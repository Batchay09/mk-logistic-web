"""Тесты таблицы заказов менеджера: _apply_grid_patch и bulk-логика.

Ключевые свойства: whitelist переходов статуса (до оплаты — нельзя),
двухфазная валидация (ошибка не оставляет частичных изменений),
очистка arrival_date через явный null, аудит каждой правки.
"""
from datetime import date

import pytest
from app.api.manager import OrderFieldsPatch, _apply_grid_patch
from app.db.models import Marketplace, Order, OrderStatus, PaymentMethod


def _order(status=OrderStatus.PAID, **kw) -> Order:
    defaults = dict(
        user_id=1,
        status=status,
        marketplace=Marketplace.WB,
        destination_id=1,
        company_name="ООО «Ромашка»",
        payment_method=PaymentMethod.CASHLESS,
        ship_date=date(2026, 7, 12),
        arrival_date=date(2026, 7, 14),
        boxes_count=22,
    )
    defaults.update(kw)
    return Order(**defaults)


def _patch(**fields) -> dict:
    """Имитация запроса: через Pydantic с exclude_unset, как в bulk-эндпоинте."""
    return OrderFieldsPatch(**fields).model_dump(exclude_unset=True)


def test_status_change_within_pipeline_ok():
    order = _order(OrderStatus.PAID)
    assert _apply_grid_patch(order, _patch(status="assigned")) is None
    assert order.status == OrderStatus.ASSIGNED


def test_status_backward_within_pipeline_ok():
    """Таблица позволяет откатить ошибочный статус назад (в отличие от /advance)."""
    order = _order(OrderStatus.IN_TRANSIT)
    assert _apply_grid_patch(order, _patch(status="assigned")) is None
    assert order.status == OrderStatus.ASSIGNED


def test_status_change_before_payment_rejected():
    """new/confirmed/awaiting_payment меняются только через «Проверку оплат»."""
    for st in (OrderStatus.NEW, OrderStatus.CONFIRMED, OrderStatus.AWAITING_PAYMENT):
        order = _order(st)
        error = _apply_grid_patch(order, _patch(status="paid"))
        assert error is not None
        assert order.status == st


def test_status_to_new_rejected():
    order = _order(OrderStatus.PAID)
    assert _apply_grid_patch(order, _patch(status="new")) is not None
    assert order.status == OrderStatus.PAID


def test_cancel_from_pipeline_ok():
    order = _order(OrderStatus.ASSIGNED)
    assert _apply_grid_patch(order, _patch(status="canceled")) is None
    assert order.status == OrderStatus.CANCELED


def test_invalid_status_value_rejected():
    order = _order()
    assert _apply_grid_patch(order, _patch(status="teleported")) is not None


def test_ship_date_cannot_be_cleared():
    order = _order()
    error = _apply_grid_patch(order, _patch(ship_date=None))
    assert error is not None
    assert order.ship_date == date(2026, 7, 12)


def test_arrival_date_cleared_by_explicit_null():
    order = _order()
    assert _apply_grid_patch(order, _patch(arrival_date=None)) is None
    assert order.arrival_date is None


def test_unsent_fields_untouched():
    """exclude_unset: не присланные поля не трогаем (отличие от null)."""
    order = _order()
    assert _apply_grid_patch(order, _patch(manager_note="позвонить")) is None
    assert order.arrival_date == date(2026, 7, 14)
    assert order.manager_note == "позвонить"


def test_error_leaves_no_partial_changes():
    """Двухфазность: валидный статус + невалидная дата → НИЧЕГО не применено."""
    order = _order(OrderStatus.PAID)
    error = _apply_grid_patch(order, _patch(status="assigned", ship_date=None))
    assert error is not None
    assert order.status == OrderStatus.PAID


def test_payment_method_change_ok():
    order = _order()
    assert _apply_grid_patch(order, _patch(payment_method="cash")) is None
    assert order.payment_method == PaymentMethod.CASH


@pytest.mark.parametrize("value", [None, "crypto"])
def test_payment_method_invalid_rejected(value):
    order = _order()
    assert _apply_grid_patch(order, _patch(payment_method=value)) is not None
    assert order.payment_method == PaymentMethod.CASHLESS
