-- Accepted offer history: every time HUD accepts a bid on a property, with its terms.
-- A property can go under contract several times (contracts fall through and it is
-- relisted), so this keeps one row per acceptance rather than one per property.
-- Fed daily by /api/hud?action=accepted-offers-sync from hudhomestore.gov/bidresults.

CREATE TABLE IF NOT EXISTS accepted_offers (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number               VARCHAR(20) NOT NULL,
  property_id               UUID REFERENCES properties(id) ON DELETE SET NULL,
  address                   VARCHAR(255),
  city                      VARCHAR(100),
  county                    VARCHAR(100),
  state                     VARCHAR(2),
  zip_code                  VARCHAR(10),
  net_to_hud                NUMERIC(12,2),
  purchaser_type            VARCHAR(50),           -- Investor / Owner-Occupant / ...
  broker_name               VARCHAR(255),
  bid_received_at           TIMESTAMP,             -- HUD local time as published
  bid_opened_on             DATE,
  accepted_at               TIMESTAMP NOT NULL,
  list_price_at_acceptance  NUMERIC(12,2),         -- our last known list price when first seen
  outcome                   VARCHAR(20) NOT NULL DEFAULT 'pending'
                              CHECK (outcome IN ('pending', 'fell_through', 'closed')),
  source                    VARCHAR(30) NOT NULL DEFAULT 'hud_bidresults',
  raw                       JSONB,
  first_seen_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT accepted_offers_case_accepted_key UNIQUE (case_number, accepted_at)
);

CREATE INDEX IF NOT EXISTS idx_accepted_offers_case   ON accepted_offers (case_number);
CREATE INDEX IF NOT EXISTS idx_accepted_offers_state  ON accepted_offers (state, accepted_at DESC);

-- Status changes seen by the HUD listing sync (under contract / back on market)
CREATE TABLE IF NOT EXISTS property_status_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number   VARCHAR(20) NOT NULL,
  property_id   UUID REFERENCES properties(id) ON DELETE SET NULL,
  state         VARCHAR(2),
  event         VARCHAR(20) NOT NULL CHECK (event IN ('under_contract', 'back_on_market')),
  list_price    NUMERIC(12,2),
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_status_events_case ON property_status_events (case_number, occurred_at DESC);

-- Scraper run log
CREATE TABLE IF NOT EXISTS accepted_offer_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger       VARCHAR(20) NOT NULL DEFAULT 'cron',
  states        INTEGER NOT NULL DEFAULT 0,
  fetched       INTEGER NOT NULL DEFAULT 0,
  new_offers    INTEGER NOT NULL DEFAULT 0,
  errors        JSONB NOT NULL DEFAULT '[]'::jsonb,
  ran_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- When a listing went under contract (set by the listing sync, cleared when relisted)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS under_contract_at TIMESTAMPTZ;
UPDATE properties SET under_contract_at = updated_at
  WHERE status = 'UNDER CONTRACT' AND under_contract_at IS NULL;

-- ─── Access ──────────────────────────────────────────────────────────────────
ALTER TABLE accepted_offers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE accepted_offer_runs    ENABLE ROW LEVEL SECURITY;

-- Bid history is a perk of having an account: signed-in users read, admins manage
DROP POLICY IF EXISTS "Signed-in users read accepted_offers" ON accepted_offers;
CREATE POLICY "Signed-in users read accepted_offers" ON accepted_offers
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage accepted_offers" ON accepted_offers;
CREATE POLICY "Admins manage accepted_offers" ON accepted_offers
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Signed-in users read property_status_events" ON property_status_events;
CREATE POLICY "Signed-in users read property_status_events" ON property_status_events
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins read accepted_offer_runs" ON accepted_offer_runs;
CREATE POLICY "Admins read accepted_offer_runs" ON accepted_offer_runs
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- Under-contract listings show in public search (previously only active ones were readable)
DROP POLICY IF EXISTS "Public can read under-contract properties" ON properties;
CREATE POLICY "Public can read under-contract properties" ON properties
  FOR SELECT TO anon, authenticated USING (status = 'UNDER CONTRACT');

-- Seed history from the older one-row-per-property bid_results table
INSERT INTO accepted_offers (case_number, property_id, address, city, state, zip_code, net_to_hud,
  purchaser_type, broker_name, bid_opened_on, accepted_at, list_price_at_acceptance, source)
SELECT b.case_number, b.property_id, b.address, b.city, b.state, b.zip_code, b.net_to_hud,
  b.purchaser_type, b.broker_name, b.date_opened, b.date_accepted::timestamp, b.original_list_price, 'bid_results_import'
FROM bid_results b
WHERE b.date_accepted IS NOT NULL
ON CONFLICT (case_number, accepted_at) DO NOTHING;
