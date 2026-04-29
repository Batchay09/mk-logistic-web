"""Bootstrap административных пользователей по переменным окружения.

Запуск: `python -m app.db.bootstrap` — внутри контейнера web-backend.
Идемпотентен: запускается на каждом старте, но создаёт/обновляет только при необходимости.

Переменные:
    ADMIN_EMAIL, ADMIN_PASSWORD — создаст или повысит до admin.
    MANAGER_EMAIL, MANAGER_PASSWORD — создаст или повысит до manager.
    MANAGER_EMAILS (csv) — повысит существующих до manager (без создания, без пароля).

Дальнейшее управление ролями — через UI `/admin/users` (PATCH /admin/users/{id}/role).
"""
import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.db.models import User, UserRole
from app.db.session import AsyncSessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def ensure_user(
    session: AsyncSession,
    email: str,
    password: str | None,
    role: UserRole,
    full_name: str,
) -> None:
    """Создать пользователя если нет, иначе повысить до требуемой роли.

    - Если пользователь не существует и пароль не задан → пропускаем (warning).
    - Если существует → обновляем роль (если ниже).
    - Если существует и роль уже выше или равна → no-op.
    """
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        if not password:
            logger.warning("Пропущен %s: пользователь не найден и пароль не задан", email)
            return
        session.add(
            User(
                email=email,
                password_hash=hash_password(password),
                full_name=full_name,
                role=role,
            )
        )
        logger.info("Создан %s с ролью %s", email, role.value)
        return

    if user.role != role:
        # Не понижаем admin до manager автоматически — если admin уже создан, не трогаем.
        if user.role == UserRole.ADMIN and role != UserRole.ADMIN:
            logger.info("Пропущен %s: уже admin, не понижаем", email)
            return
        previous = user.role.value
        user.role = role
        logger.info("Изменена роль %s: %s → %s", email, previous, role.value)
    else:
        logger.info("OK: %s уже имеет роль %s", email, role.value)


async def bootstrap() -> None:
    async with AsyncSessionLocal() as session:
        # 1. Главный админ
        if settings.ADMIN_EMAIL and settings.ADMIN_PASSWORD:
            await ensure_user(
                session,
                settings.ADMIN_EMAIL,
                settings.ADMIN_PASSWORD,
                UserRole.ADMIN,
                "Администратор",
            )

        # 2. Главный менеджер (один)
        if settings.MANAGER_EMAIL and settings.MANAGER_PASSWORD:
            await ensure_user(
                session,
                settings.MANAGER_EMAIL,
                settings.MANAGER_PASSWORD,
                UserRole.MANAGER,
                "Менеджер",
            )

        # 3. Существующих юзеров из MANAGER_EMAILS (csv) — повышаем до manager
        for email in settings.manager_email_list:
            await ensure_user(session, email, None, UserRole.MANAGER, "Менеджер")

        await session.commit()
        logger.info("Bootstrap завершён")


if __name__ == "__main__":
    asyncio.run(bootstrap())
