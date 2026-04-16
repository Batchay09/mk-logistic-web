"""Initial schema with email auth fields

Revision ID: 0001
Revises:
Create Date: 2026-04-16

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # If this is a fresh DB — create all tables.
    # If migrating from the bot's DB — this migration is skipped (tables already exist).
    # In that case run 0002 to add email auth columns.

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tg_id", sa.BigInteger(), nullable=True, unique=True),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("username", sa.String(), nullable=True),
        sa.Column("role", sa.Enum("admin", "manager", "driver", "client", name="userrole"), nullable=False, server_default="client"),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("company_name", sa.String(), nullable=True),
        sa.Column("policy_accepted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        # Web auth fields
        sa.Column("email", sa.String(255), nullable=True, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_tg_id", "users", ["tg_id"])
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "company_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("company_name", sa.String(), nullable=False),
    )

    op.create_table(
        "pickup_addresses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("city", sa.String(), nullable=False),
        sa.Column("street", sa.String(), nullable=False),
        sa.Column("house", sa.String(), nullable=False),
        sa.Column("comment", sa.String(), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
    )

    op.create_table(
        "destinations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("marketplace", sa.Enum("wb", "ozon", name="marketplace"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
    )

    op.create_table(
        "schedule_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("destination_id", sa.Integer(), sa.ForeignKey("destinations.id"), nullable=False),
        sa.Column("weekday_from", sa.Integer(), nullable=False),
        sa.Column("weekday_to", sa.Integer(), nullable=False),
        sa.Column("week_offset", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "price_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("destination_id", sa.Integer(), sa.ForeignKey("destinations.id"), nullable=False),
        sa.Column("min_qty", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
    )

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.Enum(
            "draft", "new", "confirmed", "awaiting_payment", "paid",
            "assigned", "picked_up", "in_transit", "delivered", "canceled",
            name="orderstatus"
        ), nullable=False, server_default="draft"),
        sa.Column("marketplace", sa.Enum("wb", "ozon", name="marketplace"), nullable=False),
        sa.Column("destination_id", sa.Integer(), sa.ForeignKey("destinations.id"), nullable=False),
        sa.Column("company_name", sa.String(), nullable=True),
        sa.Column("payment_method", sa.Enum("cash", "cashless", name="paymentmethod"), nullable=True),
        sa.Column("ship_date", sa.Date(), nullable=False),
        sa.Column("arrival_date", sa.Date(), nullable=True),
        sa.Column("boxes_count", sa.Integer(), nullable=False),
        sa.Column("pallets_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_pallet_mode", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("service_pickup", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("service_palletizing", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("pickup_address_id", sa.Integer(), sa.ForeignKey("pickup_addresses.id"), nullable=True),
        sa.Column("price_delivery", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("price_pickup", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("price_palletizing", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("yookassa_payment_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_table(
        "driver_assignments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("driver_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
    )

    op.create_table(
        "driver_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("driver_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("file_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("table_name", sa.String(), nullable=False),
        sa.Column("record_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("old_data", sa.JSON(), nullable=True),
        sa.Column("new_data", sa.JSON(), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("driver_reports")
    op.drop_table("driver_assignments")
    op.drop_table("payments")
    op.drop_table("orders")
    op.drop_table("price_rules")
    op.drop_table("schedule_rules")
    op.drop_table("destinations")
    op.drop_table("pickup_addresses")
    op.drop_table("company_profiles")
    op.drop_table("users")
