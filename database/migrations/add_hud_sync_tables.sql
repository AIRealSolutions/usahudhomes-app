-- ============================================================
-- HUD Sync Tables Migration
-- Creates hud_sync_runs (run history) and hud_sync_schedules
-- (admin-configurable schedules) tables.
-- Run once in the Supabase SQL editor.
-- ============================================================

-- ─── Run History ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hud_sync_runs (
    id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id                  TEXT NOT NULL,
    state                   VARCHAR(2) NOT NULL,
    dry_run                 BOOLEAN DEFAULT false,
    total_scraped           INTEGER DEFAULT 0,
    new_properties          INTEGER DEFAULT 0,
    updated_properties      INTEGER DEFAULT 0,
    restored_properties     INTEGER DEFAULT 0,
    marked_under_contract   INTEGER DEFAULT 0,
    errors                  INTEGER DEFAULT 0,
    ran_at                  TIMESTAMPTZ DEFAULT NOW(),
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hud_sync_runs_state   ON hud_sync_runs(state);
CREATE INDEX IF NOT EXISTS idx_hud_sync_runs_ran_at  ON hud_sync_runs(ran_at DESC);

COMMENT ON TABLE hud_sync_runs IS 'Audit log of every HUD scrape+import run';

-- ─── Schedules ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hud_sync_schedules (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    label             TEXT NOT NULL,
    states            TEXT[] NOT NULL,          -- e.g. ARRAY['NC','SC','FL']
    cron_expression   TEXT NOT NULL DEFAULT '0 6 * * *',  -- standard 5-field cron
    dry_run           BOOLEAN DEFAULT false,
    enabled           BOOLEAN DEFAULT true,
    last_run_at       TIMESTAMPTZ,
    next_run_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hud_sync_schedules_enabled ON hud_sync_schedules(enabled);

COMMENT ON TABLE hud_sync_schedules IS 'Admin-configurable recurring HUD sync schedules';

-- ─── RLS Policies (allow authenticated admin reads/writes) ────────────────────
ALTER TABLE hud_sync_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE hud_sync_schedules ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read (admin UI needs this)
CREATE POLICY IF NOT EXISTS "Allow authenticated read on hud_sync_runs"
    ON hud_sync_runs FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated read on hud_sync_schedules"
    ON hud_sync_schedules FOR SELECT TO authenticated USING (true);

-- Allow service role full access (backend API uses service key)
CREATE POLICY IF NOT EXISTS "Allow service role full access on hud_sync_runs"
    ON hud_sync_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow service role full access on hud_sync_schedules"
    ON hud_sync_schedules FOR ALL TO service_role USING (true) WITH CHECK (true);
