# Розгортання у Coolify

Цей репозиторій розгортається одним **Docker Compose Application** з двома
сервісами: `web` (React/Vite у Nginx) та внутрішнім `api` (FastAPI). Назовні
публікується лише `web`; Nginx пересилає запити браузера з `/api/*` до `api`.
Тому для Python-сервісу не потрібен окремий домен, а `VITE_GENERATE_API_URL`
у production завжди дорівнює `/api`.

## Налаштування Coolify

1. Створіть ресурс **Docker Compose** саме **з Git-репозиторію** (Public/Private
   Repository), а не «Docker Compose Empty» зі вставленим YAML. У «Empty»
   Coolify не клонує репозиторій, тому build-контексти `./python-service` і `.`
   на диску відсутні й deploy падає з
   `unable to prepare context: path "…/python-service" not found`. Ознака
   правильного режиму — у ресурсі є вкладка **Git Source** з цим репозиторієм.
2. Вкажіть Base Directory: `/`, Docker Compose Location:
   `docker-compose.coolify.yml` і гілку для production.
3. У полі Domains сервісу `web` додайте ваш домен з внутрішнім портом 80:
   `https://suno.pp.ua:80`. **Не додавайте домен до `api`** — Coolify тоді
   вішає Traefik на порт 443 процесу uvicorn, і публічний сайт не піднімається.
4. Увімкніть автоматичний TLS у Coolify та залиште `api` внутрішнім сервісом.
5. Додайте змінні нижче. Позначте лише `VITE_*` як **Build Variable**; усі
   інші мають бути лише **Runtime Variable**. Не передавайте секрети як build
   arguments.

| Змінна | Значення |
|---|---|
| `VITE_SUPABASE_URL` | URL вашого Supabase-проєкту |
| `VITE_SUPABASE_ANON_KEY` | anon key цього проєкту |
| `SUPABASE_URL` | той самий URL Supabase |
| `SUPABASE_ANON_KEY` | той самий anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role key (лише runtime) |
| `GOOGLE_AI_API_KEY` | ключ з доступом до Lyria 3 Pro |
| `CORS_ORIGINS` | точний origin, наприклад `https://suno.pp.ua` |
| `GENERATION_STUCK_AFTER_SECONDS` | `1800` або більше |
| `GENERATION_REAPER_INTERVAL_SECONDS` | `300` |

`VITE_GENERATE_API_URL` не додавайте у Coolify: Compose фіксує його як `/api`.
`ALLOW_DEGRADED_START` теж не задавайте: production-контейнер навмисно не
стартує без усіх критичних секретів.

## Перед першим deploy

1. У Supabase виконайте актуальні міграції та створіть public bucket `audio`.
2. У Supabase Auth додайте `https://suno.pp.ua` до Site URL і Redirect
   URLs.
3. Задайте `SITE_URL=https://suno.pp.ua` та секрети провайдерів у
   середовищі Supabase Edge Functions, після чого розгорніть
   `create-payment` і `payments-webhook`.
4. У Stripe/LiqPay налаштуйте webhook на URL опублікованої Supabase edge
   function `payments-webhook?provider=<stripe|liqpay>`; не на Coolify-домен.

## Перевірка після deploy

1. Переконайтесь у Coolify, що `api` і `web` мають стан `healthy`.
2. Відкрийте `https://suno.pp.ua/` і перевірте, що SPA-роути
   перезавантажуються без 404.
3. Увійдіть, створіть sample, переконайтесь у відповіді `POST /api/generate-music`
   та появі треку в бібліотеці.
4. Перевірте оплату в тестовому середовищі провайдера і webhook у Supabase.

## Оновлення

Coolify будує образи з `Dockerfile.frontend` і `python-service/Dockerfile`.
Healthcheck-и визначено у `docker-compose.coolify.yml`, тому Coolify не має
направляти трафік до сервісу до його готовності. Для production не публікуйте
порт 8000 на хості й не зберігайте `.env` у Git.
