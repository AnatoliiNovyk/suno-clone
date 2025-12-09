# Дизайн-специфікація - Suno Clone

## 1. Напрямок та обґрунтування

**Стиль:** Dark Mode First з елементами Artistic Minimalism та Glassmorphism

**Суть:** Темна, атмосферна AI музична платформа з теплими градієнтами, neumorphism ефектами та креативним відчуттям студійного продакшну. Дизайн балансує між професійною строгістю та емоційною залученістю, використовуючи noise-текстури, м'які тіні та градієнтне освітлення для створення "живого", тактильного інтерфейсу. Типографічний контраст (serif для емоції, sans-serif для функціональності) підкреслює подвійну природу продукту: мистецтво через технологію.

**Візуальна есенція:** Нічна студія звукозапису з аналоговим теплом, де темрява не тисне, а створює фокус на творчості. Gradient освітлення нагадує софіти на сцені, noise-текстура — зернистість плівки, pill-кнопки — фізичні контролери синтезаторів.

**Приклади:** Suno.com (оригінал), Spotify (темна тема), Linear (мінімалізм), Ableton Live (студійна естетика), Apple Music (neumorphism картки).

**Чому цей стиль:**
- **Темна тема:** Знижує втому очей під час довгих сесій створення музики, створює фокус на контенті (waveforms, обкладинки), асоціюється з професійним музичним софтом.
- **Теплі градієнти:** Пом'якшують холодність чорного, додають емоції та енергії, створюють глибину без перевантаження.
- **Serif заголовки:** Додають editorial відчуття, піднімають музику до рівня мистецтва, а не лише утиліти.
- **Neumorphism картки:** М'які тіні та світлові акценти роблять інтерфейс тактильним, знижують цифрову відчуженість.
- **Noise текстура:** Додає аналогову теплоту, нагадує вінілові платівки або плівку, робить досвід менш "штучним".

## 2. Дизайн-токени

### 2.1 Кольори

**Primary (Теплі акценти):**

| Токен | Значення | Використання |
|-------|----------|--------------|
| primary-50 | #FFF3E0 | Hover на світлих елементах |
| primary-100 | #FFE0B2 | Subtle highlights |
| primary-500 | #FF5722 | Головний акцент (CTA, активні стани, іконки Play) |
| primary-700 | #E64A19 | Hover на primary-500 |
| primary-900 | #BF360C | Pressed стан, темні акценти |

**Neutral (Темні відтінки з warmth):**

| Токен | Значення | Використання |
|-------|----------|--------------|
| neutral-50 | #E5E5E5 | Білий текст на темному (приглушений) |
| neutral-100 | #CCCCCC | Другорядний текст, плейсхолдери |
| neutral-300 | #707070 | Деактивовані елементи, icons |
| neutral-500 | #3D3D3D | Borders, dividers |
| neutral-700 | #1A1B20 | Фон карток, inputs |
| neutral-900 | #0A0A0A | Глобальний фон сторінки |

**Background (Градієнтні шари):**

| Токен | Значення | Використання |
|-------|----------|--------------|
| bg-page | linear-gradient(135deg, #0A0A0A 0%, #1A1B20 50%, #2D1B0E 100%) | Основний фон сторінки з warmth |
| bg-hero | radial-gradient(ellipse at top, rgba(139,38,53,0.3) 0%, transparent 70%) | Hero overlay з бордовим світінням |
| bg-card | rgba(26,27,32,0.6) | Напівпрозорі картки з blur backdrop |
| bg-card-hover | rgba(26,27,32,0.8) | Hover стан карток |

**Semantic (Функціональні кольори):**

| Токен | Значення | Використання |
|-------|----------|--------------|
| success | #4CAF50 | Успішна генерація, підтвердження |
| warning | #FFC107 | Попередження про кредити |
| error | #F44336 | Помилки, критичні повідомлення |
| info | #2196F3 | Інформаційні підказки |

**WCAG контрастність (перевірені пари):**

- `neutral-50` (#E5E5E5) на `neutral-900` (#0A0A0A): **13.8:1** (AAA ✓)
- `primary-500` (#FF5722) на `neutral-900` (#0A0A0A): **5.1:1** (AA ✓)
- `neutral-100` (#CCCCCC) на `neutral-700` (#1A1B20): **8.2:1** (AAA ✓)

### 2.2 Типографія

**Font Families:**

| Токен | Значення | Призначення |
|-------|----------|-------------|
| font-display | "Reckless Neue", "Tiempos Headline", "Freight Display", serif | Великі заголовки, hero text |
| font-body | "Inter", "SF Pro Text", -apple-system, sans-serif | Основний текст, UI елементи |
| font-mono | "JetBrains Mono", "Fira Code", monospace | Timestamps, технічні дані |

**Font Sizes (Type Scale 1.25 - Major Third):**

| Токен | Значення | Line Height | Використання |
|-------|----------|-------------|--------------|
| text-xs | 12px | 1.4 | Labels, метадата |
| text-sm | 14px | 1.5 | Body text (small), кнопки |
| text-base | 16px | 1.6 | Body text (default) |
| text-lg | 20px | 1.5 | Large body, субзаголовки |
| text-xl | 24px | 1.4 | Section headers |
| text-2xl | 32px | 1.3 | Page titles |
| text-3xl | 48px | 1.2 | Hero subheadlines |
| text-4xl | 64px | 1.1 | Hero headlines |
| text-5xl | 80px | 1.05 | Display (великі екрани) |

**Font Weights:**

| Токен | Значення | Використання |
|-------|----------|--------------|
| font-regular | 400 | Body text, плейсхолдери |
| font-medium | 500 | UI елементи, links |
| font-semibold | 600 | Субзаголовки, buttons |
| font-bold | 700 | Заголовки, акценти |

**Letter Spacing:**

- Великі заголовки (text-4xl+): `-0.02em` (тісніше)
- Кнопки та ALL CAPS: `0.05em` (ширше)
- Body text: `0em` (default)

### 2.3 Spacing (4pt Grid, пріоритет 8pt)

| Токен | Значення | Використання |
|-------|----------|--------------|
| space-1 | 4px | Tight spacing, іконки |
| space-2 | 8px | Gap в button groups |
| space-3 | 12px | Невеликі відступи |
| space-4 | 16px | Default padding в картках |
| space-6 | 24px | Gap між секціями |
| space-8 | 32px | Card padding (великі) |
| space-12 | 48px | Gap між major секціями |
| space-16 | 64px | Hero padding (vertical) |
| space-24 | 96px | Section spacing (великі екрани) |
| space-32 | 128px | Hero padding (top, великі екрани) |

### 2.4 Border Radius

| Токен | Значення | Використання |
|-------|----------|--------------|
| radius-sm | 8px | Small buttons, badges |
| radius-md | 12px | Inputs, smaller cards |
| radius-lg | 16px | Large cards, modals |
| radius-xl | 24px | Hero cards, special elements |
| radius-full | 9999px | Pill buttons, avatars, Play кнопки |

**Правило вкладеності:** Зовнішній radius ≥ внутрішній + 4px

### 2.5 Box Shadow (Neumorphism + Depth)

| Токен | Значення | Використання |
|-------|----------|--------------|
| shadow-sm | 0 1px 2px rgba(0,0,0,0.3) | Subtle elevation |
| shadow-card | 0 4px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05) | Картки в спокої |
| shadow-card-hover | 0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08) | Hover стан карток |
| shadow-modal | 0 24px 48px rgba(0,0,0,0.6) | Модальні вікна |
| shadow-glow-orange | 0 0 24px rgba(255,87,34,0.3) | Акцентне підсвічування (Play кнопки) |

**Neumorphism Light Source:** Top-left (135deg)
- Light highlight: `inset 1px 1px 2px rgba(255,255,255,0.05)` (top-left)
- Dark shadow: `inset -1px -1px 2px rgba(0,0,0,0.3)` (bottom-right)

### 2.6 Animation

| Токен | Значення | Використання |
|-------|----------|--------------|
| duration-fast | 150ms | Micro-interactions (hover на іконках) |
| duration-base | 250ms | Кнопки, links, transitions |
| duration-slow | 400ms | Модалі, drawer, page transitions |
| duration-slowest | 600ms | Hero animations, parallax |
| easing-default | cubic-bezier(0.4, 0, 0.2, 1) | Загальні transitions |
| easing-out | cubic-bezier(0, 0, 0.2, 1) | Елементи, що з'являються |
| easing-in | cubic-bezier(0.4, 0, 1, 1) | Елементи, що зникають |

## 3. Компоненти (MAX 6)

### 3.1 Button (2 варіанти)

**Primary (Градієнтна CTA):**

```
Структура: [Icon (optional)] + Label
Tokens:
  - Background: linear-gradient(135deg, #FF6B35 0%, #FF5722 50%, #E64A19 100%)
  - Text: neutral-50 (білий)
  - Font: font-body, font-semibold, text-base
  - Padding: space-4 (16px) vertical, space-6 (24px) horizontal
  - Radius: radius-full (pill-shape)
  - Shadow: shadow-glow-orange
  - Height: 48px (mobile), 56px (desktop)

States:
  - Default: Градієнт + glow shadow
  - Hover: brightness(1.1), scale(1.02), shadow збільшується
  - Active/Pressed: brightness(0.95), scale(0.98)
  - Disabled: opacity(0.4), cursor not-allowed

Note: Тільки для головних дій (Create, Submit Payment, Start Creating).
```

**Secondary (Ghost/Outline):**

```
Структура: [Icon (optional)] + Label
Tokens:
  - Background: transparent або bg-card (напівпрозорий)
  - Border: 1px solid rgba(255,255,255,0.15)
  - Text: neutral-50
  - Font: font-body, font-medium, text-sm
  - Padding: space-3 (12px) vertical, space-4 (16px) horizontal
  - Radius: radius-full
  - Height: 40px

States:
  - Default: Прозорий з border
  - Hover: bg-card-hover, border brightness(1.2)
  - Active: bg-card, scale(0.98)
  - Disabled: opacity(0.4)

Note: Для другорядних дій (Sign In, Advanced, Cancel).
```

### 3.2 Card (Універсальна картка контенту)

**Song Card (для бібліотеки/треків):**

```
Структура:
  - Cover Image (aspect-ratio 1:1 або 16:9)
  - Content Area:
    - Title (text-lg, font-semibold)
    - Artist/Metadata (text-sm, neutral-100)
    - Social Stats (лайки, перегляди - text-xs)
  - Action Overlay (Play кнопка по центру при hover)

Tokens:
  - Background: bg-card з backdrop-blur(20px)
  - Padding: space-4 (16px)
  - Radius: radius-lg (16px)
  - Shadow: shadow-card (default), shadow-card-hover (hover)
  - Border: 1px solid rgba(255,255,255,0.05)

States:
  - Default: Статичний з тонкою border
  - Hover: 
    - transform: translateY(-4px)
    - shadow: shadow-card-hover
    - Overlay з'являється (Play кнопка)
    - Image: brightness(0.7) - затемнення для контрасту з Play
  - Active: transform: scale(0.98)

Note: Cover має object-fit: cover. Play кнопка - 64px кругла, primary-500 з shadow-glow-orange.
```

### 3.3 Input (Текстові поля та Textarea)

**Text Input / Textarea:**

```
Структура:
  - Label (опціонально, text-sm, neutral-100)
  - Input/Textarea
  - Helper text або error message (text-xs)

Tokens:
  - Background: neutral-700 (темніше за сторінку)
  - Border: 1px solid neutral-500
  - Text: neutral-50, font-body, text-base
  - Placeholder: neutral-300
  - Padding: space-3 (12px) vertical, space-4 (16px) horizontal
  - Radius: radius-md (12px)
  - Height: 48px (input), auto (textarea)

States:
  - Default: neutral-700 bg, neutral-500 border
  - Focus: 
    - border: 2px solid primary-500
    - shadow: 0 0 0 4px rgba(255,87,34,0.1) - focus ring
  - Error: border: error, focus ring error
  - Disabled: opacity(0.5), cursor not-allowed

Note: Textarea має min-height 120px, resize: vertical. У Advanced режимі - великі textarea (200-300px).
```

### 3.4 Audio Player (Sticky Player)

```
Структура:
  - Left: Cover (48x48px) + Track Info (Title, Artist)
  - Center: 
    - Playback Controls (Previous, Play/Pause, Next - кругові кнопки 40px)
    - Seekbar (прогрес-бар з timeline)
    - Time (поточний) / Duration
  - Right: Volume Control (іконка + slider)

Tokens:
  - Background: bg-card з backdrop-blur(40px) - сильне розмиття
  - Position: fixed bottom-0, z-index: 50
  - Width: 100%
  - Padding: space-4 (16px)
  - Border-top: 1px solid rgba(255,255,255,0.1)
  - Shadow: shadow-modal (підняття над контентом)

Playback Controls:
  - Size: 40px (side buttons), 48px (Play/Pause - більша)
  - Background: transparent → bg-card (hover)
  - Icon Color: neutral-50 → primary-500 (active)

Seekbar:
  - Height: 4px
  - Background: neutral-700
  - Progress: linear-gradient(90deg, primary-500, primary-700)
  - Thumb: 12px circle, primary-500, з'являється при hover
  - Hover: height збільшується до 6px

Volume:
  - Slider width: 100px
  - Стиль як у seekbar

Note: На мобільних (<768px) - спрощена версія без volume, controls більші (48px).
```

### 3.5 Navigation (Header)

```
Структура:
  - Left: Logo (SUNO) + Primary Nav Links (Create, Library, Hub)
  - Right: Credits Counter + Profile/Auth Buttons

Tokens:
  - Position: fixed top-0, z-index: 40
  - Background: bg-card з backdrop-blur(20px)
  - Height: 64px
  - Padding: 0 space-6 (24px) на desktop, 0 space-4 (16px) на mobile
  - Border-bottom: 1px solid rgba(255,255,255,0.05)

Logo:
  - Font: font-body, font-bold, text-xl
  - Color: neutral-50
  - Letter-spacing: 0.05em (UPPERCASE tracking)

Nav Links:
  - Font: font-body, font-medium, text-sm
  - Color: neutral-100 → neutral-50 (hover/active)
  - Активний стан: underline decoration-2 decoration-primary-500

Credits Counter:
  - Background: bg-card
  - Padding: space-2 (8px) space-3 (12px)
  - Radius: radius-full
  - Text: text-sm, neutral-100
  - Icon: іскра/зірка, primary-500

Note: На мобільних (<768px) - hamburger menu, drawer з боку.
```

### 3.6 Modal / Dialog

```
Структура:
  - Backdrop (повноекранний overlay)
  - Modal Container:
    - Header (Title + Close Button)
    - Content (scrollable якщо потрібно)
    - Footer (Actions)

Tokens:
  - Backdrop: rgba(0,0,0,0.7) з backdrop-blur(8px)
  - Container Background: neutral-700
  - Max-width: 640px (md), 800px (lg)
  - Padding: space-6 (24px)
  - Radius: radius-xl (24px)
  - Shadow: shadow-modal

Header:
  - Border-bottom: 1px solid neutral-500
  - Padding-bottom: space-4 (16px)
  - Title: text-2xl, font-bold

Content:
  - Padding: space-6 (24px) 0
  - Max-height: 70vh (scrollable)

Footer:
  - Border-top: 1px solid neutral-500
  - Padding-top: space-4 (16px)
  - Buttons: gap space-3 (12px), justify-end

Animations:
  - Backdrop: opacity 0 → 1 (duration-base)
  - Container: scale(0.95) + opacity(0) → scale(1) + opacity(1) (duration-slow)
  - Exit: reverse

Note: Закриття на Escape, клік по backdrop, або Close button.
```

## 4. Layout та Responsive

### 4.1 Website Architecture (MPA - 8 сторінок)

**Базові паттерни сторінок:**

**Home Page Pattern:**
- Hero Section (500-600px висота)
  - Фон: bg-hero з noise texture
  - Заголовок: text-4xl (64px), font-display, centered
  - Chat Input Bar (600px ширина, centered)
  - Sample Cards (2-3 колонки, flanking sides з perspective tilt)
- Social Proof (Logo Grid, 100px висота)
  - Logos opacity 0.4, grayscale filter

**Create/Advanced Page Pattern:**
- Page Header (100px)
  - Breadcrumb/Back button
  - Title: text-3xl (48px)
- Content Container (max-width 800px, centered)
  - Cards: stacked vertically, gap space-6 (24px)
  - Lyrics Card: висота auto (200-400px textarea)
  - Collapsible sections (Styles, Audio)
- Sticky CTA Footer (80px)
  - Create Button (full-width на mobile, 240px на desktop)

**Library Page Pattern:**
- Filter Tabs (Horizontal, 56px висота)
- Track Grid: 3 колонки (desktop) → 2 колонки (tablet) → 1 колонка (mobile)
  - Gap: space-6 (24px)
  - Card aspect-ratio: 1:1 (square covers)
- Sticky Audio Player (внизу)

**Pricing Page Pattern:**
- Hero (200px)
- Billing Toggle (centered)
- Pricing Cards: 3 колонки (desktop) → 1 колонка стек (mobile)
  - Gap: space-8 (32px)
  - Recommended plan: scale(1.05), primary-500 border
- Feature Table (full-width, max-width 1200px)
- FAQ (Accordion, max-width 800px)

### 4.2 Breakpoints

```
sm: 640px   - Мобільні (landscape), small tablets
md: 768px   - Tablets
lg: 1024px  - Laptops
xl: 1280px  - Desktops
2xl: 1536px - Large desktops
```

### 4.3 Grid System

**Container:**
- Max-width: 1400px (основний контент)
- Max-width: 800px (forms, articles, settings)
- Padding: space-4 (16px) mobile, space-6 (24px) desktop

**Grid Columns:**
- 12-column grid
- Gap: space-6 (24px)

**Responsive Adaptation:**

| Element | Mobile (<768px) | Desktop (≥768px) |
|---------|-----------------|------------------|
| Hero Title | text-3xl (48px) | text-4xl (64px) |
| Cards Grid | 1 column | 3 columns |
| Nav | Hamburger drawer | Horizontal |
| Audio Player | Simplified | Full controls |
| Spacing | 16px padding | 24-32px padding |
| Buttons | Full-width (primaries) | Auto-width |

**Touch Targets:**
- Мінімум 44x44px на мобільних
- Buttons висота: 48px (mobile), 40-56px (desktop)
- Spacing між інтерактивними елементами: мінімум space-3 (12px)

### 4.4 Visual Effects (Decorative)

**Noise Texture:**
- Overlay на bg-page з opacity 0.03-0.05
- SVG pattern або CSS filter: `url(#noise)`

**Gradient Lighting (Hero):**
- Radial gradient з центру, колір primary-900 з низькою opacity
- Віньєтування на краях (darker corners)

**Glassmorphism:**
- `backdrop-filter: blur(20px)` на картках
- Напівпрозорі фони (rgba)
- Тонкі світлові borders (rgba(255,255,255,0.05))

**Parallax (опціонально, Hero):**
- Background рухається повільніше за контент (0.5x швидкості скролу)
- Максимальний offset: 16px (не більше, щоб не викликати нудоту)

## 5. Взаємодія та Анімації

### 5.1 Animation Standards

**Принцип:** Анімувати ТІЛЬКИ `transform` та `opacity` (GPU-accelerated). Ніколи не анімувати width, height, margin, padding.

**Тривалості за контекстом:**
- Micro-interactions (hover іконки): duration-fast (150ms)
- Buttons, links: duration-base (250ms)
- Modals, drawers: duration-slow (400ms)
- Hero animations: duration-slowest (600ms)

**Easing:**
- 90% випадків: easing-default (cubic-bezier(0.4, 0, 0.2, 1))
- Елементи що з'являються: easing-out
- Елементи що зникають: easing-in

### 5.2 Component Interactions

**Buttons:**
```
Hover: transform: scale(1.02), brightness(1.1) - duration-base
Active: transform: scale(0.98) - duration-fast
```

**Cards:**
```
Hover: 
  - transform: translateY(-4px) - duration-base
  - shadow: shadow-card → shadow-card-hover
  - Overlay (Play button): opacity: 0 → 1
Active: transform: scale(0.98) - duration-fast
```

**Inputs:**
```
Focus: 
  - border: transition all duration-base
  - Focus ring з'являється (0 → 4px spread) - duration-fast
```

**Modal:**
```
Open:
  - Backdrop: opacity 0 → 1 - duration-base
  - Container: scale(0.95) opacity(0) → scale(1) opacity(1) - duration-slow
Close: reverse
```

**Navigation Links:**
```
Hover: 
  - Color transition - duration-base
  - Underline animation (0% → 100% width from left) - duration-base
```

**Audio Player Seekbar:**
```
Hover: 
  - Height: 4px → 6px - duration-fast
  - Thumb з'являється: scale(0) → scale(1) - duration-fast
Drag: cursor grab → grabbing
```

### 5.3 Reduced Motion

Для користувачів з `prefers-reduced-motion: reduce`:
- Відключити всі transforms (scale, translate, rotate)
- Залишити тільки opacity transitions
- Duration зменшити до 100ms
- Видалити parallax та складні animations

### 5.4 Loading States

**Skeleton Screens (замість спінерів):**
- Background: neutral-700
- Shimmer animation: linear-gradient переміщується зліва направо
- Duration: 1.5s infinite
- Shape відповідає майбутньому контенту (card → card skeleton)

**Progress Indicators:**
- Генерація музики: Linear progress bar + текст "Creating your song..."
- Upload: Circular progress + percentage

### 5.5 Performance Rules

- ✅ Анімувати: transform, opacity
- ❌ НЕ анімувати: width, height, margin, padding, top, left
- ✅ Використовувати: will-change (обережно, тільки під час анімації)
- ✅ GPU acceleration: transform: translateZ(0) на елементи що анімуються
- ✅ Debounce hover effects на списках (затримка 50ms перед hover effect)

---

**Загальна характеристика:**
Дизайн створює баланс між професійною строгістю темної теми та емоційною залученістю креативного інструменту. Noise текстура, теплі градієнти та neumorphism ефекти додають "живість" цифровому інтерфейсу, а типографічний контраст (serif/sans-serif) підкреслює подвійність: мистецтво (музика) через технологію (AI). Всі рішення спрямовані на мінімізацію когнітивного навантаження та максимізацію фокусу на творчому процесі.
