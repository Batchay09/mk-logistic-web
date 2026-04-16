from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_admin
from app.db.models import (
    Destination, Marketplace, PriceRule, ScheduleRule, User, UserRole
)
from app.db.session import get_db
from app.services.audit import AuditService

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    email: Optional[str]
    full_name: Optional[str]
    phone: Optional[str]
    company_name: Optional[str]
    role: str
    tg_id: Optional[int]

    class Config:
        from_attributes = True


class UserRoleUpdate(BaseModel):
    role: str


class DestinationOut(BaseModel):
    id: int
    marketplace: str
    name: str
    is_active: bool

    class Config:
        from_attributes = True


class DestinationCreate(BaseModel):
    marketplace: str
    name: str


class DestinationUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None


class PriceRuleOut(BaseModel):
    id: int
    destination_id: int
    min_qty: int
    price: float

    class Config:
        from_attributes = True


class PriceRuleCreate(BaseModel):
    destination_id: int
    min_qty: int
    price: float


class PriceRuleUpdate(BaseModel):
    min_qty: Optional[int] = None
    price: Optional[float] = None


class ScheduleRuleOut(BaseModel):
    id: int
    destination_id: int
    weekday_from: int
    weekday_to: int
    week_offset: int

    class Config:
        from_attributes = True


class ScheduleRuleCreate(BaseModel):
    destination_id: int
    weekday_from: int
    weekday_to: int
    week_offset: int = 0


class ScheduleRuleUpdate(BaseModel):
    weekday_from: Optional[int] = None
    weekday_to: Optional[int] = None
    week_offset: Optional[int] = None


class CopyRequest(BaseModel):
    source_destination_id: int
    target_destination_id: int


class AuditLogOut(BaseModel):
    id: int
    table_name: str
    record_id: int
    action: str
    old_data: Optional[dict]
    new_data: Optional[dict]
    created_at: str
    label: str

    class Config:
        from_attributes = True


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=List[UserOut])
async def list_users(
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * limit
    result = await session.execute(select(User).order_by(User.created_at.desc()).offset(offset).limit(limit))
    return result.scalars().all()


@router.patch("/users/{user_id}/role")
async def set_user_role(
    user_id: int,
    body: UserRoleUpdate,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    user = (await session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    try:
        user.role = UserRole(body.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Неверная роль")
    await session.commit()
    return {"ok": True}


# ── Destinations ──────────────────────────────────────────────────────────────

@router.get("/destinations", response_model=List[DestinationOut])
async def list_destinations(
    marketplace: Optional[str] = None,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    query = select(Destination).order_by(Destination.name)
    if marketplace:
        query = query.where(Destination.marketplace == Marketplace(marketplace))
    result = await session.execute(query)
    return result.scalars().all()


@router.post("/destinations", response_model=DestinationOut, status_code=status.HTTP_201_CREATED)
async def create_destination(
    body: DestinationCreate,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    dest = Destination(marketplace=Marketplace(body.marketplace), name=body.name)
    session.add(dest)
    await session.flush()
    await AuditService.log_change(session, "destinations", dest.id, "create",
                                  new_data=AuditService._model_to_dict(dest), user_id=current_user.id)
    await session.commit()
    await session.refresh(dest)
    return dest


@router.patch("/destinations/{dest_id}", response_model=DestinationOut)
async def update_destination(
    dest_id: int,
    body: DestinationUpdate,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    dest = await _get_dest(dest_id, session)
    old_data = AuditService._model_to_dict(dest)
    if body.name is not None:
        dest.name = body.name
    if body.is_active is not None:
        dest.is_active = body.is_active
    await AuditService.log_change(session, "destinations", dest.id, "update",
                                  old_data=old_data, new_data=AuditService._model_to_dict(dest),
                                  user_id=current_user.id)
    await session.commit()
    await session.refresh(dest)
    return dest


@router.delete("/destinations/{dest_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_destination(
    dest_id: int,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    dest = await _get_dest(dest_id, session)
    old_data = AuditService._model_to_dict(dest)
    await AuditService.log_change(session, "destinations", dest.id, "delete",
                                  old_data=old_data, user_id=current_user.id)
    await session.delete(dest)
    await session.commit()


# ── Price Rules ───────────────────────────────────────────────────────────────

@router.get("/prices", response_model=List[PriceRuleOut])
async def list_prices(
    destination_id: Optional[int] = None,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    query = select(PriceRule).order_by(PriceRule.destination_id, PriceRule.min_qty)
    if destination_id:
        query = query.where(PriceRule.destination_id == destination_id)
    result = await session.execute(query)
    rules = result.scalars().all()
    return [PriceRuleOut(id=r.id, destination_id=r.destination_id, min_qty=r.min_qty, price=float(r.price))
            for r in rules]


@router.post("/prices", response_model=PriceRuleOut, status_code=status.HTTP_201_CREATED)
async def create_price(
    body: PriceRuleCreate,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    rule = PriceRule(destination_id=body.destination_id, min_qty=body.min_qty, price=body.price)
    session.add(rule)
    await session.flush()
    await AuditService.log_change(session, "price_rules", rule.id, "create",
                                  new_data=AuditService._model_to_dict(rule), user_id=current_user.id)
    await session.commit()
    await session.refresh(rule)
    return PriceRuleOut(id=rule.id, destination_id=rule.destination_id, min_qty=rule.min_qty, price=float(rule.price))


@router.patch("/prices/{rule_id}", response_model=PriceRuleOut)
async def update_price(
    rule_id: int,
    body: PriceRuleUpdate,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    rule = await _get_price_rule(rule_id, session)
    old_data = AuditService._model_to_dict(rule)
    if body.min_qty is not None:
        rule.min_qty = body.min_qty
    if body.price is not None:
        rule.price = body.price
    await AuditService.log_change(session, "price_rules", rule.id, "update",
                                  old_data=old_data, new_data=AuditService._model_to_dict(rule),
                                  user_id=current_user.id)
    await session.commit()
    await session.refresh(rule)
    return PriceRuleOut(id=rule.id, destination_id=rule.destination_id, min_qty=rule.min_qty, price=float(rule.price))


@router.delete("/prices/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_price(
    rule_id: int,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    rule = await _get_price_rule(rule_id, session)
    old_data = AuditService._model_to_dict(rule)
    await AuditService.log_change(session, "price_rules", rule.id, "delete",
                                  old_data=old_data, user_id=current_user.id)
    await session.delete(rule)
    await session.commit()


@router.post("/prices/copy")
async def copy_prices(
    body: CopyRequest,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    source_rules = (await session.execute(
        select(PriceRule).where(PriceRule.destination_id == body.source_destination_id)
    )).scalars().all()

    old_rules = (await session.execute(
        select(PriceRule).where(PriceRule.destination_id == body.target_destination_id)
    )).scalars().all()

    for rule in old_rules:
        await AuditService.log_change(session, "price_rules", rule.id, "delete",
                                      old_data=AuditService._model_to_dict(rule), user_id=current_user.id)
        await session.delete(rule)

    for rule in source_rules:
        new_rule = PriceRule(destination_id=body.target_destination_id, min_qty=rule.min_qty, price=rule.price)
        session.add(new_rule)
        await session.flush()
        await AuditService.log_change(session, "price_rules", new_rule.id, "create",
                                      new_data=AuditService._model_to_dict(new_rule), user_id=current_user.id)

    await session.commit()
    return {"copied": len(source_rules), "removed": len(old_rules)}


# ── Schedule Rules ────────────────────────────────────────────────────────────

@router.get("/schedule", response_model=List[ScheduleRuleOut])
async def list_schedule(
    destination_id: Optional[int] = None,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    query = select(ScheduleRule).order_by(ScheduleRule.destination_id, ScheduleRule.weekday_from)
    if destination_id:
        query = query.where(ScheduleRule.destination_id == destination_id)
    result = await session.execute(query)
    return result.scalars().all()


@router.post("/schedule", response_model=ScheduleRuleOut, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    body: ScheduleRuleCreate,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    rule = ScheduleRule(
        destination_id=body.destination_id,
        weekday_from=body.weekday_from,
        weekday_to=body.weekday_to,
        week_offset=body.week_offset,
    )
    session.add(rule)
    await session.flush()
    await AuditService.log_change(session, "schedule_rules", rule.id, "create",
                                  new_data=AuditService._model_to_dict(rule), user_id=current_user.id)
    await session.commit()
    await session.refresh(rule)
    return rule


@router.patch("/schedule/{rule_id}", response_model=ScheduleRuleOut)
async def update_schedule(
    rule_id: int,
    body: ScheduleRuleUpdate,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    rule = await _get_schedule_rule(rule_id, session)
    old_data = AuditService._model_to_dict(rule)
    if body.weekday_from is not None:
        rule.weekday_from = body.weekday_from
    if body.weekday_to is not None:
        rule.weekday_to = body.weekday_to
    if body.week_offset is not None:
        rule.week_offset = body.week_offset
    await AuditService.log_change(session, "schedule_rules", rule.id, "update",
                                  old_data=old_data, new_data=AuditService._model_to_dict(rule),
                                  user_id=current_user.id)
    await session.commit()
    await session.refresh(rule)
    return rule


@router.delete("/schedule/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    rule_id: int,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    rule = await _get_schedule_rule(rule_id, session)
    old_data = AuditService._model_to_dict(rule)
    await AuditService.log_change(session, "schedule_rules", rule.id, "delete",
                                  old_data=old_data, user_id=current_user.id)
    await session.delete(rule)
    await session.commit()


@router.post("/schedule/copy")
async def copy_schedule(
    body: CopyRequest,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    source_rules = (await session.execute(
        select(ScheduleRule).where(ScheduleRule.destination_id == body.source_destination_id)
    )).scalars().all()

    old_rules = (await session.execute(
        select(ScheduleRule).where(ScheduleRule.destination_id == body.target_destination_id)
    )).scalars().all()

    for rule in old_rules:
        await AuditService.log_change(session, "schedule_rules", rule.id, "delete",
                                      old_data=AuditService._model_to_dict(rule), user_id=current_user.id)
        await session.delete(rule)

    for rule in source_rules:
        new_rule = ScheduleRule(
            destination_id=body.target_destination_id,
            weekday_from=rule.weekday_from,
            weekday_to=rule.weekday_to,
            week_offset=rule.week_offset,
        )
        session.add(new_rule)
        await session.flush()
        await AuditService.log_change(session, "schedule_rules", new_rule.id, "create",
                                      new_data=AuditService._model_to_dict(new_rule), user_id=current_user.id)

    await session.commit()
    return {"copied": len(source_rules), "removed": len(old_rules)}


# ── Audit ─────────────────────────────────────────────────────────────────────

@router.get("/audit", response_model=List[AuditLogOut])
async def get_audit(
    table_name: Optional[str] = None,
    limit: int = 20,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    logs = await AuditService.get_history(session, table_name=table_name, limit=limit)
    return [
        AuditLogOut(
            id=log.id,
            table_name=log.table_name,
            record_id=log.record_id,
            action=log.action,
            old_data=log.old_data,
            new_data=log.new_data,
            created_at=log.created_at.isoformat(),
            label=AuditService.format_log_entry(log),
        )
        for log in logs
    ]


@router.post("/audit/rollback/{log_id}")
async def rollback(
    log_id: int,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    ok = await AuditService.rollback(session, log_id, user_id=current_user.id)
    if not ok:
        raise HTTPException(status_code=400, detail="Не удалось выполнить откат")
    await session.commit()
    return {"ok": True}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_dest(dest_id: int, session: AsyncSession) -> Destination:
    dest = (await session.execute(select(Destination).where(Destination.id == dest_id))).scalar_one_or_none()
    if not dest:
        raise HTTPException(status_code=404, detail="Направление не найдено")
    return dest


async def _get_price_rule(rule_id: int, session: AsyncSession) -> PriceRule:
    rule = (await session.execute(select(PriceRule).where(PriceRule.id == rule_id))).scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Правило цены не найдено")
    return rule


async def _get_schedule_rule(rule_id: int, session: AsyncSession) -> ScheduleRule:
    rule = (await session.execute(select(ScheduleRule).where(ScheduleRule.id == rule_id))).scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Правило расписания не найдено")
    return rule
