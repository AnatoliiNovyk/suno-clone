# changelog_2026-07-08_gitignore-python-bytecode

## Зміна
Додано `__pycache__/` та `*.pyc` до кореневого `.gitignore`.

## Як було до зміни
`.gitignore` не мав правил для Python-артефактів, тому після запуску `python-service` байткод-кеш (`python-service/__pycache__/main.cpython-311.pyc`) з'являвся як untracked-файл і ризикував потрапити в коміт.

## Що покращує зміна
Згенеровані Python-артефакти більше не забруднюють `git status` і гарантовано не потраплять до репозиторію.
