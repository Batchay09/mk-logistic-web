from typing import Optional

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.models import User, UserRole
from app.db.session import get_db


async def get_current_user(
    access_token: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не авторизован",
    )
    if not access_token:
        raise credentials_exception

    payload = decode_token(access_token)
    if payload is None or payload.get("type") != "access":
        raise credentials_exception

    user_id: Optional[int] = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    result = await session.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user


async def get_current_user_optional(
    access_token: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not access_token:
        return None
    try:
        return await get_current_user(access_token=access_token, session=session)
    except HTTPException:
        return None


def require_role(*roles: UserRole):
    async def _checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав",
            )
        return current_user
    return _checker


require_admin = require_role(UserRole.ADMIN)
require_manager = require_role(UserRole.MANAGER, UserRole.ADMIN)
require_client = require_role(UserRole.CLIENT, UserRole.MANAGER, UserRole.ADMIN)
