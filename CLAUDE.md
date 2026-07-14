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
# Вход по SSH-ключу id_ed25519 через alias `mk-vps` (~/.ssh/config → IdentityFile).
# Ключ уже залит в authorized_keys на сервере. Пароль на сервере ОТКЛЮЧЁН
# (PasswordAuthentication no) — SSHPASS-fallback больше не работает.
# Ключ с passphrase: если после ребута «Permission denied (publickey)» —
# это пустой ssh-agent, лечится: ssh-add --apple-use-keychain ~/.ssh/id_ed25519
# (в ~/.ssh/config для mk-vps стоят AddKeysToAgent/UseKeychain — нужен один запуск).
# Проверка доступа:  ssh mk-vps "hostname"
```

## База данных

**Общая PostgreSQL с ботом.** Совместимость критична.

- Миграция `0002_add_email_auth.py` добавляет nullable поля: `email`, `password_hash`, `email_verified_at` к таблице `users` и `yookassa_payment_id` к `orders`; `0005_add_pd_consent.py` — `pd_consent_at` (момент согласия на ПД при веб-регистрации); `0006_email_otp.py` — таблица одноразовых кодов (веб-only) + staff помечены подтверждёнными; `0007_add_manager_note.py` — `manager_note` в `orders` (заметка менеджера, клиенту не видна)
- Бот не трогает новые колонки — работает параллельно без изменений (веб-only nullable колонки в модель бота не добавляем)
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

- `POST /auth/register` → создаёт User (role=CLIENT), шлёт **6-значный код** на почту; cookie НЕ ставится, телефон обязателен
- `POST /auth/register/confirm {email, code}` → верификация почты + httpOnly cookie → залогинен
- `POST /auth/login` → httpOnly cookie `access_token` (JWT, **30 дней**, скользящее продление в `get_current_user` при остатке < половины срока); неподтверждённый email → 403 `email_not_verified` + автоотправка кода (фронт показывает экран ввода кода)
- Сброс пароля: `POST /auth/reset-password {email}` → код → `POST /auth/reset-confirm {email, code, new_password}` (успех засчитывает верификацию почты); `POST /auth/resend-code {email, purpose}` — переотправка. Анти-enumeration: всегда `{ok: true}`
- Коды — `services/otp.py` + таблица `email_otp`: HMAC-SHA256, TTL 15 мин, 5 попыток, один активный код на (email, purpose)
- `GET /auth/me` → возвращает текущего юзера
- Middleware `frontend/middleware.ts` — проверяет cookie, редиректит на `/login`
- `Depends(get_current_user)` в FastAPI для защищённых роутов
- Bootstrap-аккаунты admin/manager создаются сразу подтверждёнными (ящики могут не существовать)
- Фолбэк при недоставке кодов: `POST /admin/users/{id}/verify-email` — админ подтверждает почту вручную (кнопка в `/admin/users`); на экранах кода — ссылка на `/contacts`

## Роли пользователей

| Роль | Доступ |
|------|--------|
| `client` | `/dashboard`, `/orders/*`, `/cart`, `/profile`, `/companies`, `/support` + плавающий чат-виджет поддержки |
| `manager` | `/manager/*` — dashboard, **orders** (вкладки по этапам + таймлайн, провал в `/manager/orders/[id]`), **orders/table** (Excel-режим: инлайн-правки, bulk-сохранение с аудитом), payments (проверка оплат), search, reports, **chats** (инбокс поддержки), **broadcast** (рассылка) |
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

- **Оплата — только ЮKassa (безнал)**. Корзина «Безналичный» → `POST /payments/yookassa/create` напрямую (заказы остаются NEW, пока платёж не создан) → редирект на оплату. СБП-перевод по реквизитам с ручным подтверждением **убран** (вместе с захардкоженными реквизитами). Кнопка «Наличные» осталась.
- **YooKassa webhook** `POST /payments/yookassa/webhook` — `payment.succeeded` (верификация через API, не по телу) → статус PAID → PDF-стикеры на email клиенту + email-уведомление менеджерам.
- **Пайплайн заказа у менеджера** — `/manager/orders` вкладки по этапам (К отправке/В работе/Забран/В пути/Доставлен, `GET /manager/orders/by-status`, `/orders/counts`), продвижение `POST /manager/orders/{id}/advance` (умный next: «Забрано»/PICKED_UP только при `service_pickup`). Таймлайн этапов в карточке заказа.
- **Публичные юр-страницы** — `app/(legal)/`: `/offer`, `/privacy`, `/delivery`, `/contacts`. Реквизиты ИП — единый источник `frontend/lib/company.ts` → футер (`SiteFooter`) на всех публичных страницах. Регистрация требует согласия на обработку ПД (152-ФЗ). Всё для прохождения модерации эквайринга.
- **Паллетизация** — паллетный режим `is_pallet_mode` только от 11 коробок (`BOXES_PER_PALLET`); доставка считается по коробкам со ступенчатым тарифом (`PriceRule.min_qty`: при 11+ включается сниженный «паллетный» тариф); обмотка паллет **всегда включена** — +500 ₽ за каждую полную паллету, без переключателя (в боте услуга пока опциональна — расхождение осознанное, см. TODO).
- **Таблица заказов (Excel-режим)** — `/manager/orders/table`: `GET /manager/orders/grid` (фильтры/пагинация), `PATCH /manager/orders/bulk` (частичные ошибки по-строчно, каждая правка в аудит-журнал). Статус меняется только внутри пайплайна исполнения (+отмена, +откат назад); до оплаты — только через «Проверку оплат» (не обойти стикеры/email). Rollback правок заказов из аудита не поддержан.
- **Стикеры** — нал (`confirmed`): доступны сразу после оформления; безнал: только после оплаты ЮKassa (`paid`+; `awaiting_payment` исключён — платёж создан ≠ оплачен). Гейт: `stickers.py::ALLOWED_STATUSES` + зеркало `frontend/app/orders/[id]`.
- **sticker.py fallback** — если `tg_id=None` (web-юзер), использует `user.id`
- **httpOnly cookie** secure=True только в production (`settings.is_production`)
- **Docker сеть** — `mk-web` (внутренняя) + `mk-shared` (external, общая с ботом для PostgreSQL)
- **Next.js standalone** — `output: "standalone"` в `next.config.ts` для минимального Docker-образа
- **Email best-effort** — `services/email.py::_send` глотает SMTP-ошибки и логирует warning. Бизнес-операции (заказ, оплата) не падают если SMTP не настроен или недоступен. Хосты с `example.com`/`localhost` пропускаются как заглушки.
- **Email From — только через `format_from_header`** (⚠️ грабли): наивное `msg["From"] = "МК Логистик <...>"` кодирует кириллический заголовок base64 ЦЕЛИКОМ вместе с адресом — нарушение RFC 5322, Mail.ru отклоняет 550 «spam». Имя кодируется отдельно от адреса. OTP-коды в логах маскируются (`re.sub` в success-логе `_send`).
- **Чат поддержки** — переписка клиент↔менеджер прямо на сайте (`support_conversations`/`support_messages`, миграции 0003–0004), обновление polling 3–5 сек. У клиента — плавающий виджет `ChatWidget` на всех страницах кабинета (пункт «Поддержка» открывает его), у менеджера — инбокс `/manager/chats` с живым бейджем непрочитанного. Вложения-картинки (JPEG/PNG/WEBP ≤5 МБ) валидируются и пере-кодируются через Pillow (`services/attachments.py`), хранятся в БД (`attachment_data`, `deferred`), отдаются auth-gated. Эндпоинты: `/client/chat*`, `/manager/chats*`.
- **Безопасность** — rate-limiting (slowapi, ключ по `X-Real-IP` — не подделать; в т.ч. на checkout и создании платежа), fail-fast `SECRET_KEY` в prod, webhook ЮKassa верифицируется через API (не по телу), URL возврата после оплаты строится на бэке от `APP_URL` (клиент шлёт только `return_path`), `order_ids` с лимитом и дедупом, checkout принимает только `cash` (безнал — исключительно `/payments/yookassa/create`), согласие на ПД фиксируется в `users.pd_consent_at`, экранирование HTML в письмах, валидация/пере-кодирование загружаемых картинок. Пройден аудит — CRITICAL нет.
- **Дизайн — Aurora Glass** — иммёрсивный стиль во всём приложении: брендовый оранжевый, стекло, световые ауры, свечение, глубина. Никакого хардкода цветов (`bg-[#D4512B]` ❌) — только токены (`bg-primary`, `text-foreground`, `border-border`), автоадаптация light/dark. Переиспользуемые классы/компоненты в `frontend/app/globals.css` (`.glass`, `.glass-brand`, `.aurora-blob`, `.btn-shine`) и `AuroraHero`. Справка → `frontend/DESIGN_SYSTEM.md`.

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

## Статус и следующие шаги

**Готово (staging https://mk.da-net.net):** редизайн Aurora Glass, все страницы клиента (профиль, компании, поддержка, сброс пароля кодом), OTP-коды при регистрации/сбросе + скользящая сессия 30 дней + обязательный телефон, кабинет менеджера (пайплайн заказов по этапам + таймлайн, **Excel-таблица заказов**, payments, search, reports, broadcast, chats), чат поддержки с вложениями, публичные юр-страницы + реквизиты + согласие на ПД, оплата ЮKassa (тестовый магазин, сквозной платёж прошёл; безнал только через ЮKassa; стикеры безнала — после оплаты), SMTP (SpaceWeb), security-хардненинг по аудиту, staging HTTPS. Актуальный список задач → `TODO.md`.

**Для прод-запуска (осталось):**
1. Домен + HTTPS на **проде** (staging уже на HTTPS; прод `nginx/nginx.conf` — HTTP)
2. Реальные ключи ЮKassa (shop_id + secret_key) + webhook URL на прод-домен, боевой `.env`, первый `./deploy.sh`
3. Бэкапы Postgres (cron `pg_dump`), мониторинг/uptime, DR-документ, структурные логи
4. Тесты (backend unit + E2E Playwright), CI (tsc/ruff + pip-audit), pre-commit хуки
