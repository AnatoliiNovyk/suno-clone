# changelog_2026-07-26_pnpm-workspace-esbuild

## Зміна
Додано `suno-clone/pnpm-workspace.yaml` з `onlyBuiltDependencies: [esbuild]`. Поле `pnpm.onlyBuiltDependencies` у `package.json` залишено для сумісності зі старішими версіями pnpm.

## Як було до зміни
Фікс дозволу build-скрипта esbuild (changelog_2026-07-16_pnpm-allow-esbuild-build) було зроблено через поле `pnpm` у `package.json`. Новіші версії pnpm (10+) **більше не читають** це поле — при `pnpm install`/`pnpm dev` вони виводять `WARN: The "pnpm" field in package.json is no longer read` і знову падають з `ERR_PNPM_IGNORED_BUILDS: esbuild`. Тобто на свіжій машині з новим pnpm Vite знову не стартував без ручного `pnpm approve-builds`.

## Що покращує зміна
Дозвіл на збірку esbuild тепер зчитується новими версіями pnpm із `pnpm-workspace.yaml` (їхнє нове місце для цього налаштування), а старими — з поля в `package.json`. `pnpm install` збирає esbuild автоматично на будь-якій версії pnpm, без ручних кроків.
