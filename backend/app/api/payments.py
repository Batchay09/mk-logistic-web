"""ЮKassa интеграция — создание платежа и обработка webhook"""
import ipaddress
import json
import logging
import uuid
from decimal import Decimal, InvalidOperation
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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])

# Официальные подсети, с которых ЮKassa отправляет webhook-уведомления.
# https://yookassa.ru/developers/using-api/webhooks#ip
_YOOKASSA_NETWORKS = [
    ipaddress.ip_network(cidr)
    for cidr in (
        "185.71.76.0/27",
        "185.71.77.0/27",
        "77.75.153.0/25",
        "77.75.156.11/32",
        "77.75.156.35/32",
        "77.75.154.128/25",
        "2a02:5180::/32",
    )
]


class YooKassaCreateRequest(BaseModel):
    order_ids: List[int]
    return_url: str


def _client_ip(request: Request) -> str:
    """Реальный IP отправителя с учётом reverse-proxy (nginx X-Forwarded-For)."""
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else ""


def _is_yookassa_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return any(addr in net for net in _YOOKASSA_NETWORKS)


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
    total = Decimal("0")
    for oid in body.order_ids:
        order = (await session.execute(
            select(Order).where(Order.id == oid, Order.user_id == current_user.id)
        )).scalar_one_or_none()
        if not order or order.status not in (OrderStatus.AWAITING_PAYMENT, OrderStatus.NEW):
            raise HTTPException(status_code=400, detail=f"Заказ #{oid} недоступен для оплаты")
        orders.append(order)
        total += order.total_amount

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
            "total": float(total),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ошибка создания платежа ЮKassa: %s", e)
        raise HTTPException(status_code=502, detail="Не удалось создать платёж")


@router.post("/yookassa/webhook")
async def yookassa_webhook(request: Request, session: AsyncSession = Depends(get_db)):
    """Обрабатывает уведомления ЮKassa о платежах.

    Безопасность: тело запроса НЕ является доверенным источником. Из него берём
    только идентификатор платежа, после чего запрашиваем настоящий объект платежа
    через YooKassa API (по нашему secret_key) и сверяем статус и сумму. Подделать
    'payment.succeeded' невозможно — авторитетные данные приходят напрямую от ЮKassa,
    а не из тела webhook.
    """
    if not settings.YOOKASSA_SHOP_ID or not settings.YOOKASSA_SECRET_KEY:
        raise HTTPException(status_code=503, detail="ЮKassa не настроена")

    # Мягкий рубеж: логируем запросы с неожиданных IP.
    # Основную защиту даёт сверка через API ниже, поэтому жёстко не блокируем
    # (IP можно спутать при смене инфраструктуры ЮKassa).
    ip = _client_ip(request)
    if not _is_yookassa_ip(ip):
        logger.warning("YooKassa webhook с неожиданного IP: %s", ip)

    try:
        event = json.loads(await request.body())
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    if event.get("event") != "payment.succeeded":
        return {"ok": True}  # прочие события игнорируем

    payment_id = (event.get("object") or {}).get("id")
    if not payment_id:
        return {"ok": True}

    # Авторитетная проверка: запрашиваем настоящий платёж у ЮKassa по его id.
    try:
        from yookassa import Configuration, Payment as YooPayment  # type: ignore
        Configuration.account_id = settings.YOOKASSA_SHOP_ID
        Configuration.secret_key = settings.YOOKASSA_SECRET_KEY
        payment = YooPayment.find_one(str(payment_id))
    except Exception as e:
        logger.error("Не удалось проверить платёж %s в ЮKassa: %s", payment_id, e)
        raise HTTPException(status_code=502, detail="Не удалось проверить платёж")

    if not payment or payment.status != "succeeded" or not getattr(payment, "paid", False):
        logger.warning("Платёж %s не подтверждён ЮKassa (status=%s)",
                       payment_id, getattr(payment, "status", None))
        return {"ok": True}

    # Заказы ищем в НАШЕЙ БД по payment_id, а не по metadata из тела webhook.
    orders = list((await session.execute(
        select(Order)
        .options(selectinload(Order.user), selectinload(Order.destination))
        .where(Order.yookassa_payment_id == str(payment_id))
    )).scalars().all())

    if not orders:
        logger.warning("Webhook для неизвестного payment_id: %s", payment_id)
        return {"ok": True}

    # Сверяем сумму: реально оплаченное не меньше суммы заказов.
    expected_total = sum((o.total_amount for o in orders), Decimal("0"))
    try:
        paid_amount = Decimal(str(payment.amount.value))
    except (InvalidOperation, AttributeError, TypeError):
        paid_amount = Decimal("0")

    if paid_amount < expected_total:
        logger.error(
            "Сумма платежа %s (%s ₽) меньше суммы заказов (%s ₽) — PAID не проставляем",
            payment_id, paid_amount, expected_total,
        )
        raise HTTPException(status_code=400, detail="Сумма платежа не совпадает с заказом")

    for order in orders:
        if order.status == OrderStatus.PAID:  # идемпотентность
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
