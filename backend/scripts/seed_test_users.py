"""Seed admin + test client into the local SQLite dev DB.

Run from `backend/`:
    .venv/bin/python scripts/seed_test_users.py
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

# Ensure same env as run-local.sh so app.core.config loads cleanly
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./dev.db")
os.environ.setdefault("SECRET_KEY", "local-dev-secret-key-32-chars-ok")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("API_URL", "http://127.0.0.1:8001")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("SMTP_USER", "")
os.environ.setdefault("SMTP_PASSWORD", "")
os.environ.setdefault("YOOKASSA_SHOP_ID", "")
os.environ.setdefault("YOOKASSA_SECRET_KEY", "")
os.environ.setdefault("YOOKASSA_WEBHOOK_SECRET", "")
os.environ.setdefault("MANAGER_EMAILS", "")
os.environ.setdefault("ADMIN_TG_IDS", "")

# Make `app.*` imports work when running from backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from datetime import datetime, timezone

from sqlalchemy import select

from app.core.security import hash_password
from app.db.models import User, UserRole
from app.db.session import AsyncSessionLocal


# Пароль для тестовых учёток берётся из окружения (не хардкодим в файле,
# который может уехать на сервер). Дефолт — только для локальной SQLite-разработки.
SEED_PASSWORD = os.environ.get("SEED_PASSWORD", "devpass123")

SEED_USERS: list[dict] = [
    {
        "email": "admin@mk-logistic.ru",
        "password": SEED_PASSWORD,
        "full_name": "Администратор",
        "role": UserRole.ADMIN,
        "phone": "+7 999 000-00-01",
        "company_name": None,
    },
    {
        "email": "client@test.ru",
        "password": SEED_PASSWORD,
        "full_name": "Тестовый клиент",
        "role": UserRole.CLIENT,
        "phone": "+7 999 123-45-67",
        "company_name": "ООО Тест",
    },
]


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        for data in SEED_USERS:
            existing = (
                await session.execute(select(User).where(User.email == data["email"]))
            ).scalar_one_or_none()

            if existing:
                existing.password_hash = hash_password(data["password"])
                existing.full_name = data["full_name"]
                existing.role = data["role"]
                existing.phone = data["phone"]
                existing.company_name = data["company_name"]
                existing.policy_accepted = True
                existing.email_verified_at = datetime.now(timezone.utc)
                action = "updated"
            else:
                user = User(
                    email=data["email"],
                    password_hash=hash_password(data["password"]),
                    full_name=data["full_name"],
                    role=data["role"],
                    phone=data["phone"],
                    company_name=data["company_name"],
                    policy_accepted=True,
                    email_verified_at=datetime.now(timezone.utc),
                )
                session.add(user)
                action = "created"

            print(f"  [{action}] {data['role'].value:<8} {data['email']}  пароль: {data['password']}")

        await session.commit()


if __name__ == "__main__":
    print("=== Seed test users ===")
    asyncio.run(seed())
    print("=== Готово ===")
