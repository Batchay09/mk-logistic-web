#!/usr/bin/env bash
# Deploy MK Logistic Web — STAGING стенд (mk.da-net.net)
# Изолированный от prod-бота: свой Postgres, своя сеть, nginx на 80.

set -e

VPS_IP="89.111.142.70"
VPS_USER="root"
VPS_DIR="/opt/mk-logistic-test"
SSH_OPTS="-o StrictHostKeyChecking=no -o PreferredAuthentications=password"

echo "==> 🚀 Staging deploy → $VPS_USER@$VPS_IP:$VPS_DIR"
echo "==> Домен: http://mk.da-net.net"

# 0) sshpass check
if ! command -v sshpass &>/dev/null; then
    echo "❌ Установи sshpass: brew install sshpass"
    exit 1
fi

# 1) Пароль — из env SSHPASS или интерактивно
if [ -z "${SSHPASS:-}" ]; then
    read -rsp "🔑 SSH пароль ($VPS_USER@$VPS_IP): " SSHPASS
    echo
    export SSHPASS
fi

# 2) Локальные файлы должны быть на месте
for f in .env.staging docker-compose.staging.yml nginx/nginx.staging.conf; do
    if [ ! -f "$f" ]; then
        echo "❌ Не найден $f — он требуется для staging-деплоя"
        exit 1
    fi
done

# 3) Создаём папку на VPS
echo "==> 📂 Готовим папку на сервере..."
sshpass -e ssh $SSH_OPTS "$VPS_USER@$VPS_IP" "mkdir -p $VPS_DIR"

# 4) Синхронизируем код (без секретов и build-артефактов)
echo "==> 📤 rsync исходников..."
sshpass -e rsync -az --delete \
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
    -e "ssh $SSH_OPTS" \
    ./ "$VPS_USER@$VPS_IP:$VPS_DIR/"

# 5) Кладём staging-конфиги под нужными именами на сервере
echo "==> 📋 Кладу .env и docker-compose..."
sshpass -e scp $SSH_OPTS .env.staging "$VPS_USER@$VPS_IP:$VPS_DIR/.env"
sshpass -e scp $SSH_OPTS docker-compose.staging.yml "$VPS_USER@$VPS_IP:$VPS_DIR/docker-compose.yml"

# 6) Запуск docker compose
echo "==> 🐳 docker compose build & up..."
sshpass -e ssh $SSH_OPTS "$VPS_USER@$VPS_IP" "
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
echo "==> 📜 Логи:    sshpass -p \$SSHPASS ssh $VPS_USER@$VPS_IP 'cd $VPS_DIR && docker compose logs -f'"
