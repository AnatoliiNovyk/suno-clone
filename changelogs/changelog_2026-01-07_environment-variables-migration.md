# Changelog: Environment Variables Migration

**Дата**: 2026-01-07  
**Тип**: Security / Configuration

## Що було до зміни

**Проблема безпеки**: Credentials були hardcoded в коді:

```typescript
// suno-clone/src/lib/supabase.ts
const supabaseUrl = 'https://mwsigocoyiuywrrrgjcv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // EXPOSED!

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Ризики**:
- ❌ Credentials відкриті в git репозиторії
- ❌ Неможливо змінити конфігурацію для різних середовищ
- ❌ Service role key відсутній для edge functions
- ❌ Складно керувати secrets для production

## Що покращилося після зміни

### 1. **Безпечне зберігання credentials**
Створено `.env` файли (ігноруються git):

**`suno-clone/.env`** (frontend):
```env
VITE_SUPABASE_URL=https://mwsigocoyiuywrrrgjcv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

**`.env`** (root для edge functions):
```env
SUPABASE_URL=https://mwsigocoyiuywrrrgjcv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
STRIPE_SECRET_KEY=
GOOGLE_AI_API_KEY=
```

### 2. **Оновлений Supabase client**
```typescript
// suno-clone/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 3. **Захист через .gitignore**
`.env` файли вже були в `.gitignore`:
```
.env
.env.*
*.env
```

## Переваги

✅ **Безпека**: Credentials не потрапляють в git  
✅ **Гнучкість**: Легко змінювати для dev/staging/production  
✅ **Готовність до production**: Можна додавати secrets через CI/CD  
✅ **Edge functions**: Готові до використання SUPABASE_SERVICE_ROLE_KEY  
✅ **Майбутні інтеграції**: Placeholder для STRIPE_SECRET_KEY та GOOGLE_AI_API_KEY

## Технічні деталі

### Змінені файли
1. **Створено** `suno-clone/.env` - frontend env variables
2. **Створено** `.env` - root env variables (edge functions)
3. **Оновлено** `suno-clone/src/lib/supabase.ts` - використання `import.meta.env.*`

### Валідація
- Додана перевірка наявності env variables при ініціалізації
- Зрозумілі error messages при відсутності конфігурації

### Тестування
✅ `pnpm dev` запускається успішно  
✅ Авторизація працює  
✅ Немає помилок в консолі

## Наступні кроці

1. **Production deployment**: Додати env variables в hosting provider
2. **Service role key**: Додати справжній `SUPABASE_SERVICE_ROLE_KEY` в `.env`
3. **Team sharing**: Створити `.env.example` з placeholder values для команди

## Примітки

⚠️ **Важливо**: Файли `.env` не комітяться в git. Для локальної розробки потрібно створити їх вручну з правильними credentials з Supabase Dashboard.

🔒 **Service Role Key**: Знаходиться в Supabase Dashboard → Settings → API → service_role key (копіювати обережно - дає повний доступ до БД)
