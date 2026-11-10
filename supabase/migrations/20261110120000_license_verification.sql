-- State license record for HUD-directory brokers and partner agents (License Check).
-- Filled automatically from state open data (NY, TX, IL) or entered by an admin from
-- the state board / ARELLO lookup. agents already has license_number and license_state.

ALTER TABLE hud_brokers
  ADD COLUMN IF NOT EXISTS license_number      TEXT,
  ADD COLUMN IF NOT EXISTS license_type        TEXT,
  ADD COLUMN IF NOT EXISTS license_status      TEXT,
  ADD COLUMN IF NOT EXISTS license_active      BOOLEAN,
  ADD COLUMN IF NOT EXISTS license_expires     DATE,
  ADD COLUMN IF NOT EXISTS license_name        TEXT,
  ADD COLUMN IF NOT EXISTS license_firm        TEXT,
  ADD COLUMN IF NOT EXISTS license_source      TEXT,
  ADD COLUMN IF NOT EXISTS license_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS license_checked_at  TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_hud_brokers_license_verified ON hud_brokers (license_verified_at);

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS license_type        TEXT,
  ADD COLUMN IF NOT EXISTS license_status      TEXT,
  ADD COLUMN IF NOT EXISTS license_active      BOOLEAN,
  ADD COLUMN IF NOT EXISTS license_expires     DATE,
  ADD COLUMN IF NOT EXISTS license_firm        TEXT,
  ADD COLUMN IF NOT EXISTS license_source      TEXT,
  ADD COLUMN IF NOT EXISTS license_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS license_checked_at  TIMESTAMPTZ;
