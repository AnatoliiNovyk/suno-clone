# changelog_2026-07-13_remove-merchants

## Зміна
Повністю видалено функціонал «Мерчант» з усіх шарів проєкту:

- **Фронтенд**: видалено `MerchantRegisterPage.tsx` та `AdminMerchantsPage.tsx`; прибрано маршрути `/merchant` і `/admin/merchants` з `App.tsx`; прибрано пункти «Мерчантам» та «Admin» із хедера; видалено інтерфейс `Merchant` із типів.
- **Edge-функції**: `create-payment` більше не приймає і не валідує `merchantId`; `merchantId`/`merchant_id` прибрано з інтерфейсів провайдерів (`provider.ts`), метаданих Stripe/LiqPay та запису `subscriptions` у `payments-webhook`.
- **Схема БД**: видалено `tables/merchants.sql`, `merchant_documents.sql`, `merchant_provider_accounts.sql`; з `subscriptions` прибрано колонку `merchant_id`; з `bootstrap.sql` вилучено merchant-таблиці, їхні RLS-політики, бакет `merchant-docs` і його storage-політики. Додано ідемпотентну міграцію `1784064000_remove_merchants.sql` для очищення живої бази (DROP таблиць/політик, видалення бакета з файлами, DROP COLUMN).
- **Документація**: з `CLAUDE.md` і `README.md` прибрано розділ merchant-onboarding та всі згадки.

Функція `is_admin()` і колонка `profiles.role` збережені — це загальна адмін-інфраструктура, не специфічна для мерчантів.

## Як було до зміни
У проєкті існував повний цикл мерчант-онбордингу: реєстрація з KYC-документом на `/merchant`, приватний Storage-бакет `merchant-docs`, три таблиці БД із RLS-політиками, адмін-рев'ю на `/admin/merchants`, і прив'язка `merchantId` через увесь платіжний ланцюжок (create-payment → провайдери → webhook → subscriptions.merchant_id). Функціонал з'явився внаслідок непорозуміння у вимогах.

## Що покращує зміна
Кодова база спрощена відповідно до фактичних вимог власника: менше сторінок, таблиць, політик і параметрів у платіжному флоу; менша поверхня атаки (немає прийому документів користувачів); платіжна абстракція стала чистішою (провайдери працюють лише з планом/валютою/користувачем). Для живої бази достатньо один раз виконати міграцію `1784064000_remove_merchants.sql` у SQL Editor.
