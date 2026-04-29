# CLAUDE.md

Руководство для Claude Code при работе с репозиторием `mk-logistic-web`.

## Обзор проекта

МК Логистик — веб-сайт как альтернатива Telegram-боту (`MK tranzit`) для клиентов с заблокированным TG.  
Полный функционал бота: клиентская, менеджерская и админская части.

**GitHub:** https://github.com/Batchay09/mk-logistic-web  
**VPS:** `89.111.142.70` (тот же сервер, что и бот)

## Стек

- **Backend:** FastAPI + SQLAlchemy async + PostgreSQL + Alembic
- **Frontend:** Next.js 15 App Router + shadcn/ui + Tailwind CSS v4
- **Auth:** email + пароль, JWT в httpOnly cookie (`access_token`)
- **Платежи:** ЮKassa (webhook автоподтверждение)
- **Уведомления:** SMTP Yandex email (вместо Telegram)
- **Деплой:** Docker Compose + Nginx на VPS, `./deploy.sh`

## Структура

```
mk-logistic-web/
├── backend/               # FastAPI приложение
│   ├── app/
│   │   ├── api/           # роутеры: auth, client, manager, admin, calculator, payments, stickers
│   │   ├── core/          # config.py, security.py, dependencies.py
│   │   ├── db/            # base.py, models.py, session.py
│   │   ├── schemas/       # Pydantic схемы (request/response)
│   │   ├── services/      # calculator, sticker, audit, reports, email (реюз из бота)
│   │   ├── templates/     # Jinja2 шаблоны для email и PDF
│   │   └── main.py
│   ├── migrations/        # Alembic (versions/0001_initial_schema, 0002_add_email_auth)
│   └── requirements.txt
├── frontend/              # Next.js 15 (см. frontend/CLAUDE.md)
│   ├── app/               # App Router страницы
│   ├── components/        # ui/ (shadcn), features/, layout/
│   ├── lib/               # api.ts, auth.ts, utils.ts
│   └── middleware.ts      # cookie-проверка + редирект на /login
├── nginx/nginx.conf       # reverse proxy
├── docker-compose.yml         # production-стенд (Postgres внешняя сеть mk-shared)
├── docker-compose.local.yml   # локальный стенд (свой Postgres)
├── run-local.sh           # быстрый запуск на SQLite без Docker
├── deploy.sh              # rsync + docker compose up на VPS
└── .env.example
```

## Основные команды

```bash
# Самый быстрый локальный запуск (SQLite, без Docker)
./run-local.sh
#  → backend на :8001, frontend на :3000, миграции применятся автоматически

# Локальный стенд на Postgres через Docker
docker compose -f docker-compose.local.yml --env-file .env.local up --build

# Backend вручную (если нужна изоляция или отладка)
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8001

# Frontend вручную
cd frontend
npm install --legacy-peer-deps
npm run dev          # dev-сервер
npm run build        # production build
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript без компиляции

# Линтинг / типизация backend
cd backend && ruff check . && mypy .

# Новая Alembic-миграция при изменении app/db/models.py
cd backend && alembic revision --autogenerate -m "описание"
alembic upgrade head

# Staging деплой на VPS (mk.da-net.net)
bash deploy-staging.sh
# По умолчанию использует SSH-ключ через alias `mk-vps` из ~/.ssh/config
# (нужно один раз: ssh-add --apple-use-keychain ~/.ssh/id_ed25519)
# Fallback: SSHPASS='...' bash deploy-staging.sh — если ключ не настроен
```

## База данных

**Общая PostgreSQL с ботом.** Совместимость критична.

- Миграция `0002_add_email_auth.py` добавляет nullable поля: `email`, `password_hash`, `email_verified_at` к таблице `users` и `yookassa_payment_id` к `orders`
- Бот не трогает новые колонки — работает параллельно без изменений
- При изменении `backend/app/db/models.py` — синхронизировать с ботом (`MK tranzit/app/db/models.py`) и накатить Alembic-миграцию

## Фирменные цвета

```
#D4512B  — кирпично-оранжевый (primary, кнопки)
#B33D1A  — тёмный orange (hover)
#EAC9B0  — розово-бежевый (акцент, border)
#FBF0EA  — светло-персиковый (фон карточек)
```

В коде: `bg-[#D4512B]`, `hover:bg-[#B33D1A]`, `border-[#EAC9B0]`

## Архитектура Auth

- `POST /auth/register` → создаёт User (role=CLIENT) → email с токеном подтверждения
- `POST /auth/login` → httpOnly cookie `access_token` (JWT, 7 дней)
- `GET /auth/me` → возвращает текущего юзера
- Middleware `frontend/middleware.ts` — проверяет cookie, редиректит на `/login`
- `Depends(get_current_user)` в FastAPI для защищённых роутов

## Роли пользователей

| Роль | Доступ |
|------|--------|
| `client` | `/dashboard`, `/orders/*`, `/cart`, `/profile`, `/companies`, `/support` |
| `manager` | `/manager/*` (платежи, поиск, отчёты) |
| `admin` | `/admin/*` (пользователи, направления, тарифы, расписание, аудит) |

### Как создать admin / manager

**Bootstrap при старте бэкенда** (`backend/app/db/bootstrap.py`):
- `ADMIN_EMAIL` + `ADMIN_PASSWORD` → создаёт юзера с ролью admin (или повышает существующего)
- `MANAGER_EMAIL` + `MANAGER_PASSWORD` → создаёт юзера с ролью manager
- `MANAGER_EMAILS` (CSV) → повышает уже зарегистрированных до manager (без создания)
- Не понижает existing admin'ов автоматически

**Дальше — через UI**: `/admin/users` → карандаш → select роли → сохранить
(`PATCH /admin/users/{id}/role`).

## Сервисы (реюз из бота 1:1)

- `calculator.py` — `CalculatorService.calculate_price()`, `SchedulerService.get_available_dates()`. Паллетизация >= 11 коробок (`BOXES_PER_PALLET = 11`).
- `sticker.py` — PDF 58×40мм + QR TSV (tab-separated, 10 полей)
- `audit.py` — `log_change()`, `rollback()`, ретенция 30 дней
- `reports.py`, `import_prices.py`, `import_schedule.py` — Excel

## Особенности

- **YooKassa webhook** `POST /payments/yookassa/webhook` — `payment.succeeded` → статус PAID → PDF на email клиенту
- **SBP оплата** — реквизиты в dialog, менеджер подтверждает вручную
- **sticker.py fallback** — если `tg_id=None` (web-юзер), использует `user.id`
- **httpOnly cookie** secure=True только в production (`settings.is_production`)
- **Docker сеть** — `mk-web` (внутренняя) + `mk-shared` (external, общая с ботом для PostgreSQL)
- **Next.js standalone** — `output: "standalone"` в `next.config.ts` для минимального Docker-образа
- **Email best-effort** — `services/email.py::_send` глотает SMTP-ошибки и логирует warning. Бизнес-операции (заказ, оплата) не падают если SMTP не настроен или недоступен. Хосты с `example.com`/`localhost` пропускаются как заглушки.
- **Дизайн-система через токены** — никакого хардкода цветов в коде (`bg-[#D4512B]` ❌). Используем `bg-primary`, `text-foreground`, `border-border` — они автоматически адаптируются к light/dark теме. Полная справка → `frontend/DESIGN_SYSTEM.md`.

## Переменные окружения (.env)

Полный шаблон → `.env.example`. Ключевые блоки:

```
DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/mk_logistic
SECRET_KEY=

# SMTP — необязательны (best-effort). example.com → пропускается как заглушка.
SMTP_HOST=smtp.yandex.ru
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=

YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=

APP_URL=https://mk-logistic.ru

# Bootstrap admin/manager при старте бэкенда
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=
MANAGER_EMAIL=manager@example.com
MANAGER_PASSWORD=
# CSV — повышает уже зарегистрированных до manager и шлёт уведомления
MANAGER_EMAILS=manager@example.com
```

## Следующие шаги

1. Купить/настроить домен, обновить `nginx/nginx.conf` для HTTPS
2. Создать `.env` на VPS и запустить `./deploy.sh`
3. Подключить ЮKassa (shop_id + secret_key, настроить webhook URL)
4. Настроить SMTP Yandex (app password)
5. Создать страницы: `/verify-email`, `/reset-password`, `/profile`, `/companies`, `/support`, `/manager/broadcast`
