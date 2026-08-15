-- Migration: track_generation_lifecycle
-- Created at: 1786665800 (2026-08-14)
--
-- Stage C — gives the Python service what it needs to recover abandoned
-- generations.
--
-- A generation runs in a FastAPI BackgroundTask. If the process restarts or
-- the task is killed mid-flight, nothing ever moves the row out of
-- pending/processing: the track hangs forever, the user's credits are never
-- returned, and LibraryPage polls that row every 2.5s indefinitely. There was
-- no way to even detect it — `tracks` had no updated_at, so "in flight since
-- when?" was unanswerable, and no record of what the generation had cost.
--
-- Adds:
--   * tracks.updated_at, maintained by a trigger (every write touches it, so a
--     row that stops moving is provably abandoned);
--   * tracks.generation_cost — the exact amount charged, so the reaper refunds
--     that and never guesses between song (10) and sample (4);
--   * a partial index over in-flight rows, which is the only thing the reaper
--     ever scans.
--
-- Idempotent: safe to re-run.

ALTER TABLE tracks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS generation_cost INTEGER;

-- Existing rows: seed updated_at from created_at so the reaper's cutoff
-- comparison is meaningful instead of NULL.
UPDATE tracks
SET updated_at = COALESCE(created_at, NOW())
WHERE updated_at IS NULL;

-- Maintained by the database, not the caller: the service role, the admin
-- panel and any future writer all bump it without having to remember.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tracks_set_updated_at ON tracks;
CREATE TRIGGER tracks_set_updated_at
    BEFORE UPDATE ON tracks
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- The reaper only ever asks "which in-flight rows stopped moving before X?".
CREATE INDEX IF NOT EXISTS tracks_in_flight_idx
    ON tracks (updated_at)
    WHERE status IN ('pending', 'processing');

-- generation_cost is written by the service role only — it is deliberately
-- absent from the authenticated UPDATE grant set in
-- 1786665700_schema_security_hardening.sql.
