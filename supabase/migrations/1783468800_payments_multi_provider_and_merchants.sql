-- Multi-provider payments (Stripe + LiqPay), multi-currency (UAH/USD/EUR),
-- merchant registration with minimal documents, atomic credit adjustments.

-- ============================================================
-- 1. Generalize subscriptions beyond Stripe
-- ============================================================
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'stripe';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS amount_minor INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS "interval" TEXT DEFAULT 'month';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS merchant_id UUID;

-- Backfill generalized columns from the legacy Stripe-specific ones.
UPDATE subscriptions
SET provider_customer_id = COALESCE(provider_customer_id, stripe_customer_id),
    provider_subscription_id = COALESCE(provider_subscription_id, stripe_subscription_id)
WHERE stripe_customer_id IS NOT NULL OR stripe_subscription_id IS NOT NULL;

-- ============================================================
-- 2. Application role for admin review of merchants
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- ============================================================
-- 3. RLS for new tables
-- ============================================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_provider_accounts ENABLE ROW LEVEL SECURITY;

-- Plans and prices are public marketing data: anyone may read, nobody but service role writes.
CREATE POLICY "plans_public_read" ON plans FOR SELECT USING (true);
CREATE POLICY "plan_prices_public_read" ON plan_prices FOR SELECT USING (true);

-- Merchants: the owner manages their own record; admins review.
CREATE POLICY "merchants_owner_select" ON merchants FOR SELECT
    USING (auth.uid() = owner_user_id OR is_admin());
CREATE POLICY "merchants_owner_insert" ON merchants FOR INSERT
    WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "merchants_owner_update" ON merchants FOR UPDATE
    USING (auth.uid() = owner_user_id AND status = 'pending');
CREATE POLICY "merchants_admin_update" ON merchants FOR UPDATE
    USING (is_admin());

-- Documents follow their merchant's ownership.
CREATE POLICY "merchant_documents_owner_select" ON merchant_documents FOR SELECT
    USING (EXISTS (SELECT 1 FROM merchants m WHERE m.id = merchant_id AND (m.owner_user_id = auth.uid() OR is_admin())));
CREATE POLICY "merchant_documents_owner_insert" ON merchant_documents FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM merchants m WHERE m.id = merchant_id AND m.owner_user_id = auth.uid()));

-- Provider accounts: owner sees own, admin manages; writes go through service role/admin.
CREATE POLICY "merchant_provider_accounts_owner_select" ON merchant_provider_accounts FOR SELECT
    USING (EXISTS (SELECT 1 FROM merchants m WHERE m.id = merchant_id AND (m.owner_user_id = auth.uid() OR is_admin())));
CREATE POLICY "merchant_provider_accounts_admin_write" ON merchant_provider_accounts FOR ALL
    USING (is_admin());

-- ============================================================
-- 4. Private storage bucket for merchant documents
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('merchant-docs', 'merchant-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Files live under merchant-docs/{auth.uid()}/... — owner-scoped by first path segment.
CREATE POLICY "merchant_docs_owner_insert" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'merchant-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "merchant_docs_owner_select" ON storage.objects FOR SELECT
    USING (bucket_id = 'merchant-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin()));

-- ============================================================
-- 5. Atomic credit adjustment (fixes read-modify-write races)
-- ============================================================
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

-- Only the service role may move credits.
REVOKE ALL ON FUNCTION adjust_credits(UUID, INTEGER) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 6. Seed plans and fixed per-currency prices (minor units)
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
