"""ЮKassa интеграция — создание платежа и обработка webhook"""
import asyncio
import ipaddress
import json
import logging
import uuid
from decimal import Decimal, InvalidOperation
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.dependencies import require_client
from app.core.rate_limit import limiter
from app.db.models import Order, OrderStatus, PaymentMethod, User
from app.db.session import get_db
from app.services.email import notify_client_payment_confirmed, notify_managers_new_order
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
    order_ids: List[int] = Field(min_length=1, max_length=50)
    # Относительный путь возврата после оплаты; полный URL строим сами от APP_URL,
    # чтобы платёж нельзя было создать с редиректом на чужой сайт.
    return_path: str = Field(min_length=1, max_length=200)


class PaymentSyncResponse(BaseModel):
    """Итог сверки платежа с ЮKassa для страницы результата."""

    status: Literal["succeeded", "canceled", "pending", "none"]
    order_ids: List[int] = []
    paid_order_ids: List[int] = []


# Сколько ждём ответа ЮKassa, прежде чем сдаться (её SDK своего таймаута не ставит).
YOOKASSA_TIMEOUT_SEC = 10

# Сколько платежей максимум сверяем за один вызов /sync: цикл ходит во внешний
# API по одному запросу на платёж, и без потолка клиент с длинным хвостом
# незавершённых оплат занял бы воркер надолго (и упёрся бы в лимиты ЮKassa).
# Остаток разберётся при следующем заходе в корзину.
SYNC_BATCH_LIMIT = 20
SYNC_ORDERS_LIMIT = 200


def _yoo_payment_api():
    """Настраивает SDK ЮKassa и отдаёт класс Payment."""
    from yookassa import Configuration, Payment as YooPayment  # type: ignore

    Configuration.account_id = settings.YOOKASSA_SHOP_ID
    Configuration.secret_key = settings.YOOKASSA_SECRET_KEY
    return YooPayment


async def _call_yookassa(fn, *args):
    """Вызывает синхронный метод SDK, не блокируя event loop.

    SDK ЮKassa построен на requests и не передаёт timeout в запрос, поэтому
    прямой вызов из async-обработчика подвешивает весь воркер (в проде их два)
    до ответа ЮKassa — то есть потенциально навсегда. Уносим вызов в поток
    и ограничиваем ожидание.
    """
    return await asyncio.wait_for(asyncio.to_thread(fn, *args), timeout=YOOKASSA_TIMEOUT_SEC)


async def _fetch_payment(payment_id: str):
    """Авторитетные данные о платеже — из API ЮKassa, а не из тела запроса."""
    return await _call_yookassa(_yoo_payment_api().find_one, str(payment_id))


def _client_ip(request: Request) -> str:
    """Реальный IP отправителя с учётом reverse-proxy.

    X-Real-IP nginx ставит безусловно ($remote_addr) — подделать нельзя.
    X-Forwarded-For клиент может подделать (nginx дописывает реальный IP в конец),
    поэтому берём последний элемент.
    """
    real_ip = request.headers.get("x-real-ip", "")
    if real_ip:
        return real_ip.strip()
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else ""


def _is_yookassa_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return any(addr in net for net in _YOOKASSA_NETWORKS)


@router.post("/yookassa/create")
@limiter.limit("10/minute")
async def create_yookassa_payment(
    request: Request,
    body: YooKassaCreateRequest,
    current_user: User = Depends(require_client),
    session: AsyncSession = Depends(get_db),
):
    if not settings.YOOKASSA_SHOP_ID or not settings.YOOKASSA_SECRET_KEY:
        raise HTTPException(status_code=503, detail="ЮKassa не настроена")

    # "//host" и "/\host" браузеры трактуют как протокол-относительный URL —
    # пропускаем только настоящие внутренние пути.
    if not body.return_path.startswith("/") or body.return_path[1:2] in ("/", "\\"):
        raise HTTPException(status_code=400, detail="Некорректный путь возврата")
    return_url = f"{settings.APP_URL.rstrip('/')}{body.return_path}"

    # Load orders (дубликаты id отбрасываем — иначе сумма платежа задвоится)
    orders = []
    total = Decimal("0")
    for oid in dict.fromkeys(body.order_ids):
        order = (await session.execute(
            select(Order).where(Order.id == oid, Order.user_id == current_user.id)
        )).scalar_one_or_none()
        if not order or order.status not in (OrderStatus.AWAITING_PAYMENT, OrderStatus.NEW):
            raise HTTPException(status_code=400, detail=f"Заказ #{oid} недоступен для оплаты")
        orders.append(order)
        total += order.total_amount

    # Create payment via YooKassa SDK
    try:
        idempotency_key = str(uuid.uuid4())
        order_ids_str = ", ".join(f"#{o.id}" for o in orders)

        payment = await _call_yookassa(_yoo_payment_api().create, {
            "amount": {"value": f"{total:.2f}", "currency": "RUB"},
            "confirmation": {"type": "redirect", "return_url": return_url},
            "capture": True,
            "description": f"МК Логистик — заказы {order_ids_str}",
            "metadata": {"order_ids": ",".join(str(o.id) for o in orders)},
        }, idempotency_key)

        # Store yookassa_payment_id for webhook matching
        yookassa_id = payment.id
        for order in orders:
            order.yookassa_payment_id = yookassa_id
            order.payment_method = PaymentMethod.CASHLESS
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


async def _orders_by_payment(session: AsyncSession, payment_id: str) -> List[Order]:
    """Заказы, относящиеся к платежу (с подгрузкой связей для стикеров и писем).

    Строки берём под блокировку: webhook и сверка со страницы результата могут
    прийтись на один платёж одновременно — без неё оба увидят «ещё не оплачен»
    и клиент получит два письма со стикерами. Порядок по id — единый во всех
    местах, где заказы блокируются, иначе встречные запросы поймают дедлок.
    """
    return list((await session.execute(
        select(Order)
        .options(selectinload(Order.user), selectinload(Order.destination))
        .where(Order.yookassa_payment_id == str(payment_id))
        .order_by(Order.id)
        .with_for_update(of=Order)
    )).scalars().all())


async def _mark_orders_paid(
    session: AsyncSession, orders: List[Order], paid_amount: Decimal, payment_id: str
) -> List[int]:
    """Переводит заказы в PAID, шлёт стикеры клиенту и уведомляет менеджеров.

    Идемпотентно: заказы, уже помеченные PAID, пропускаются — webhook от ЮKassa
    может прийти повторно, и то же самое делает сверка при возврате с оплаты.
    Помечаем оплаченными только заказы в AWAITING_PAYMENT: если клиент успел
    отменить заказ, а оплата всё же прошла, не воскрешаем его молча — логируем
    для ручной проверки (возможен возврат). Ничего не коммитит — коммит выше.
    """
    # Заказы, которые вообще нельзя помечать оплаченными (отменён/уже в работе).
    # Их сумму НЕ включаем в сверку: иначе полная оплата группы прошла бы проверку,
    # а по факту оплатился лишь остаток — деньги за отменённый заказ повисли бы.
    for order in orders:
        if order.status not in (OrderStatus.AWAITING_PAYMENT, OrderStatus.PAID):
            logger.warning(
                "Платёж %s прошёл по заказу #%s в статусе %s — не помечаем PAID, "
                "нужна ручная проверка (возможен возврат)",
                payment_id, order.id, order.status.value,
            )

    to_mark = [o for o in orders if o.status == OrderStatus.AWAITING_PAYMENT]
    if not to_mark:
        return []  # всё уже оплачено или отменено — делать нечего

    expected_total = sum((o.total_amount for o in to_mark), Decimal("0"))
    if paid_amount < expected_total:
        logger.error(
            "Сумма платежа %s (%s ₽) меньше суммы заказов (%s ₽) — PAID не проставляем",
            payment_id, paid_amount, expected_total,
        )
        raise HTTPException(status_code=400, detail="Сумма платежа не совпадает с заказом")

    newly_paid_ids: List[int] = []
    for order in to_mark:
        order.status = OrderStatus.PAID
        newly_paid_ids.append(order.id)

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

    # Уведомляем менеджеров только при первом переходе в PAID.
    if newly_paid_ids:
        try:
            first_user = orders[0].user
            client_name = (
                (first_user.full_name or first_user.email) if first_user else None
            ) or "Клиент"
            pickup_info = (
                "Требуется забор"
                if any(o.service_pickup and o.pickup_address_id for o in orders)
                else ""
            )
            await notify_managers_new_order(
                newly_paid_ids, client_name, float(expected_total), pickup_info
            )
        except Exception:
            logger.warning("Не удалось уведомить менеджеров об оплате заказов %s", newly_paid_ids)

    return newly_paid_ids


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

    # Успех обрабатываем; отмену только логируем — заказ остаётся «Ожидает оплаты»
    # (клиент может оплатить заново или отменить сам). Прочее игнорируем.
    if event.get("event") not in ("payment.succeeded", "payment.canceled"):
        return {"ok": True}

    payment_id = (event.get("object") or {}).get("id")
    if not payment_id:
        return {"ok": True}

    # Авторитетная проверка: запрашиваем настоящий платёж у ЮKassa по его id.
    try:
        payment = await _fetch_payment(str(payment_id))
    except Exception as e:
        logger.error("Не удалось проверить платёж %s в ЮKassa: %s", payment_id, e)
        # 502 — ЮKassa повторит уведомление позже.
        raise HTTPException(status_code=502, detail="Не удалось проверить платёж")

    if not payment:
        logger.warning("Платёж %s не найден в ЮKassa", payment_id)
        return {"ok": True}

    if payment.status == "canceled":
        reason = getattr(getattr(payment, "cancellation_details", None), "reason", None)
        logger.info("Платёж %s отменён (%s) — заказ ждёт новой оплаты",
                    payment_id, reason or "без причины")
        return {"ok": True}

    if payment.status != "succeeded" or not getattr(payment, "paid", False):
        logger.warning("Платёж %s не подтверждён ЮKassa (status=%s)",
                       payment_id, getattr(payment, "status", None))
        return {"ok": True}

    # Заказы ищем в НАШЕЙ БД по payment_id, а не по metadata из тела webhook.
    orders = await _orders_by_payment(session, str(payment_id))
    if not orders:
        logger.warning("Webhook для неизвестного payment_id: %s", payment_id)
        return {"ok": True}

    # Сверяем сумму: реально оплаченное не меньше суммы заказов.
    try:
        paid_amount = Decimal(str(payment.amount.value))
    except (InvalidOperation, AttributeError, TypeError):
        paid_amount = Decimal("0")

    await _mark_orders_paid(session, orders, paid_amount, str(payment_id))
    await session.commit()
    return {"ok": True}


@router.post("/yookassa/sync", response_model=PaymentSyncResponse)
@limiter.limit("30/minute")
async def sync_yookassa_payments(
    request: Request,
    payment_id: Optional[str] = Query(default=None, max_length=64),
    current_user: User = Depends(require_client),
    session: AsyncSession = Depends(get_db),
):
    """Узнаёт настоящий статус платежа у ЮKassa и ловит опоздавший «succeeded».

    Возврат на return_url оплату НЕ доказывает, а webhook об успехе может чуть
    отстать от редиректа. Поэтому страница результата спрашивает статус здесь.

    Статус заказа сверка НЕ откатывает: непрошедший платёж оставляет заказ
    «Ожидает оплаты» (клиент оплатит заново или отменит сам). Единственное
    изменение состояния — succeeded → PAID, если webhook ещё не успел.

    Обычно вызывается с payment_id только что оформленного платежа. Без него
    (например, потерян sessionStorage) проверяем ожидающие заказы клиента —
    тоже лишь чтобы поймать успех.
    """
    if not settings.YOOKASSA_SHOP_ID or not settings.YOOKASSA_SECRET_KEY:
        raise HTTPException(status_code=503, detail="ЮKassa не настроена")

    if payment_id:
        # Блокировка строк: сверка может столкнуться с webhook по тому же платежу.
        orders = await _orders_by_payment(session, payment_id)
        orders = [o for o in orders if o.user_id == current_user.id]
        if not orders:
            raise HTTPException(status_code=404, detail="Платёж не найден")
        by_payment = {payment_id: orders}
    else:
        pending = list((await session.execute(
            select(Order)
            .options(selectinload(Order.user), selectinload(Order.destination))
            .where(
                Order.user_id == current_user.id,
                Order.status == OrderStatus.AWAITING_PAYMENT,
                Order.yookassa_payment_id.is_not(None),
            )
            .order_by(Order.id)
            .limit(SYNC_ORDERS_LIMIT)
            .with_for_update(of=Order)
        )).scalars().all())
        by_payment = {}
        for order in pending:
            by_payment.setdefault(order.yookassa_payment_id, []).append(order)

    paid_ids: List[int] = []
    seen_statuses: set[str] = set()

    # Необработанный из-за лимита остаток считаем «ещё висит» — иначе агрегатный
    # статус мог бы ошибочно стать canceled по одним лишь первым платежам.
    if len(by_payment) > SYNC_BATCH_LIMIT:
        seen_statuses.add("pending")

    for pid in list(by_payment)[:SYNC_BATCH_LIMIT]:
        orders = by_payment[pid]
        try:
            payment = await _fetch_payment(pid)
        except Exception as e:
            # Недоступность ЮKassa не должна ронять страницу — оставляем как есть.
            logger.warning("Сверка платежа %s не удалась: %s", pid, e)
            seen_statuses.add("pending")
            continue

        if not payment:
            seen_statuses.add("pending")
            continue

        seen_statuses.add(payment.status)
        if payment.status == "succeeded" and getattr(payment, "paid", False):
            try:
                paid_amount = Decimal(str(payment.amount.value))
            except (InvalidOperation, AttributeError, TypeError):
                paid_amount = Decimal("0")
            try:
                paid_ids += await _mark_orders_paid(session, orders, paid_amount, pid)
            except HTTPException:
                # Недоплата: заказ оставляем менеджеру, статус не трогаем.
                logger.error("Сверка: сумма платежа %s не совпала с заказами", pid)

    await session.commit()

    # Статус для страницы результата. Оплата приоритетна; иначе платёж ещё висит
    # (клиент не заплатил или банк не подтвердил) — для UX это одно «не завершено».
    order_ids = sorted({o.id for orders in by_payment.values() for o in orders})
    if paid_ids or seen_statuses == {"succeeded"}:
        status = "succeeded"
    elif not by_payment:
        status = "none"
    elif "canceled" in seen_statuses and "pending" not in seen_statuses:
        status = "canceled"
    else:
        status = "pending"

    return PaymentSyncResponse(status=status, order_ids=order_ids, paid_order_ids=paid_ids)
