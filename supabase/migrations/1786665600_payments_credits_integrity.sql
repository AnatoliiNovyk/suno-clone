-- Migration: payments_credits_integrity
-- Created at: 1786665600 (2026-08-14)
--
-- Stage A — fixes three money bugs:
--
--   1. The payments webhook OVERWROTE profiles.credits with the plan's monthly
--      allowance instead of adding to the existing balance, so buying Pro
--      (2500) actually *reduced* a 4000-credit balance to 2500. It also wrote
--      profiles.credits directly, bypassing the atomic credit path.
--      Fixed by apply_plan_purchase() below — one transaction that sets the
--      plan, ADDS the credits, logs the ledger row and upserts the
--      subscription.
--
--   2. No webhook idempotency: every provider retry re-granted credits and
--      inserted another subscriptions row. Fixed by the payment_events table
--      (UNIQUE per provider+event_id), which the webhook claims before doing
--      any work.
--
--   3. credit_transactions was never written for generation charges/refunds,
--      so the admin dashboard's "credits spent" metric was permanently ~0 and
--      users saw an empty transaction history. adjust_credits() now records
--      every movement it makes.
--
-- Idempotent: safe to re-run.

-- ============================================================
-- 1. Webhook idempotency ledger
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,             -- 'stripe' | 'liqpay' | ...
    event_id TEXT NOT NULL,             -- the provider's own event/payment id
    event_type TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (provider, event_id)
);

ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Written only by the service role (the webhook); admins may read it.
DROP POLICY IF EXISTS "payment_events_admin_select" ON payment_events;
CREATE POLICY "payment_events_admin_select" ON payment_events FOR SELECT
    USING (is_admin());

CREATE INDEX IF NOT EXISTS payment_events_created_idx
    ON payment_events (created_at DESC);

-- ============================================================
-- 2. adjust_credits: same atomic guarantee, now with a ledger row
-- ============================================================
-- The 2-argument version is dropped and replaced by a 4-argument one with
-- defaults, so existing callers that pass only p_user_id/p_delta keep working
-- (PostgREST resolves RPCs by named argument). Keeping both signatures would
-- make a 2-argument call ambiguous, hence the DROP.

DROP FUNCTION IF EXISTS adjust_credits(UUID, INTEGER);

CREATE OR REPLACE FUNCTION adjust_credits(
    p_user_id UUID,
    p_delta INTEGER,
    p_type TEXT DEFAULT 'adjustment',
    p_description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

    -- Every credit movement is recorded: the admin dashboard and the user's
    -- transaction history read from this table.
    INSERT INTO credit_transactions (user_id, amount, type, description)
    VALUES (
        p_user_id,
        p_delta,
        COALESCE(NULLIF(btrim(p_type), ''), 'adjustment'),
        NULLIF(btrim(COALESCE(p_description, '')), '')
    );

    RETURN new_balance;
END;
$$;

REVOKE ALL ON FUNCTION adjust_credits(UUID, INTEGER, TEXT, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION adjust_credits(UUID, INTEGER, TEXT, TEXT) TO service_role;

-- ============================================================
-- 3. apply_plan_purchase: the only way a paid plan is granted
-- ============================================================
-- Sets the plan, ADDS the plan's monthly credits to the current balance,
-- writes the ledger row and upserts the subscription — all in one
-- transaction. Credits come from plans.monthly_credits (single source of
-- truth); the caller never supplies an amount.

CREATE OR REPLACE FUNCTION apply_plan_purchase(
    p_user_id UUID,
    p_plan TEXT,
    p_provider TEXT,
    p_currency TEXT,
    p_amount_minor INTEGER,
    p_interval TEXT,
    p_provider_customer_id TEXT DEFAULT NULL,
    p_provider_subscription_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_credits INTEGER;
    v_balance INTEGER;
    v_updated BOOLEAN := FALSE;
BEGIN
    SELECT monthly_credits INTO v_credits FROM plans WHERE key = p_plan;
    IF v_credits IS NULL THEN
        RAISE EXCEPTION 'unknown_plan';
    END IF;

    UPDATE profiles
    SET plan = p_plan,
        credits = COALESCE(credits, 0) + v_credits,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING credits INTO v_balance;

    IF v_balance IS NULL THEN
        RAISE EXCEPTION 'user_not_found';
    END IF;

    INSERT INTO credit_transactions (user_id, amount, type, description)
    VALUES (
        p_user_id,
        v_credits,
        'plan_purchase',
        format(
            '%s plan via %s (%s %s / %s)',
            p_plan, p_provider,
            to_char(COALESCE(p_amount_minor, 0)::NUMERIC / 100, 'FM999999990.00'),
            p_currency, p_interval
        )
    );

    -- A renewal reuses the provider's subscription id: refresh that row
    -- instead of piling up duplicates. Done as UPDATE-then-INSERT rather than
    -- ON CONFLICT so it works whether or not a unique index exists.
    IF p_provider_subscription_id IS NOT NULL AND btrim(p_provider_subscription_id) <> '' THEN
        UPDATE subscriptions
        SET plan = p_plan,
            currency = p_currency,
            amount_minor = p_amount_minor,
            "interval" = p_interval,
            provider_customer_id = COALESCE(p_provider_customer_id, provider_customer_id),
            status = 'active'
        WHERE provider = p_provider
          AND provider_subscription_id = p_provider_subscription_id;
        v_updated := FOUND;
    END IF;

    IF NOT v_updated THEN
        INSERT INTO subscriptions (
            user_id, plan, provider, currency, amount_minor, "interval",
            provider_customer_id, provider_subscription_id, status
        )
        VALUES (
            p_user_id, p_plan, p_provider, p_currency, p_amount_minor, p_interval,
            p_provider_customer_id, p_provider_subscription_id, 'active'
        );
    END IF;

    RETURN jsonb_build_object('credits_granted', v_credits, 'new_balance', v_balance);
END;
$$;

REVOKE ALL ON FUNCTION apply_plan_purchase(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION apply_plan_purchase(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT)
    TO service_role;
