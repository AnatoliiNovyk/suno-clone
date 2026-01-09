# Changelog: Direct Python Service Architecture

## Дата зміни / Date of Change
2026-01-08

## Короткий опис / Short Description
direct-python-service-architecture-bypass-docker

## Опис змін / Description of Changes

### До зміни / Before Change
- Архітектура передбачала використання Supabase Edge Function (`generate-music`) як посередника, який викликає локальний Python-сервіс.
- Edge Function вимагала локального запуску через Docker (`supabase functions serve`), що викликало проблеми з пермісіями та конфігурацією середовища.
- Python-сервіс залежав від бібліотеки `supabase`, яка потребувала складних залежностей для компіляції (`pyroaring` / MSVC Build Tools).
- Frontend звертався до Edge Function, яка потім мала комунікувати з localhost.

### Після зміни / After Change
- **Змінено Frontend (`CreatePage.tsx`)**: Тепер клієнтський додаток звертається напряму до локального Python-сервісу (`http://localhost:8000/generate-music`), оминаючи Edge Function.
- **Оновлено Python Service (`main.py`)**:
    - Замінено бібліотеку `supabase` на легкому `httpx` для виконання прямих REST-запитів до Supabase API (це вирішило проблему встановлення залежностей).
    - Перенесено бізнес-логіку (перевірка кредитів, списання коштів, створення запису треку) з Edge Function безпосередньо в Python-сервіс.
    - Додано CORS middleware та обробку помилок для прямої взаємодії з браузером.
- **Архітектурний зсув**: Перехід до гібридної архітектури для локальної розробки, де Python-сервіс виступає повноцінним бекендом для AI-задач.

### Переваги / Benefits
- **Відмова від Docker**: Для розробки більше не потрібен Docker Desktop, що спрощує запуск на Windows.
- **Спрощення залежностей**: Видалення проблемних бібліотек (`pyroaring`) дозволяє легко встановити середовище через `pip install`.
- **Швидкість розробки**: Менше ланок у ланцюгу викликів (Browser -> Python замість Browser -> Deno -> Python).
