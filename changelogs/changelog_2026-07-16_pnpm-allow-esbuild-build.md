# changelog_2026-07-16_pnpm-allow-esbuild-build

## Зміна
До `suno-clone/package.json` додано блок `pnpm.onlyBuiltDependencies: ["esbuild"]`.

## Як було до зміни
На свіжій машині з pnpm 10 (нова політика блокування build-скриптів залежностей за замовчуванням) `pnpm install`/`pnpm dev` падали з `ERR_PNPM_IGNORED_BUILDS: Ignored build scripts: esbuild` і ненульовим кодом виходу. Vite не міг стартувати, бо нативний бінарник esbuild не збирався. Кожен новий клон вимагав ручного `pnpm approve-builds` або `pnpm install --allow-build=esbuild`.

## Що покращує зміна
Дозвіл на збірку esbuild тепер зафіксований у репозиторії, тож `pnpm install` на будь-якій машині одразу збирає esbuild і `pnpm dev` стартує без додаткових кроків. Список навмисно мінімальний (лише esbuild) — інші пакети без потреби білд-скриптів залишаються заблокованими згідно з політикою безпеки pnpm.
