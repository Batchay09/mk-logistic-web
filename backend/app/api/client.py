import asyncio
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, undefer

from app.api.payments import _fetch_payment, _mark_orders_paid, _orders_by_payment
from app.core.config import settings
from app.core.dependencies import require_client
from app.core.rate_limit import limiter
from app.db.models import (
    CompanyProfile, Destination, Marketplace, Order, OrderStatus,
    PaymentMethod, PickupAddress, SupportConversation, SupportMessage, User
)
from app.db.session import get_db
from app.services.attachments import (
    AttachmentError, MAX_UPLOAD_BYTES, content_disposition, process_image, safe_filename,
)
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
    city: str = Field(max_length=120)
    street: str = Field(max_length=200)
    house: str = Field(max_length=40)
    comment: Optional[str] = Field(default=None, max_length=500)


class OrderCreateRequest(BaseModel):
    destination_id: int
    marketplace: str = Field(max_length=32)
    ship_date: date
    arrival_date: date
    boxes_count: int = Field(gt=0, le=100000)
    service_pickup: bool = False
    pickup_address: Optional[AddressIn] = None
    company_name: Optional[str] = Field(default=None, max_length=255)


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
    order_ids: List[int] = Field(min_length=1, max_length=50)
    payment_method: str  # только cash — безнал идёт через POST /payments/yookassa/create


class CompanyOut(BaseModel):
    id: int
    company_name: str

    class Config:
        from_attributes = True


class CompanyCreateRequest(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=40)
    company_name: Optional[str] = Field(default=None, max_length=255)


class SupportRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


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

    try:
        marketplace = Marketplace(body.marketplace)
    except ValueError:
        raise HTTPException(status_code=400, detail="Неверный маркетплейс")

    # Calculate price
    pricing = await CalculatorService.calculate_price(
        session, body.destination_id, body.boxes_count, body.service_pickup
    )
    if pricing["total_amount"] <= 0:
        raise HTTPException(status_code=400, detail="Некорректная сумма заказа")

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
        marketplace=marketplace,
        destination_id=body.destination_id,
        company_name=body.company_name or current_user.company_name,
        ship_date=body.ship_date,
        arrival_date=body.arrival_date,
        boxes_count=body.boxes_count,
        pallets_count=pricing["pallets_count"],
        is_pallet_mode=pricing["is_pallet_mode"],
        service_pickup=body.service_pickup,
        # Паллетизация всегда включена при наличии полных паллет (колонка остаётся
        # для совместимости с ботом, где услуга пока опциональна).
        service_palletizing=pricing["is_pallet_mode"],
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


@router.post("/orders/{order_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("20/minute")
async def cancel_order(
    request: Request,
    order_id: int,
    current_user: User = Depends(require_client),
    session: AsyncSession = Depends(get_db),
):
    """Клиент отменяет неоплаченный заказ, который передумал оплачивать.

    Отменять можно только заказ «Ожидает оплаты». Перед отменой сверяем платёж
    с ЮKassa: если он всё же прошёл — не отменяем, а помечаем оплаченным
    (иначе клиент, нажав «отмена» на форме и оплатив в другой вкладке, потерял бы
    заказ при списанных деньгах). Если ЮKassa недоступна — отмену разрешаем:
    запоздавший «succeeded» по отменённому заказу webhook не воскресит, а залогирует
    для ручного возврата.

    Корзина из нескольких заказов оплачивается ОДНИМ платежом (общий
    yookassa_payment_id). Платёж неделим, поэтому отменяем всю группу заказов,
    ждущих этот платёж, — иначе оплата исходного платежа целиком прошла бы за
    группу, а выполнилась бы лишь часть (деньги за отменённый заказ повисли бы).
    """
    order = (await session.execute(
        select(Order)
        .where(Order.id == order_id, Order.user_id == current_user.id)
        .with_for_update(of=Order)
    )).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    if order.status == OrderStatus.CANCELED:
        return  # идемпотентность
    if order.status != OrderStatus.AWAITING_PAYMENT:
        raise HTTPException(status_code=400, detail="Отменить можно только неоплаченный заказ")

    pid = order.yookassa_payment_id
    if pid and settings.YOOKASSA_SHOP_ID and settings.YOOKASSA_SECRET_KEY:
        try:
            payment = await _fetch_payment(pid)
        except Exception:
            payment = None  # ЮKassa недоступна — отменяем, webhook-гард подстрахует
        if payment and payment.status == "succeeded" and getattr(payment, "paid", False):
            # Платёж прошёл — не отменяем, помечаем всю группу оплаченной.
            group = await _orders_by_payment(session, pid)
            try:
                paid_amount = Decimal(str(payment.amount.value))
            except (InvalidOperation, AttributeError, TypeError):
                paid_amount = Decimal("0")
            try:
                await _mark_orders_paid(session, group, paid_amount, pid)
                await session.commit()
            except HTTPException:
                await session.rollback()
            raise HTTPException(status_code=409, detail="Заказ уже оплачен")

    # Отменяем всю группу, ждущую этот платёж (при отсутствии pid — только сам заказ).
    if pid:
        group = (await session.execute(
            select(Order)
            .where(
                Order.yookassa_payment_id == pid,
                Order.user_id == current_user.id,
                Order.status == OrderStatus.AWAITING_PAYMENT,
            )
            .with_for_update(of=Order)
        )).scalars().all()
    else:
        group = [order]

    for o in group:
        o.status = OrderStatus.CANCELED
    await session.commit()


@router.post("/cart/checkout")
@limiter.limit("10/minute")
async def checkout(
    request: Request,
    body: CheckoutRequest,
    current_user: User = Depends(require_client),
    session: AsyncSession = Depends(get_db),
):
    # Безнал оформляется только через POST /payments/yookassa/create — статус
    # AWAITING_PAYMENT заказы получают вместе с созданием платежа. Иначе они
    # зависали бы у менеджера в очереди «проверка оплат» без реального платежа.
    if body.payment_method != "cash":
        raise HTTPException(status_code=400, detail="Неверный метод оплаты")

    orders = []
    for oid in dict.fromkeys(body.order_ids):
        order = (await session.execute(
            select(Order)
            .options(selectinload(Order.user), selectinload(Order.destination))
            .where(Order.id == oid, Order.user_id == current_user.id, Order.status == OrderStatus.NEW)
        )).scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail=f"Заказ #{oid} не найден или уже оплачен")
        orders.append(order)

    for order in orders:
        order.payment_method = PaymentMethod.CASH
        order.status = OrderStatus.CONFIRMED

    await session.commit()

    # Notify managers
    pickup_info = ""
    if any(o.service_pickup and o.pickup_address_id for o in orders):
        pickup_info = "Требуется забор"

    total = sum(float(o.total_amount) for o in orders)
    client_name = current_user.full_name or current_user.email or "Клиент"
    await notify_managers_new_order([o.id for o in orders], client_name, total, pickup_info)

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
@limiter.limit("10/minute")
async def send_support(
    request: Request,
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


# ── Chat (поддержка: клиент ↔ менеджер) ────────────────────────────────────────

class ChatMessageIn(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


def _msg_out(m: SupportMessage) -> dict:
    return {
        "id": m.id,
        "sender_role": m.sender_role,
        "body": m.body,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "attachment": (
            {"name": m.attachment_name, "mime": m.attachment_mime}
            if m.attachment_mime else None
        ),
    }


async def _get_or_create_conversation(user_id: int, session: AsyncSession) -> SupportConversation:
    conv = (await session.execute(
        select(SupportConversation).where(SupportConversation.user_id == user_id)
    )).scalar_one_or_none()
    if not conv:
        conv = SupportConversation(user_id=user_id)
        session.add(conv)
        await session.commit()
        await session.refresh(conv)
    return conv


@router.get("/chat")
async def get_chat(current_user: User = Depends(require_client), session: AsyncSession = Depends(get_db)):
    conv = await _get_or_create_conversation(current_user.id, session)
    msgs = (await session.execute(
        select(SupportMessage)
        .where(SupportMessage.conversation_id == conv.id)
        .order_by(SupportMessage.created_at)
    )).scalars().all()
    if conv.client_unread:
        conv.client_unread = 0
        await session.commit()
    return {"conversation_id": conv.id, "messages": [_msg_out(m) for m in msgs]}


@router.get("/chat/unread")
async def get_chat_unread(current_user: User = Depends(require_client), session: AsyncSession = Depends(get_db)):
    conv = (await session.execute(
        select(SupportConversation).where(SupportConversation.user_id == current_user.id)
    )).scalar_one_or_none()
    return {"unread": conv.client_unread if conv else 0}


@router.post("/chat")
@limiter.limit("30/minute")
async def post_chat(
    request: Request,
    body: ChatMessageIn,
    current_user: User = Depends(require_client),
    session: AsyncSession = Depends(get_db),
):
    conv = await _get_or_create_conversation(current_user.id, session)
    was_quiet = (conv.manager_unread or 0) == 0
    msg = SupportMessage(conversation_id=conv.id, sender_role="client", body=body.body)
    session.add(msg)
    conv.manager_unread = (conv.manager_unread or 0) + 1
    conv.updated_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(msg)

    # Email менеджеру только на «новую» активность (не на каждое сообщение) — в
    # интерфейсе и так есть живой бейдж непрочитанного.
    if was_quiet:
        try:
            await notify_managers_support(
                client_name=current_user.full_name or current_user.email or "Клиент",
                client_phone=current_user.phone or "—",
                message=body.body,
            )
        except Exception:
            pass

    return _msg_out(msg)


@router.post("/chat/upload")
@limiter.limit("15/minute")
async def upload_chat_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(require_client),
    session: AsyncSession = Depends(get_db),
):
    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    try:
        data, mime = await asyncio.to_thread(process_image, raw)
    except AttachmentError as e:
        raise HTTPException(status_code=400, detail=str(e))

    conv = await _get_or_create_conversation(current_user.id, session)
    was_quiet = (conv.manager_unread or 0) == 0
    msg = SupportMessage(
        conversation_id=conv.id,
        sender_role="client",
        body="",
        attachment_mime=mime,
        attachment_name=safe_filename(file.filename),
        attachment_data=data,
    )
    session.add(msg)
    conv.manager_unread = (conv.manager_unread or 0) + 1
    conv.updated_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(msg)

    if was_quiet:
        try:
            await notify_managers_support(
                client_name=current_user.full_name or current_user.email or "Клиент",
                client_phone=current_user.phone or "—",
                message="[Изображение]",
            )
        except Exception:
            pass

    return _msg_out(msg)


@router.get("/chat/attachment/{message_id:int}")
async def get_chat_attachment(
    message_id: int,
    current_user: User = Depends(require_client),
    session: AsyncSession = Depends(get_db),
):
    # Только вложение из СВОЕГО диалога (join по user_id) — защита от IDOR.
    msg = (await session.execute(
        select(SupportMessage)
        .options(undefer(SupportMessage.attachment_data))
        .join(SupportConversation, SupportMessage.conversation_id == SupportConversation.id)
        .where(SupportMessage.id == message_id, SupportConversation.user_id == current_user.id)
    )).scalar_one_or_none()
    if not msg or not msg.attachment_data:
        raise HTTPException(status_code=404, detail="Вложение не найдено")
    return Response(
        content=msg.attachment_data,
        media_type=msg.attachment_mime or "application/octet-stream",
        headers={
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": content_disposition(msg.attachment_name),
            "Cache-Control": "private, max-age=3600",
        },
    )


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
