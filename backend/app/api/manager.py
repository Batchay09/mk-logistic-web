from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import require_manager
from app.db.models import Order, OrderStatus, User
from app.db.session import get_db
from app.services.email import notify_client_order_canceled, notify_client_payment_confirmed
from app.services.reports import generate_orders_report
from app.services.import_prices import import_prices_from_excel, generate_price_template
from app.services.import_schedule import import_schedule_from_excel, generate_schedule_template
from app.services.sticker import StickerService

router = APIRouter(prefix="/manager", tags=["manager"])


class OrderBrief(BaseModel):
    id: int
    status: str
    marketplace: str
    destination_name: Optional[str]
    company_name: Optional[str]
    ship_date: date
    boxes_count: int
    total_amount: float
    payment_method: Optional[str]
    client_name: Optional[str]
    client_email: Optional[str]
    client_phone: Optional[str]

    class Config:
        from_attributes = True


@router.get("/payments/awaiting", response_model=List[OrderBrief])
async def awaiting_payments(
    current_user: User = Depends(require_manager),
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(Order)
        .options(selectinload(Order.user), selectinload(Order.destination))
        .where(Order.status == OrderStatus.AWAITING_PAYMENT)
        .order_by(Order.created_at.asc())
    )
    return [_brief(o) for o in result.scalars().all()]


@router.post("/payments/{order_id}/confirm")
async def confirm_payment(
    order_id: int,
    current_user: User = Depends(require_manager),
    session: AsyncSession = Depends(get_db),
):
    order = await _get_order(order_id, session, [OrderStatus.AWAITING_PAYMENT])
    order.status = OrderStatus.PAID
    await session.commit()
    await session.refresh(order, ["user", "destination"])

    # Send stickers to client
    pdf_bytes = None
    try:
        pdf_bytes = StickerService.generate_stickers(order, order.payment_method.value if order.payment_method else "")
    except Exception:
        pass

    if order.user and order.user.email:
        try:
            await notify_client_payment_confirmed(order.user.email, order.id, pdf_bytes)
        except Exception:
            pass

    return {"ok": True}


@router.post("/payments/{order_id}/cancel")
async def cancel_payment(
    order_id: int,
    current_user: User = Depends(require_manager),
    session: AsyncSession = Depends(get_db),
):
    order = await _get_order(order_id, session, [OrderStatus.AWAITING_PAYMENT, OrderStatus.NEW])
    order.status = OrderStatus.CANCELED
    await session.commit()
    await session.refresh(order, ["user"])

    if order.user and order.user.email:
        try:
            await notify_client_order_canceled(order.user.email, order.id)
        except Exception:
            pass

    return {"ok": True}


@router.get("/orders/search", response_model=List[OrderBrief])
async def search_orders(
    company: Optional[str] = None,
    ship_date: Optional[date] = None,
    current_user: User = Depends(require_manager),
    session: AsyncSession = Depends(get_db),
):
    query = (
        select(Order)
        .options(selectinload(Order.user), selectinload(Order.destination))
        .where(Order.status != OrderStatus.DRAFT)
        .order_by(Order.created_at.desc())
        .limit(20)
    )
    if company:
        query = query.where(Order.company_name.ilike(f"%{company}%"))
    if ship_date:
        query = query.where(Order.ship_date == ship_date)
    result = await session.execute(query)
    return [_brief(o) for o in result.scalars().all()]


@router.get("/orders/export.xlsx")
async def export_orders(
    current_user: User = Depends(require_manager),
    session: AsyncSession = Depends(get_db),
):
    output = await generate_orders_report(session)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=orders.xlsx"},
    )


@router.post("/orders/import")
async def import_orders(
    file: UploadFile = File(...),
    current_user: User = Depends(require_manager),
    session: AsyncSession = Depends(get_db),
):
    content = await file.read()
    # Simple import: update order status by ID from Excel
    # Expected columns: ID, Status (optional), ShipDate (optional)
    import asyncio
    import pandas as pd
    from io import BytesIO

    try:
        df = await asyncio.to_thread(lambda: pd.read_excel(BytesIO(content)))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка чтения файла: {e}")

    if "ID" not in df.columns:
        raise HTTPException(status_code=400, detail="Отсутствует колонка ID")

    updated = 0
    for _, row in df.iterrows():
        order_id = int(row["ID"])
        order = (await session.execute(select(Order).where(Order.id == order_id))).scalar_one_or_none()
        if not order:
            continue
        if "Status" in df.columns and str(row["Status"]).strip():
            try:
                order.status = OrderStatus(str(row["Status"]).strip())
            except ValueError:
                pass
        updated += 1

    await session.commit()
    return {"updated": updated}


@router.get("/prices/template.xlsx")
async def price_template(current_user: User = Depends(require_manager)):
    output = await generate_price_template()
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=prices_template.xlsx"},
    )


@router.post("/prices/import")
async def import_prices(
    file: UploadFile = File(...),
    current_user: User = Depends(require_manager),
    session: AsyncSession = Depends(get_db),
):
    content = await file.read()
    result = await import_prices_from_excel(session, content)
    return {"message": result}


@router.get("/schedule/template.xlsx")
async def schedule_template(current_user: User = Depends(require_manager)):
    output = await generate_schedule_template()
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=schedule_template.xlsx"},
    )


@router.post("/schedule/import")
async def import_schedule(
    file: UploadFile = File(...),
    current_user: User = Depends(require_manager),
    session: AsyncSession = Depends(get_db),
):
    content = await file.read()
    result = await import_schedule_from_excel(session, content)
    return {"message": result}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_order(order_id: int, session: AsyncSession, allowed_statuses: list) -> Order:
    order = (await session.execute(
        select(Order).where(Order.id == order_id)
    )).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    if order.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Неверный статус заказа: {order.status.value}")
    return order


def _brief(order: Order) -> OrderBrief:
    return OrderBrief(
        id=order.id,
        status=order.status.value,
        marketplace=order.marketplace.value,
        destination_name=order.destination.name if order.destination else None,
        company_name=order.company_name,
        ship_date=order.ship_date,
        boxes_count=order.boxes_count,
        total_amount=float(order.total_amount),
        payment_method=order.payment_method.value if order.payment_method else None,
        client_name=order.user.full_name if order.user else None,
        client_email=order.user.email if order.user else None,
        client_phone=order.user.phone if order.user else None,
    )
