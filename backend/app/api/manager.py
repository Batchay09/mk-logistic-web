import asyncio
import logging
from datetime import date, datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, undefer

from app.core.dependencies import require_manager
from app.core.rate_limit import limiter
from app.db.models import (
    Order, OrderStatus, SupportConversation, SupportMessage, User, UserRole,
)
from app.db.session import get_db
from app.services.attachments import (
    AttachmentError, MAX_UPLOAD_BYTES, content_disposition, process_image, safe_filename,
)

logger = logging.getLogger(__name__)

MAX_IMPORT_BYTES = 10 * 1024 * 1024  # 10 МБ на Excel-импорт
from app.services.email import (
    notify_client_order_canceled,
    notify_client_payment_confirmed,
    send_broadcast,
)
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


class BroadcastRequest(BaseModel):
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1)


class ChatReplyIn(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


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
    logger.info("Менеджер id=%s подтвердил оплату заказа #%s", current_user.id, order.id)
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
    logger.info("Менеджер id=%s отменил заказ #%s", current_user.id, order.id)
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
    content = await file.read(MAX_IMPORT_BYTES + 1)
    if len(content) > MAX_IMPORT_BYTES:
        raise HTTPException(status_code=413, detail="Файл слишком большой (максимум 10 МБ)")
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
    content = await file.read(MAX_IMPORT_BYTES + 1)
    if len(content) > MAX_IMPORT_BYTES:
        raise HTTPException(status_code=413, detail="Файл слишком большой (максимум 10 МБ)")
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
    content = await file.read(MAX_IMPORT_BYTES + 1)
    if len(content) > MAX_IMPORT_BYTES:
        raise HTTPException(status_code=413, detail="Файл слишком большой (максимум 10 МБ)")
    result = await import_schedule_from_excel(session, content)
    return {"message": result}


@router.post("/broadcast")
@limiter.limit("6/hour")
async def broadcast(
    request: Request,
    body: BroadcastRequest,
    current_user: User = Depends(require_manager),
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(User.email).where(User.role == UserRole.CLIENT, User.email.is_not(None))
    )
    emails = [email for email in result.scalars().all()]
    await send_broadcast(emails, body.subject, body.message)
    return {"sent": len(emails)}


@router.get("/orders/{order_id:int}")
async def get_order_detail(
    order_id: int,
    current_user: User = Depends(require_manager),
    session: AsyncSession = Depends(get_db),
):
    """Полные детали одного заказа для менеджера (любой статус, любой клиент)."""
    order = (await session.execute(
        select(Order)
        .options(
            selectinload(Order.user),
            selectinload(Order.destination),
            selectinload(Order.pickup_address),
        )
        .where(Order.id == order_id)
    )).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    pickup = None
    if order.pickup_address:
        pa = order.pickup_address
        pickup = {"city": pa.city, "street": pa.street, "house": pa.house, "comment": pa.comment}

    return {
        "id": order.id,
        "status": order.status.value,
        "marketplace": order.marketplace.value,
        "destination_name": order.destination.name if order.destination else None,
        "company_name": order.company_name,
        "payment_method": order.payment_method.value if order.payment_method else None,
        "ship_date": order.ship_date.isoformat() if order.ship_date else None,
        "arrival_date": order.arrival_date.isoformat() if order.arrival_date else None,
        "boxes_count": order.boxes_count,
        "pallets_count": order.pallets_count,
        "is_pallet_mode": order.is_pallet_mode,
        "service_pickup": order.service_pickup,
        "service_palletizing": order.service_palletizing,
        "price_delivery": float(order.price_delivery),
        "price_pickup": float(order.price_pickup),
        "price_palletizing": float(order.price_palletizing),
        "total_amount": float(order.total_amount),
        "yookassa_payment_id": order.yookassa_payment_id,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "client": {
            "name": order.user.full_name if order.user else None,
            "email": order.user.email if order.user else None,
            "phone": order.user.phone if order.user else None,
        },
        "pickup_address": pickup,
    }


# ── Chat / инбокс поддержки ─────────────────────────────────────────────────────

@router.get("/chats")
async def list_chats(
    current_user: User = Depends(require_manager),
    session: AsyncSession = Depends(get_db),
):
    convs = (await session.execute(
        select(SupportConversation)
        .options(selectinload(SupportConversation.user), selectinload(SupportConversation.messages))
        .order_by(SupportConversation.updated_at.desc())
    )).scalars().all()
    out = []
    for c in convs:
        last = c.messages[-1] if c.messages else None
        if last is None:
            preview = None
        elif last.body:
            preview = last.body
        elif last.attachment_mime:
            preview = "Изображение"
        else:
            preview = ""
        out.append({
            "id": c.id,
            "client_name": c.user.full_name if c.user else None,
            "client_email": c.user.email if c.user else None,
            "unread": c.manager_unread,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            "last_message": preview,
            "last_sender": last.sender_role if last else None,
        })
    return out


@router.get("/chats/unread")
async def chats_unread(
    current_user: User = Depends(require_manager),
    session: AsyncSession = Depends(get_db),
):
    total = (await session.execute(
        select(func.coalesce(func.sum(SupportConversation.manager_unread), 0))
    )).scalar_one()
    return {"unread": int(total or 0)}


@router.get("/chats/{conversation_id:int}")
async def get_chat_thread(
    conversation_id: int,
    current_user: User = Depends(require_manager),
    session: AsyncSession = Depends(get_db),
):
    conv = (await session.execute(
        select(SupportConversation)
        .options(selectinload(SupportConversation.user), selectinload(SupportConversation.messages))
        .where(SupportConversation.id == conversation_id)
    )).scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Диалог не найден")
    if conv.manager_unread:
        conv.manager_unread = 0
        await session.commit()
    return {
        "id": conv.id,
        "client": {
            "name": conv.user.full_name if conv.user else None,
            "email": conv.user.email if conv.user else None,
            "phone": conv.user.phone if conv.user else None,
        },
        "messages": [_chat_msg_out(m) for m in conv.messages],
    }


@router.post("/chats/{conversation_id:int}")
@limiter.limit("40/minute")
async def reply_chat(
    request: Request,
    conversation_id: int,
    body: ChatReplyIn,
    current_user: User = Depends(require_manager),
    session: AsyncSession = Depends(get_db),
):
    conv = (await session.execute(
        select(SupportConversation).where(SupportConversation.id == conversation_id)
    )).scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Диалог не найден")
    msg = SupportMessage(conversation_id=conv.id, sender_role="manager", body=body.body)
    session.add(msg)
    conv.client_unread = (conv.client_unread or 0) + 1
    conv.manager_unread = 0  # менеджер прочитал, отвечая
    conv.updated_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(msg)
    return _chat_msg_out(msg)


@router.post("/chats/{conversation_id:int}/upload")
@limiter.limit("20/minute")
async def upload_chat_reply_image(
    request: Request,
    conversation_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_manager),
    session: AsyncSession = Depends(get_db),
):
    conv = (await session.execute(
        select(SupportConversation).where(SupportConversation.id == conversation_id)
    )).scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Диалог не найден")

    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    try:
        data, mime = await asyncio.to_thread(process_image, raw)
    except AttachmentError as e:
        raise HTTPException(status_code=400, detail=str(e))

    msg = SupportMessage(
        conversation_id=conv.id,
        sender_role="manager",
        body="",
        attachment_mime=mime,
        attachment_name=safe_filename(file.filename),
        attachment_data=data,
    )
    session.add(msg)
    conv.client_unread = (conv.client_unread or 0) + 1
    conv.manager_unread = 0
    conv.updated_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(msg)
    return _chat_msg_out(msg)


@router.get("/chats/attachment/{message_id:int}")
async def get_chat_attachment(
    message_id: int,
    current_user: User = Depends(require_manager),
    session: AsyncSession = Depends(get_db),
):
    msg = (await session.execute(
        select(SupportMessage)
        .options(undefer(SupportMessage.attachment_data))
        .where(SupportMessage.id == message_id)
    )).scalar_one_or_none()
    if not msg or not msg.attachment_data:
        raise HTTPException(status_code=404, detail="Вложение не найдено")
    return Response(
        content=msg.attachment_data,
        media_type=msg.attachment_mime or "application/octet-stream",
        headers={
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": content_disposition(msg.attachment_name),
            "Cache-Control": "private, max-age=3600",
        },
    )


# ── Helpers ───────────────────────────────────────────────────────────────────


def _chat_msg_out(m: SupportMessage) -> dict:
    return {
        "id": m.id,
        "sender_role": m.sender_role,
        "body": m.body,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "attachment": (
            {"name": m.attachment_name, "mime": m.attachment_mime}
            if m.attachment_mime else None
        ),
    }

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
