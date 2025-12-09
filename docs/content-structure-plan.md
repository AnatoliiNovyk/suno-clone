# План структури контенту - Suno Clone

## 1. Інвентаризація матеріалів

**Файли документації:**
- `docs/suno_analysis/suno_website_analysis.md` (180 рядків, секції: навігація, UI, генератор, дизайн-система, UX, Hub)
- `docs/suno_analysis/payment_systems_analysis.md` (173 рядки, секції: підписки, методи оплати, політика повернень, конкуренти)
- `docs/suno_analysis/suno_visual_materials_documentation.md` (123 рядки, опис візуальних матеріалів)

**Візуальні матеріали:**
- `imgs/suno_screenshots/` (11 файлів: homepage, advanced interface, lyrics, about, blog)
- `imgs/suno_logos/` (3 файли: офіційні логотипи)
- `imgs/suno_icons/` (6 файлів: іконки додатку, соціальні іконки)
- `imgs/suno_ui_elements/` (12 файлів: AI music UI, audio controls, dark UI, loading animations)
- `imgs/suno_music_examples/` (6 файлів: приклади музики, waveforms)
- `imgs/suno_hero_images/` (3 файли: hero зображення)

**Загальна кількість файлів:** 41 візуальних матеріалів + 3 документи аналізу

## 2. Структура сайту

**Тип:** MPA (Multi-Page Application)

**Обґрунтування:** 
- Більше 6 розділів (Home, Create, Advanced, Library, Pricing, Payment, Hub)
- Різні цільові аудиторії (новачки у Simple, професіонали в Advanced, читачі у Hub)
- Складна функціональність з різними робочими потоками
- Понад 3000 слів контенту в аналізі
- Множинні точки входу та конверсії

## 3. Розбивка по сторінках

### Сторінка 1: Home - Головна сторінка (`/`)

**Призначення:** Привернути увагу, показати цінність, направити до створення музики

**Маппінг контенту:**

| Секція | Паттерн компонента | Шлях до даних | Контент для використання | Візуальні матеріали (контент) |
|--------|-------------------|---------------|--------------------------|-------------------------------|
| Header | Navigation Pattern | - | Логотип "SUNO", Sign In, Sign Up | `imgs/suno_logos/suno_logo_2.jpg` |
| Hero Section | Hero Pattern | `docs/suno_analysis/suno_website_analysis.md` L45-48 | Заголовок "Turn any idea into a song", підзаголовок, prompt example | `imgs/suno_hero_images/hero_music_0.jpg` |
| Quick Start Input | Chat Input Pattern | `docs/suno_analysis/suno_website_analysis.md` L106-109 | Chat prompt bar "Chat to make music", кнопки +, Advanced, Create | - |
| Sample Songs Cards | Song Card Grid (2-3 колонки) | - | Приклади треків з кнопками Play | `imgs/suno_music_examples/suno_music_2.jpg` |
| Social Proof | Logo Grid | - | Логотипи партнерів: Variety, WIRED, Billboard | - |
| Footer | Footer Pattern | - | Навігація, соціальні посилання | `imgs/suno_icons/social_icons_0.jpg` |

### Сторінка 2: Create (Simple Mode) - Простий режим створення (`/create`)

**Призначення:** Швидке створення музики через текстовий промпт

**Маппінг контенту:**

| Секція | Паттерн компонента | Шлях до даних | Контент для використання | Візуальні матеріали (контент) |
|--------|-------------------|---------------|--------------------------|-------------------------------|
| Header | Navigation Pattern | - | Логотип, навігація, профіль | `imgs/suno_logos/suno_logo_2.jpg` |
| Chat Interface | Chat Pattern | `docs/suno_analysis/suno_website_analysis.md` L106-109 | Текстове поле для промпту, історія чату | - |
| Generation Controls | Button Group | - | Кнопка Create з градієнтом, іконки Random/Dice | - |
| Generated Track Preview | Audio Card | - | Прев'ю згенерованого треку | `imgs/suno_music_examples/waveform_1.jpg` |
| Audio Player | Audio Player Pattern | - | Play/Pause, timeline, volume | Використати референс з `imgs/suno_ui_elements/audio_controls_0.png` |

### Сторінка 3: Advanced Mode - Розширений режим (`/advanced`)

**Призначення:** Професійне створення з повним контролем параметрів

**Маппінг контенту:**

| Секція | Паттерн компонента | Шлях до даних | Контент для використання | Візуальні матеріали (контент) |
|--------|-------------------|---------------|--------------------------|-------------------------------|
| Header | Navigation Pattern | - | Навігація з кнопкою "Назад" | - |
| Page Title | Title Block | `docs/suno_analysis/suno_website_analysis.md` L73-79 | "Turn any idea into a song", підзаголовок "Beat, lyrics, or both" | - |
| Lyrics Section | Expandable Card | `docs/suno_analysis/suno_website_analysis.md` L73-79 | Перемикач Auto/Write Lyrics, textarea, кнопка Generate Lyrics | - |
| Instrumental Toggle | Toggle Switch | `docs/suno_analysis/suno_website_analysis.md` L73 | Перемикач Instrumental з іконкою мікрофона | - |
| Styles Selector | Expandable Menu | `docs/suno_analysis/suno_website_analysis.md` L73 | Меню вибору музичних жанрів (50+ варіантів) | - |
| Audio Reference | File Upload Card | `docs/suno_analysis/suno_website_analysis.md` L73 | Завантаження аудіо-референсів | - |
| Vocal Recording | Recording Card | `docs/suno_analysis/suno_website_analysis.md` L73 | Запис через мікрофон | - |
| Create Button | Primary CTA | - | Велика кнопка з градієнтом | - |

### Сторінка 4: Library - Бібліотека треків (`/library`)

**Призначення:** Перегляд, управління та публікація створених треків

**Маппінг контенту:**

| Секція | Паттерн компонента | Шлях до даних | Контент для використання | Візуальні матеріали (контент) |
|--------|-------------------|---------------|--------------------------|-------------------------------|
| Header | Navigation Pattern | - | Навігація + фільтри | - |
| Filter Tabs | Horizontal Tabs | - | All, Public, Private, Liked | - |
| Track Grid | Song Card Grid (3-4 колонки) | `docs/suno_analysis/suno_website_analysis.md` L122-125 | Картки треків з metadata | `imgs/suno_music_examples/suno_music_7.jpg` |
| Track Card | Card Component | - | Обкладинка, назва, автор, лайки, перегляди, Play кнопка | - |
| Audio Player (Sticky) | Fixed Audio Player | - | Плеєр з розширеними контролами | Використати `imgs/suno_ui_elements/audio_controls_4.png` |
| Pagination | Pagination | - | Навігація по сторінках | - |

### Сторінка 5: Pricing - Тарифні плани (`/pricing`)

**Призначення:** Показати плани підписки та конвертувати у платних користувачів

**Маппінг контенту:**

| Секція | Паттерн компонента | Шлях до даних | Контент для використання | Візуальні матеріали (контент) |
|--------|-------------------|---------------|--------------------------|-------------------------------|
| Header | Navigation Pattern | - | Навігація | - |
| Page Hero | Hero Pattern (Simple) | - | Заголовок "Choose your plan" | - |
| Billing Toggle | Toggle Switch | `docs/suno_analysis/payment_systems_analysis.md` L25-27 | Перемикач Monthly/Annual (20% знижка) | - |
| Pricing Cards | Card Grid (3 колонки) | `docs/suno_analysis/payment_systems_analysis.md` L32-40 | Free Basic (50 кредитів/день), Pro, Premier | - |
| Feature Comparison | Table | `docs/suno_analysis/payment_systems_analysis.md` L82-93 | Порівняння функцій по планах | - |
| FAQ Section | Accordion | `docs/suno_analysis/payment_systems_analysis.md` L145-150 | Питання про кредити, комерційне використання, повернення | - |
| CTA | CTA Block | - | Кнопка "Start Creating" | - |

### Сторінка 6: Payment - Оплата (`/payment`)

**Призначення:** Обробка платежів через Stripe

**Маппінг контенту:**

| Секція | Паттерн компонента | Шлях до даних | Контент для використання | Візуальні матеріали (контент) |
|--------|-------------------|---------------|--------------------------|-------------------------------|
| Header | Navigation Pattern | - | Навігація (мінімалістична) | - |
| Order Summary | Summary Card | `docs/suno_analysis/payment_systems_analysis.md` L32-40 | Обраний план, ціна, період | - |
| Payment Methods | Payment Methods Grid | `docs/suno_analysis/payment_systems_analysis.md` L59-73 | Visa, Mastercard, AmEx, Google Pay, Apple Pay, UPI, KakaoPay | - |
| Stripe Integration | Stripe Elements | `docs/suno_analysis/payment_systems_analysis.md` L52-56 | Stripe Checkout/Payment Element | - |
| Billing Details | Form | - | Email, card details, billing address | - |
| Terms Agreement | Checkbox | `docs/suno_analysis/payment_systems_analysis.md` L76-78 | Згода з Terms of Service, політикою повернень | - |
| Submit Button | Primary CTA | - | "Complete Payment" кнопка | - |

### Сторінка 7: Hub - Контентний розділ (`/hub`)

**Призначення:** Освітній контент та м'яка конверсія

**Маппінг контенту:**

| Секція | Паттерн компонента | Шлях до даних | Контент для використання | Візуальні матеріали (контент) |
|--------|-------------------|---------------|--------------------------|-------------------------------|
| Header | Navigation Pattern | - | Навігація + пошук | - |
| Hero | Hero Pattern | - | Заголовок "Hub", підзаголовок | - |
| Featured Article | Large Card | `docs/suno_analysis/suno_website_analysis.md` L49-52 | Головна стаття з великим зображенням | - |
| Articles Grid | Card Grid (3 колонки) | `docs/suno_analysis/suno_website_analysis.md` L37-43 | Картки статей з датою, заголовком, описом, категорією | - |
| Article Card | Card Component | - | Дата, заголовок, опис, категорія, градієнтна обкладинка | - |
| Pagination | Pagination | - | Навігація по статтях | - |
| CTA Footer | CTA Block | - | "Start Creating Music" | - |

### Сторінка 8: Profile - Профіль користувача (`/profile`)

**Призначення:** Управління акаунтом та налаштуваннями

**Маппінг контенту:**

| Секція | Паттерн компонента | Шлях до даних | Контент для використання | Візуальні матеріали (контент) |
|--------|-------------------|---------------|--------------------------|-------------------------------|
| Header | Navigation Pattern | - | Навігація | - |
| Profile Header | Profile Card | - | Аватар, ім'я, username, статистика (треки, лайки) | - |
| Settings Tabs | Vertical Tabs | - | Account, Subscription, Billing, Preferences | - |
| Account Settings | Form Section | - | Email, password, display name | - |
| Subscription Info | Info Card | `docs/suno_analysis/payment_systems_analysis.md` L25-27 | Поточний план, кредити, дата оновлення | - |
| Billing History | Table | - | Історія платежів | - |
| Danger Zone | Alert Card | - | Delete account, cancel subscription | - |

## 4. Аналіз контенту

**Інформаційна щільність:** Висока
- 3 детальні документи аналізу (476+ рядків загалом)
- 41 візуальний матеріал (скріншоти, UI елементи, приклади)
- Складна функціональність (генератор, плеєр, підписки)
- Багато технічних деталей (API, платежі, UX патерни)

**Баланс контенту:**
- Зображення: 41 файлів (40%)
- Текст/Документація: 476+ рядків (35%)
- Функціональність/Інтерактив: (25%)
- **Тип контенту:** Змішаний (візуально-функціональний з акцентом на інтерактивність)

**Візуальна орієнтація:**
- Темна тема як основа бренду
- Музичні приклади та waveforms для демонстрації
- Скріншоти для точного референсу UI
- Hero зображення для атмосферності

**Функціональна складність:**
- Генератор музики (Simple + Advanced режими)
- Аудіо-плеєр з просунутими контролами
- Система підписок та платежів
- Соціальні функції (лайки, перегляди)
- Бібліотека та управління треками
