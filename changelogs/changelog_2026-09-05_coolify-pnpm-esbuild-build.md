# changelog_2026-09-05_coolify-pnpm-esbuild-build

## Зміна
Coolify-збірка фронтенда більше не падає на pnpm 11 (`ERR_PNPM_IGNORED_BUILDS: esbuild`).

- `Dockerfile.frontend` і `suno-clone/Dockerfile` дозволяють build-скрипт esbuild
  (`--config.dangerouslyAllowAllBuilds=true` + Docker-only `.npmrc`). Хостовий
  `.npmrc` зі `store-dir=/tmp` у образ не копіюється.
- `docker-compose.coolify.yml`: прибрано `${VAR:?…}`. Coolify трактував `:?` як
  default і підставляв у контейнер літерал `Set GOOGLE_AI_API_KEY in Coolify`.

## Як було до зміни
Два Coolify-деплої 2026-09-05 (09:01 і 09:21 UTC) падали на
`pnpm install --frozen-lockfile`: corepack тягнув pnpm 11.25.0, який вважає
ігнорований esbuild фатальною помилкою. Робочий патч жив лише на VPS у
`/root/suno-clone/Dockerfile.frontend` і не був у GitHub, тож Coolify збирав
зламаний Dockerfile з `main`.

## Що покращує зміна
`docker compose` ресурс у Coolify може зібрати обидва образи з Git. Деплой
лишається виключно через Coolify; живий стек `/root/suno-clone` не чіпається.
