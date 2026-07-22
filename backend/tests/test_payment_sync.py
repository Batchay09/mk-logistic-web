"""Тесты сверки платежей ЮKassa: отмена, успех, идемпотентность, гонки.

Ключевые свойства: отменённый платёж возвращает заказ в корзину (иначе он
навсегда виснет в AWAITING_PAYMENT), успех идемпотентен (webhook приходит
повторно), запоздавшая отмена прошлой попытки не ломает начатую новую,
недоплата не переводит заказ в PAID.
"""
from datetime import date
from types import SimpleNamespace

import pytest
from app.api.payments import _mark_orders_paid, _release_orders
from app.db.models import Marketplace, Order, OrderStatus, PaymentMethod, User, UserRole
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession


def _payment(status: str, amount: str = "1000.00"):
    """Имитация объекта платежа из SDK ЮKassa."""
    return SimpleNamespace(
        id="pay-1",
        status=status,
        paid=status == "succeeded",
        amount=SimpleNamespace(value=amount, currency="RUB"),
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
    return user, orders


# --- Отмена платежа ---------------------------------------------------------

async def test_canceled_payment_returns_orders_to_cart(session):
    """Главный сценарий: клиент бросил оплату — заказ снова в корзине."""
    _, orders = await _seed(session)

    released = await _release_orders(session, orders, "pay-1")

    assert released == [o.id for o in orders]
    assert all(o.status == OrderStatus.NEW for o in orders)
    assert all(o.payment_method is None for o in orders)


async def test_release_keeps_payment_id_for_result_page(session):
    """payment_id не обнуляем: по нему страница результата узнаёт судьбу платежа."""
    _, orders = await _seed(session)

    await _release_orders(session, orders, "pay-1")

    assert all(o.yookassa_payment_id == "pay-1" for o in orders)


async def test_release_is_idempotent(session):
    """Повторное «отменён» по тому же платежу ничего не меняет."""
    _, orders = await _seed(session)
    await _release_orders(session, orders, "pay-1")

    assert await _release_orders(session, orders, "pay-1") == []
    assert all(o.status == OrderStatus.NEW for o in orders)


async def test_release_ignores_paid_orders(session):
    """Оплаченный заказ нельзя вернуть в корзину — иначе обход статусов."""
    _, orders = await _seed(session, status=OrderStatus.PAID)

    assert await _release_orders(session, orders, "pay-1") == []
    assert all(o.status == OrderStatus.PAID for o in orders)


async def test_stale_cancel_does_not_break_new_attempt(session):
    """Клиент бросил платёж X и начал заново (Y); «отменён X» приходит позже.

    Откатывать заказ нельзя — он уже ждёт оплату Y.
    """
    _, orders = await _seed(session, payment_id="pay-Y")

    released = await _release_orders(session, orders, "pay-X")

    assert released == []
    assert all(o.status == OrderStatus.AWAITING_PAYMENT for o in orders)
    assert all(o.yookassa_payment_id == "pay-Y" for o in orders)


async def test_orphan_order_without_payment_released(session):
    """Заказ завис в ожидании, но платежа нет — возвращаем в корзину."""
    _, orders = await _seed(session, payment_id=None, count=1)

    assert await _release_orders(session, orders) == [orders[0].id]
    assert orders[0].status == OrderStatus.NEW


# --- Успешная оплата --------------------------------------------------------

async def test_successful_payment_marks_paid(session):
    _, orders = await _seed(session, count=2, amount=500)

    paid = await _mark_orders_paid(session, orders, _decimal("1000.00"), "pay-1")

    assert paid == [o.id for o in orders]
    assert all(o.status == OrderStatus.PAID for o in orders)


async def test_mark_paid_is_idempotent(session):
    """Webhook от ЮKassa может прийти повторно — второй раз не пересчитываем."""
    _, orders = await _seed(session, count=2, amount=500)
    await _mark_orders_paid(session, orders, _decimal("1000.00"), "pay-1")

    assert await _mark_orders_paid(session, orders, _decimal("1000.00"), "pay-1") == []
    assert all(o.status == OrderStatus.PAID for o in orders)


async def test_underpayment_rejected(session):
    """Оплатили меньше суммы заказов — PAID не проставляем."""
    _, orders = await _seed(session, count=2, amount=500)  # ждём 1000

    with pytest.raises(HTTPException) as exc:
        await _mark_orders_paid(session, orders, _decimal("10.00"), "pay-1")

    assert exc.value.status_code == 400
    assert all(o.status == OrderStatus.AWAITING_PAYMENT for o in orders)


async def test_overpayment_accepted(session):
    """Переплата (например, комиссия сверху) оплате не мешает."""
    _, orders = await _seed(session, count=1, amount=500)

    assert await _mark_orders_paid(session, orders, _decimal("600.00"), "pay-1")
    assert orders[0].status == OrderStatus.PAID


def _decimal(value: str):
    from decimal import Decimal

    return Decimal(value)
