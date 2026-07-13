"""Add manager_note to orders

Revision ID: 0007
Revises: 0006
Create Date: 2026-07-14

Внутренняя заметка менеджера для таблицы заказов (Excel-режим).
Nullable — бот и существующие заказы колонку не заполняют.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c["name"] for c in inspector.get_columns("orders")}
    if "manager_note" not in cols:
        op.add_column("orders", sa.Column("manager_note", sa.String(2000), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "manager_note")
