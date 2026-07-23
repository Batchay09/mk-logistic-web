"""Тесты логики оплаты ЮKassa: успех, отмена, сверка, клиентская отмена заказа.

Модель (как у большинства сервисов): непрошедшая оплата НЕ возвращает заказ
в корзину — он остаётся «Ожидает оплаты», клиент оплачивает заново или отменяет.
Ключевые свойства: succeeded идемпотентен, отменённый заказ не воскресает в PAID,
клиент не может отменить уже оплаченный заказ.
"""
from datetime import date
from decimal import Decimal
from types import SimpleNamespace

import httpx
import pytest
from app.api import client as client_api
from app.api import payments as pay
from app.api.payments import _mark_orders_paid
from app.core.dependencies import require_client
from app.db.models import Marketplace, Order, OrderStatus, PaymentMethod, User, UserRole
from fastapi import FastAPI, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


def _payment(status: str, amount: str = "1000.00"):
    """Имитация объекта платежа из SDK ЮKassa."""
    return SimpleNamespace(
        id="pay-1", status=status, paid=status == "succeeded",
        amount=SimpleNamespace(value=amount, currency="RUB"),
        cancellation_details=SimpleNamespace(reason="3d_secure_failed"),
    )


async def _seed(
    session: AsyncSession,
    status: OrderStatus = OrderStatus.AWAITING_PAYMENT,
    payment_id: str | None = "pay-1",
    count: int = 2,
    amount: int = 500,
) -> tuple[User, list[Order]]:
    user = User(
        email="client@test.ru", password_hash="x", role=UserRole.CLIENT,
        full_name="Тест Клиент", tg_id=None,
    )
    session.add(user)
    await session.flush()
    orders = [
        Order(
            user_id=user.id, destination_id=1, status=status,
            marketplace=Marketplace.WB, ship_date=date(2026, 8, 1),
            arrival_date=date(2026, 8, 4), boxes_count=3, total_amount=amount,
            yookassa_payment_id=payment_id, payment_method=PaymentMethod.CASHLESS,
        )
        for _ in range(count)
    ]
    session.add_all(orders)
    await session.flush()
    await session.commit()
    return user, orders


# ── _mark_orders_paid ───────────────────────────────────────────────────────

async def test_successful_payment_marks_paid(session):
    _, orders = await _seed(session, count=2, amount=500)
    paid = await _mark_orders_paid(session, orders, Decimal("1000.00"), "pay-1")
    assert paid == [o.id for o in orders]
    assert all(o.status == OrderStatus.PAID for o in orders)


async def test_mark_paid_idempotent(session):
    """Webhook приходит повторно — второй раз не пересчитываем."""
    _, orders = await _seed(session, count=2, amount=500)
    await _mark_orders_paid(session, orders, Decimal("1000.00"), "pay-1")
    assert await _mark_orders_paid(session, orders, Decimal("1000.00"), "pay-1") == []


async def test_underpayment_rejected(session):
    _, orders = await _seed(session, count=2, amount=500)  # ждём 1000
    with pytest.raises(HTTPException) as exc:
        await _mark_orders_paid(session, orders, Decimal("10.00"), "pay-1")
    assert exc.value.status_code == 400
    assert all(o.status == OrderStatus.AWAITING_PAYMENT for o in orders)


async def test_overpayment_accepted(session):
    """Переплата (например, комиссия сверху) оплате не мешает."""
    _, orders = await _seed(session, count=1, amount=500)
    assert await _mark_orders_paid(session, orders, Decimal("600.00"), "pay-1")
    assert orders[0].status == OrderStatus.PAID


async def test_canceled_order_not_resurrected(session):
    """Заказ отменён клиентом, а оплата всё же прошла — не воскрешаем в PAID."""
    _, orders = await _seed(session, status=OrderStatus.CANCELED, count=1, amount=500)
    paid = await _mark_orders_paid(session, orders, Decimal("500.00"), "pay-1")
    assert paid == []
    assert orders[0].status == OrderStatus.CANCELED


async def test_canceled_sibling_excluded_from_sum(session):
    """Группа из 2 заказов на 500 каждый; один отменён. Оплата 500 (за оставшийся)
    проходит проверку суммы (отменённый в неё не входит) и помечает живой PAID."""
    _, orders = await _seed(session, count=2, amount=500)
    orders[0].status = OrderStatus.CANCELED
    await session.flush()

    paid = await _mark_orders_paid(session, orders, Decimal("500.00"), "pay-1")
    assert paid == [orders[1].id]
    assert orders[0].status == OrderStatus.CANCELED
    assert orders[1].status == OrderStatus.PAID


# ── эндпоинты (ASGI) ─────────────────────────────────────────────────────────
# In-memory SQLite привязана к соединению, поэтому в get_db отдаём ТУ ЖЕ сессию
# фикстуры (иначе новый коннект увидит пустую БД). ASGI-вызов полностью
# дожидается перед возвратом — гонок с тестом нет.

def _app(user, session):
    app = FastAPI()
    from app.core.rate_limit import limiter
    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.include_router(pay.router)
    app.include_router(client_api.router)

    async def _db():
        yield session

    from app.db.session import get_db
    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[require_client] = lambda: user
    return app


async def _post(session, user, path):
    app = _app(user, session)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://t"
    ) as c:
        return await c.post(path)


@pytest.fixture
def yoo(monkeypatch):
    """Настраивает ЮKassa-заглушку и возвращает сеттер статуса платежа."""
    monkeypatch.setattr(pay.settings, "YOOKASSA_SHOP_ID", "shop", raising=False)
    monkeypatch.setattr(pay.settings, "YOOKASSA_SECRET_KEY", "secret", raising=False)
    holder = {"payment": None}

    class FakeApi:
        def find_one(self, pid):
            return holder["payment"]

    monkeypatch.setattr(pay, "_yoo_payment_api", lambda: FakeApi())
    return lambda p: holder.__setitem__("payment", p)


async def test_sync_success_marks_paid(session, yoo):
    user, orders = await _seed(session, count=1, amount=500)
    yoo(_payment("succeeded", "500.00"))

    r = await _post(session, user, "/payments/yookassa/sync?payment_id=pay-1")
    assert r.status_code == 200
    assert r.json()["status"] == "succeeded"
    await session.refresh(orders[0])
    assert orders[0].status == OrderStatus.PAID


async def test_sync_pending_leaves_order_awaiting(session, yoo):
    """Клиент вернулся не заплатив — заказ ждёт оплаты, НЕ в корзину."""
    user, orders = await _seed(session, count=1)
    yoo(_payment("pending"))

    r = await _post(session, user, "/payments/yookassa/sync?payment_id=pay-1")
    assert r.json()["status"] == "pending"
    await session.refresh(orders[0])
    assert orders[0].status == OrderStatus.AWAITING_PAYMENT  # не тронут


async def test_sync_canceled_leaves_order_awaiting(session, yoo):
    """Даже при отменённом платеже заказ остаётся ожидающим (не в корзине)."""
    user, orders = await _seed(session, count=1)
    yoo(_payment("canceled"))

    r = await _post(session, user, "/payments/yookassa/sync?payment_id=pay-1")
    assert r.json()["status"] == "canceled"
    await session.refresh(orders[0])
    assert orders[0].status == OrderStatus.AWAITING_PAYMENT


async def test_sync_foreign_payment_404(session, yoo):
    user, _ = await _seed(session, count=1)
    yoo(_payment("succeeded"))

    r = await _post(session, user, "/payments/yookassa/sync?payment_id=someone-else")
    assert r.status_code == 404


async def test_client_cancel_awaiting_order(session, yoo):
    user, orders = await _seed(session, count=1)
    yoo(_payment("pending"))  # платёж не прошёл — отмена разрешена

    r = await _post(session, user, f"/client/orders/{orders[0].id}/cancel")
    assert r.status_code == 204
    await session.refresh(orders[0])
    assert orders[0].status == OrderStatus.CANCELED


async def test_client_cannot_cancel_paid_order(session, yoo):
    """Клиент жмёт «отмена», но платёж уже прошёл — заказ помечается оплаченным."""
    user, orders = await _seed(session, count=1, amount=500)
    yoo(_payment("succeeded", "500.00"))

    r = await _post(session, user, f"/client/orders/{orders[0].id}/cancel")
    assert r.status_code == 409
    await session.refresh(orders[0])
    assert orders[0].status == OrderStatus.PAID


async def test_client_cannot_cancel_shipped_order(session, yoo):
    user, orders = await _seed(session, status=OrderStatus.IN_TRANSIT, count=1)

    r = await _post(session, user, f"/client/orders/{orders[0].id}/cancel")
    assert r.status_code == 400


async def test_cancel_cancels_whole_payment_group(session, yoo):
    """Корзина из 2 заказов = один платёж. Отмена одного отменяет всю группу —
    иначе оплата исходного платежа целиком прошла бы за оба, а выполнился бы один."""
    user, orders = await _seed(session, count=2, amount=500)  # общий pay-1
    yoo(_payment("pending"))

    r = await _post(session, user, f"/client/orders/{orders[0].id}/cancel")
    assert r.status_code == 204
    for o in orders:
        await session.refresh(o)
        assert o.status == OrderStatus.CANCELED
