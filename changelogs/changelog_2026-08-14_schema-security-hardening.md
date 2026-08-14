# changelog_2026-08-14_schema-security-hardening

Етап B плану виправлень після повного сканування проєкту: рівень схеми БД —
`search_path` у definer-функціях, прогонність міграцій із нуля, індекси, зовнішні
ключі та колонкові гранти на `tracks`.

## Зміна

### 1. `SET search_path` у всіх `SECURITY DEFINER` функціях

`is_admin()`, `adjust_credits()`, `apply_plan_purchase()`,
`admin_adjust_credits()`, `admin_set_plan()`, `admin_set_role()` тепер
оголошені з `SET search_path = public, pg_temp`.

### 2. Міграції проганяються з нуля і повторно

- `1765294229_enable_rls_policies.sql` — додано `CREATE TABLE IF NOT EXISTS`
  для `profiles`, `tracks`, `credit_transactions`, `subscriptions`; кожна
  політика створюється після `DROP POLICY IF EXISTS`.
- `1783468800_payments_multi_provider_and_merchants.sql` — додано
  `CREATE TABLE IF NOT EXISTS` для `plans` і `plan_prices`; усі merchant-блоки
  (таблиці, політики, storage-бакет) загорнуто в `DO $$ … IF
  to_regclass('public.merchants') IS NULL THEN RETURN`; політики ідемпотентні.
- `1783555200_rls_security_hardening.sql` — merchant-блоки так само загорнуто;
  `GRANT EXECUTE ON adjust_credits(UUID, INTEGER)` виконується лише якщо
  двоаргументна сигнатура ще існує (її замінює міграція етапу A).

### 3. Індекси під реальні запити застосунку

`tracks (user_id, created_at DESC)`, `tracks (status)`, `tracks (created_at DESC)`,
`credit_transactions (user_id, created_at DESC)`, `credit_transactions (created_at DESC)`,
`subscriptions (user_id)`, `subscriptions (provider, provider_subscription_id)`,
`profiles (email)`, `admin_actions (created_at DESC)`,
`payment_events (created_at DESC)`.

### 4. Зовнішні ключі

`profiles.id → auth.users(id)`, `tracks.user_id → profiles(id)`,
`credit_transactions.user_id → profiles(id)`,
`subscriptions.user_id → profiles(id)` — усі з `ON DELETE CASCADE`.

Додаються як `NOT VALID`, після чого валідація виконується окремим кроком у
`DO`-блоці з перехопленням помилки: якщо в базі вже є сирітські рядки, скрипт
не падає, а друкує `NOTICE` з назвою обмеження. Нові й оновлені рядки
перевіряються в будь-якому разі.

### 5. Колонкові гранти на `tracks`

```sql
REVOKE UPDATE ON tracks FROM anon, authenticated;
GRANT  UPDATE (title, is_public, cover_url) ON tracks TO authenticated;
```

Файли: `supabase/migrations/1786665700_schema_security_hardening.sql` (новий),
три відредаговані legacy-міграції, `supabase/bootstrap.sql`, `CLAUDE.md`.

## Як було до зміни

- **`search_path` не був зафіксований.** Лише `handle_new_user()` мав
  `SET search_path`. Решта definer-функцій резолвили `profiles`, `plans`,
  `credit_transactions` за `search_path` викликача — класичний вектор
  ескалації привілеїв (можна підсунути тимчасову таблицю з тим самим іменем).
  Supabase-лінтер позначає це як `function_search_path_mutable`.
- **`supabase db push` на чистому проєкті падав.** Основні таблиці існували
  лише у `supabase/tables/*.sql`, які CLI не застосовує, тож перша ж міграція
  зупинялась на `relation "profiles" does not exist`. Далі
  `1783468800` виконував `ALTER TABLE merchants ENABLE ROW LEVEL SECURITY` для
  таблиць, яких **жодна міграція не створює** (їх пізніше видалила
  `1784064000_remove_merchants.sql`) — ще одна зупинка, і те саме в
  `1783555200`. До того ж голі `CREATE POLICY` робили ці файли
  неповторюваними: другий запуск падав на `policy already exists`.
- **Жодного індексу.** Список бібліотеки (`tracks` за `user_id` + сортування за
  датою), полінг статусів, пагінація `/admin/tracks` і `/admin/users`, пошук
  профілю за email у вебхуці, 14-денний графік дашборда — усе це були
  послідовні сканування таблиць.
- **Жодного зовнішнього ключа.** Видалення користувача в Supabase Auth лишало
  назавжди осиротілі `profiles`, `tracks`, `credit_transactions` і
  `subscriptions`; цілісність трималась виключно на коді застосунку.
- **`tracks` мав суцільний грант на UPDATE.** RLS-політика
  `"Users can update own tracks"` лише обирає рядок, тож користувач через
  публічний anon-ключ міг у власному треку виставити `status='completed'`,
  підмінити `audio_url` на будь-яку адресу або накрутити `likes`/`plays`.
  Для `profiles` колонкові гранти зробили ще в
  `1783555200_rls_security_hardening.sql`, а для `tracks` — ні.

## Що покращує зміна

- **Definer-функції не можна обдурити підміною схеми** — вони завжди працюють з
  `public`, незалежно від того, що виставив викликач.
- **Проєкт піднімається з нуля через `supabase db push`**, а не лише через
  `bootstrap.sql`; будь-яку міграцію тепер безпечно перезапустити. Історичні
  merchant-блоки збережені (не переписуємо історію), але коректно
  пропускаються.
- **Запити стали індексованими** — бібліотека, полінг, адмін-пагінація й
  дашборд перестають деградувати з ростом кількості треків.
- **Видалення користувача прибирає його дані** каскадом замість того, щоб
  залишати сміття. Наявні сирітські рядки не блокують міграцію — про них
  повідомляє `NOTICE`, і їх можна прибрати окремо, після чого просто
  перезапустити файл.
- **Трек більше не можна переписати з клієнта.** Колонки генерації
  (`status`, `audio_url`, `duration`, `lyrics`) і лічильники (`likes`, `plays`)
  рухає лише service-role; користувачеві лишились `title`, `is_public`,
  `cover_url` — рівно те, що використовує UI (перемикач публічності в
  `/admin/tracks` продовжує працювати).

## Що зробити після оновлення

1. Застосувати міграцію (`supabase db push`) або виконати
   `supabase/migrations/1786665700_schema_security_hardening.sql` у SQL Editor.
   Порядок важливий: спершу `1786665600` (етап A), потім цей файл.
2. Переглянути вивід на `NOTICE` про невалідовані зовнішні ключі — якщо такі є,
   у базі лишились сирітські рядки від видалених користувачів.
