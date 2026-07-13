"""Email-уведомления через SMTP (замена Telegram-уведомлений)"""
import html
import logging
import re
import ssl
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid, parseaddr
from typing import List, Optional

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)

# Хосты, которые считаются заглушкой (staging/dev): не пытаемся к ним коннектиться.
_STUB_HOSTS = ("example.com", "example.org", "localhost")


def _html_to_text(html: str) -> str:
    """Грубое HTML→text для текстовой альтернативы письма.
    Ссылки превращаем в 'текст: url', чтобы получатель и спам-фильтры видели реальный URL.
    """
    html = re.sub(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', r'\2: \1', html, flags=re.S | re.I)
    html = re.sub(r'<br\s*/?>', '\n', html, flags=re.I)
    html = re.sub(r'</(p|h\d|div)>', '\n', html, flags=re.I)
    text = re.sub(r'<[^>]+>', '', html)
    text = re.sub(r'\n[ \t]*\n+', '\n\n', text)
    return text.strip()


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
    text: Optional[str] = None,
) -> None:
    """Отправить email. Никогда не пробрасывает SMTP-ошибки наружу:
    уведомления — best-effort, бизнес-операции (заказ, оплата) не должны падать
    из-за временных проблем со связью или незаконфигуренного SMTP.

    Письмо собирается как multipart/alternative (text + html): HTML-only письма
    строгие фильтры (Mail.ru, Yandex) штрафуют как спам.
    attachments: list of (filename, bytes)
    text: текстовая версия; если не задана — генерируется из html.
    """
    if not _smtp_configured():
        logger.warning("SMTP не настроен (host=%s) — письмо '%s' для %s НЕ отправлено",
                       settings.SMTP_HOST, subject, to)
        return

    # text + html как равноправные альтернативы (text первым — так требует RFC)
    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(text or _html_to_text(html), "plain", "utf-8"))
    alt.attach(MIMEText(html, "html", "utf-8"))

    if attachments:
        msg: MIMEMultipart = MIMEMultipart("mixed")
        msg.attach(alt)
        for filename, data in attachments:
            part = MIMEApplication(data, Name=filename)
            part["Content-Disposition"] = f'attachment; filename="{filename}"'
            msg.attach(part)
    else:
        msg = alt

    # Домен отправителя — для Message-ID он должен совпадать с From (репутация).
    from_addr = parseaddr(settings.EMAIL_FROM)[1] or settings.SMTP_USER or ""
    sender_domain = from_addr.split("@")[-1] if "@" in from_addr else None

    msg["From"] = settings.EMAIL_FROM
    msg["To"] = ", ".join(to)
    msg["Subject"] = subject
    # Date и Message-ID обязательны: письмо без них строгие фильтры (Mail.ru) режут как спам.
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=sender_domain) if sender_domain else make_msgid()
    if from_addr:
        msg["Reply-To"] = formataddr(("МК Логистик", from_addr))

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
        logger.info("Email '%s' отправлен: %s", subject, to)
    except (aiosmtplib.errors.SMTPException, OSError) as exc:
        # OSError ловит DNS-резолюшен (gaierror) и сетевые сбои.
        logger.warning("SMTP send failed for '%s' to %s: %s", subject, to, exc)


async def send_verification_email(to: str, token: str) -> None:
    url = f"{settings.APP_URL}/verify-email?token={token}"
    html = f"""
    <h2>Подтверждение email — МК Логистик</h2>
    <p>Здравствуйте! Для завершения регистрации в личном кабинете МК Логистик
       перейдите по кнопке ниже:</p>
    <a href="{url}" style="background:#D4512B;color:#fff;padding:12px 24px;
       border-radius:6px;text-decoration:none;display:inline-block;font-size:16px;">
       Подтвердить email
    </a>
    <p style="font-size:13px;">Если кнопка не работает, скопируйте ссылку в браузер:<br>
       <a href="{url}">{url}</a></p>
    <p style="color:#888;font-size:12px;">Ссылка действительна 24 часа.
       Если вы не регистрировались на сайте МК Логистик, просто проигнорируйте это письмо.</p>
    """
    text = (
        "Подтверждение email — МК Логистик\n\n"
        "Для завершения регистрации перейдите по ссылке:\n"
        f"{url}\n\n"
        "Ссылка действительна 24 часа. Если вы не регистрировались — проигнорируйте письмо."
    )
    await _send([to], "Подтверждение email — МК Логистик", html, text=text)


async def send_reset_password_email(to: str, token: str) -> None:
    url = f"{settings.APP_URL}/reset-password?token={token}"
    html = f"""
    <h2>Сброс пароля — МК Логистик</h2>
    <p>Вы запросили сброс пароля для аккаунта в личном кабинете МК Логистик.
       Чтобы задать новый пароль, перейдите по кнопке ниже:</p>
    <a href="{url}" style="background:#D4512B;color:#fff;padding:12px 24px;
       border-radius:6px;text-decoration:none;display:inline-block;font-size:16px;">
       Сбросить пароль
    </a>
    <p style="font-size:13px;">Если кнопка не работает, скопируйте ссылку в браузер:<br>
       <a href="{url}">{url}</a></p>
    <p style="color:#888;font-size:12px;">Ссылка действительна 2 часа.
       Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
    """
    text = (
        "Сброс пароля — МК Логистик\n\n"
        "Вы запросили сброс пароля. Чтобы задать новый, перейдите по ссылке:\n"
        f"{url}\n\n"
        "Ссылка действительна 2 часа. Если вы не запрашивали сброс — проигнорируйте письмо."
    )
    await _send([to], "Сброс пароля — МК Логистик", html, text=text)


async def notify_managers_new_order(order_ids: List[int], client_name: str, total: float,
                                     pickup_info: str = "") -> None:
    if not settings.manager_email_list:
        return
    ids_str = ", ".join(f"#{i}" for i in order_ids)
    # Экранируем пользовательский ввод (client_name/pickup_info), чтобы клиент
    # не смог внедрить произвольный HTML/ссылки в письмо менеджеру.
    client_name_safe = html.escape(client_name)
    pickup_safe = html.escape(pickup_info)
    body_html = f"""
    <h2>Новый заказ — МК Логистик</h2>
    <p><b>Клиент:</b> {client_name_safe}</p>
    <p><b>Заказы:</b> {ids_str}</p>
    <p><b>Сумма:</b> {total:.0f} ₽</p>
    {"<p><b>Забор:</b> " + pickup_safe + "</p>" if pickup_info else ""}
    <p>Откройте раздел <b>Менеджер → Оплаты</b> для проверки.</p>
    """
    await _send(settings.manager_email_list, f"Новый заказ {ids_str} — МК Логистик", body_html)


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


async def send_broadcast(recipients: List[str], subject: str, message: str) -> None:
    """Рассылка менеджера по клиентам. Каждому получателю — отдельным письмом
    (не раскрываем список адресов друг другу). Best-effort: ошибки уже глотаются в _send.
    Экранируем subject и message, чтобы менеджер не мог внедрить произвольный HTML.
    """
    subject_safe = html.escape(subject)
    message_safe = html.escape(message).replace("\n", "<br>")
    body_html = f"""
    <h2>{subject_safe}</h2>
    <p>{message_safe}</p>
    <p style="color:#888;font-size:12px;">С уважением, команда МК Логистик.</p>
    """
    for to in recipients:
        await _send([to], subject, body_html)


async def notify_managers_support(client_name: str, client_phone: str, message: str,
                                   active_orders: str = "") -> None:
    if not settings.manager_email_list:
        return
    # Экранируем весь пользовательский ввод перед вставкой в HTML письма.
    client_name_safe = html.escape(client_name)
    client_phone_safe = html.escape(client_phone)
    message_safe = html.escape(message).replace("\n", "<br>")
    body_html = f"""
    <h2>Обращение от клиента — МК Логистик</h2>
    <p><b>Клиент:</b> {client_name_safe}</p>
    <p><b>Телефон:</b> {client_phone_safe}</p>
    <p><b>Сообщение:</b><br>{message_safe}</p>
    {"<p><b>Активные заказы:</b><br>" + html.escape(active_orders) + "</p>" if active_orders else ""}
    """
    await _send(settings.manager_email_list, f"Обращение от {html.escape(client_name)} — МК Логистик", body_html)
