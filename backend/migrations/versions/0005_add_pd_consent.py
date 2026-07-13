"""Add pd_consent_at to users

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-13

Метка времени согласия на обработку ПД (152-ФЗ) при веб-регистрации.
Nullable — бот и ранее зарегистрированные пользователи колонку не заполняют.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c["name"] for c in inspector.get_columns("users")}
    if "pd_consent_at" not in cols:
        op.add_column("users", sa.Column("pd_consent_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "pd_consent_at")
