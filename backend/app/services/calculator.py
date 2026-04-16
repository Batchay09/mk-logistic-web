import math
from datetime import date, timedelta, datetime
from typing import List, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models import PriceRule, ScheduleRule

BASE_PICKUP_PRICE = 500
PALLET_PRICE = 500
BOXES_PER_PALLET = 11
PALLETIZING_PRICE = 500


class CalculatorService:
    @staticmethod
    async def calculate_price(
        session: AsyncSession,
        destination_id: int,
        boxes: int,
        service_pickup: bool,
        service_palletizing: bool,
    ) -> dict:
        is_pallet_mode = boxes >= BOXES_PER_PALLET
        pallets_count = math.ceil(boxes / BOXES_PER_PALLET) if is_pallet_mode else 0

        rules_q = await session.execute(
            select(PriceRule)
            .where(PriceRule.destination_id == destination_id)
            .order_by(PriceRule.min_qty.desc())
        )
        rules = rules_q.scalars().all()

        unit_price = 0.0
        for rule in rules:
            if boxes >= rule.min_qty:
                unit_price = float(rule.price)
                break

        price_delivery = unit_price * boxes
        price_pickup = BASE_PICKUP_PRICE if service_pickup else 0
        price_palletizing = (pallets_count * PALLETIZING_PRICE) if (is_pallet_mode and service_palletizing) else 0
        total = price_delivery + price_pickup + price_palletizing

        return {
            "price_delivery": price_delivery,
            "price_pickup": price_pickup,
            "price_palletizing": price_palletizing,
            "total_amount": total,
            "unit_price": unit_price,
            "pallets_count": pallets_count,
            "is_pallet_mode": is_pallet_mode,
        }


class SchedulerService:
    @staticmethod
    async def get_available_dates(
        session: AsyncSession,
        destination_id: int,
        start_date: date | None = None,
        days_ahead: int = 5,
    ) -> List[Tuple[date, date]]:
        if not start_date:
            start_date = datetime.now().date()

        stmt = select(ScheduleRule).where(ScheduleRule.destination_id == destination_id)
        rules = (await session.execute(stmt)).scalars().all()

        available_dates: List[Tuple[date, date]] = []
        current_date = start_date

        while len(available_dates) < days_ahead:
            weekday = current_date.weekday()

            for rule in rules:
                if rule.weekday_from == weekday:
                    arrival_delta = (rule.weekday_to - rule.weekday_from) % 7
                    if arrival_delta <= 0:
                        arrival_delta += 7
                    if rule.week_offset > 0:
                        arrival_delta += 7 * rule.week_offset
                    arrival_date = current_date + timedelta(days=arrival_delta)
                    available_dates.append((current_date, arrival_date))
                    break

            current_date += timedelta(days=1)
            if (current_date - start_date).days > 60:
                break

        return available_dates
