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
│   │   ├── db/            # models.py, session.py
│   │   └── services/      # calculator, sticker, audit, reports, email (реюз из бота)
│   ├── migrations/        # Alembic (versions/0001_initial_schema, 0002_add_email_auth)
│   └── requirements.txt
├── frontend/              # Next.js 15
│   ├── app/               # App Router страницы
│   ├── components/        # ui/ (shadcn), features/, layout/
│   └── lib/               # api.ts, auth.ts
├── nginx/nginx.conf       # reverse proxy
├── docker-compose.yml
├── deploy.sh
└── .env.example
```

## Основные команды

```bash
# Backend локально
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8001

# Frontend локально
cd frontend
npm install
npm run dev      # http://localhost:3000

# TypeScript проверка
cd frontend && npx tsc --noEmit

# Линтинг backend
cd backend && ruff check . && mypy .

# Полный стек через Docker
docker compose up --build

# Деплой на VPS (требует sshpass: brew install sshpass)
./deploy.sh
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

## Переменные окружения (.env)

```
DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/mk_logistic
SECRET_KEY=

SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=

APP_URL=https://mk-logistic.ru
MANAGER_EMAILS=manager@example.com

ADMIN_EMAIL=
ADMIN_PASSWORD=
```

## Следующие шаги

1. Купить/настроить домен, обновить `nginx/nginx.conf` для HTTPS
2. Создать `.env` на VPS и запустить `./deploy.sh`
3. Подключить ЮKassa (shop_id + secret_key, настроить webhook URL)
4. Настроить SMTP Yandex (app password)
5. Создать страницы: `/verify-email`, `/reset-password`, `/profile`, `/companies`, `/support`, `/manager/broadcast`
