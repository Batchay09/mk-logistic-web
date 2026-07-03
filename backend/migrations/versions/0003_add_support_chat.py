"""Add support chat tables (conversations + messages)

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-03

Новые таблицы для чата поддержки клиент ↔ менеджер. Бот их не трогает —
безопасно накатывать на общую БД.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "support_conversations" not in tables:
        op.create_table(
            "support_conversations",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
            sa.Column("client_unread", sa.Integer, nullable=False, server_default="0"),
            sa.Column("manager_unread", sa.Integer, nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index(
            "ix_support_conversations_user_id", "support_conversations", ["user_id"], unique=True
        )

    if "support_messages" not in tables:
        op.create_table(
            "support_messages",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column(
                "conversation_id",
                sa.Integer,
                sa.ForeignKey("support_conversations.id"),
                nullable=False,
            ),
            sa.Column("sender_role", sa.String(16), nullable=False),
            sa.Column("body", sa.Text, nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index(
            "ix_support_messages_conversation_id", "support_messages", ["conversation_id"]
        )


def downgrade() -> None:
    op.drop_index("ix_support_messages_conversation_id", table_name="support_messages")
    op.drop_table("support_messages")
    op.drop_index("ix_support_conversations_user_id", table_name="support_conversations")
    op.drop_table("support_conversations")
