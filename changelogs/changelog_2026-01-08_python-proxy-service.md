# Changelog: Python Proxy Service Implementation

## Дата зміни / Date of Change
2026-01-08

## Короткий опис / Short Description
implementation-of-python-proxy-service-for-lyria

## Опис змін / Description of Changes

### До зміни / Before Change
- Edge Function `generate-music` намагалася використовувати Google Lyria API прямо з Deno або фолбекилася на демо-треки при невдачі.
- Реалізація Lyria RealTime API була неможливою через відсутність підтримки WebSocket/RealTime в JS SDK.
- Користувач отримував статичні демо-файли замість реальної генерації.

### Після зміни / After Change
- **Впроваджено Python Proxy Service**: Створено локальний сервіс на базі FastAPI (`python-service/`) для взаємодії з Google GenAI Python SDK.
- **Нова архітектура**:
    - Edge Function (`generate-music`) тепер діє як контролер: перевіряє авторизацію, списує кредити та перенаправляє запит на `localhost:8000/generate-music`.
    - Python сервіс асинхронно з'єднується з Gemini 2.0 Flash Exp (Lyria capability), отримує аудіо та завантажує його в Supabase Storage.
- **Оновлена логіка Edge Function**:
    - Видалено логіку демо-треків.
    - Додано пряме списання кредитів перед генерацією.
    - Додано механізм повернення кредитів (refund) у випадку недоступності Python сервісу.
- **Нові файли**:
    - `python-service/main.py`: Сервер FastAPI з логікою генерації.
    - `python-service/requirements.txt`: Список залежностей (`google-genai`, `fastapi`, `supabase`, etc.).

### Переваги / Benefits
- Можливість використання експериментальних аудіо-можливостей Gemini 2.0 / Lyria, які доступні лише в Python.
- Реальна генерація музики замість моків.
- Збереження серверної логіки (кредити, auth) в Supabase, при винесенні важкої AI-логіки в мікросервіс.
