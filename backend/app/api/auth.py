import re
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.rate_limit import limiter
from app.core.security import (
    hash_password,
    set_auth_cookie,
    verify_password,
)
from app.db.models import User, UserRole
from app.db.session import get_db
from app.services.email import send_registration_code, send_reset_code
from app.services.otp import issue_code, verify_code

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="Пароль не менее 8 символов")
    full_name: str
    # Телефон обязателен: менеджеру нужен контакт для связи по заказу
    phone: str = Field(min_length=5, max_length=40)
    company_name: Optional[str] = None
    pd_consent: bool = Field(description="Согласие на обработку персональных данных (152-ФЗ)")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = v.strip()
        digits = re.sub(r"\D", "", cleaned)
        if not re.fullmatch(r"[\d+()\-\s]{5,40}", cleaned) or len(digits) < 5:
            raise ValueError("Укажите корректный номер телефона")
        return cleaned


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordConfirm(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8)


class RegisterConfirmRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class ResendCodeRequest(BaseModel):
    email: EmailStr
    purpose: Literal["register", "reset"]


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


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

async def _issue_and_send_register_code(session: AsyncSession, user: User) -> None:
    """Выпустить регистрационный код и отправить письмом (best-effort)."""
    code = await issue_code(session, user.email, "register", user.id)
    await session.commit()
    try:
        await send_registration_code(user.email, code)
    except Exception:
        pass  # письмо best-effort: код можно переотправить


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest, session: AsyncSession = Depends(get_db)):
    if not body.pd_consent:
        raise HTTPException(status_code=400, detail="Необходимо согласие на обработку персональных данных")

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
        pd_consent_at=datetime.now(timezone.utc),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    # Регистрация завершается только после подтверждения кода из письма —
    # cookie здесь намеренно не ставим.
    await _issue_and_send_register_code(session, user)
    return {"ok": True, "email": user.email}


@router.post("/register/confirm", response_model=UserOut)
@limiter.limit("10/minute")
async def register_confirm(
    request: Request,
    body: RegisterConfirmRequest,
    response: Response,
    session: AsyncSession = Depends(get_db),
):
    user = (await session.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if not user or not await verify_code(session, body.email, "register", body.code):
        raise HTTPException(status_code=400, detail="Неверный или устаревший код")

    if user.email_verified_at is None:
        user.email_verified_at = datetime.now(timezone.utc)
    await session.commit()

    set_auth_cookie(response, user.id)
    return _user_out(user)


@router.post("/resend-code")
@limiter.limit("3/minute")
async def resend_code(request: Request, body: ResendCodeRequest, session: AsyncSession = Depends(get_db)):
    user = (await session.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if user:
        already_verified = body.purpose == "register" and user.email_verified_at is not None
        if not already_verified:
            code = await issue_code(session, user.email, body.purpose, user.id)
            await session.commit()
            try:
                if body.purpose == "register":
                    await send_registration_code(user.email, code)
                else:
                    await send_reset_code(user.email, code)
            except Exception:
                pass
    # Всегда 200 — не раскрываем, зарегистрирован ли email
    return {"ok": True}


@router.post("/login", response_model=UserOut)
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, response: Response, session: AsyncSession = Depends(get_db)):
    user = (await session.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    if user.email_verified_at is None:
        # Пароль верный, но email не подтверждён (в т.ч. старые аккаунты со ссылочной
        # верификацией). Шлём код и просим фронт показать экран подтверждения.
        await _issue_and_send_register_code(session, user)
        raise HTTPException(status_code=403, detail="email_not_verified")

    set_auth_cookie(response, user.id)
    return _user_out(user)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"ok": True}


@router.post("/reset-password")
@limiter.limit("3/minute")
async def reset_password(request: Request, body: ResetPasswordRequest, session: AsyncSession = Depends(get_db)):
    user = (await session.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if user:
        code = await issue_code(session, user.email, "reset", user.id)
        await session.commit()
        try:
            await send_reset_code(user.email, code)
        except Exception:
            pass
    # Always return 200 to avoid email enumeration
    return {"ok": True}


@router.post("/reset-confirm")
@limiter.limit("10/minute")
async def reset_confirm(request: Request, body: ResetPasswordConfirm, session: AsyncSession = Depends(get_db)):
    user = (await session.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if not user or not await verify_code(session, body.email, "reset", body.code):
        raise HTTPException(status_code=400, detail="Неверный или устаревший код")

    user.password_hash = hash_password(body.new_password)
    # Код пришёл на почту — владение ящиком доказано, засчитываем верификацию
    if user.email_verified_at is None:
        user.email_verified_at = datetime.now(timezone.utc)
    await session.commit()
    return {"ok": True}


@router.post("/change-password")
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    if not current_user.password_hash or not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")

    current_user.password_hash = hash_password(body.new_password)
    await session.commit()
    return {"ok": True}


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return _user_out(current_user)
