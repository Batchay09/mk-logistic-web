# TODO — МК Логистик Web

Открытые задачи и известные баги. Бери сверху, отмечай выполненные `[x]`.

---

## 🔴 До production-запуска

- [ ] Купить домен → DNS → обновить `nginx/nginx.conf` для `mk-logistic.ru`
- [ ] HTTPS через Let's Encrypt (certbot в docker-compose.yml)
- [ ] Заполнить `.env` на VPS (`SECRET_KEY`, SMTP, YooKassa, ADMIN_*)
- [ ] Подключить ЮKassa: `shop_id` + `secret_key` + настроить webhook URL `https://mk-logistic.ru/payments/yookassa/webhook`
- [ ] Настроить SMTP Yandex (приложение-пароль для аккаунта)
- [ ] Первый `./deploy.sh`, проверить что бот всё ещё работает на той же БД
- [ ] **Бэкапы Postgres** — cron `pg_dump` ежедневно + ротация 7 дней
- [ ] **Мониторинг** — Healthchecks.io / UptimeRobot на `/healthz`, алерт в Telegram при падении
- [ ] **Disaster recovery** — документ `docs/DR.md` «сервер умер — что делать»
- [ ] Структурированное логирование (json + ротация) вместо stdout

## 🟠 Недостающие страницы клиента

(Папки в `frontend/app/` существуют, но без `page.tsx` → 404)

- [ ] `/profile` — редактирование имени, email, телефона, смена пароля
- [ ] `/companies` — CRUD `CompanyProfile` (юр. лица для стикеров)
- [ ] `/support` — форма обратной связи + контакты
- [ ] `/reset-password` — восстановление по email-токену
- [ ] `/verify-email` — обработка ссылки подтверждения email из welcome-письма

## 🟡 Менеджер

- [ ] Seed manager-юзера в `backend/scripts/seed_test_users.py`
- [ ] Браузерный QA `/manager/payments`, `/manager/search`, `/manager/reports`
- [ ] `/manager/broadcast` — массовая рассылка email клиентам

## 🟢 Улучшения

- [ ] Order detail timeline статусов (vertical stepper, как в `Screens.jsx` дизайн-системы)
- [ ] Unit-тесты `backend/tests/` (Calculator, Auth, Audit) — сейчас каталог пустой
- [ ] E2E-тесты (Playwright) для критических flow: register → login → create order → pay
- [ ] CI: `.github/workflows/check.yml` для tsc + ruff *(добавлено)*
- [ ] Pre-commit хуки (ruff + eslint) — на push сейчас ничего не запускается локально
- [ ] Retry для SMTP/YooKassa — не терять operations при сетевых сбоях

## 🐛 Известные баги (не критичные)

- [ ] При повторных `fill` через DevTools/Playwright значение поля удваивается — не баг приложения, поведение dom inputs (фиксится через native setter)
- [ ] Buttons `Создание заказа` + `Добавить в корзину`: после успеха корзина не инвалидирует cache — иногда счётчик в sidebar обновляется только при ручном refresh

---

_Обновлено: 2026-04-26._
