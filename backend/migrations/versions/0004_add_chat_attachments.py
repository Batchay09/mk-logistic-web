"""Add image attachment columns to support_messages

Revision ID: 0004
Revises: 0003
Create Date: 2026-07-03

Вложения-изображения в чате: mime, имя, бинарные данные (nullable).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "support_messages" not in set(inspector.get_table_names()):
        return
    cols = {c["name"] for c in inspector.get_columns("support_messages")}

    if "attachment_mime" not in cols:
        op.add_column("support_messages", sa.Column("attachment_mime", sa.String(64), nullable=True))
    if "attachment_name" not in cols:
        op.add_column("support_messages", sa.Column("attachment_name", sa.String(255), nullable=True))
    if "attachment_data" not in cols:
        op.add_column("support_messages", sa.Column("attachment_data", sa.LargeBinary(), nullable=True))


def downgrade() -> None:
    op.drop_column("support_messages", "attachment_data")
    op.drop_column("support_messages", "attachment_name")
    op.drop_column("support_messages", "attachment_mime")
