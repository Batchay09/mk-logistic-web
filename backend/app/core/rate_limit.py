"""Rate limiting (slowapi) — общий экземпляр Limiter для всего приложения.

Ключ — реальный IP клиента с учётом reverse-proxy (nginx X-Forwarded-For),
иначе за прокси все пользователи попадут в один общий бакет.
"""
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=_client_key)
