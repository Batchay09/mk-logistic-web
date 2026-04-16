import io
import os
import tempfile

import qrcode
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

from app.db.models import Order


def _generate_qr_data(order: Order, payment_type: str = "") -> str:
    """Формирует TSV строку для QR-кода (для сканера → Excel)

    Порядок полей:
    ID | TG ID | Компания | Маркетплейс | Склад | Сдача | Доставка | Коробки | Сумма | Оплата
    """
    company = (order.company_name or order.user.company_name or order.user.full_name or "")[:20]
    dest = (order.destination.name if order.destination else "")[:15]
    ship = order.ship_date.strftime("%d.%m.%Y") if order.ship_date else ""
    arr = order.arrival_date.strftime("%d.%m.%Y") if order.arrival_date else ship
    tg_id = str(order.user.tg_id) if order.user.tg_id else str(order.user.id)

    fields = [
        str(order.id),
        tg_id,
        company,
        order.marketplace.value.upper(),
        dest,
        ship,
        arr,
        str(order.boxes_count),
        str(int(order.total_amount)),
        (payment_type or "")[:10],
    ]
    return "\t".join(fields)


def _add_qr_to_canvas(c: canvas.Canvas, data: str, x: float, y: float, size: float) -> None:
    qr_img = qrcode.make(data, error_correction=qrcode.constants.ERROR_CORRECT_L, border=1)
    pil_img = qr_img.get_image().convert("RGB")

    tmp_path = tempfile.mktemp(suffix=".png")
    pil_img.save(tmp_path, "PNG")
    try:
        reader = ImageReader(tmp_path)
        c.drawImage(reader, x, y, width=size, height=size)
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def _get_font_path() -> str:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return ""


class StickerService:
    @staticmethod
    def generate_stickers(order: Order, payment_type: str = "") -> bytes:
        buffer = io.BytesIO()
        width = 58 * mm
        height = 40 * mm

        c = canvas.Canvas(buffer, pagesize=(width, height))

        font_path = _get_font_path()
        if font_path:
            try:
                pdfmetrics.registerFont(TTFont("CustomFont", font_path))
                font_name = "CustomFont"
            except Exception:
                font_name = "Helvetica"
        else:
            font_name = "Helvetica"

        boxes_count = order.boxes_count
        company = order.company_name or order.user.company_name or order.user.full_name or ""
        if len(company) > 20:
            company = company[:17] + "..."

        ship_date_str = order.ship_date.strftime("%d.%m")
        arrival_date_str = order.arrival_date.strftime("%d.%m") if order.arrival_date else ship_date_str
        dates_line = f"Сдача {ship_date_str} → Отгр {arrival_date_str}"
        destination = f"({order.destination.name})"
        tg_id = str(order.user.tg_id) if order.user.tg_id else str(order.user.id)
        client_id = f"ID: {tg_id}"

        qr_data = _generate_qr_data(order, payment_type)
        qr_size = 10 * mm
        qr_x = 46 * mm
        qr_y = 28 * mm
        text_center_x = (width - qr_size) / 2

        for i in range(1, boxes_count + 1):
            _add_qr_to_canvas(c, qr_data, qr_x, qr_y, qr_size)

            c.setFont(font_name, 11)
            c.drawCentredString(text_center_x, 31 * mm, company)

            c.setFont(font_name, 9)
            c.drawCentredString(text_center_x, 24 * mm, dates_line)

            c.setFont(font_name, 11)
            c.drawCentredString(text_center_x, 17 * mm, destination)

            count_str = f"{i}/{boxes_count}"
            full_str = f"{count_str}   {payment_type}" if payment_type else count_str
            c.setFont(font_name, 14)
            c.drawCentredString(width / 2, 9 * mm, full_str)

            c.setFont(font_name, 9)
            c.drawCentredString(width / 2, 3 * mm, client_id)

            c.showPage()

        c.save()
        buffer.seek(0)
        return buffer.read()
