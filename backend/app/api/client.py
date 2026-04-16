from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import require_client
from app.db.models import (
    CompanyProfile, Destination, Marketplace, Order, OrderStatus,
    PaymentMethod, PickupAddress, User
)
from app.db.session import get_db
from app.services.calculator import CalculatorService
from app.services.email import (
    notify_managers_new_order,
    notify_managers_support,
)

router = APIRouter(prefix="/client", tags=["client"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class DestinationOut(BaseModel):
    id: int
    name: str
    marketplace: str
    is_active: bool

    class Config:
        from_attributes = True


class AddressIn(BaseModel):
    city: str
    street: str
    house: str
    comment: Optional[str] = None


class OrderCreateRequest(BaseModel):
    destination_id: int
    marketplace: str
    ship_date: date
    arrival_date: date
    boxes_count: int
    service_pickup: bool = False
    service_palletizing: bool = False
    pickup_address: Optional[AddressIn] = None
    company_name: Optional[str] = None


class OrderOut(BaseModel):
    id: int
    status: str
    marketplace: str
    destination_id: int
    destination_name: Optional[str] = None
    company_name: Optional[str] = None
    ship_date: date
    arrival_date: Optional[date]
    boxes_count: int
    pallets_count: int
    is_pallet_mode: bool
    service_pickup: bool
    service_palletizing: bool
    price_delivery: float
    price_pickup: float
    price_palletizing: float
    total_amount: float
    payment_method: Optional[str]

    class Config:
        from_attributes = True


class CheckoutRequest(BaseModel):
    order_ids: List[int]
    payment_method: str  # cash | cashless


class CompanyOut(BaseModel):
    id: int
    company_name: str

    class Config:
        from_attributes = True


class CompanyCreateRequest(BaseModel):
    company_name: str


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None


class SupportRequest(BaseModel):
    message: str


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/marketplaces")
async def list_marketplaces():
    return [{"value": mp.value, "label": mp.value.upper()} for mp in Marketplace]


@router.get("/destinations", response_model=List[DestinationOut])
async def list_destinations(
    marketplace: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
):
    query = select(Destination).where(Destination.is_active)
    if marketplace:
        query = query.where(Destination.marketplace == Marketplace(marketplace))
    result = await session.execute(query.order_by(Destination.name))
    return result.scalars().all()


@router.post("/orders", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    body: OrderCreateRequest,
    current_user: User = Depends(require_client),
    session: AsyncSession = Depends(get_db),
):
    # Validate destination
    dest = (await session.execute(
        select(Destination).where(Destination.id == body.destination_id, Destination.is_active)
    )).scalar_one_or_none()
    if not dest:
        raise HTTPException(status_code=404, detail="Направление не найдено")

    # Calculate price
    pricing = await CalculatorService.calculate_price(
        session, body.destination_id, body.boxes_count, body.service_pickup, body.service_palletizing
    )

    # Handle pickup address
    pickup_address_id = None
    if body.service_pickup and body.pickup_address:
        addr = PickupAddress(
            user_id=current_user.id,
            city=body.pickup_address.city,
            street=body.pickup_address.street,
            house=body.pickup_address.house,
            comment=body.pickup_address.comment,
        )
        session.add(addr)
        await session.flush()
        pickup_address_id = addr.id

    order = Order(
        user_id=current_user.id,
        status=OrderStatus.NEW,
        marketplace=Marketplace(body.marketplace),
        destination_id=body.destination_id,
        company_name=body.company_name or current_user.company_name,
        ship_date=body.ship_date,
        arrival_date=body.arrival_date,
        boxes_count=body.boxes_count,
        pallets_count=pricing["pallets_count"],
        is_pallet_mode=pricing["is_pallet_mode"],
        service_pickup=body.service_pickup,
        service_palletizing=body.service_palletizing,
        pickup_address_id=pickup_address_id,
        price_delivery=pricing["price_delivery"],
        price_pickup=pricing["price_pickup"],
        price_palletizing=pricing["price_palletizing"],
        total_amount=pricing["total_amount"],
    )
    session.add(order)
    await session.commit()
    await session.refresh(order)

    # Eager load destination for response
    await session.refresh(order, ["destination"])
    return _order_out(order)


@router.get("/orders", response_model=List[OrderOut])
async def list_orders(
    status: Optional[str] = None,
    current_user: User = Depends(require_client),
    session: AsyncSession = Depends(get_db),
):
    query = (
        select(Order)
        .options(selectinload(Order.destination))
        .where(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
    )
    if status:
        query = query.where(Order.status == OrderStatus(status))
    result = await session.execute(query)
    return [_order_out(o) for o in result.scalars().all()]


@router.get("/orders/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: int,
    current_user: User = Depends(require_client),
    session: AsyncSession = Depends(get_db),
):
    order = await _get_user_order(order_id, current_user.id, session)
    return _order_out(order)


@router.delete("/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
    order_id: int,
    current_user: User = Depends(require_client),
    session: AsyncSession = Depends(get_db),
):
    order = await _get_user_order(order_id, current_user.id, session)
    if order.status != OrderStatus.NEW:
        raise HTTPException(status_code=400, detail="Можно удалить только заказ в статусе NEW")
    await session.delete(order)
    await session.commit()


@router.post("/cart/checkout")
async def checkout(
    body: CheckoutRequest,
    current_user: User = Depends(require_client),
    session: AsyncSession = Depends(get_db),
):
    if body.payment_method not in ("cash", "cashless"):
        raise HTTPException(status_code=400, detail="Неверный метод оплаты")

    orders = []
    for oid in body.order_ids:
        order = (await session.execute(
            select(Order)
            .options(selectinload(Order.user), selectinload(Order.destination))
            .where(Order.id == oid, Order.user_id == current_user.id, Order.status == OrderStatus.NEW)
        )).scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail=f"Заказ #{oid} не найден или уже оплачен")
        orders.append(order)

    pm = PaymentMethod(body.payment_method)
    new_status = OrderStatus.CONFIRMED if pm == PaymentMethod.CASH else OrderStatus.AWAITING_PAYMENT

    for order in orders:
        order.payment_method = pm
        order.status = new_status

    await session.commit()

    # Notify managers
    pickup_info = ""
    if any(o.service_pickup and o.pickup_address_id for o in orders):
        pickup_info = "Требуется забор"

    total = sum(float(o.total_amount) for o in orders)
    client_name = current_user.full_name or current_user.email or "Клиент"
    await notify_managers_new_order([o.id for o in orders], client_name, total, pickup_info)

    if pm == PaymentMethod.CASHLESS:
        # Return SBP payment info (YooKassa integration done separately in /payments)
        return {
            "status": "awaiting_payment",
            "order_ids": [o.id for o in orders],
            "total": total,
            "sbp_phone": "+79384980009",
            "sbp_card": "2202208127908078",
            "note": f"Оплата за услуги (Заказы: {', '.join(f'#{o.id}' for o in orders)})",
        }

    # CASH: generate and return sticker link
    return {
        "status": "confirmed",
        "order_ids": [o.id for o in orders],
    }


@router.get("/companies", response_model=List[CompanyOut])
async def list_companies(current_user: User = Depends(require_client), session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(CompanyProfile).where(CompanyProfile.user_id == current_user.id))
    return result.scalars().all()


@router.post("/companies", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
async def create_company(
    body: CompanyCreateRequest,
    current_user: User = Depends(require_client),
    session: AsyncSession = Depends(get_db),
):
    profile = CompanyProfile(user_id=current_user.id, company_name=body.company_name)
    session.add(profile)
    await session.commit()
    await session.refresh(profile)
    return profile


@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: int,
    current_user: User = Depends(require_client),
    session: AsyncSession = Depends(get_db),
):
    profile = (await session.execute(
        select(CompanyProfile).where(CompanyProfile.id == company_id, CompanyProfile.user_id == current_user.id)
    )).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    await session.delete(profile)
    await session.commit()


@router.get("/profile")
async def get_profile(current_user: User = Depends(require_client)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "company_name": current_user.company_name,
        "role": current_user.role.value,
        "email_verified": current_user.email_verified_at is not None,
    }


@router.patch("/profile")
async def update_profile(
    body: ProfileUpdate,
    current_user: User = Depends(require_client),
    session: AsyncSession = Depends(get_db),
):
    if body.full_name is not None:
        current_user.full_name = body.full_name
    if body.phone is not None:
        current_user.phone = body.phone
    if body.company_name is not None:
        current_user.company_name = body.company_name
    await session.commit()
    return {"ok": True}


@router.post("/support")
async def send_support(
    body: SupportRequest,
    current_user: User = Depends(require_client),
    session: AsyncSession = Depends(get_db),
):
    # Get active orders summary
    result = await session.execute(
        select(Order)
        .options(selectinload(Order.destination))
        .where(
            Order.user_id == current_user.id,
            Order.status.not_in([OrderStatus.DELIVERED, OrderStatus.CANCELED, OrderStatus.DRAFT]),
        )
        .limit(10)
    )
    active_orders = result.scalars().all()
    orders_str = "<br>".join(
        f"#{o.id}: {o.destination.name if o.destination else '—'}, {o.boxes_count} кор., {o.status.value}"
        for o in active_orders
    )

    await notify_managers_support(
        client_name=current_user.full_name or current_user.email or "Клиент",
        client_phone=current_user.phone or "—",
        message=body.message,
        active_orders=orders_str,
    )
    return {"ok": True}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_user_order(order_id: int, user_id: int, session: AsyncSession) -> Order:
    order = (await session.execute(
        select(Order)
        .options(selectinload(Order.destination))
        .where(Order.id == order_id, Order.user_id == user_id)
    )).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    return order


def _order_out(order: Order) -> OrderOut:
    return OrderOut(
        id=order.id,
        status=order.status.value,
        marketplace=order.marketplace.value,
        destination_id=order.destination_id,
        destination_name=order.destination.name if order.destination else None,
        company_name=order.company_name,
        ship_date=order.ship_date,
        arrival_date=order.arrival_date,
        boxes_count=order.boxes_count,
        pallets_count=order.pallets_count,
        is_pallet_mode=order.is_pallet_mode,
        service_pickup=order.service_pickup,
        service_palletizing=order.service_palletizing,
        price_delivery=float(order.price_delivery),
        price_pickup=float(order.price_pickup),
        price_palletizing=float(order.price_palletizing),
        total_amount=float(order.total_amount),
        payment_method=order.payment_method.value if order.payment_method else None,
    )
