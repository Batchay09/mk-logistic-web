"""Seed данные для направлений, цен, расписания.
Перенесено из MK tranzit (app/db/seeds.py).
Запуск: python -m app.db.seeds — внутри контейнера web-backend.
Идемпотентный: проверяет, есть ли уже данные.
"""
import asyncio
import logging

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.db.models import Destination, PriceRule, ScheduleRule, Marketplace

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_data() -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Destination))
        if result.scalars().first():
            logger.info("Data already seeded — skipping.")
            return

        logger.info("Seeding data...")

        # --- Wildberries ---
        wb_data = [
            ("Невинномысск", 180, 150),
            ("Краснодар", 300, 250),
            ("Коледино", 450, 315),
            ("Воронеж (WB)", 400, 350),
            ("Электросталь", 500, 365),
            ("Подольск", 500, 365),
            ("Казань (WB)", 550, 365),
            ("Тула", 500, 390),
            ("Волгоград (WB)", 500, 400),
            ("Рязань", 650, 400),
            ("Владимир", 520, 420),
            ("Котовск", 550, 425),
            ("Самара (WB)", 500, 437),
            ("Сарапул", 500, 472.5),
            ("Екатеринбург (WB)", 950, 540),
            ("Новосибирск", 1000, 800),
        ]
        wb_schedule = [
            (0, 2, 0),  # ПН → СР
            (1, 3, 0),  # ВТ → ЧТ
            (2, 4, 0),  # СР → ПТ
            (3, 6, 0),  # ЧТ → ВС
            (4, 0, 1),  # ПТ → ПН (следующая неделя)
        ]
        for name, p1, p11 in wb_data:
            dest = Destination(marketplace=Marketplace.WB, name=name)
            session.add(dest)
            await session.flush()
            session.add(PriceRule(destination_id=dest.id, min_qty=1, price=p1))
            session.add(PriceRule(destination_id=dest.id, min_qty=11, price=p11))
            for f, t, o in wb_schedule:
                session.add(ScheduleRule(
                    destination_id=dest.id, weekday_from=f, weekday_to=t, week_offset=o,
                ))

        # --- Ozon ---
        ozon_data = [
            ("Невинномысск", 180, 150),
            ("Адыгейск", 300, 250),
            ("Гривно", 400, 350),
            ("Воронеж", 400, 350),
            ("Ногинск", 450, 370),
            ("Софьино", 450, 420),
            ("Казань", 550, 420),
            ("Волгоград", 500, 450),
            ("Самара", 500, 450),
            ("Хоругвино", 600, 470),
            ("Петровское", 500, 470),
            ("СПБ Шушары", 700, 550),
            ("Екатеринбург", 750, 650),
            ("СПБ РФЦ", 800, 700),
            ("СПБ Бугры", 800, 700),
        ]
        ozon_schedule = [
            (0, 3, 0),  # ПН → ЧТ
            (1, 4, 0),  # ВТ → ПТ
            (3, 0, 1),  # ЧТ → ПН (следующая неделя)
        ]
        for name, p1, p11 in ozon_data:
            dest = Destination(marketplace=Marketplace.OZON, name=name)
            session.add(dest)
            await session.flush()
            session.add(PriceRule(destination_id=dest.id, min_qty=1, price=p1))
            session.add(PriceRule(destination_id=dest.id, min_qty=11, price=p11))
            for f, t, o in ozon_schedule:
                session.add(ScheduleRule(
                    destination_id=dest.id, weekday_from=f, weekday_to=t, week_offset=o,
                ))

        await session.commit()
        logger.info("Seeding complete: %d WB + %d Ozon destinations.",
                    len(wb_data), len(ozon_data))


if __name__ == "__main__":
    asyncio.run(seed_data())
