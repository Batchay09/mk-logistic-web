"""Seed minimal test catalogue: destinations + schedule + prices.

Run from `backend/`:
    .venv/bin/python scripts/seed_test_data.py
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

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

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.db.models import Destination, Marketplace, PriceRule, ScheduleRule
from app.db.session import AsyncSessionLocal


DESTINATIONS = [
    {
        "marketplace": Marketplace.WB,
        "name": "Электросталь",
        "schedule": [
            # weekday_from=Mon (приём), weekday_to=Wed (приезд), след. неделя
            {"weekday_from": 0, "weekday_to": 2, "week_offset": 0},
            {"weekday_from": 3, "weekday_to": 0, "week_offset": 1},
        ],
        "prices": [
            {"min_qty": 1, "price": 250},
            {"min_qty": 11, "price": 2500},   # пал
            {"min_qty": 50, "price": 2300},
        ],
    },
    {
        "marketplace": Marketplace.WB,
        "name": "Коледино",
        "schedule": [
            {"weekday_from": 1, "weekday_to": 3, "week_offset": 0},
        ],
        "prices": [
            {"min_qty": 1, "price": 280},
            {"min_qty": 11, "price": 2800},
        ],
    },
    {
        "marketplace": Marketplace.OZON,
        "name": "Хоругвино",
        "schedule": [
            {"weekday_from": 2, "weekday_to": 4, "week_offset": 0},
        ],
        "prices": [
            {"min_qty": 1, "price": 300},
            {"min_qty": 11, "price": 3000},
        ],
    },
]


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        for d in DESTINATIONS:
            existing = (
                await session.execute(
                    select(Destination).where(
                        Destination.name == d["name"],
                        Destination.marketplace == d["marketplace"],
                    )
                )
            ).scalar_one_or_none()

            if existing:
                print(f"  [skip] {d['marketplace'].value} → {d['name']}")
                continue

            dest = Destination(
                marketplace=d["marketplace"],
                name=d["name"],
                is_active=True,
            )
            session.add(dest)
            await session.flush()

            for s in d["schedule"]:
                session.add(ScheduleRule(destination_id=dest.id, **s))
            for p in d["prices"]:
                session.add(PriceRule(destination_id=dest.id, **p))

            print(f"  [created] {d['marketplace'].value} → {d['name']} (id={dest.id})")

        await session.commit()


if __name__ == "__main__":
    print("=== Seed catalogue ===")
    asyncio.run(seed())
    print("=== Готово ===")
