# changelog_2026-09-05_single-coolify-deploy-path

## Зміна
Прибрано дублюючий шлях розгортання й залишено один канонічний — Docker Compose:

- **Видалено** `DEPLOY.md`, `suno-clone/Dockerfile`, `suno-clone/nginx.conf`,
  `suno-clone/.dockerignore` — артефакти окремого «two applications» підходу.
- **`CLAUDE.md`** — розділ Production deploy переписано під фактичну схему:
  один Compose-ресурс (`docker-compose.coolify.yml`) із `web` + внутрішнім `api`,
  **один** домен на `web`, `VITE_GENERATE_API_URL` зафіксовано як `/api`,
  ресурс обов'язково створюється з Git-репозиторію.
- **`docs/coolify-deployment.md`** — приклад домену замінено на реальний
  `suno.pp.ua`; у крок 1 додано явне попередження, що «Docker Compose Empty»
  (вставлений YAML без Git-джерела) падає з
  `unable to prepare context: path "…/python-service" not found`.

Код застосунку не змінювався: `suno-clone/src/`, `python-service/main.py`,
`Dockerfile.frontend`, `deploy/nginx.conf`, `docker-compose.coolify.yml`,
`supabase/` — без правок.

## Як було до зміни
У репозиторії співіснували два взаємовиключні описи деплою. `DEPLOY.md` разом із
`suno-clone/Dockerfile` та `suno-clone/nginx.conf` описував **два окремі
Coolify-застосунки на двох піддоменах**, тоді як `README.md`,
`docker-compose.coolify.yml`, `Dockerfile.frontend` і `docs/coolify-deployment.md`
описували **один Compose-ресурс з одним доменом**. `CLAUDE.md` посилався на
застарілий `DEPLOY.md`, а `README.md` — на compose. Крім того,
`suno-clone/nginx.conf` не мав проксі `/api/` на бекенд, тобто в тій схемі
фронтенд узагалі не дістав би до Python-сервіса без окремого домену.

## Що покращує зміна
- Один спосіб розгортання без суперечливих інструкцій: усі документи тепер
  ведуть до `docs/coolify-deployment.md` і `docker-compose.coolify.yml`.
- Прибрано мертві файли: `suno-clone/nginx.conf` (без `/api`-проксі) і
  `suno-clone/Dockerfile` більше нічим не використовувались — реальні збірки
  йдуть через `Dockerfile.frontend` + `deploy/nginx.conf`.
- Документація описує один домен на кореневому імені замість піддоменів і
  попереджає про типову помилку створення compose без Git-джерела.
