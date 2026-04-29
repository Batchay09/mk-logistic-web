# МК Логистик — Web

Веб-приложение для доставки грузов на склады Wildberries и Ozon. Альтернатива Telegram-боту [`MK tranzit`](https://github.com/Batchay09) для клиентов с заблокированным TG. Полный функционал бота: кабинеты клиента, менеджера и администратора.

**Production:** https://mk-logistic.ru *(планируется)*  
**Stack:** FastAPI · Next.js 15 · PostgreSQL · Docker · Nginx

---

## Быстрый старт (локально)

Самый быстрый способ — SQLite, без Docker:

```bash
git clone https://github.com/Batchay09/mk-logistic-web.git
cd mk-logistic-web
./run-local.sh
```

→ Backend на `http://localhost:8001` (Swagger: `/docs`), frontend на `http://localhost:3000`.

Тестовые юзеры (после первого запуска):

| Email | Пароль | Роль |
|---|---|---|
| `admin@mk-logistic.ru` | `232526` | Админ |
| `client@test.ru` | `232526` | Клиент |

### Локально на Postgres (через Docker)

```bash
cp .env.example .env.local
docker compose -f docker-compose.local.yml --env-file .env.local up --build
```

### Backend / frontend по-отдельности

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8001

# Frontend (в другом терминале)
cd frontend
npm install --legacy-peer-deps
npm run dev
```

---

## Архитектура

```
mk-logistic-web/
├── backend/              FastAPI + SQLAlchemy async + Alembic
│   ├── app/api/          роутеры: auth, client, manager, admin, calculator, payments, stickers
│   ├── app/services/     calculator, sticker, audit, reports, email (реюз из бота)
│   └── migrations/       Alembic
├── frontend/             Next.js 15 App Router + shadcn/ui + Tailwind v4
│   ├── app/              страницы (clients, manager, admin)
│   ├── components/       ui/, features/, layout/
│   └── public/brand/     логотип, иллюстрации (DaNet design system)
├── nginx/                reverse proxy (production)
├── docker-compose.yml         production стек (Postgres внешняя сеть mk-shared)
├── docker-compose.local.yml   локальный стек со своим Postgres
├── .env.example
├── deploy.sh             rsync + docker compose на VPS
└── run-local.sh          быстрый локальный запуск (SQLite)
```

Для AI-ассистентов: контекст и правила см. в [`CLAUDE.md`](./CLAUDE.md) (root) и [`frontend/CLAUDE.md`](./frontend/CLAUDE.md).

---

## Ключевые фичи

- **Auth** — email + пароль, JWT в httpOnly cookie. 3 роли: client / manager / admin.
- **Калькулятор тарифов** — расчёт цены по маркетплейсу/складу/коробкам, паллет-режим автоматом при ≥11 коробок.
- **Визард создания заказа** — 6 шагов с прогрессом и сводкой.
- **Стикеры** — PDF 58×40мм с QR-кодом, по одному на коробку.
- **YooKassa** — webhook для автоподтверждения карточных оплат, СБП по реквизитам.
- **Email-уведомления** — через SMTP Yandex (вместо Telegram).
- **Audit log** — все изменения справочников, ретенция 30 дней, rollback.

---

## Деплой

**Staging стенд** (`mk.da-net.net`):

```bash
bash deploy-staging.sh
```

Скрипт делает rsync на VPS (`89.111.142.70:/opt/mk-logistic-test`) → `docker compose up -d --build`.

Аутентификация — через SSH-ключ (`~/.ssh/id_ed25519` + alias `mk-vps` в `~/.ssh/config`). На macOS один раз: `ssh-add --apple-use-keychain ~/.ssh/id_ed25519` — паспрейза сохраняется в Keychain. Дальше деплой без пароля.

Fallback (если ключ не настроен): `SSHPASS='...' bash deploy-staging.sh` — потребует `sshpass` (`brew install sshpass`).

**Перед первым деплоем** — заполнить `.env.staging` (см. `.env.example`). HTTPS уже настроен через Letsencrypt.

---

## База данных

PostgreSQL общая с [`MK tranzit`](https://github.com/Batchay09) (Telegram-ботом). Миграция `0002_add_email_auth` добавляет nullable-поля (`email`, `password_hash`, `email_verified_at`, `yookassa_payment_id`) — бот эти колонки не трогает, оба сервиса работают параллельно на одной БД.

При изменении `backend/app/db/models.py`:

```bash
cd backend
alembic revision --autogenerate -m "описание"
alembic upgrade head
```

И **синхронизировать модели с ботом** — это критично, общая схема.

---

## Команды разработчика

```bash
# Backend
cd backend
ruff check . && mypy .            # линтер + типизация

# Frontend
cd frontend
npx tsc --noEmit                  # type check без билда
npm run lint                      # ESLint
npm run build                     # production build (standalone Docker)
```

---

## Roadmap

См. [`TODO.md`](./TODO.md) — открытые задачи, известные баги, production-чеклист.

---

## Лицензия

Proprietary © МК Логистик 2026.
