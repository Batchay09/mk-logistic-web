# TODO — МК Логистик Web

Открытые задачи и известные баги. Бери сверху, отмечай выполненные `[x]`.
Актуальный обзор фич → `CLAUDE.md`. Staging: https://mk.da-net.net

---

## 🔴 До production-запуска (нужны доступы/действия Азамата)

- [ ] Купить домен → DNS → обновить `nginx/nginx.conf` для боевого домена
- [ ] HTTPS на **проде** через Let's Encrypt (на staging HTTPS уже есть)
- [ ] Заполнить боевой `.env` на VPS (`SECRET_KEY`, SMTP, YooKassa, ADMIN_*)
- [ ] Подключить ЮKassa на **проде**: боевые `shop_id` + `secret_key` + webhook (на staging тестовый магазин подключён, сквозной платёж прошёл)
- [ ] Первый `./deploy.sh` на прод, проверить что бот работает на той же БД
- [ ] **Бэкапы Postgres** — cron `pg_dump` ежедневно + ротация 7 дней
- [ ] **Мониторинг** — Healthchecks.io / UptimeRobot на `/health`, алерт в Telegram
- [ ] **Disaster recovery** — документ `docs/DR.md`
- [ ] Структурированное логирование (json + ротация) вместо stdout

## 🟢 Качество / тех-долг

- [ ] Unit-тесты `backend/tests/` (Calculator, Auth, Chat, Attachments) — каталог пустой
- [ ] E2E (Playwright): register → login → order → pay; чат клиент↔менеджер
- [ ] CI `.github/workflows/check.yml`: tsc + ruff + **pip-audit** (по итогам аудита)
- [ ] Pre-commit хуки (ruff + eslint)
- [ ] Апгрейд `fastapi`/`starlette` до актуальных (CVE-2025-54121) — с тестированием
- [ ] Retry для SMTP/YooKassa; рассылка/broadcast — вынести в BackgroundTasks
- [ ] Вложения чата: ретенция/вынос в объектное хранилище (S3/MinIO) вместо `bytea` при росте объёма
- [ ] `.with_for_update()` на checkout/создание платежа (гонка при двойном сабмите)
- [ ] Браузерный QA страниц менеджера/админа

## 🟡 Возможные улучшения чата

- [ ] Realtime через WebSocket (сейчас polling 3–5 сек) — при необходимости
- [ ] Чат по конкретному заказу (кнопка «Обсудить» в карточке заказа)
- [ ] Defense-in-depth: role-guard в `app/(admin|manager)/layout.tsx` (сейчас гейт только на бэке)

## ✅ Сделано (крупные вехи)

- [x] **Юр-страницы для эквайринга** — публичные `/offer`, `/privacy`, `/delivery`, `/contacts`;
      реквизиты ИП (ИНН/ОГРНИП) в футере на всех страницах; согласие на обработку ПД в регистрации
- [x] **ЮKassa подключена** — тестовый магазин на staging, сквозной платёж прошёл (create → webhook → PAID → стикеры)
- [x] **Безнал = только ЮKassa** — убран СБП-перевод по реквизитам (+ захардкоженные `sbp_card`/`sbp_phone`)
- [x] **Отслеживание процесса заказа** — `/manager/orders` вкладки по этапам (К отправке/В работе/Забран/В пути/Доставлен)
      со счётчиками + таймлайн и продвижение по этапам в карточке заказа; email менеджеру при оплате
- [x] **Фикс паллетизации** — паллетный режим показывается только от 11 коробок (было всегда)
- [x] **Редизайн Aurora Glass** — весь сайт (лендинг + кабинет + авторизация)
- [x] Страницы клиента: `/profile` (+ смена пароля), `/companies` (CRUD), `/support`, `/reset-password`, `/verify-email`
- [x] Кабинет менеджера: `/manager/broadcast`, **drill-in в заказ** `/manager/orders/[id]`, seed `manager@test.ru`
- [x] **Чат поддержки** клиент↔менеджер: виджет + инбокс, бейджи непрочитанного, polling
- [x] **Вложения-картинки** в чат (JPEG/PNG/WEBP ≤5 МБ, валидация Pillow)
- [x] **Аудит безопасности** + фиксы: rate-limit по X-Real-IP, webhook ЮKassa через API,
      Content-Disposition (кириллица), deferred BLOB, лимиты размеров, апгрейд jose/multipart/Pillow
- [x] SMTP на staging (SpaceWeb `smtp.spaceweb.ru:465`)
- [x] Staging-деплой на HTTPS (`mk.da-net.net`)

## 🐛 Известные баги

- [x] Корзина не инвалидировала cache после создания заказа — мастер теперь чистит `cart`+`orders`
- [ ] При повторных `fill` через DevTools/Playwright значение поля удваивается — поведение dom inputs (не баг приложения)

---

_Обновлено: 2026-07-07._
