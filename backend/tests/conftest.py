"""Общие фикстуры для тестов: изолированная in-memory SQLite-сессия с засеянными данными."""
import pytest_asyncio
from app.db.base import Base
from app.db.models import Destination, Marketplace, PriceRule
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest_asyncio.fixture
async def session() -> AsyncSession:
    """Свежая БД на каждый тест: одна destination (id=1) с тарифной сеткой.

    Тарифы (по убыванию min_qty, как читает калькулятор):
      >= 20 коробок → 100₽/коробка
      >= 1  коробка → 150₽/коробка
    """
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        dest = Destination(id=1, marketplace=Marketplace.WB, name="Коледино", is_active=True)
        s.add(dest)
        s.add_all([
            PriceRule(destination_id=1, min_qty=1, price=150),
            PriceRule(destination_id=1, min_qty=20, price=100),
        ])
        await s.commit()
        yield s

    await engine.dispose()
