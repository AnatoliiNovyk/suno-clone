#!/bin/bash
# Сборка и запуск контейнеров в фоне
docker-compose up --build -d

# Ждем 10 секунд, пока фронтенд поднимется
sleep 10

# Открываем фронтенд в браузере по умолчанию
if command -v xdg-open > /dev/null; then
  xdg-open http://localhost:5174
elif command -v open > /dev/null; then
  open http://localhost:5173
else
  echo "Откройте в браузере: http://localhost:5173"
fi
