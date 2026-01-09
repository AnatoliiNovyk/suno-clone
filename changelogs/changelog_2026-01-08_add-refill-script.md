# Changelog: Add Credit Refill Script

## Дата зміни / Date of Change
2026-01-08

## Короткий опис / Short Description
add-credit-refill-utility-script

## Опис змін / Description of Changes

### До зміни / Before Change
- Розробник не мав можливості поповнити кредити для тестування генерації, оскільки інтеграція зі Stripe не працює без валідних ключів і вебхуків.
- Єдиний спосіб - ручне редагування бази даних через SQL-редактор Supabase.

### Після зміни / After Change
- **Створено скрипт `python-service/refill_credits.py`**: Утиліта для ручного нарахування кредитів користувачу за email'ом.
- Скрипт використовує ті ж змінні середовища та `httpx` клієнт, що і основний сервіс.

### Переваги / Benefits
- Швидке відновлення можливості тестування (DX).
- Не потребує доступу до UI Supabase Dashboard.
