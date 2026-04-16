from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.security import (
    create_access_token,
    create_email_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.models import User, UserRole
from app.db.session import get_db
from app.services.email import send_reset_password_email, send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    company_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordConfirm(BaseModel):
    token: str
    new_password: str


class VerifyEmailRequest(BaseModel):
    token: str


class UserOut(BaseModel):
    id: int
    email: Optional[str]
    full_name: Optional[str]
    company_name: Optional[str]
    phone: Optional[str]
    role: str
    email_verified: bool

    class Config:
        from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

def _set_auth_cookie(response: Response, user: User) -> None:
    token = create_access_token({"sub": str(user.id)})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def _user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        company_name=user.company_name,
        phone=user.phone,
        role=user.role.value,
        email_verified=user.email_verified_at is not None,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, response: Response, session: AsyncSession = Depends(get_db)):
    existing = (await session.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        phone=body.phone,
        company_name=body.company_name,
        role=UserRole.CLIENT,
        policy_accepted=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    # Send verification email (non-blocking)
    try:
        token = create_email_token({"sub": str(user.id), "purpose": "verify"})
        await send_verification_email(body.email, token)
    except Exception:
        pass  # don't fail registration if email fails

    _set_auth_cookie(response, user)
    return _user_out(user)


@router.post("/login", response_model=UserOut)
async def login(body: LoginRequest, response: Response, session: AsyncSession = Depends(get_db)):
    user = (await session.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    _set_auth_cookie(response, user)
    return _user_out(user)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"ok": True}


@router.post("/verify-email")
async def verify_email(body: VerifyEmailRequest, session: AsyncSession = Depends(get_db)):
    payload = decode_token(body.token)
    if not payload or payload.get("purpose") != "verify":
        raise HTTPException(status_code=400, detail="Неверная или устаревшая ссылка")

    user_id = payload.get("sub")
    user = (await session.execute(select(User).where(User.id == int(user_id)))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user.email_verified_at = datetime.now(timezone.utc)
    await session.commit()
    return {"ok": True}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, session: AsyncSession = Depends(get_db)):
    user = (await session.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if user:
        token = create_email_token({"sub": str(user.id), "purpose": "reset"}, expires_hours=2)
        try:
            await send_reset_password_email(body.email, token)
        except Exception:
            pass
    # Always return 200 to avoid email enumeration
    return {"ok": True}


@router.post("/reset-confirm")
async def reset_confirm(body: ResetPasswordConfirm, session: AsyncSession = Depends(get_db)):
    payload = decode_token(body.token)
    if not payload or payload.get("purpose") != "reset":
        raise HTTPException(status_code=400, detail="Неверная или устаревшая ссылка")

    user = (await session.execute(
        select(User).where(User.id == int(payload["sub"]))
    )).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Пароль должен быть не менее 8 символов")

    user.password_hash = hash_password(body.new_password)
    await session.commit()
    return {"ok": True}


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return _user_out(current_user)
