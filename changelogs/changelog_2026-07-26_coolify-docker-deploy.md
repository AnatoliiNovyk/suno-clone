# changelog_2026-07-26_coolify-docker-deploy

## Зміна
Додано конфігурацію для розгортання на VPS через Coolify (Docker):

- **`python-service/Dockerfile`** (+ `.dockerignore`) — `python:3.12-slim`, встановлення `requirements.txt`, запуск `python main.py` (uvicorn на :8000). Env читаються з оточення (Coolify), відсутній `../.env` тихо ігнорується.
- **`suno-clone/Dockerfile`** (+ `.dockerignore`) — multi-stage: `node:20-alpine` збирає Vite SPA (з `VITE_*` як build-args), потім `nginx:alpine` роздає статику на :80.
- **`suno-clone/nginx.conf`** — SPA-fallback (`try_files … /index.html`), щоб React Router обробляв `/create`, `/admin` тощо при перезавантаженні; кешування хешованих ассетів.
- **`DEPLOY.md`** — покрокова інструкція: два застосунки Coolify (фронт `app.` + Python `api.`), DNS, env vars/build-args, `CORS_ORIGINS`, порядок (бекенд першим), перевірка, редеплої.
- `CLAUDE.md` — новий підрозділ «Production deploy (Coolify / Docker)».

## Як було до зміни
Проект запускався лише локально (`pnpm dev` + `python main.py`), без жодних артефактів для контейнеризації чи хмарного розгортання. Перенести на VPS означало вручну з'ясовувати, як зібрати фронт, роздати SPA, підняти FastAPI і зв'язати env — з нуля.

## Що покращує зміна
- Розгортання на будь-якому Coolify/Docker-хості стає відтворюваним: підключити репо, задати env/build-args за `DEPLOY.md`, задеплоїти два ресурси.
- Враховано специфіку: `VITE_*` вбудовуються під час збірки (build-args, не рантайм), Python читає рантайм-env, SPA-роутинг не ламається при рефреші, CORS налаштовується під домен фронту.
- Секрети не потрапляють в образи (`.dockerignore` виключає `.env`; значення задаються в Coolify UI).
