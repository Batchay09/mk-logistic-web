"""Тесты подписи способа оплаты на стикере.

Ключевое свойство: человек на бумаге видит «Наличные»/«Безнал», а в QR-код
уходит сырое значение enum — это машинный контракт со сканером и Excel-выгрузкой.
"""
from datetime import date
from types import SimpleNamespace

from app.services.sticker import StickerService, _generate_qr_data, _payment_label
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics

STICKER_WIDTH = 58 * mm
MAX_TEXT_WIDTH = STICKER_WIDTH - 4 * mm


def _order(boxes: int = 3):
    user = SimpleNamespace(tg_id=None, id=42, company_name="ООО Ромашка", full_name="Иванов И.И.")
    return SimpleNamespace(
        id=1001, user=user, company_name="ООО Ромашка",
        destination=SimpleNamespace(name="Коледино"),
        marketplace=SimpleNamespace(value="wb"),
        ship_date=date(2026, 7, 25), arrival_date=date(2026, 7, 28),
        boxes_count=boxes, total_amount=15400,
    )


def test_cash_printed_in_russian():
    assert _payment_label("cash") == "Наличные"


def test_cashless_printed_in_russian():
    assert _payment_label("cashless") == "Безнал"


def test_unknown_value_printed_as_is():
    """Незнакомый способ оплаты не должен ронять печать стикера."""
    assert _payment_label("weird") == "weird"
    assert _payment_label("") == ""


def test_qr_keeps_raw_value():
    """В QR — латиница: по ней парсят сканер и Excel-выгрузка."""
    for raw in ("cash", "cashless"):
        fields = _generate_qr_data(_order(), raw).split("\t")
        assert len(fields) == 10
        assert fields[9] == raw


def test_label_fits_sticker_width():
    """«Наличные» шире прежнего «cash» — строка не должна вылезать за 58 мм."""
    for boxes in (1, 99, 250):
        for raw in ("cash", "cashless"):
            line = f"{boxes}/{boxes}   {_payment_label(raw)}"
            assert pdfmetrics.stringWidth(line, "Helvetica", 14) <= MAX_TEXT_WIDTH


def test_pdf_generated_for_both_methods():
    for raw in ("cash", "cashless"):
        pdf = StickerService.generate_stickers(_order(3), raw)
        assert pdf.startswith(b"%PDF")
