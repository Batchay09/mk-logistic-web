"""Безопасная обработка вложений-изображений для чата.

Принцип: не доверять клиенту. Формат определяем сами (Pillow), пере-кодируем
в чистый буфер — это сбрасывает EXIF/метаданные и убивает «полиглоты»
(файлы, валидные и как картинка, и как скрипт). SVG НЕ поддерживаем — вектор
опасен XSS.
"""
import io
from urllib.parse import quote

from PIL import Image

MAX_UPLOAD_BYTES = 5 * 1024 * 1024          # 5 МБ
MAX_PIXELS = 40_000_000                       # ~40 Мп — защита от decompression bomb

# Разрешённые форматы Pillow → отдаваемый mime
_ALLOWED = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}


class AttachmentError(Exception):
    """Проблема с загруженным файлом (невалидный/большой/запрещённый формат)."""


def safe_filename(name: str | None) -> str:
    """Имя для показа в UI (хранится в БД). Убираем путь и опасные символы.
    Юникод (кириллица) сохраняем — для заголовка используется content_disposition()."""
    base = (name or "image").replace("\\", "/").split("/")[-1]
    base = base.replace('"', "").replace("\r", "").replace("\n", "").strip()
    return base[:100] or "image"


def content_disposition(name: str | None) -> str:
    """Собирает безопасный Content-Disposition.

    Заголовок HTTP кодируется latin-1 → кириллица в `filename="..."` роняет ответ
    (UnicodeEncodeError → 500). Отдаём ASCII-fallback в filename и полное имя через
    RFC 5987 `filename*=UTF-8''<percent-encoded>` (только ASCII-символы).
    """
    safe = safe_filename(name)
    ascii_fallback = safe.encode("ascii", "ignore").decode().strip() or "image"
    return f"inline; filename=\"{ascii_fallback}\"; filename*=UTF-8''{quote(safe)}"


def process_image(raw: bytes) -> tuple[bytes, str]:
    """Валидирует и пере-кодирует изображение.

    Возвращает (чистые_байты, mime). Бросает AttachmentError при любой проблеме.
    """
    if not raw:
        raise AttachmentError("Пустой файл")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise AttachmentError("Файл слишком большой (максимум 5 МБ)")

    try:
        img = Image.open(io.BytesIO(raw))
        fmt = (img.format or "").upper()
    except Exception:
        raise AttachmentError("Файл не является изображением")

    if fmt not in _ALLOWED:
        raise AttachmentError("Разрешены только изображения JPEG, PNG или WEBP")

    width, height = img.size
    if width * height > MAX_PIXELS:
        raise AttachmentError("Слишком большое разрешение изображения")

    # Пере-кодируем в чистый буфер (сброс метаданных, защита от полиглотов)
    out = io.BytesIO()
    try:
        if fmt == "JPEG":
            img.convert("RGB").save(out, format="JPEG", quality=85)
        elif fmt == "PNG":
            img.save(out, format="PNG", optimize=True)
        else:  # WEBP
            img.save(out, format="WEBP", quality=85)
    except Exception:
        raise AttachmentError("Не удалось обработать изображение")

    return out.getvalue(), _ALLOWED[fmt]
