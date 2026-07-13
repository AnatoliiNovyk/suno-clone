-- Migration: admin_panel_foundation
-- Created at: 1784150400
--
-- Phase 1 of the admin panel: audit table, admin RLS policies, and
-- SECURITY DEFINER RPCs for privileged actions. Idempotent — safe to re-run.
-- Requires is_admin() and profiles.role (created by earlier migrations /
-- bootstrap.sql).

-- ============================================================
-- 1. AUDIT TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    action TEXT NOT NULL,               -- 'adjust_credits' | 'set_plan' | 'set_role' | ...
    target_user_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Admins can read the audit log; nobody writes directly (SECURITY DEFINER
-- functions below insert on the caller's behalf).
DROP POLICY IF EXISTS "admin_actions_admin_select" ON admin_actions;
CREATE POLICY "admin_actions_admin_select" ON admin_actions FOR SELECT
    USING (is_admin());

-- ============================================================
-- 2. ADMIN RLS POLICIES
-- ============================================================

DROP POLICY IF EXISTS "admin_select_all_profiles" ON profiles;
CREATE POLICY "admin_select_all_profiles" ON profiles FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "admin_select_all_tracks" ON tracks;
CREATE POLICY "admin_select_all_tracks" ON tracks FOR SELECT
    USING (is_admin());
DROP POLICY IF EXISTS "admin_update_any_track" ON tracks;
CREATE POLICY "admin_update_any_track" ON tracks FOR UPDATE
    USING (is_admin());
DROP POLICY IF EXISTS "admin_delete_any_track" ON tracks;
CREATE POLICY "admin_delete_any_track" ON tracks FOR DELETE
    USING (is_admin());

DROP POLICY IF EXISTS "admin_select_all_subscriptions" ON subscriptions;
CREATE POLICY "admin_select_all_subscriptions" ON subscriptions FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "admin_select_all_transactions" ON credit_transactions;
CREATE POLICY "admin_select_all_transactions" ON credit_transactions FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "plans_admin_write" ON plans;
CREATE POLICY "plans_admin_write" ON plans FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());
DROP POLICY IF EXISTS "plan_prices_admin_write" ON plan_prices;
CREATE POLICY "plan_prices_admin_write" ON plan_prices FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- ============================================================
-- 3. ADMIN RPCs (SECURITY DEFINER + internal is_admin() check)
-- ============================================================

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
