import asyncio
from io import BytesIO

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.db.models import Destination, PriceRule, ScheduleRule, Marketplace


def _read_excel_sync(content: bytes) -> pd.DataFrame:
    return pd.read_excel(BytesIO(content))


async def import_prices_from_excel(session: AsyncSession, file_content: bytes) -> str:
    try:
        df = await asyncio.to_thread(_read_excel_sync, file_content)
    except Exception as e:
        return f"Ошибка чтения Excel: {e}"

    required_cols = ["Marketplace", "Destination", "Price_1_10", "Price_11_plus"]
    missing = [col for col in required_cols if col not in df.columns]
    if missing:
        return f"Отсутствуют колонки: {', '.join(missing)}"

    updated_count = 0
    created_count = 0

    for _, row in df.iterrows():
        mp_str = str(row["Marketplace"]).lower().strip()
        dest_name = str(row["Destination"]).strip()

        try:
            mp = Marketplace(mp_str)
        except ValueError:
            continue

        result = await session.execute(
            select(Destination).where(Destination.marketplace == mp, Destination.name == dest_name)
        )
        dest = result.scalars().first()

        if not dest:
            dest = Destination(marketplace=mp, name=dest_name)
            session.add(dest)
            await session.flush()
            created_count += 1
            rules = [(0, 2, 0), (1, 3, 0), (2, 4, 0), (3, 6, 0), (4, 0, 1)] if mp == Marketplace.WB \
                else [(0, 3, 0), (1, 4, 0), (3, 0, 1)]
            for f, t, o in rules:
                session.add(ScheduleRule(destination_id=dest.id, weekday_from=f, weekday_to=t, week_offset=o))
        else:
            updated_count += 1

        await session.execute(delete(PriceRule).where(PriceRule.destination_id == dest.id))
        session.add(PriceRule(destination_id=dest.id, min_qty=1, price=float(row["Price_1_10"])))
        session.add(PriceRule(destination_id=dest.id, min_qty=11, price=float(row["Price_11_plus"])))

    await session.commit()
    return f"✅ Импорт завершен.\nСоздано: {created_count}\nОбновлено: {updated_count}"


def _generate_template_sync() -> BytesIO:
    df = pd.DataFrame({
        "Marketplace": ["wb", "ozon"],
        "Destination": ["Казань", "Москва"],
        "Price_1_10": [350, 400],
        "Price_11_plus": [300, 350],
    })
    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    output.seek(0)
    return output


async def generate_price_template() -> BytesIO:
    return await asyncio.to_thread(_generate_template_sync)
