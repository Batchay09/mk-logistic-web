from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user
from app.db.models import Order, User, UserRole
from app.db.session import get_db
from app.services.sticker import StickerService

router = APIRouter(prefix="/stickers", tags=["stickers"])

ALLOWED_STATUSES = {"confirmed", "awaiting_payment", "paid", "assigned", "picked_up", "in_transit", "delivered"}


@router.get("/{order_id}.pdf")
async def get_sticker_pdf(
    order_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    order = (await session.execute(
        select(Order)
        .options(
            selectinload(Order.user),
            selectinload(Order.destination),
        )
        .where(Order.id == order_id)
    )).scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    # Access control: owner or manager/admin
    is_owner = order.user_id == current_user.id
    is_staff = current_user.role in (UserRole.MANAGER, UserRole.ADMIN)
    if not is_owner and not is_staff:
        raise HTTPException(status_code=403, detail="Нет доступа")

    if order.status.value not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Стикеры ещё не доступны для этого заказа")

    payment_type = order.payment_method.value if order.payment_method else ""
    pdf_bytes = StickerService.generate_stickers(order, payment_type)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="stickers_{order_id}.pdf"'},
    )
