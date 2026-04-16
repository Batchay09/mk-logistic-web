import asyncio
from io import BytesIO

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models import Order, OrderStatus


def _create_excel_sync(data: list) -> BytesIO:
    df = pd.DataFrame(data)
    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Заказы")
        worksheet = writer.sheets["Заказы"]
        for idx, col in enumerate(df.columns):
            max_len = max(df[col].astype(str).map(len).max(), len(str(col))) + 2
            worksheet.column_dimensions[chr(65 + idx)].width = min(max_len, 50)
    output.seek(0)
    return output


async def generate_orders_report(session: AsyncSession) -> BytesIO:
    query = (
        select(Order)
        .options(
            selectinload(Order.user),
            selectinload(Order.destination),
            selectinload(Order.pickup_address),
        )
        .where(Order.status != OrderStatus.DRAFT)
        .order_by(Order.ship_date.desc())
    )
    result = await session.execute(query)
    orders = result.scalars().all()

    data = []
    for order in orders:
        address = ""
        if order.pickup_address:
            a = order.pickup_address
            address = f"{a.city}, {a.street}, {a.house}"
        data.append({
            "ID Заказа": order.id,
            "Дата создания": order.created_at.strftime("%d.%m.%Y %H:%M") if order.created_at else "",
            "Дата отгрузки": order.ship_date.strftime("%d.%m.%Y") if order.ship_date else "",
            "Статус": order.status.value,
            "Клиент": order.user.full_name if order.user else "",
            "Телефон": order.user.phone if order.user else "",
            "Email": order.user.email if order.user else "",
            "Маркетплейс": order.marketplace.value,
            "Склад назначения": order.destination.name if order.destination else "",
            "Коробок": order.boxes_count,
            "Паллет": order.pallets_count,
            "Сумма (руб)": float(order.total_amount) if order.total_amount else 0.0,
            "Забор груза": "Да" if order.service_pickup else "Нет",
            "Адрес забора": address,
        })

    return await asyncio.to_thread(_create_excel_sync, data)
