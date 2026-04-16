import asyncio
from io import BytesIO

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.db.models import Destination, ScheduleRule, Marketplace

WEEKDAY_MAP = {
    "пн": 0, "вт": 1, "ср": 2, "чт": 3, "пт": 4, "сб": 5, "вс": 6,
    "mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6,
    "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6,
}


def _parse_weekday(value) -> int:
    if isinstance(value, (int, float)):
        return int(value)
    val = str(value).lower().strip()
    if val in WEEKDAY_MAP:
        return WEEKDAY_MAP[val]
    raise ValueError(f"Неизвестный день недели: {value}")


def _read_excel_sync(content: bytes) -> pd.DataFrame:
    return pd.read_excel(BytesIO(content))


async def import_schedule_from_excel(session: AsyncSession, file_content: bytes) -> str:
    try:
        df = await asyncio.to_thread(_read_excel_sync, file_content)
    except Exception as e:
        return f"Ошибка чтения Excel: {e}"

    required_cols = ["Marketplace", "Destination", "WeekdayFrom", "WeekdayTo", "WeekOffset"]
    missing = [col for col in required_cols if col not in df.columns]
    if missing:
        return f"Отсутствуют колонки: {', '.join(missing)}"

    dest_rules: dict = {}
    errors = []

    for idx, row in df.iterrows():
        try:
            mp_str = str(row["Marketplace"]).lower().strip()
            dest_name = str(row["Destination"]).strip()
            mp = Marketplace(mp_str)
            weekday_from = _parse_weekday(row["WeekdayFrom"])
            weekday_to = _parse_weekday(row["WeekdayTo"])
            week_offset = int(row["WeekOffset"])
            key = (mp, dest_name)
            if key not in dest_rules:
                dest_rules[key] = []
            dest_rules[key].append((weekday_from, weekday_to, week_offset))
        except Exception as e:
            errors.append(f"Строка {idx + 2}: {e}")

    updated_count = 0
    created_count = 0

    for (mp, dest_name), rules in dest_rules.items():
        result = await session.execute(
            select(Destination).where(Destination.marketplace == mp, Destination.name == dest_name)
        )
        dest = result.scalars().first()
        if not dest:
            dest = Destination(marketplace=mp, name=dest_name, is_active=True)
            session.add(dest)
            await session.flush()
            created_count += 1
        else:
            updated_count += 1

        await session.execute(delete(ScheduleRule).where(ScheduleRule.destination_id == dest.id))
        for f, t, o in rules:
            session.add(ScheduleRule(destination_id=dest.id, weekday_from=f, weekday_to=t, week_offset=o))

    await session.commit()
    result_text = f"✅ Импорт расписания завершен.\nСоздано: {created_count}\nОбновлено: {updated_count}"
    if errors:
        result_text += f"\n\n⚠️ Ошибки ({len(errors)}):\n" + "\n".join(errors[:5])
        if len(errors) > 5:
            result_text += f"\n...и ещё {len(errors) - 5}"
    return result_text


def _generate_template_sync() -> BytesIO:
    df = pd.DataFrame({
        "Marketplace": ["wb", "wb", "ozon"],
        "Destination": ["Коледино", "Коледино", "Хоругвино"],
        "WeekdayFrom": [0, 1, 0],
        "WeekdayTo": [2, 3, 3],
        "WeekOffset": [0, 0, 0],
    })
    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
        info = pd.DataFrame({
            "Колонка": ["Marketplace", "Destination", "WeekdayFrom", "WeekdayTo", "WeekOffset"],
            "Описание": [
                "wb или ozon",
                "Название направления",
                "День сдачи (0=Пн, 6=Вс или Пн/Вт/Ср...)",
                "День доставки (0=Пн, 6=Вс)",
                "Сдвиг недели (0=текущая, 1=следующая)",
            ],
        })
        info.to_excel(writer, sheet_name="Справка", index=False)
    output.seek(0)
    return output


async def generate_schedule_template() -> BytesIO:
    return await asyncio.to_thread(_generate_template_sync)
