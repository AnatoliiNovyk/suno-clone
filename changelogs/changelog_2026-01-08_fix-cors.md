# Changelog: Fix CORS in Python Service

## Дата зміни / Date of Change
2026-01-08

## Короткий опис / Short Description
fix-cors-middleware-python-service

## Опис змін / Description of Changes

### До зміни / Before Change
- Python сервіс (`main.py`) не мав налаштованого middleware для CORS.
- Браузер блокував `OPTIONS` запити (Preflight) при спробі фронтенду (`localhost:5173`) звернутися до бекенду (`localhost:8000`), повертаючи помилку `405 Method Not Allowed`.
- Користувач бачив помилку "Failed to fetch" на клієнті.

### Після зміни / After Change
- Додано `CORSMiddleware` у `python-service/main.py`.
- Дозволено всі джерела (`allow_origins=["*"]`), методи та заголовки для локальної розробки.

### Переваги / Benefits
- Розблоковано можливість прямої взаємодії React-додатку з локальним Python-сервісом.
