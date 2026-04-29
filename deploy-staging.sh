#!/usr/bin/env bash
# Deploy MK Logistic Web — STAGING стенд (mk.da-net.net)
# Изолированный от prod-бота: свой Postgres, своя сеть, nginx на 80.
#
# Аутентификация: SSH-ключ через alias `mk-vps` из ~/.ssh/config.
# Если ключ не настроен — fallback на sshpass с переменной SSHPASS.

set -e

VPS_HOST="mk-vps"           # alias из ~/.ssh/config (с ControlMaster и id_ed25519)
VPS_DIR="/opt/mk-logistic-test"

# Если SSHPASS задан — используем sshpass (старый режим). Иначе — чистый ssh с ключом.
if [ -n "${SSHPASS:-}" ] && command -v sshpass &>/dev/null; then
    export SSHPASS
    SSH="sshpass -e ssh -o StrictHostKeyChecking=no"
    SCP="sshpass -e scp -o StrictHostKeyChecking=no"
    RSYNC_E="sshpass -e ssh -o StrictHostKeyChecking=no"
    AUTH_MODE="sshpass"
else
    SSH="ssh"
    SCP="scp"
    RSYNC_E="ssh"
    AUTH_MODE="ssh-key"
fi

echo "==> 🚀 Staging deploy → $VPS_HOST:$VPS_DIR"
echo "==> Домен: http://mk.da-net.net"
echo "==> Auth: $AUTH_MODE"

# Локальные файлы должны быть на месте
for f in .env.staging docker-compose.staging.yml nginx/nginx.staging.conf; do
    if [ ! -f "$f" ]; then
        echo "❌ Не найден $f — он требуется для staging-деплоя"
        exit 1
    fi
done

# 1) Создаём папку на VPS
echo "==> 📂 Готовим папку на сервере..."
$SSH "$VPS_HOST" "mkdir -p $VPS_DIR"

# 2) Синхронизируем код (без секретов и build-артефактов)
echo "==> 📤 rsync исходников..."
rsync -az --delete \
    --exclude='.git/' \
    --exclude='node_modules/' \
    --exclude='.next/' \
    --exclude='.venv/' \
    --exclude='__pycache__/' \
    --exclude='*.pyc' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='.env.staging' \
    --exclude='.env.production' \
    --exclude='nginx/certbot/' \
    --exclude='dev.db' \
    --exclude='*.png' \
    --exclude='*.jpeg' \
    --exclude='.playwright-mcp/' \
    -e "$RSYNC_E" \
    ./ "$VPS_HOST:$VPS_DIR/"

# 3) Кладём staging-конфиги под нужными именами на сервере
echo "==> 📋 Кладу .env и docker-compose..."
$SCP .env.staging "$VPS_HOST:$VPS_DIR/.env"
$SCP docker-compose.staging.yml "$VPS_HOST:$VPS_DIR/docker-compose.yml"

# 4) Запуск docker compose
echo "==> 🐳 docker compose build & up..."
$SSH "$VPS_HOST" "
    set -e
    cd $VPS_DIR
    docker compose down --remove-orphans 2>/dev/null || true
    docker compose up -d --build
    echo
    echo '=== СТАТУС ==='
    docker compose ps
"

echo
echo "==> ✅ Deploy завершён"
echo "==> 🌐 Открой:  http://mk.da-net.net"
echo "==> 📜 Логи:    ssh $VPS_HOST 'cd $VPS_DIR && docker compose logs -f'"
