import enum
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    BigInteger, String, Boolean, ForeignKey, Integer,
    Numeric, Date, DateTime, Enum, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


def _enum(enum_cls):
    """SQLAlchemy Enum, сериализующий по .value (lowercase),
    так как миграции создают enum'ы с lowercase значениями.
    Без этого SQLAlchemy шлёт name (uppercase) → 'invalid input value for enum'.
    """
    return Enum(enum_cls, values_callable=lambda obj: [e.value for e in obj])


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    DRIVER = "driver"
    CLIENT = "client"


class Marketplace(str, enum.Enum):
    WB = "wb"
    OZON = "ozon"


class OrderStatus(str, enum.Enum):
    DRAFT = "draft"
    NEW = "new"
    CONFIRMED = "confirmed"
    AWAITING_PAYMENT = "awaiting_payment"
    PAID = "paid"
    ASSIGNED = "assigned"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELED = "canceled"


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CASHLESS = "cashless"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tg_id: Mapped[Optional[int]] = mapped_column(BigInteger, unique=True, index=True, nullable=True)
    full_name: Mapped[Optional[str]] = mapped_column(String)
    username: Mapped[Optional[str]] = mapped_column(String)
    role: Mapped[UserRole] = mapped_column(_enum(UserRole), default=UserRole.CLIENT)
    phone: Mapped[Optional[str]] = mapped_column(String)
    company_name: Mapped[Optional[str]] = mapped_column(String)
    policy_accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Web auth fields (nullable — tg-users from the bot don't have these)
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True, nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    orders: Mapped[List["Order"]] = relationship("Order", back_populates="user", foreign_keys="Order.user_id")
    addresses: Mapped[List["PickupAddress"]] = relationship("PickupAddress", back_populates="user")
    assigned_orders: Mapped[List["DriverAssignment"]] = relationship("DriverAssignment", back_populates="driver")
    company_profiles: Mapped[List["CompanyProfile"]] = relationship("CompanyProfile", back_populates="user")

    def __str__(self) -> str:
        return f"{self.full_name or self.email or 'User'} ({self.id})"


class CompanyProfile(Base):
    __tablename__ = "company_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    company_name: Mapped[str] = mapped_column(String)

    user: Mapped["User"] = relationship("User", back_populates="company_profiles")

    def __str__(self) -> str:
        return self.company_name


class PickupAddress(Base):
    __tablename__ = "pickup_addresses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    city: Mapped[str] = mapped_column(String)
    street: Mapped[str] = mapped_column(String)
    house: Mapped[str] = mapped_column(String)
    comment: Mapped[Optional[str]] = mapped_column(String)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship("User", back_populates="addresses")

    def __str__(self) -> str:
        return f"{self.city}, {self.street}, {self.house}"


class Destination(Base):
    __tablename__ = "destinations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    marketplace: Mapped[Marketplace] = mapped_column(_enum(Marketplace))
    name: Mapped[str] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    schedule_rules: Mapped[List["ScheduleRule"]] = relationship("ScheduleRule", back_populates="destination")
    price_rules: Mapped[List["PriceRule"]] = relationship("PriceRule", back_populates="destination")

    def __str__(self) -> str:
        return f"{self.name} ({self.marketplace.value.upper()})"


class ScheduleRule(Base):
    __tablename__ = "schedule_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    destination_id: Mapped[int] = mapped_column(ForeignKey("destinations.id"))
    weekday_from: Mapped[int] = mapped_column(Integer)  # 0=Mon
    weekday_to: Mapped[int] = mapped_column(Integer)    # 0=Mon
    week_offset: Mapped[int] = mapped_column(Integer, default=0)

    destination: Mapped["Destination"] = relationship("Destination", back_populates="schedule_rules")

    def __str__(self) -> str:
        days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
        d_from = days[self.weekday_from] if 0 <= self.weekday_from < 7 else "?"
        d_to = days[self.weekday_to] if 0 <= self.weekday_to < 7 else "?"
        return f"{d_from} -> {d_to} (+{self.week_offset} нед.)"


class PriceRule(Base):
    __tablename__ = "price_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    destination_id: Mapped[int] = mapped_column(ForeignKey("destinations.id"))
    min_qty: Mapped[int] = mapped_column(Integer, default=1)
    price: Mapped[float] = mapped_column(Numeric(10, 2))

    destination: Mapped["Destination"] = relationship("Destination", back_populates="price_rules")

    def __str__(self) -> str:
        return f"> {self.min_qty} шт: {self.price}₽"


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[OrderStatus] = mapped_column(_enum(OrderStatus), default=OrderStatus.DRAFT)
    marketplace: Mapped[Marketplace] = mapped_column(_enum(Marketplace))
    destination_id: Mapped[int] = mapped_column(ForeignKey("destinations.id"))

    company_name: Mapped[Optional[str]] = mapped_column(String)
    payment_method: Mapped[Optional[PaymentMethod]] = mapped_column(_enum(PaymentMethod), nullable=True)

    ship_date: Mapped[date] = mapped_column(Date)
    arrival_date: Mapped[Optional[date]] = mapped_column(Date)

    boxes_count: Mapped[int] = mapped_column(Integer)
    pallets_count: Mapped[int] = mapped_column(Integer, default=0)
    is_pallet_mode: Mapped[bool] = mapped_column(Boolean, default=False)

    service_pickup: Mapped[bool] = mapped_column(Boolean, default=False)
    service_palletizing: Mapped[bool] = mapped_column(Boolean, default=False)

    pickup_address_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pickup_addresses.id"), nullable=True)

    price_delivery: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    price_pickup: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    price_palletizing: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0)

    # YooKassa payment id for tracking
    yookassa_payment_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="orders")
    destination: Mapped["Destination"] = relationship("Destination")
    pickup_address: Mapped[Optional["PickupAddress"]] = relationship("PickupAddress")
    driver_assignment: Mapped[Optional["DriverAssignment"]] = relationship("DriverAssignment", back_populates="order")
    payments: Mapped[List["Payment"]] = relationship("Payment", back_populates="order")

    def __str__(self) -> str:
        return f"Заказ #{self.id} ({self.total_amount}₽)"


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    status: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order: Mapped["Order"] = relationship("Order", back_populates="payments")

    def __str__(self) -> str:
        return f"Оплата #{self.id} ({self.amount}₽)"


class DriverAssignment(Base):
    __tablename__ = "driver_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    driver_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    order: Mapped["Order"] = relationship("Order", back_populates="driver_assignment")
    driver: Mapped["User"] = relationship("User", back_populates="assigned_orders")

    def __str__(self) -> str:
        return f"Рейс #{self.id}"


class DriverReport(Base):
    __tablename__ = "driver_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    driver_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    file_id: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    table_name: Mapped[str] = mapped_column(String)
    record_id: Mapped[int] = mapped_column(Integer)
    action: Mapped[str] = mapped_column(String)
    old_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    new_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[Optional["User"]] = relationship("User")

    def __str__(self) -> str:
        return f"AuditLog #{self.id}: {self.action} {self.table_name}[{self.record_id}]"
