"""Одноразовые email-коды (OTP): выпуск и проверка.

Код — 6 цифр, живёт OTP_TTL_MINUTES, максимум OTP_MAX_ATTEMPTS проверок.
В БД хранится HMAC-SHA256(SECRET_KEY, code) — утечка таблицы не раскрывает коды.
"""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import EmailOtp

OTP_TTL_MINUTES = 15
OTP_MAX_ATTEMPTS = 5


def _hash_code(code: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), code.encode(), hashlib.sha256).hexdigest()


def _as_utc(dt: datetime) -> datetime:
    """SQLite отдаёт naive datetime, Postgres — aware; нормализуем к UTC."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


async def issue_code(
    session: AsyncSession,
    email: str,
    purpose: str,
    user_id: Optional[int] = None,
) -> str:
    """Выпустить новый код, инвалидировав предыдущий для (email, purpose).

    Коммит — на вызывающей стороне (вместе с отправкой письма).
    """
    code = f"{secrets.randbelow(10**6):06d}"
    await session.execute(
        delete(EmailOtp).where(EmailOtp.email == email, EmailOtp.purpose == purpose)
    )
    session.add(
        EmailOtp(
            email=email,
            user_id=user_id,
            purpose=purpose,
            code_hash=_hash_code(code),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES),
        )
    )
    return code


async def verify_code(session: AsyncSession, email: str, purpose: str, code: str) -> bool:
    """Проверить код. Неверный код увеличивает счётчик попыток (коммитится сразу,
    чтобы перебор не откатывался); успешный помечает код использованным —
    коммит успеха остаётся вызывающей стороне (вместе с изменениями пользователя).
    """
    otp = (
        await session.execute(
            select(EmailOtp).where(EmailOtp.email == email, EmailOtp.purpose == purpose)
        )
    ).scalar_one_or_none()

    if otp is None or otp.used_at is not None:
        return False
    if _as_utc(otp.expires_at) < datetime.now(timezone.utc):
        return False
    if otp.attempts >= OTP_MAX_ATTEMPTS:
        return False

    if not hmac.compare_digest(otp.code_hash, _hash_code(code)):
        otp.attempts += 1
        await session.commit()
        return False

    otp.used_at = datetime.now(timezone.utc)
    return True
