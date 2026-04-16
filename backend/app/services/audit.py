"""Сервис аудита изменений для направлений, цен и расписания"""
from datetime import datetime, timedelta
from typing import Optional, List, Any, Dict

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditLog, Destination, PriceRule, ScheduleRule, Marketplace

TABLE_MODEL_MAP = {
    "destinations": Destination,
    "price_rules": PriceRule,
    "schedule_rules": ScheduleRule,
}

ACTION_NAMES = {
    "create": "Создание",
    "update": "Изменение",
    "delete": "Удаление",
}

TABLE_NAMES = {
    "destinations": "Направление",
    "price_rules": "Тариф",
    "schedule_rules": "Расписание",
}


class AuditService:
    @staticmethod
    async def log_change(
        session: AsyncSession,
        table_name: str,
        record_id: int,
        action: str,
        old_data: Optional[Dict[str, Any]] = None,
        new_data: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None,
    ) -> AuditLog:
        log = AuditLog(
            table_name=table_name,
            record_id=record_id,
            action=action,
            old_data=old_data,
            new_data=new_data,
            user_id=user_id,
        )
        session.add(log)
        await session.flush()
        return log

    @staticmethod
    async def get_history(
        session: AsyncSession,
        table_name: Optional[str] = None,
        record_id: Optional[int] = None,
        limit: int = 20,
    ) -> List[AuditLog]:
        query = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
        if table_name:
            query = query.where(AuditLog.table_name == table_name)
        if record_id:
            query = query.where(AuditLog.record_id == record_id)
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def rollback(
        session: AsyncSession,
        audit_log_id: int,
        user_id: Optional[int] = None,
    ) -> bool:
        result = await session.execute(select(AuditLog).where(AuditLog.id == audit_log_id))
        log = result.scalar_one_or_none()
        if not log:
            return False

        model_class = TABLE_MODEL_MAP.get(log.table_name)
        if not model_class:
            return False

        if log.action == "create":
            result = await session.execute(select(model_class).where(model_class.id == log.record_id))
            record = result.scalar_one_or_none()
            if record:
                await AuditService.log_change(session, log.table_name, log.record_id, "delete",
                                              old_data=log.new_data, new_data=None, user_id=user_id)
                await session.delete(record)
                return True

        elif log.action == "update":
            result = await session.execute(select(model_class).where(model_class.id == log.record_id))
            record = result.scalar_one_or_none()
            if record and log.old_data:
                current_data = AuditService._model_to_dict(record)
                for key, value in log.old_data.items():
                    if hasattr(record, key):
                        if key == "marketplace" and isinstance(value, str):
                            value = Marketplace(value)
                        setattr(record, key, value)
                await AuditService.log_change(session, log.table_name, log.record_id, "update",
                                              old_data=current_data, new_data=log.old_data, user_id=user_id)
                return True

        elif log.action == "delete":
            if log.old_data:
                data = log.old_data.copy()
                data.pop("id", None)
                if "marketplace" in data and isinstance(data["marketplace"], str):
                    data["marketplace"] = Marketplace(data["marketplace"])
                new_record = model_class(**data)
                session.add(new_record)
                await session.flush()
                await AuditService.log_change(session, log.table_name, new_record.id, "create",
                                              old_data=None, new_data=AuditService._model_to_dict(new_record),
                                              user_id=user_id)
                return True

        return False

    @staticmethod
    async def cleanup_old_logs(session: AsyncSession, days: int = 30) -> int:
        cutoff_date = datetime.now() - timedelta(days=days)
        result = await session.execute(delete(AuditLog).where(AuditLog.created_at < cutoff_date))
        return result.rowcount

    @staticmethod
    def _model_to_dict(model: Any) -> Dict[str, Any]:
        from decimal import Decimal
        data = {}
        for column in model.__table__.columns:
            value = getattr(model, column.name)
            if hasattr(value, "value"):
                value = value.value
            elif isinstance(value, Decimal):
                value = float(value)
            data[column.name] = value
        return data

    @staticmethod
    def format_log_entry(log: AuditLog) -> str:
        table_name = TABLE_NAMES.get(log.table_name, log.table_name)
        action_name = ACTION_NAMES.get(log.action, log.action)
        date_str = log.created_at.strftime("%d.%m %H:%M")
        details = ""
        if log.action == "update" and log.old_data and log.new_data:
            changes = []
            for key in log.new_data:
                if key in log.old_data and log.old_data[key] != log.new_data[key]:
                    changes.append(f"{log.old_data[key]} → {log.new_data[key]}")
            if changes:
                details = f" ({', '.join(changes[:2])})"
        elif log.action == "create" and log.new_data:
            name = log.new_data.get("name", "")
            if name:
                details = f" ({name})"
        elif log.action == "delete" and log.old_data:
            name = log.old_data.get("name", "")
            if name:
                details = f" ({name})"
        return f"{date_str} | {action_name} {table_name}{details}"
