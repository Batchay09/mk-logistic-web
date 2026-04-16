from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.calculator import CalculatorService, SchedulerService

router = APIRouter(prefix="/calc", tags=["calculator"])


class PriceRequest(BaseModel):
    destination_id: int
    boxes: int
    service_pickup: bool = False
    service_palletizing: bool = False


class PriceResponse(BaseModel):
    price_delivery: float
    price_pickup: float
    price_palletizing: float
    total_amount: float
    unit_price: float
    pallets_count: int
    is_pallet_mode: bool


class DatesRequest(BaseModel):
    destination_id: int
    start_date: Optional[date] = None
    days_ahead: int = 5


class DateOption(BaseModel):
    ship_date: date
    arrival_date: date
    label: str


@router.post("/price", response_model=PriceResponse)
async def calculate_price(body: PriceRequest, session: AsyncSession = Depends(get_db)):
    result = await CalculatorService.calculate_price(
        session, body.destination_id, body.boxes, body.service_pickup, body.service_palletizing
    )
    return result


@router.post("/dates", response_model=List[DateOption])
async def get_available_dates(body: DatesRequest, session: AsyncSession = Depends(get_db)):
    dates = await SchedulerService.get_available_dates(
        session, body.destination_id, body.start_date, body.days_ahead
    )
    DAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
    return [
        DateOption(
            ship_date=ship,
            arrival_date=arrival,
            label=f"{ship.strftime('%d.%m')} ({DAYS_RU[ship.weekday()]}) → {arrival.strftime('%d.%m')} ({DAYS_RU[arrival.weekday()]})",
        )
        for ship, arrival in dates
    ]
