"""Регрессия RFC 5322: From с кириллическим именем должен сохранять адрес
в открытом виде (Mail.ru отклоняет письма, где закодирован весь заголовок)."""
from email.mime.multipart import MIMEMultipart
from email.utils import parseaddr

from app.services.email import format_from_header


def test_cyrillic_name_keeps_plain_address():
    header = format_from_header("МК Логистик <mk-logistic@da-net.net>")
    assert "<mk-logistic@da-net.net>" in header
    assert parseaddr(header)[1] == "mk-logistic@da-net.net"


def test_serialized_message_has_parseable_from():
    msg = MIMEMultipart("alternative")
    msg["From"] = format_from_header("МК Логистик <mk-logistic@da-net.net>")
    from_line = next(
        line for line in msg.as_string().splitlines() if line.startswith("From:")
    )
    # Адрес не должен прятаться внутрь base64 encoded-word
    assert "mk-logistic@da-net.net" in from_line


def test_ascii_name_untouched():
    header = format_from_header("MK Logistic <noreply@example.com>")
    assert header == "MK Logistic <noreply@example.com>"


def test_bare_address_passthrough():
    assert format_from_header("noreply@example.com") == "noreply@example.com"
