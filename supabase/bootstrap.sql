-- ============================================================================
-- suno-clone — bootstrap for a FRESH Supabase project
-- ============================================================================
-- Paste this whole file into Dashboard → SQL Editor and run it once.
-- The script is idempotent: running it again is safe (IF NOT EXISTS /
-- CREATE OR REPLACE / DROP POLICY IF EXISTS / ON CONFLICT DO NOTHING).
--
-- It recreates everything the app needs:
--   1. Tables (profiles, tracks, credits, subscriptions, plans, merchants)
--   2. Functions (is_admin, adjust_credits)
--   3. Row Level Security policies
--   4. Storage buckets (audio — public, merchant-docs — private)
--   5. Seed data (plans + fixed per-currency prices)
--
-- After running it, point .env files at the new project:
--   suno-clone/.env : VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
--   root .env       : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
-- and deploy the edge functions (create-payment, payments-webhook).
-- ============================================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    credits INTEGER DEFAULT 50,
    plan TEXT DEFAULT 'free',
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- In case an older profiles table already exists without the role column.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

CREATE TABLE IF NOT EXISTS tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    prompt TEXT,
    lyrics TEXT,
    genre TEXT,
    audio_url TEXT,
    cover_url TEXT,
    duration INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT false,
    likes INTEGER DEFAULT 0,
    plays INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    plan TEXT NOT NULL,
    -- legacy Stripe-only columns (kept for backwards compatibility)
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    -- generalized multi-provider columns
    provider TEXT DEFAULT 'stripe',
    currency TEXT DEFAULT 'USD',
    amount_minor INTEGER,
    "interval" TEXT DEFAULT 'month',
    provider_customer_id TEXT,
    provider_subscription_id TEXT,
    merchant_id UUID,
    status TEXT DEFAULT 'active',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- In case an older subscriptions table already exists without the new columns.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'stripe';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS amount_minor INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS "interval" TEXT DEFAULT 'month';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS merchant_id UUID;

-- Legacy tables (vestigial, kept so the schema matches the repo)
CREATE TABLE IF NOT EXISTS suno_plans (
    id SERIAL PRIMARY KEY,
    price_id VARCHAR(255) UNIQUE NOT NULL,
    plan_type VARCHAR(50) NOT NULL,
    price INTEGER NOT NULL,
    monthly_limit INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suno_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    price_id VARCHAR(255) NOT NULL REFERENCES suno_plans(price_id),
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
    key TEXT PRIMARY KEY,                -- 'free' | 'pro' | 'premier'
    name TEXT NOT NULL,
    monthly_credits INTEGER NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fixed price per plan/currency/interval, in minor units (kopiykas/cents).
CREATE TABLE IF NOT EXISTS plan_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_key TEXT NOT NULL REFERENCES plans(key),
    currency TEXT NOT NULL CHECK (currency IN ('UAH', 'USD', 'EUR')),
    "interval" TEXT NOT NULL CHECK ("interval" IN ('month', 'year')),
    amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (plan_key, currency, "interval")
);

CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL,
    legal_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    country TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    review_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (owner_user_id)
);

CREATE TABLE IF NOT EXISTS merchant_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    type TEXT NOT NULL,                  -- 'identity' | 'tax_id' | 'company_registration' | ...
    file_path TEXT NOT NULL,             -- path inside the private 'merchant-docs' bucket
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchant_provider_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,              -- 'stripe' | 'liqpay' | ...
    credentials_ref TEXT,                -- reference to secret storage, never raw keys
    active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (merchant_id, provider)
);

-- ============================================================
-- 2. FUNCTIONS (before policies — merchant policies use is_admin)
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- Atomic credit adjustment (service-role only): eliminates read-modify-write races.
CREATE OR REPLACE FUNCTION adjust_credits(p_user_id UUID, p_delta INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_balance INTEGER;
BEGIN
    UPDATE profiles
    SET credits = COALESCE(credits, 0) + p_delta,
        updated_at = NOW()
    WHERE id = p_user_id
      AND COALESCE(credits, 0) + p_delta >= 0
    RETURNING credits INTO new_balance;

    IF new_balance IS NULL THEN
        RAISE EXCEPTION 'insufficient_credits';
    END IF;

    RETURN new_balance;
END;
$$;

REVOKE ALL ON FUNCTION adjust_credits(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
-- The service role (Python service, webhooks) must still be able to call it.
GRANT EXECUTE ON FUNCTION adjust_credits(UUID, INTEGER) TO service_role;

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_provider_accounts ENABLE ROW LEVEL SECURITY;
-- Legacy tables: RLS on with no policies = service-role only (never anon).
ALTER TABLE suno_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE suno_subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Lock privileged columns: role/credits/plan move only through the service
-- role (adjust_credits, webhooks, admin SQL), never a client write.
REVOKE UPDATE ON profiles FROM anon, authenticated;
GRANT  UPDATE (display_name, avatar_url) ON profiles TO authenticated;
REVOKE INSERT ON profiles FROM anon, authenticated;
GRANT  INSERT (id, email, display_name, avatar_url) ON profiles TO authenticated;

-- Tracks
DROP POLICY IF EXISTS "Users can view own tracks" ON tracks;
CREATE POLICY "Users can view own tracks" ON tracks FOR SELECT USING (auth.uid() = user_id OR is_public = true);
DROP POLICY IF EXISTS "Users can insert own tracks" ON tracks;
CREATE POLICY "Users can insert own tracks" ON tracks FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own tracks" ON tracks;
CREATE POLICY "Users can update own tracks" ON tracks FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own tracks" ON tracks;
CREATE POLICY "Users can delete own tracks" ON tracks FOR DELETE USING (auth.uid() = user_id);

-- Subscriptions (read-only for owners; writes go through the service role)
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Credit transactions (read-only for owners)
DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
CREATE POLICY "Users can view own transactions" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);

-- Plans and prices are public marketing data.
DROP POLICY IF EXISTS "plans_public_read" ON plans;
CREATE POLICY "plans_public_read" ON plans FOR SELECT USING (true);
DROP POLICY IF EXISTS "plan_prices_public_read" ON plan_prices;
CREATE POLICY "plan_prices_public_read" ON plan_prices FOR SELECT USING (true);

-- Merchants: the owner manages their own record; admins review.
DROP POLICY IF EXISTS "merchants_owner_select" ON merchants;
CREATE POLICY "merchants_owner_select" ON merchants FOR SELECT
    USING (auth.uid() = owner_user_id OR is_admin());
DROP POLICY IF EXISTS "merchants_owner_insert" ON merchants;
CREATE POLICY "merchants_owner_insert" ON merchants FOR INSERT
    WITH CHECK (auth.uid() = owner_user_id);
DROP POLICY IF EXISTS "merchants_owner_update" ON merchants;
CREATE POLICY "merchants_owner_update" ON merchants FOR UPDATE
    USING (auth.uid() = owner_user_id AND status = 'pending')
    WITH CHECK (auth.uid() = owner_user_id AND status = 'pending');
DROP POLICY IF EXISTS "merchants_admin_update" ON merchants;
CREATE POLICY "merchants_admin_update" ON merchants FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

-- Documents follow their merchant's ownership.
DROP POLICY IF EXISTS "merchant_documents_owner_select" ON merchant_documents;
CREATE POLICY "merchant_documents_owner_select" ON merchant_documents FOR SELECT
    USING (EXISTS (SELECT 1 FROM merchants m WHERE m.id = merchant_id AND (m.owner_user_id = auth.uid() OR is_admin())));
DROP POLICY IF EXISTS "merchant_documents_owner_insert" ON merchant_documents;
CREATE POLICY "merchant_documents_owner_insert" ON merchant_documents FOR INSERT
    WITH CHECK (status = 'submitted' AND EXISTS (SELECT 1 FROM merchants m WHERE m.id = merchant_id AND m.owner_user_id = auth.uid()));

-- Provider accounts: owner sees own, admin manages.
DROP POLICY IF EXISTS "merchant_provider_accounts_owner_select" ON merchant_provider_accounts;
CREATE POLICY "merchant_provider_accounts_owner_select" ON merchant_provider_accounts FOR SELECT
    USING (EXISTS (SELECT 1 FROM merchants m WHERE m.id = merchant_id AND (m.owner_user_id = auth.uid() OR is_admin())));
DROP POLICY IF EXISTS "merchant_provider_accounts_admin_write" ON merchant_provider_accounts;
CREATE POLICY "merchant_provider_accounts_admin_write" ON merchant_provider_accounts FOR ALL
    USING (is_admin());

-- ============================================================
-- 4. STORAGE BUCKETS
-- ============================================================

-- Public bucket for generated music and demo samples.
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', true)
ON CONFLICT (id) DO NOTHING;

-- Private bucket for merchant KYC documents.
INSERT INTO storage.buckets (id, name, public)
VALUES ('merchant-docs', 'merchant-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Audio bucket: public READ only. Uploads/updates/deletes go through the
-- service role (which bypasses RLS) — never grant public write.
DROP POLICY IF EXISTS "Public Upload for audio" ON storage.objects;
DROP POLICY IF EXISTS "Public Update for audio" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete for audio" ON storage.objects;
DROP POLICY IF EXISTS "audio_public_read" ON storage.objects;
CREATE POLICY "audio_public_read" ON storage.objects FOR SELECT
    USING (bucket_id = 'audio');

-- Files live under merchant-docs/{auth.uid()}/... — owner-scoped by first path segment.
DROP POLICY IF EXISTS "merchant_docs_owner_insert" ON storage.objects;
CREATE POLICY "merchant_docs_owner_insert" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'merchant-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "merchant_docs_owner_select" ON storage.objects;
CREATE POLICY "merchant_docs_owner_select" ON storage.objects FOR SELECT
    USING (bucket_id = 'merchant-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin()));

-- ============================================================
-- 5. SEED DATA
-- ============================================================

INSERT INTO plans (key, name, monthly_credits, active) VALUES
    ('free', 'Free', 50, true),
    ('pro', 'Pro', 2500, true),
    ('premier', 'Premier', 10000, true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO plan_prices (plan_key, currency, "interval", amount_minor) VALUES
    -- Pro: $8 / €7.50 / ₴330 per month; yearly = 12 months with ~20% discount
    ('pro', 'USD', 'month', 800),
    ('pro', 'EUR', 'month', 750),
    ('pro', 'UAH', 'month', 33000),
    ('pro', 'USD', 'year', 7680),
    ('pro', 'EUR', 'year', 7200),
    ('pro', 'UAH', 'year', 316800),
    -- Premier: $24 / €22 / ₴990 per month
    ('premier', 'USD', 'month', 2400),
    ('premier', 'EUR', 'month', 2200),
    ('premier', 'UAH', 'month', 99000),
    ('premier', 'USD', 'year', 23040),
    ('premier', 'EUR', 'year', 21120),
    ('premier', 'UAH', 'year', 950400)
ON CONFLICT (plan_key, currency, "interval") DO NOTHING;
