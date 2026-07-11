-- ============================================================================
-- RLS / security hardening (Level 0 — exploitable holes)
-- ============================================================================
-- Closes: profile privilege escalation (role/credits self-write), merchant
-- self-approval, unprotected legacy suno_* tables, and a world-writable audio
-- bucket. Idempotent: safe to re-run.
-- ============================================================================

-- 1. profiles: add WITH CHECK and lock privileged columns --------------------
-- USING alone only picks the row; without column locks a user can still set
-- their own role='admin' / credits=999999. role/credits/plan move exclusively
-- through the service role (adjust_credits, webhooks, admin SQL).
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

REVOKE UPDATE ON profiles FROM anon, authenticated;
GRANT  UPDATE (display_name, avatar_url) ON profiles TO authenticated;
REVOKE INSERT ON profiles FROM anon, authenticated;
GRANT  INSERT (id, email, display_name, avatar_url) ON profiles TO authenticated;

-- 2. merchants: owners can never move their own record out of 'pending' ------
DROP POLICY IF EXISTS "merchants_owner_update" ON merchants;
CREATE POLICY "merchants_owner_update" ON merchants FOR UPDATE
    USING (auth.uid() = owner_user_id AND status = 'pending')
    WITH CHECK (auth.uid() = owner_user_id AND status = 'pending');

DROP POLICY IF EXISTS "merchants_admin_update" ON merchants;
CREATE POLICY "merchants_admin_update" ON merchants FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

-- 3. merchant_documents: cannot self-mark a document 'accepted' --------------
DROP POLICY IF EXISTS "merchant_documents_owner_insert" ON merchant_documents;
CREATE POLICY "merchant_documents_owner_insert" ON merchant_documents FOR INSERT
    WITH CHECK (status = 'submitted' AND EXISTS (
        SELECT 1 FROM merchants m WHERE m.id = merchant_id AND m.owner_user_id = auth.uid()));

-- 4. legacy suno_* tables: enable RLS (service-role only; no policies) --------
-- A table with RLS disabled is fully reachable via the public anon key.
ALTER TABLE IF EXISTS suno_plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suno_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. guarantee the atomic credit RPC is callable by the service role ---------
GRANT EXECUTE ON FUNCTION adjust_credits(UUID, INTEGER) TO service_role;

-- 6. audio bucket: drop any public write policies, keep public read only ------
DROP POLICY IF EXISTS "Public Upload for audio" ON storage.objects;
DROP POLICY IF EXISTS "Public Update for audio" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete for audio" ON storage.objects;
DROP POLICY IF EXISTS "audio_public_read" ON storage.objects;
CREATE POLICY "audio_public_read" ON storage.objects FOR SELECT
    USING (bucket_id = 'audio');
