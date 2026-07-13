"""Тесты сервиса одноразовых email-кодов (app/services/otp.py).

Ключевые свойства: код одноразовый, живёт 15 минут, 5 попыток подбора,
переотправка инвалидирует предыдущий код.
"""
from datetime import datetime, timedelta, timezone

from app.db.models import EmailOtp
from app.services.otp import OTP_MAX_ATTEMPTS, issue_code, verify_code
from sqlalchemy import select

EMAIL = "user@example.com"


async def test_issue_and_verify_happy_path(session):
    code = await issue_code(session, EMAIL, "register")
    await session.commit()

    assert len(code) == 6 and code.isdigit()
    assert await verify_code(session, EMAIL, "register", code) is True


async def test_code_is_single_use(session):
    code = await issue_code(session, EMAIL, "reset")
    await session.commit()

    assert await verify_code(session, EMAIL, "reset", code) is True
    await session.commit()
    assert await verify_code(session, EMAIL, "reset", code) is False


async def test_wrong_code_increments_attempts_and_blocks(session):
    code = await issue_code(session, EMAIL, "register")
    await session.commit()

    for _ in range(OTP_MAX_ATTEMPTS):
        assert await verify_code(session, EMAIL, "register", "000001") is False

    # После исчерпания попыток даже правильный код не проходит
    assert await verify_code(session, EMAIL, "register", code) is False


async def test_expired_code_rejected(session):
    code = await issue_code(session, EMAIL, "register")
    await session.commit()

    otp = (await session.execute(select(EmailOtp).where(EmailOtp.email == EMAIL))).scalar_one()
    otp.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    await session.commit()

    assert await verify_code(session, EMAIL, "register", code) is False


async def test_reissue_invalidates_previous_code(session):
    old_code = await issue_code(session, EMAIL, "register")
    await session.commit()
    new_code = await issue_code(session, EMAIL, "register")
    await session.commit()

    assert await verify_code(session, EMAIL, "register", old_code) is False or old_code == new_code
    assert await verify_code(session, EMAIL, "register", new_code) is True


async def test_purposes_are_isolated(session):
    reg_code = await issue_code(session, EMAIL, "register")
    reset_code = await issue_code(session, EMAIL, "reset")
    await session.commit()

    # Код регистрации не подходит для сброса и наоборот
    if reg_code != reset_code:
        assert await verify_code(session, EMAIL, "reset", reg_code) is False
    assert await verify_code(session, EMAIL, "reset", reset_code) is True
