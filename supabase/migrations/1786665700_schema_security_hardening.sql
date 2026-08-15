-- Migration: schema_security_hardening
-- Created at: 1786665700 (2026-08-14)
--
-- Stage B — closes four schema-level problems:
--
--   1. SECURITY DEFINER functions ran without a fixed search_path, which lets
--      a caller shadow `profiles` / `plans` with a temp table and make the
--      function operate on it (privilege escalation). Every definer function
--      now pins `search_path = public, pg_temp`.
--
--   2. No indexes behind the app's hot queries (library listing, status
--      polling, admin pagination, webhook profile lookup) — every one was a
--      sequential scan.
--
--   3. No foreign keys: deleting an auth user left orphan profiles, tracks,
--      transactions and subscriptions behind forever. Added as NOT VALID
--      first, then validated separately, so pre-existing orphans surface as a
--      NOTICE instead of aborting the migration.
--
--   4. `tracks` had a blanket UPDATE grant for authenticated users, so anyone
--      could set their own row to status='completed', swap audio_url, or
--      inflate likes/plays. profiles got column-level grants long ago; tracks
--      now gets the same treatment.
--
-- Idempotent: safe to re-run.

-- ============================================================
-- 1. Pin search_path on every SECURITY DEFINER function
-- ============================================================
-- (adjust_credits and apply_plan_purchase already ship with it — see
--  1786665600_payments_credits_integrity.sql.)

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION admin_adjust_credits(p_user_id UUID, p_delta INTEGER, p_reason TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
SET search_path = public, pg_temp
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
SET search_path = public, pg_temp
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

-- ============================================================
-- 2. Indexes for the queries the app actually runs
-- ============================================================

-- LibraryPage: tracks of one user, newest first.
CREATE INDEX IF NOT EXISTS tracks_user_created_idx
    ON tracks (user_id, created_at DESC);
-- Status polling + /admin/tracks status filter + the stuck-track reaper.
CREATE INDEX IF NOT EXISTS tracks_status_idx
    ON tracks (status);
-- /admin/tracks pagination and the dashboard's 14-day chart.
CREATE INDEX IF NOT EXISTS tracks_created_idx
    ON tracks (created_at DESC);

-- User transaction history + dashboard "credits spent" window.
CREATE INDEX IF NOT EXISTS credit_transactions_user_created_idx
    ON credit_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS credit_transactions_created_idx
    ON credit_transactions (created_at DESC);

-- Subscription lookups: by owner, and by provider ref (renewals/cancellations).
CREATE INDEX IF NOT EXISTS subscriptions_user_idx
    ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_provider_ref_idx
    ON subscriptions (provider, provider_subscription_id);

-- Webhook legacy email fallback + admin user search.
CREATE INDEX IF NOT EXISTS profiles_email_idx
    ON profiles (email);

-- /admin/audit listing.
CREATE INDEX IF NOT EXISTS admin_actions_created_idx
    ON admin_actions (created_at DESC);

-- ============================================================
-- 3. Foreign keys (added NOT VALID, then validated separately)
-- ============================================================
-- NOT VALID means the constraint applies to all new/updated rows immediately
-- while pre-existing rows are not checked; the VALIDATE step below promotes it
-- to fully enforced. If orphan rows exist, validation raises a NOTICE naming
-- the constraint and the migration still completes — clean up the orphans and
-- re-run this file.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey') THEN
        ALTER TABLE profiles
            ADD CONSTRAINT profiles_id_fkey
            FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
            NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tracks_user_id_fkey') THEN
        ALTER TABLE tracks
            ADD CONSTRAINT tracks_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
            NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_transactions_user_id_fkey') THEN
        ALTER TABLE credit_transactions
            ADD CONSTRAINT credit_transactions_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
            NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_fkey') THEN
        ALTER TABLE subscriptions
            ADD CONSTRAINT subscriptions_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
            NOT VALID;
    END IF;
END $$;

DO $$
DECLARE
    v_table TEXT;
    v_constraint TEXT;
BEGIN
    FOREACH v_constraint IN ARRAY ARRAY[
        'profiles_id_fkey',
        'tracks_user_id_fkey',
        'credit_transactions_user_id_fkey',
        'subscriptions_user_id_fkey'
    ] LOOP
        v_table := CASE v_constraint
            WHEN 'profiles_id_fkey' THEN 'profiles'
            WHEN 'tracks_user_id_fkey' THEN 'tracks'
            WHEN 'credit_transactions_user_id_fkey' THEN 'credit_transactions'
            ELSE 'subscriptions'
        END;
        BEGIN
            EXECUTE format('ALTER TABLE %I VALIDATE CONSTRAINT %I', v_table, v_constraint);
        EXCEPTION WHEN others THEN
            RAISE NOTICE
                'Could not validate %.% — orphan rows present (%). The constraint still guards new rows.',
                v_table, v_constraint, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================
-- 4. tracks: column-level UPDATE grants
-- ============================================================
-- The RLS policy only picks the row; without column grants a user could set
-- status='completed', point audio_url anywhere, or inflate likes/plays on
-- their own tracks. Generation columns move exclusively through the service
-- role (the Python service); likes/plays need a dedicated RPC when that
-- feature lands.

REVOKE UPDATE ON tracks FROM anon, authenticated;
GRANT  UPDATE (title, is_public, cover_url) ON tracks TO authenticated;
