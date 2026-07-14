# changelog_2026-07-14_fix-admin-rpc-error-message

## Зміна
`suno-clone/src/lib/adminErrors.ts`: `rpcErrorMessage()` тепер витягає текст помилки з будь-якої форми — додано хелпер `extractRawMessage()`, який для не-`Error` об'єктів по черзі пробує поля `message` / `details` / `hint` / `code` (структура `PostgrestError`), і лише як останній крок робить `String(err)`.

## Як було до зміни
Помилки від `supabase.rpc(...)` приходять як `PostgrestError` — звичайний об'єкт, а не екземпляр `Error`. Стара гілка `err instanceof Error ? err.message : String(err)` для такого об'єкта давала `String(err)` = `"[object Object]"`. У модалках адмін-панелі (кредити/тариф/роль) замість причини показувалось червоне `[object Object]`, і справжня помилка RPC була прихована.

## Що покращує зміна
Модалки адмінки показують осмислений текст: або людське UA-повідомлення для відомих доменних кодів (`forbidden`, `insufficient_credits_or_missing_user`, `cannot_demote_self`, `unknown_plan`, `invalid_role`, `reason_required`, `user_not_found`), або реальний текст від Postgres для будь-якої іншої помилки. Це і виправляє відображення, і повертає діагностованість збоїв RPC.
