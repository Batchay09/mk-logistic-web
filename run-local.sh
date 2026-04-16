#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

export DATABASE_URL="sqlite+aiosqlite:///./dev.db"
export SECRET_KEY="local-dev-secret-key-32-chars-ok"
export APP_URL="http://localhost:3000"
export API_URL="http://127.0.0.1:8001"
export ENVIRONMENT="development"
export SMTP_USER="" SMTP_PASSWORD=""
export YOOKASSA_SHOP_ID="" YOOKASSA_SECRET_KEY="" YOOKASSA_WEBHOOK_SECRET=""
export MANAGER_EMAILS="" ADMIN_TG_IDS=""

echo "=== MK Logistic — локальный запуск ==="
echo ""

# ── 1. Python venv ────────────────────────────────────────────
cd "$BACKEND"
if [ ! -d ".venv" ]; then
  echo "[1/4] Создаю Python окружение..."
  python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
else
  echo "[1/4] Python окружение готово"
fi

# ── 2. Миграции ───────────────────────────────────────────────
echo "[2/4] Применяю миграции..."
.venv/bin/alembic upgrade head

# ── 3. npm зависимости ────────────────────────────────────────
cd "$FRONTEND"
if [ ! -d "node_modules" ]; then
  echo "[3/4] Устанавливаю npm пакеты (первый раз ~1 мин)..."
  npm install --legacy-peer-deps
else
  echo "[3/4] node_modules готовы"
fi

# ── 4. Запуск ─────────────────────────────────────────────────
echo "[4/4] Запускаю..."
echo ""
echo "  Backend API: http://localhost:8001/docs"
echo "  Frontend:    http://localhost:3000"
echo ""
echo "  Ctrl+C — остановить"
echo ""

trap 'echo ""; echo "Останавливаю..."; kill $(jobs -p) 2>/dev/null; exit 0' INT TERM

cd "$BACKEND"
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload &

sleep 3

cd "$FRONTEND"
npm run dev &

wait
