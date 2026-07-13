-- ============================================================================
-- suno-clone — bootstrap for a FRESH Supabase project
-- ============================================================================
-- Paste this whole file into Dashboard → SQL Editor and run it once.
-- The script is idempotent: running it again is safe (IF NOT EXISTS /
-- CREATE OR REPLACE / DROP POLICY IF EXISTS / ON CONFLICT DO NOTHING).
--
-- It recreates everything the app needs:
--   1. Tables (profiles, tracks, credits, subscriptions, plans)
--   2. Functions (is_admin, adjust_credits)
--   3. Row Level Security policies
--   4. Storage buckets (audio — public)
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

-- Audit log of privileged admin-panel actions (written only by the
-- SECURITY DEFINER admin_* functions).
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    action TEXT NOT NULL,               -- 'adjust_credits' | 'set_plan' | 'set_role' | ...
    target_user_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. FUNCTIONS
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

-- --- Admin-panel RPCs: SECURITY DEFINER + internal is_admin() check. ---

CREATE OR REPLACE FUNCTION admin_adjust_credits(p_user_id UUID, p_delta INTEGER, p_reason TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_balance INTEGER;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'forbidden';
    END IF;
    IF p_reason IS NULL OR btrim(p_reason) = '' THEN
        RAISE EXCEPTION 'reason_required';
    END IF;

    UPDATE profiles
    SET credits = COALESCE(credits, 0) + p_delta,
        updated_at = NOW()
    WHERE id = p_user_id
      AND COALESCE(credits, 0) + p_delta >= 0
    RETURNING credits INTO new_balance;

    IF new_balance IS NULL THEN
        RAISE EXCEPTION 'insufficient_credits_or_missing_user';
    END IF;

    INSERT INTO credit_transactions (user_id, amount, type, description)
    VALUES (p_user_id, p_delta, 'admin_adjustment', btrim(p_reason));

    INSERT INTO admin_actions (admin_id, action, target_user_id, details)
    VALUES (auth.uid(), 'adjust_credits', p_user_id,
            jsonb_build_object('delta', p_delta, 'reason', btrim(p_reason), 'new_balance', new_balance));

    RETURN new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION admin_set_plan(p_user_id UUID, p_plan TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'forbidden';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM plans WHERE key = p_plan AND active) THEN
        RAISE EXCEPTION 'unknown_plan';
    END IF;

    UPDATE profiles SET plan = p_plan, updated_at = NOW() WHERE id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'user_not_found';
    END IF;

    INSERT INTO admin_actions (admin_id, action, target_user_id, details)
    VALUES (auth.uid(), 'set_plan', p_user_id, jsonb_build_object('plan', p_plan));
END;
$$;

CREATE OR REPLACE FUNCTION admin_set_role(p_user_id UUID, p_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'forbidden';
    END IF;
    IF p_role NOT IN ('user', 'admin') THEN
        RAISE EXCEPTION 'invalid_role';
    END IF;
    -- An admin cannot demote themselves — prevents locking everyone out.
    IF p_user_id = auth.uid() AND p_role <> 'admin' THEN
        RAISE EXCEPTION 'cannot_demote_self';
    END IF;

    UPDATE profiles SET role = p_role, updated_at = NOW() WHERE id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'user_not_found';
    END IF;

    INSERT INTO admin_actions (admin_id, action, target_user_id, details)
    VALUES (auth.uid(), 'set_role', p_user_id, jsonb_build_object('role', p_role));
END;
$$;

-- Callable by signed-in users; the functions themselves enforce is_admin().
REVOKE ALL ON FUNCTION admin_adjust_credits(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_adjust_credits(UUID, INTEGER, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION admin_set_plan(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_set_plan(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION admin_set_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_set_role(UUID, TEXT) TO authenticated;

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
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

-- Admin panel: admins read everything, moderate tracks, and manage pricing.
DROP POLICY IF EXISTS "admin_select_all_profiles" ON profiles;
CREATE POLICY "admin_select_all_profiles" ON profiles FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "admin_select_all_tracks" ON tracks;
CREATE POLICY "admin_select_all_tracks" ON tracks FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "admin_update_any_track" ON tracks;
CREATE POLICY "admin_update_any_track" ON tracks FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "admin_delete_any_track" ON tracks;
CREATE POLICY "admin_delete_any_track" ON tracks FOR DELETE USING (is_admin());
DROP POLICY IF EXISTS "admin_select_all_subscriptions" ON subscriptions;
CREATE POLICY "admin_select_all_subscriptions" ON subscriptions FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "admin_select_all_transactions" ON credit_transactions;
CREATE POLICY "admin_select_all_transactions" ON credit_transactions FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "plans_admin_write" ON plans;
CREATE POLICY "plans_admin_write" ON plans FOR ALL USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "plan_prices_admin_write" ON plan_prices;
CREATE POLICY "plan_prices_admin_write" ON plan_prices FOR ALL USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_actions_admin_select" ON admin_actions;
CREATE POLICY "admin_actions_admin_select" ON admin_actions FOR SELECT USING (is_admin());

-- ============================================================
-- 4. STORAGE BUCKETS
-- ============================================================

-- Public bucket for generated music and demo samples.
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', true)
ON CONFLICT (id) DO NOTHING;

-- Audio bucket: public READ only. Uploads/updates/deletes go through the
-- service role (which bypasses RLS) — never grant public write.
DROP POLICY IF EXISTS "Public Upload for audio" ON storage.objects;
DROP POLICY IF EXISTS "Public Update for audio" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete for audio" ON storage.objects;
DROP POLICY IF EXISTS "audio_public_read" ON storage.objects;
CREATE POLICY "audio_public_read" ON storage.objects FOR SELECT
    USING (bucket_id = 'audio');

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
