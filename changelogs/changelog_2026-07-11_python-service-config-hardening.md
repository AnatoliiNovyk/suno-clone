# Changelog 2026-07-11 — python-service config hardening

До зміни:
- `python-service/main.py` лише логував відсутні змінні середовища, але дозволяв сервісу стартувати.
- README описував генерацію як Supabase edge function-першу, хоча актуальний шлях — Python-сервіс.

Після зміни:
- додано жорстку валідацію налаштувань на старті FastAPI, яка піднімає `RuntimeError`, якщо бракує `GOOGLE_AI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` або `SUPABASE_ANON_KEY`.
- оновлено `README.md`, щоб зафіксувати, що `python-service/main.py` є основним сервісом генерації, а edge function `generate-music` — legacy / сумісний маршрут.
