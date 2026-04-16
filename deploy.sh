#!/usr/bin/env bash
set -e

VPS="root@89.111.142.70"
VPS_DIR="/opt/mk-logistic-web"
SSH_OPTS="-o StrictHostKeyChecking=no -o PreferredAuthentications=password"

echo "==> Деплой MK Logistic Web на $VPS"

# Проверяем sshpass
if ! command -v sshpass &>/dev/null; then
    echo "Установи sshpass: brew install sshpass"
    exit 1
fi

# Читаем пароль
read -rsp "SSH пароль: " SSH_PASS
echo

export SSHPASS="$SSH_PASS"

# Создаём папку на сервере
sshpass -e ssh $SSH_OPTS "$VPS" "mkdir -p $VPS_DIR"

# Синхронизируем файлы (исключая node_modules, .venv, .next, __pycache__)
echo "==> Синхронизация файлов..."
sshpass -e rsync -avz --progress \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.venv' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.env' \
  --exclude='nginx/certbot/live' \
  --exclude='nginx/certbot/archive' \
  -e "ssh $SSH_OPTS" \
  . "$VPS:$VPS_DIR/"

# Копируем .env на сервер (если есть локально)
if [ -f .env ]; then
    echo "==> Копируем .env..."
    sshpass -e scp $SSH_OPTS .env "$VPS:$VPS_DIR/.env"
fi

# Деплоим через docker compose
echo "==> Запуск docker compose..."
sshpass -e ssh $SSH_OPTS "$VPS" "
    cd $VPS_DIR
    docker compose pull --quiet 2>/dev/null || true
    docker compose up -d --build --remove-orphans
    docker compose ps
"

echo "==> Готово! Сайт доступен на http://$VPS"
