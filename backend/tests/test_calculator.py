"""Тесты CalculatorService.calculate_price — фокус на логике подсчёта паллет.

Регрессия, которую ловим: раньше использовался math.ceil → 20 коробок давали 2 паллета.
Теперь — целочисленное деление по 11 (полные паллеты): 11→1, 20→1, 22→2, 33→3.
"""
import pytest
from app.services.calculator import (
    BOXES_PER_PALLET,
    PALLETIZING_PRICE,
    CalculatorService,
)


async def _calc(session, boxes, *, pickup=False):
    return await CalculatorService.calculate_price(
        session,
        destination_id=1,
        boxes=boxes,
        service_pickup=pickup,
    )


@pytest.mark.parametrize(
    "boxes, expected_pallets",
    [
        (0, 0),
        (5, 0),
        (10, 0),   # граница снизу: ещё не полный паллет
        (11, 1),   # ровно один полный паллет
        (20, 1),   # ключевой кейс регрессии: НЕ 2
        (21, 1),
        (22, 2),
        (32, 2),
        (33, 3),
    ],
)
async def test_pallets_count_uses_floor(session, boxes, expected_pallets):
    result = await _calc(session, boxes)
    assert result["pallets_count"] == expected_pallets


async def test_pallet_mode_from_full_pallet(session):
    """Паллетный режим включается только от полной паллеты (11+ коробок)."""
    for boxes in (1, 5, 10):
        result = await _calc(session, boxes)
        assert result["is_pallet_mode"] is False
    for boxes in (11, 50):
        result = await _calc(session, boxes)
        assert result["is_pallet_mode"] is True


async def test_palletizing_always_charged_per_full_pallet(session):
    """Паллетизация всегда включена: число полных паллет × цена за паллету."""
    result = await _calc(session, 22)
    assert result["price_palletizing"] == 2 * PALLETIZING_PRICE

    # 20 коробок → 1 полный паллет → одна цена паллетизации (а не две)
    result = await _calc(session, 20)
    assert result["price_palletizing"] == 1 * PALLETIZING_PRICE


async def test_palletizing_zero_below_full_pallet(session):
    """До 11 коробок паллет нет — доплаты за паллетизацию нет."""
    result = await _calc(session, 10)
    assert result["price_palletizing"] == 0


async def test_delivery_charged_per_box_with_tier_pricing(session):
    """Доставка считается по коробкам с учётом тарифной ступени, независимо от паллет."""
    # 10 коробок < 20 → ступень 150₽
    result = await _calc(session, 10)
    assert result["unit_price"] == 150
    assert result["price_delivery"] == 10 * 150

    # 25 коробок >= 20 → ступень 100₽
    result = await _calc(session, 25)
    assert result["unit_price"] == 100
    assert result["price_delivery"] == 25 * 100


async def test_boxes_per_pallet_constant_is_11():
    assert BOXES_PER_PALLET == 11
