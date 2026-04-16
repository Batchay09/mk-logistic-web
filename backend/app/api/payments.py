"""ЮKassa интеграция — создание платежа и обработка webhook"""
import hashlib
import hmac
import json
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.dependencies import require_client
from app.db.models import Order, OrderStatus, User
from app.db.session import get_db
from app.services.email import notify_client_payment_confirmed
from app.services.sticker import StickerService

router = APIRouter(prefix="/payments", tags=["payments"])


class YooKassaCreateRequest(BaseModel):
    order_ids: List[int]
    return_url: str


@router.post("/yookassa/create")
async def create_yookassa_payment(
    body: YooKassaCreateRequest,
    current_user: User = Depends(require_client),
    session: AsyncSession = Depends(get_db),
):
    if not settings.YOOKASSA_SHOP_ID or not settings.YOOKASSA_SECRET_KEY:
        raise HTTPException(status_code=503, detail="ЮKassa не настроена")

    # Load orders
    orders = []
    total = 0.0
    for oid in body.order_ids:
        order = (await session.execute(
            select(Order).where(Order.id == oid, Order.user_id == current_user.id)
        )).scalar_one_or_none()
        if not order or order.status not in (OrderStatus.AWAITING_PAYMENT, OrderStatus.NEW):
            raise HTTPException(status_code=400, detail=f"Заказ #{oid} недоступен для оплаты")
        orders.append(order)
        total += float(order.total_amount)

    # Create payment via YooKassa SDK
    try:
        from yookassa import Configuration, Payment as YooPayment  # type: ignore
        Configuration.account_id = settings.YOOKASSA_SHOP_ID
        Configuration.secret_key = settings.YOOKASSA_SECRET_KEY

        idempotency_key = str(uuid.uuid4())
        order_ids_str = ", ".join(f"#{o.id}" for o in orders)

        payment = YooPayment.create({
            "amount": {"value": f"{total:.2f}", "currency": "RUB"},
            "confirmation": {"type": "redirect", "return_url": body.return_url},
            "capture": True,
            "description": f"МК Логистик — заказы {order_ids_str}",
            "metadata": {"order_ids": ",".join(str(o.id) for o in orders)},
        }, idempotency_key)

        # Store yookassa_payment_id for webhook matching
        yookassa_id = payment.id
        for order in orders:
            order.yookassa_payment_id = yookassa_id
            order.status = OrderStatus.AWAITING_PAYMENT

        await session.commit()

        return {
            "payment_id": yookassa_id,
            "confirmation_url": payment.confirmation.confirmation_url,
            "total": total,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка создания платежа: {e}")


@router.post("/yookassa/webhook")
async def yookassa_webhook(request: Request, session: AsyncSession = Depends(get_db)):
    """Handles YooKassa payment.succeeded events."""
    body = await request.body()

    # Verify webhook signature if secret is set
    if settings.YOOKASSA_WEBHOOK_SECRET:
        signature = request.headers.get("Yookassa-Signature", "")
        expected = hmac.new(
            settings.YOOKASSA_WEBHOOK_SECRET.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        event = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    if event.get("event") != "payment.succeeded":
        return {"ok": True}  # ignore other events

    payment_obj = event.get("object", {})
    metadata = payment_obj.get("metadata", {})
    order_ids_str = metadata.get("order_ids", "")

    if not order_ids_str:
        return {"ok": True}

    order_ids = [int(x) for x in order_ids_str.split(",") if x.strip().isdigit()]

    for oid in order_ids:
        order = (await session.execute(
            select(Order)
            .options(selectinload(Order.user), selectinload(Order.destination))
            .where(Order.id == oid)
        )).scalar_one_or_none()

        if not order or order.status == OrderStatus.PAID:
            continue

        order.status = OrderStatus.PAID

        # Send stickers to client
        pdf_bytes = None
        try:
            pdf_bytes = StickerService.generate_stickers(
                order, order.payment_method.value if order.payment_method else ""
            )
        except Exception:
            pass

        if order.user and order.user.email:
            try:
                await notify_client_payment_confirmed(order.user.email, order.id, pdf_bytes)
            except Exception:
                pass

    await session.commit()
    return {"ok": True}
