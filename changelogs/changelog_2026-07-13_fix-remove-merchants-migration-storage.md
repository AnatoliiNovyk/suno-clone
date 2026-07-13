# changelog_2026-07-13_fix-remove-merchants-migration-storage

## Зміна
З міграції `supabase/migrations/1784064000_remove_merchants.sql` прибрано прямі `DELETE FROM storage.objects/buckets`; замість них — коментар із інструкцією видалити бакет `merchant-docs` через Dashboard → Storage.

## Як було до зміни
Міграція намагалась видалити бакет `merchant-docs` та його файли прямими DELETE-запитами до таблиць `storage`. На живому проєкті Supabase це падає з помилкою `42501: Direct deletion from storage tables is not allowed. Use the Storage API instead` — платформа захищає storage-таблиці тригером `storage.protect_delete()`. Через це вся міграція завершувалась помилкою і жоден DROP не застосовувався.

## Що покращує зміна
Міграція виконується без помилок: DROP політик, таблиць і колонки — це DDL, який дозволено. Видалення самого бакета винесено в ручний крок через Dashboard (або Storage API), що відповідає вимогам платформи.
