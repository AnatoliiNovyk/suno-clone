# Бібліотека компонентів - Візуальний гайд

## Огляд

Цей документ надає детальні візуальні специфікації для 6 ключових компонентів дизайн-системи Suno Clone. Кожен компонент включає структуру, розміри, spacing, кольори та варіанти станів.

---

## 1. Button Component

### 1.1 Primary Button (Градієнтна CTA)

**Призначення:** Головні дії (Create, Submit Payment, Sign Up)

```
┌────────────────────────────────────┐
│  [Icon]  Create Music       →      │  ← Gradient bg: #FF6B35 → #FF5722 → #E64A19
└────────────────────────────────────┘
 ↑         ↑                   ↑
 16px     Label              16px
padding  (font-semibold)    padding
         text-base
```

**Специфікація:**
- **Висота:** 48px (mobile), 56px (desktop)
- **Padding:** 16px vertical, 24px horizontal
- **Border Radius:** 9999px (pill-shape)
- **Font:** Inter, 600 (semibold), 16px
- **Text Color:** #E5E5E5 (neutral-50)
- **Background:** Linear gradient 135deg
  - Start: #FF6B35
  - Middle: #FF5722
  - End: #E64A19
- **Shadow:** 0 0 24px rgba(255,87,34,0.3) (glow-orange)
- **Icon (optional):** 20px, spacing 8px від тексту

**States:**
```
Default:  ┌──────────────┐
          │ Create Music │  ← Gradient + glow shadow
          └──────────────┘

Hover:    ┌──────────────┐
          │ Create Music │  ← brightness(1.1), scale(1.02), shadow↑
          └──────────────┘

Active:   ┌──────────────┐
          │ Create Music │  ← brightness(0.95), scale(0.98)
          └──────────────┘

Disabled: ┌──────────────┐
          │ Create Music │  ← opacity(0.4), cursor: not-allowed
          └──────────────┘
```

**Transitions:**
- All: 250ms cubic-bezier(0.4, 0, 0.2, 1)

---

### 1.2 Secondary Button (Ghost/Outline)

**Призначення:** Другорядні дії (Sign In, Cancel, Advanced)

```
┌────────────────────────────────────┐
│        Sign In                     │  ← Transparent bg, border
└────────────────────────────────────┘
 ↑                                  ↑
 12px                              12px
padding                          padding
```

**Специфікація:**
- **Висота:** 40px
- **Padding:** 12px vertical, 16px horizontal
- **Border Radius:** 9999px (pill-shape)
- **Border:** 1px solid rgba(255,255,255,0.15)
- **Font:** Inter, 500 (medium), 14px
- **Text Color:** #E5E5E5 (neutral-50)
- **Background:** transparent або rgba(26,27,32,0.6) (bg-card)

**States:**
```
Default:  ┌────────────┐
          │  Sign In   │  ← Transparent + border
          └────────────┘

Hover:    ┌────────────┐
          │  Sign In   │  ← bg-card-hover, border brightness(1.2)
          └────────────┘

Active:   ┌────────────┐
          │  Sign In   │  ← bg-card, scale(0.98)
          └────────────┘
```

---

## 2. Card Component (Song Card)

### Структура

```
┌──────────────────────────────────────┐
│  ┌──────────────────────────────┐   │
│  │                              │   │ ← Cover Image (16:9 або 1:1)
│  │      [COVER IMAGE]           │   │   object-fit: cover
│  │                              │   │
│  └──────────────────────────────┘   │
│                                      │
│  Song Title Here                     │ ← text-lg, font-semibold, neutral-50
│  Artist Name                         │ ← text-sm, neutral-100
│                                      │
│  ♥ 1.2k    👁 5.4k                  │ ← text-xs, neutral-300, icons
└──────────────────────────────────────┘
 ↑                                    ↑
16px                                 16px
padding                            padding
```

**Специфікація:**
- **Background:** rgba(26,27,32,0.6) з backdrop-filter: blur(20px)
- **Border:** 1px solid rgba(255,255,255,0.05)
- **Border Radius:** 16px
- **Padding:** 16px
- **Shadow:** 0 4px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)

**Cover Image:**
- **Aspect Ratio:** 1:1 (square) або 16:9 (widescreen)
- **Border Radius:** 12px (inner, відповідає правилу outer - 4px)
- **Object Fit:** cover

**Typography:**
- **Title:** font-body, 600, 20px, neutral-50
- **Artist:** font-body, 400, 14px, neutral-100
- **Stats:** font-body, 400, 12px, neutral-300

**Hover Effect:**
```
Default State:
┌──────────────────────────────────────┐
│  [Cover Image]                       │  ← Статична картинка
│                                      │
│  Song Title                          │
│  Artist Name                         │
│  ♥ 1.2k    👁 5.4k                  │
└──────────────────────────────────────┘

Hover State:
┌──────────────────────────────────────┐
│  ┌────────────────────────────────┐ │
│  │    [Darker Cover: 70%]         │ │ ← brightness(0.7)
│  │                                │ │
│  │         ┌────────┐             │ │
│  │         │   ▶    │             │ │ ← Play button (64px circle)
│  │         └────────┘             │ │   bg: primary-500, shadow-glow
│  │                                │ │
│  └────────────────────────────────┘ │
│                                      │
│  Song Title                          │
│  Artist Name                         │
│  ♥ 1.2k    👁 5.4k                  │
└──────────────────────────────────────┘
   ↑ Card піднімається: translateY(-4px)
   ↑ Shadow збільшується: shadow-card-hover
```

**Transitions:**
- Card: transform + shadow - 250ms
- Image brightness: 250ms
- Overlay (Play button): opacity 0 → 1 - 250ms

**Play Button:**
- **Size:** 64px × 64px (circle)
- **Background:** #FF5722 (primary-500)
- **Icon:** ▶ (play), 24px, white
- **Shadow:** 0 0 24px rgba(255,87,34,0.3)
- **Position:** Absolute center

---

## 3. Input Component

### 3.1 Text Input

```
Label Text (optional)
┌────────────────────────────────────────────────┐
│  Enter your email address                      │ ← Input text (neutral-50)
└────────────────────────────────────────────────┘
Helper text or error message (optional)

↑                                              ↑
12px padding                                  12px
vertical                                    vertical
```

**Специфікація:**
- **Background:** #1A1B20 (neutral-700)
- **Border:** 1px solid #3D3D3D (neutral-500)
- **Border Radius:** 12px
- **Height:** 48px
- **Padding:** 12px vertical, 16px horizontal
- **Font:** Inter, 400, 16px
- **Text Color:** #E5E5E5 (neutral-50)
- **Placeholder:** #707070 (neutral-300)

**Label (optional):**
- **Font:** Inter, 500, 14px
- **Color:** #CCCCCC (neutral-100)
- **Margin-bottom:** 8px

**Helper/Error Text:**
- **Font:** Inter, 400, 12px
- **Color:** #CCCCCC (neutral-100) або #F44336 (error)
- **Margin-top:** 4px

**Focus State:**
```
Default:
┌────────────────────────────────────────────────┐
│  Email address                                 │ ← Border: neutral-500
└────────────────────────────────────────────────┘

Focus:
┌────────────────────────────────────────────────┐
│  user@example.com|                             │ ← Border: 2px primary-500
└────────────────────────────────────────────────┘
 ◀──────────────────────────────────────────────▶
   Focus ring: 0 0 0 4px rgba(255,87,34,0.1)
```

**Error State:**
```
┌────────────────────────────────────────────────┐
│  invalid-email                                 │ ← Border: 2px #F44336
└────────────────────────────────────────────────┘
⚠ Please enter a valid email address
↑ Error message (text-xs, error color)
```

---

### 3.2 Textarea (Advanced Mode)

```
Lyrics (optional label)
┌────────────────────────────────────────────────┐
│  Write your lyrics here...                     │
│                                                │
│                                                │
│                                                │ ← Min-height: 120px
│                                                │   resize: vertical
│                                                │
│                                                │
│                                                │
└────────────────────────────────────────────────┘
```

**Специфікація:**
- Така сама як Input, але:
- **Min-height:** 120px (default), 200-300px (Advanced mode)
- **Resize:** vertical
- **Line-height:** 1.6 (для читабельності багаторядкового тексту)

---

## 4. Audio Player (Sticky Player)

### Структура

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ┌────┐  Song Title            ⏮  ▶  ⏭       ──●────────  01:23 / 3:45  🔊──│──│
│  │IMG │  Artist Name                                                           │
│  └────┘                                                                        │
└──────────────────────────────────────────────────────────────────────────────┘
   ↑      ↑                        ↑            ↑            ↑           ↑
   48x48  Track Info         Controls       Seekbar      Time        Volume
```

**Специфікація:**
- **Position:** fixed, bottom: 0, z-index: 50
- **Width:** 100%
- **Height:** 80px
- **Background:** rgba(26,27,32,0.6) з backdrop-filter: blur(40px)
- **Border-top:** 1px solid rgba(255,255,255,0.1)
- **Padding:** 16px
- **Shadow:** 0 24px 48px rgba(0,0,0,0.6) (modal shadow, але інвертований)

### Секції

**Left Section (Track Info):**
```
┌────┐
│IMG │  Song Title Here
└────┘  Artist Name
48x48   ↑ text-base, font-semibold, neutral-50
        ↑ text-sm, neutral-100
```

**Center Section (Controls + Seekbar):**

**Playback Controls:**
```
 ⏮      ▶      ⏭
 ↑      ↑      ↑
40px   48px   40px
(side) (main) (side)

Circle buttons, transparent bg → bg-card (hover)
Icon color: neutral-50 → primary-500 (active)
```

**Seekbar:**
```
──────●──────────────────────────
↑     ↑                         ↑
0%  Progress (35%)            100%

Height: 4px (default) → 6px (hover)
Background: neutral-700
Progress: linear-gradient(90deg, #FF5722, #E64A19)
Thumb: 12px circle, primary-500, opacity 0 → 1 (hover)
```

**Time Display:**
```
01:23  /  3:45
  ↑        ↑
Current  Duration
text-sm, neutral-100, font-mono
```

**Right Section (Volume):**
```
🔊 ──────●────
   ↑         ↑
   Icon   Slider (100px width)

Slider: Same style as Seekbar
```

### Responsive (Mobile <768px)

```
┌──────────────────────────────────────────────┐
│  ┌────┐  Song Title       ⏮  ▶  ⏭         │
│  │IMG │  Artist Name                         │
│  └────┘  ──●──────────    01:23 / 3:45      │
└──────────────────────────────────────────────┘
   ↑                          ↑
   48x48                  No volume control
                         Controls: 48px (larger)
```

---

## 5. Navigation (Header)

### Структура

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SUNO    Create  Library  Hub          ✨ 450 credits    [Avatar] ▼         │
└──────────────────────────────────────────────────────────────────────────────┘
   ↑       ↑                              ↑                 ↑
   Logo    Nav Links                   Credits           Profile Menu
```

**Специфікація:**
- **Position:** fixed, top: 0, z-index: 40
- **Width:** 100%
- **Height:** 64px
- **Background:** rgba(26,27,32,0.6) з backdrop-filter: blur(20px)
- **Border-bottom:** 1px solid rgba(255,255,255,0.05)
- **Padding:** 0 24px (desktop), 0 16px (mobile)

### Елементи

**Logo:**
```
SUNO
↑
font-body, 700 (bold), 24px (text-xl)
Color: neutral-50
Letter-spacing: 0.05em (uppercase tracking)
```

**Nav Links:**
```
Create   Library   Hub
  ↑        ↑        ↑
font-body, 500 (medium), 14px
Color: neutral-100 → neutral-50 (hover/active)
Gap: 32px між links

Active state:
Create
──────  ← Underline: 2px, primary-500, width animation
```

**Credits Counter:**
```
┌──────────────┐
│ ✨ 450       │  ← Pill shape, bg-card
└──────────────┘
   ↑   ↑
   Icon Number
   (primary-500, 16px) (text-sm, neutral-100)

Padding: 8px 12px
Radius: 9999px (pill)
```

**Profile Menu:**
```
┌────┐
│ JD │  ▼   ← Avatar (32x32, circle) + Dropdown arrow
└────┘

Hover: bg-card
Click: Dropdown відкривається нижче
```

### Mobile (<768px)

```
┌────────────────────────────────────────┐
│  ☰  SUNO           ✨ 450    [Avatar] │
└────────────────────────────────────────┘
   ↑                     ↑
   Hamburger          Compact view
   Menu Icon

Drawer (з лівого боку):
┌─────────────┐
│  Create     │
│  Library    │
│  Hub        │
│  ─────────  │
│  Profile    │
│  Settings   │
│  Sign Out   │
└─────────────┘
Width: 280px
Background: neutral-700
```

---

## 6. Modal / Dialog

### Структура

```
Full-screen backdrop (rgba(0,0,0,0.7) + blur(8px))

              ┌────────────────────────────────┐
              │  Title Here                 ✕  │ ← Header
              ├────────────────────────────────┤
              │                                │
              │  Modal content goes here       │
              │                                │ ← Content (scrollable)
              │                                │
              │                                │
              ├────────────────────────────────┤
              │          [Cancel]  [Confirm]   │ ← Footer
              └────────────────────────────────┘
                      ↑
                  Max-width: 640px (md) або 800px (lg)
```

**Специфікація:**

**Backdrop:**
- **Background:** rgba(0,0,0,0.7)
- **Backdrop-filter:** blur(8px)
- **Position:** fixed, inset: 0, z-index: 100

**Modal Container:**
- **Background:** #1A1B20 (neutral-700)
- **Max-width:** 640px (md) або 800px (lg)
- **Border Radius:** 24px
- **Padding:** 24px
- **Shadow:** 0 24px 48px rgba(0,0,0,0.6)
- **Position:** Центр екрану

**Header:**
- **Border-bottom:** 1px solid #3D3D3D (neutral-500)
- **Padding-bottom:** 16px
- **Display:** flex, justify-between, align-center

**Title:**
- **Font:** Inter, 700, 32px (text-2xl)
- **Color:** neutral-50

**Close Button (✕):**
- **Size:** 32px × 32px
- **Color:** neutral-300 → neutral-50 (hover)
- **Background:** transparent → bg-card (hover)
- **Radius:** 8px

**Content:**
- **Padding:** 24px 0
- **Max-height:** 70vh
- **Overflow-y:** auto (scrollable якщо потрібно)

**Footer:**
- **Border-top:** 1px solid #3D3D3D (neutral-500)
- **Padding-top:** 16px
- **Display:** flex, justify-end, gap: 12px

**Buttons:**
- Cancel: Secondary button (ghost)
- Confirm: Primary button (gradient)

### Animations

**Open:**
```
t=0ms:    Backdrop opacity: 0
          Modal scale: 0.95, opacity: 0
          
t=250ms:  Backdrop opacity: 1 (duration-base)

t=400ms:  Modal scale: 1, opacity: 1 (duration-slow)
```

**Close:**
- Reverse animations

**Interaction:**
- Закривається на:
  - Click на ✕ button
  - Click на backdrop
  - Keyboard: Escape
  - Confirm/Cancel action

---

## Загальні правила для всіх компонентів

### Spacing Consistency
- Використовувати spacing tokens (4, 8, 12, 16, 24, 32...)
- Gap між елементами: мінімум 8px, оптимально 12-16px
- Padding в контейнерах: 16px (mobile), 24px (desktop)

### Touch Targets (Mobile)
- Мінімум 44×44px для інтерактивних елементів
- Gap між сусідніми кнопками: мінімум 8px

### Border Radius Nesting
- Outer radius ≥ Inner radius + 4px
- Приклад: Card (16px) → Inner image (12px)

### Animation Performance
- ✅ Анімувати: transform, opacity
- ❌ НЕ анімувати: width, height, margin, padding
- Тривалість: 150-250ms (micro), 400-600ms (major)

### Accessibility
- Focus states обов'язкові (2px border або 4px ring)
- Color contrast ≥4.5:1 (WCAG AA)
- Keyboard navigation працює
- Screen reader labels присутні

---

## Tailwind CSS приклади

### Button Primary
```jsx
<button className="
  h-12 md:h-14 px-6 
  bg-gradient-to-r from-[#FF6B35] via-[#FF5722] to-[#E64A19]
  text-neutral-50 font-semibold text-base
  rounded-full
  shadow-[0_0_24px_rgba(255,87,34,0.3)]
  hover:brightness-110 hover:scale-105
  active:brightness-95 active:scale-98
  disabled:opacity-40
  transition-all duration-250
">
  Create Music
</button>
```

### Card
```jsx
<div className="
  bg-neutral-700/60 backdrop-blur-[20px]
  border border-white/5
  rounded-2xl p-4
  shadow-[0_4px_12px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)]
  hover:shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08)]
  hover:-translate-y-1
  transition-all duration-250
">
  {/* Card content */}
</div>
```

### Input
```jsx
<input className="
  w-full h-12 px-4 py-3
  bg-neutral-700 
  border border-neutral-500
  rounded-xl
  text-neutral-50 placeholder:text-neutral-300
  focus:border-2 focus:border-primary-500
  focus:ring-4 focus:ring-primary-500/10
  transition-all duration-250
" />
```

---

**Кінець Component Library Guide**
