"""Email-уведомления через Yandex SMTP (замена Telegram-уведомлений)"""
import logging
import ssl
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)

# Хосты, которые считаются заглушкой (staging/dev): не пытаемся к ним коннектиться.
_STUB_HOSTS = ("example.com", "example.org", "localhost")


def _smtp_configured() -> bool:
    """SMTP считается настроенным, если есть креды и host не похож на заглушку."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        return False
    host = (settings.SMTP_HOST or "").lower()
    return not any(stub in host for stub in _STUB_HOSTS)


async def _send(
    to: List[str],
    subject: str,
    html: str,
    attachments: Optional[List[tuple]] = None,
) -> None:
    """Отправить email. Никогда не пробрасывает SMTP-ошибки наружу:
    уведомления — best-effort, бизнес-операции (заказ, оплата) не должны падать
    из-за временных проблем со связью или незаконфигуренного SMTP.
    attachments: list of (filename, bytes)
    """
    if not _smtp_configured():
        logger.info("SMTP не настроен (host=%s) — пропуск '%s' для %s",
                    settings.SMTP_HOST, subject, to)
        return

    msg = MIMEMultipart("mixed")
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = ", ".join(to)
    msg["Subject"] = subject
    msg.attach(MIMEText(html, "html", "utf-8"))

    if attachments:
        for filename, data in attachments:
            part = MIMEApplication(data, Name=filename)
            part["Content-Disposition"] = f'attachment; filename="{filename}"'
            msg.attach(part)

    context = ssl.create_default_context()
    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            use_tls=True,
            tls_context=context,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
        )
    except (aiosmtplib.errors.SMTPException, OSError) as exc:
        # OSError ловит DNS-резолюшен (gaierror) и сетевые сбои.
        logger.warning("SMTP send failed for '%s' to %s: %s", subject, to, exc)


async def send_verification_email(to: str, token: str) -> None:
    url = f"{settings.APP_URL}/verify-email?token={token}"
    html = f"""
    <h2>Подтверждение email — МК Логистик</h2>
    <p>Для завершения регистрации нажмите кнопку:</p>
    <a href="{url}" style="background:#D4512B;color:#fff;padding:12px 24px;
       border-radius:6px;text-decoration:none;display:inline-block;font-size:16px;">
       Подтвердить email
    </a>
    <p style="color:#888;font-size:12px;">Ссылка действительна 24 часа.</p>
    """
    await _send([to], "Подтверждение email — МК Логистик", html)


async def send_reset_password_email(to: str, token: str) -> None:
    url = f"{settings.APP_URL}/reset-password?token={token}"
    html = f"""
    <h2>Сброс пароля — МК Логистик</h2>
    <p>Для сброса пароля нажмите кнопку:</p>
    <a href="{url}" style="background:#D4512B;color:#fff;padding:12px 24px;
       border-radius:6px;text-decoration:none;display:inline-block;font-size:16px;">
       Сбросить пароль
    </a>
    <p style="color:#888;font-size:12px;">Ссылка действительна 2 часа.</p>
    """
    await _send([to], "Сброс пароля — МК Логистик", html)


async def notify_managers_new_order(order_ids: List[int], client_name: str, total: float,
                                     pickup_info: str = "") -> None:
    if not settings.manager_email_list:
        return
    ids_str = ", ".join(f"#{i}" for i in order_ids)
    html = f"""
    <h2>Новый заказ — МК Логистик</h2>
    <p><b>Клиент:</b> {client_name}</p>
    <p><b>Заказы:</b> {ids_str}</p>
    <p><b>Сумма:</b> {total:.0f} ₽</p>
    {"<p><b>Забор:</b> " + pickup_info + "</p>" if pickup_info else ""}
    <p>Откройте раздел <b>Менеджер → Оплаты</b> для проверки.</p>
    """
    await _send(settings.manager_email_list, f"Новый заказ {ids_str} — МК Логистик", html)


async def notify_client_payment_confirmed(
    to: str,
    order_id: int,
    pdf_bytes: Optional[bytes] = None,
) -> None:
    attachments = [(f"stickers_order_{order_id}.pdf", pdf_bytes)] if pdf_bytes else None
    html = f"""
    <h2>Оплата подтверждена — МК Логистик</h2>
    <p>Ваш заказ <b>#{order_id}</b> оплачен. Стикеры для наклейки во вложении.</p>
    <p>Данные для пропуска придут в день отгрузки.</p>
    """
    await _send([to], f"Заказ #{order_id} оплачен — МК Логистик", html, attachments)


async def notify_client_order_canceled(to: str, order_id: int) -> None:
    html = f"""
    <h2>Заказ отменён — МК Логистик</h2>
    <p>Ваш заказ <b>#{order_id}</b> был отменён менеджером.
       Свяжитесь с нами для уточнения деталей.</p>
    """
    await _send([to], f"Заказ #{order_id} отменён — МК Логистик", html)


async def notify_managers_support(client_name: str, client_phone: str, message: str,
                                   active_orders: str = "") -> None:
    if not settings.manager_email_list:
        return
    html = f"""
    <h2>Обращение от клиента — МК Логистик</h2>
    <p><b>Клиент:</b> {client_name}</p>
    <p><b>Телефон:</b> {client_phone}</p>
    <p><b>Сообщение:</b><br>{message}</p>
    {"<p><b>Активные заказы:</b><br>" + active_orders + "</p>" if active_orders else ""}
    """
    await _send(settings.manager_email_list, f"Обращение от {client_name} — МК Логистик", html)
