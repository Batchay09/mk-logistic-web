"""Email OTP codes + пометить staff-аккаунты подтверждёнными

Revision ID: 0006
Revises: 0005
Create Date: 2026-07-13

Таблица одноразовых 6-значных кодов подтверждения email (регистрация, сброс
пароля). Веб-only — бот её не знает. Вход теперь требует подтверждённый email,
поэтому существующие admin/manager помечаются подтверждёнными, чтобы
bootstrap-аккаунты (ящики могут не существовать) не оказались заблокированы.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "email_otp" not in inspector.get_table_names():
        op.create_table(
            "email_otp",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("email", sa.String(255), nullable=False),
            sa.Column(
                "user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=True,
            ),
            sa.Column("purpose", sa.String(16), nullable=False),
            sa.Column("code_hash", sa.String(64), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_email_otp_email", "email_otp", ["email"])

    # CURRENT_TIMESTAMP работает и в Postgres, и в SQLite (run-local.sh)
    op.execute(
        "UPDATE users SET email_verified_at = CURRENT_TIMESTAMP "
        "WHERE role IN ('admin', 'manager') AND email IS NOT NULL AND email_verified_at IS NULL"
    )


def downgrade() -> None:
    op.drop_index("ix_email_otp_email", table_name="email_otp")
    op.drop_table("email_otp")
