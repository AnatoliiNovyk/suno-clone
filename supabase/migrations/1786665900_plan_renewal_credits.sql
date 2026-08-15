-- Migration: plan_renewal_credits
-- Created at: 1786665900 (2026-08-15)
--
-- Stage F — makes a yearly subscription grant a year's worth of credits.
--
-- apply_plan_purchase() granted plans.monthly_credits flat, whatever the
-- billing interval. Combined with the fact that a provider only charges (and
-- therefore only calls back) once per billing period, an annual Pro subscriber
-- paid for twelve months and received 2500 credits — once — while the pricing
-- page advertised "2500 кредитів / місяць". Yearly plans now receive
-- 12 × monthly_credits up front, which is the same entitlement the monthly
-- plan accumulates over the same period.
--
-- Everything else about the function is unchanged: credits are still ADDED to
-- the balance, the ledger row and the subscription upsert still happen in the
-- same transaction, and the amount still comes from plans.monthly_credits
-- rather than from the caller.
--
-- Idempotent: safe to re-run.

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
    v_monthly INTEGER;
    v_months INTEGER;
    v_granted INTEGER;
    v_balance INTEGER;
    v_updated BOOLEAN := FALSE;
BEGIN
    SELECT monthly_credits INTO v_monthly FROM plans WHERE key = p_plan;
    IF v_monthly IS NULL THEN
        RAISE EXCEPTION 'unknown_plan';
    END IF;

    -- One provider callback covers the whole billing period.
    v_months := CASE WHEN lower(COALESCE(p_interval, 'month')) = 'year' THEN 12 ELSE 1 END;
    v_granted := v_monthly * v_months;

    UPDATE profiles
    SET plan = p_plan,
        credits = COALESCE(credits, 0) + v_granted,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING credits INTO v_balance;

    IF v_balance IS NULL THEN
        RAISE EXCEPTION 'user_not_found';
    END IF;

    INSERT INTO credit_transactions (user_id, amount, type, description)
    VALUES (
        p_user_id,
        v_granted,
        'plan_purchase',
        format(
            '%s plan via %s (%s %s / %s, %s month(s))',
            p_plan, p_provider,
            to_char(COALESCE(p_amount_minor, 0)::NUMERIC / 100, 'FM999999990.00'),
            p_currency, p_interval, v_months
        )
    );

    -- A renewal reuses the provider's subscription id: refresh that row
    -- instead of piling up duplicates.
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

    RETURN jsonb_build_object(
        'credits_granted', v_granted,
        'months', v_months,
        'new_balance', v_balance
    );
END;
$$;

REVOKE ALL ON FUNCTION apply_plan_purchase(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION apply_plan_purchase(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT)
    TO service_role;
