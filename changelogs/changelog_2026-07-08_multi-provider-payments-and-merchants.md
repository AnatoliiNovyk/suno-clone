# changelog_2026-07-08_multi-provider-payments-and-merchants

## Зміна
Додано плагінну систему платіжних провайдерів (Stripe + LiqPay), мультивалютність (UAH/USD/EUR) та реєстрацію мерчанта з мінімумом документів. Супутньо виправлено критичні проблеми платіжного шляху з код-рев'ю.

## Як було до зміни
- Оплата працювала **лише через Stripe**: валюта `'usd'` та інтервал `'month'` були захардкоджені в `create-subscription` (щорічний тариф із фронтенду взагалі не досягав Stripe).
- Ціни/кредити планів дублювалися в 4 місцях (PricingPage, PaymentPage, create-subscription, stripe-webhook) і могли розійтися; валюти не існувало ніде в моделі даних.
- Таблиця `subscriptions` була жорстко прив'язана до Stripe (`stripe_customer_id`/`stripe_subscription_id`); таблиці `suno_plans`/`suno_subscriptions` були мертві.
- Вебхук Stripe **не перевіряв підпис** (будь-хто міг надіслати підроблену подію й отримати план/кредити).
- Поняття «мерчант», KYC чи документів не існувало.
- Кредити списувалися/поверталися неатомарно (read-modify-write — гонки при паралельних генераціях), а невдале повернення кредитів **мовчки ковталося** (`except: pass`) — користувач міг назавжди втратити 10 кредитів.
- `success_url` у Stripe будувався маніпуляцією з `SUPABASE_URL` і був некоректним.

## Що покращує зміна
- **Плагінні провайдери:** інтерфейс `PaymentProvider` (`supabase/functions/_shared/payments/`), реєстр провайдерів; додати новий шлюз = один файл + один запис у реєстрі. Реалізовано Stripe (USD/EUR) і LiqPay (UAH/USD/EUR).
- **Мультивалютність:** нові таблиці `plans` + `plan_prices` — єдине джерело правди; фіксовані ціни на кожну валюту в мінорних одиницях (без автоконвертації). Фронтенд отримав селектор валюти (₴/$/€) і форматування `formatMoney`; сервер бере ціну лише з БД, ніколи з клієнта. Щорічний інтервал тепер реально передається провайдеру.
- **Безпека вебхуків:** новий `payments-webhook` перевіряє підписи (Stripe HMAC-SHA256 + захист від replay; LiqPay `base64(sha1(priv+data+priv))`) — непідписані події не досягають БД.
- **Мерчанти з мінімумом документів:** сторінка `/merchant` — назва, email, країна та **один документ** достатні для заявки; документи йдуть у приватний бакет `merchant-docs` (owner-scoped RLS); заявка отримує статус `pending`; апрув — роллю `admin` (`profiles.role`, `is_admin()`). Облікові дані шлюзів мерчанта зберігаються як `credentials_ref` (без plaintext-ключів).
- **Атомарні кредити:** RPC `adjust_credits` (SECURITY DEFINER, лише service role) замінює read-modify-write у python-service — усунуто гонку подвійного списання/затирання повернення; невдале повернення тепер логуються як `[CRITICAL]`, а не ковтаються.
- **Узагальнена модель підписок:** `subscriptions` отримала `provider`, `currency`, `amount_minor`, `interval`, `provider_customer_id`/`provider_subscription_id`, `merchant_id` (зі зворотним заповненням зі старих stripe-колонок).
- `SITE_URL` env виправляє формування redirect-URL після оплати.

## Перевірка
- `deno check` обох нових edge-функцій (включно з модулем `_shared/payments`) — без помилок.
- Фронтенд: `tsc -b` чисто, ESLint без помилок, `vite build` успішний.
- `python-service/main.py` імпортується; `adjust_credits`/`InsufficientCreditsError` на місці, посилань на старий read-modify-write немає.
- Реальний чекаут потребує sandbox-ключів Stripe/LiqPay та застосованої міграції (`supabase db push`).
