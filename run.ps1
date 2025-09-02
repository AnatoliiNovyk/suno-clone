# Сборка и запуск контейнеров в фоне
docker-compose up --build -d

# Ждем 10 секунд, пока фронтенд поднимется
Start-Sleep -Seconds 10

# Открываем фронтенд в браузере по умолчанию
Start-Process "http://localhost:5174"

Write-Host "Suno AI Clone запущен. Frontend: http://localhost:5174"
