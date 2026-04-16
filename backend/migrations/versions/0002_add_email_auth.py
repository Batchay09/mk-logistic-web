"""Add email auth fields to users (for sites migrated from bot's DB)

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-16

Если ты мигрируешь с существующей БД бота, а не создаёшь с нуля:
  1. Подключись к прод-БД бота
  2. Запусти только эту миграцию: alembic upgrade 0002
  3. Все поля nullable — бот продолжает работать без изменений
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add yookassa_payment_id to orders if it doesn't exist
    # (safe to run on both fresh and existing DB)
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    order_cols = {c["name"] for c in inspector.get_columns("orders")}
    if "yookassa_payment_id" not in order_cols:
        op.add_column("orders", sa.Column("yookassa_payment_id", sa.String(255), nullable=True))

    user_cols = {c["name"] for c in inspector.get_columns("users")}

    if "email" not in user_cols:
        op.add_column("users", sa.Column("email", sa.String(255), nullable=True))
        op.create_index("ix_users_email", "users", ["email"], unique=True)

    if "password_hash" not in user_cols:
        op.add_column("users", sa.Column("password_hash", sa.String(255), nullable=True))

    if "email_verified_at" not in user_cols:
        op.add_column("users", sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True))

    # Make tg_id nullable (was NOT NULL in bot's DB, but we want new web-only users)
    if "tg_id" in user_cols:
        try:
            op.alter_column("users", "tg_id", nullable=True)
        except Exception:
            pass  # already nullable


def downgrade() -> None:
    op.drop_column("users", "email_verified_at")
    op.drop_column("users", "password_hash")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_column("users", "email")
    op.drop_column("orders", "yookassa_payment_id")
