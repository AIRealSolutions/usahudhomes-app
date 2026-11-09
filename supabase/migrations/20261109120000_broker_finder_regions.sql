-- Broker Finder: economic regions, a directory of HUD-registered selling brokers,
-- and referral requests sent to them.
--
-- * economic_regions: named groups of counties per state (NC is seeded with the
--   eight N.C. Prosperity Zones, G.S. 143B-28.1). Admins add regions for other
--   states in Admin > Economic Regions.
-- * properties.economic_region / hud_brokers.economic_region / agents.economic_regions:
--   the region data field. Properties and brokers are kept in step by triggers.
-- * hud_brokers: brokers found through hudhomestore.gov/brokersearch, geocoded so
--   they can be shown on the map and ranked by distance from a property.
-- * broker_referral_requests: "we have a buyer for this home" emails to brokers,
--   with a public token link the broker uses to accept, decline, or sign up for
--   more leads in regions of their state.

-- ─── Economic regions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS economic_regions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state       VARCHAR(2) NOT NULL,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  counties    TEXT[] NOT NULL DEFAULT '{}',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (state, slug)
);
ALTER TABLE economic_regions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads economic regions" ON economic_regions;
CREATE POLICY "Anyone reads economic regions" ON economic_regions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage economic regions" ON economic_regions;
CREATE POLICY "Admins manage economic regions" ON economic_regions
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- County names from HUD and the Census differ in spelling, so compare a normalized key:
-- "New Hanover County" = "new hanover", "St. Mary's" = "Saint Marys", "DeSoto" = "De Soto",
-- "Doña Ana" = "Dona Ana", "Kenai Peninsula Borough" = "Kenai Peninsula".
CREATE OR REPLACE FUNCTION county_key(p_county TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT nullif(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    translate(lower(trim(coalesce(p_county, ''))), 'áàâäãåéèêëíìîïóòôöõúùûüñç', 'aaaaaaeeeeiiiiooooouuuunc'),
    '\s+(county|parish|borough|city and borough|census area|municipality|municipio)$', ''),
    '^st\.?\s+', 'saint '), '^ste\.?\s+', 'sainte '), '[^a-z0-9]', '', 'g'), '')
$$;

-- The region slug for a state + county, or NULL
CREATE OR REPLACE FUNCTION economic_region_for(p_state TEXT, p_county TEXT) RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.slug FROM economic_regions r
  WHERE r.state = upper(trim(p_state))
    AND county_key(p_county) = ANY (SELECT county_key(c) FROM unnest(r.counties) c)
  ORDER BY r.sort_order, r.name
  LIMIT 1
$$;

-- ─── Region field on properties ─────────────────────────────────────────────
ALTER TABLE properties ADD COLUMN IF NOT EXISTS economic_region TEXT;
CREATE INDEX IF NOT EXISTS idx_properties_economic_region ON properties (state, economic_region);

CREATE OR REPLACE FUNCTION set_property_economic_region() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.economic_region := economic_region_for(NEW.state, NEW.county);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_property_economic_region ON properties;
CREATE TRIGGER trg_property_economic_region BEFORE INSERT OR UPDATE OF state, county ON properties
  FOR EACH ROW EXECUTE FUNCTION set_property_economic_region();

-- ─── HUD broker directory ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hud_brokers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_key        TEXT NOT NULL UNIQUE,          -- normalized company|contact|zip
  company_name      TEXT NOT NULL,
  contact_name      TEXT,
  address           TEXT,
  city              TEXT,
  state             VARCHAR(2),
  zip               TEXT,
  phone             TEXT,
  email             TEXT,
  website           TEXT,
  county            TEXT,
  latitude          NUMERIC(9,6),
  longitude         NUMERIC(9,6),
  geocode_quality   TEXT,                           -- 'address' | 'zip' | NULL (not geocoded)
  economic_region   TEXT,
  status            TEXT NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new', 'contacted', 'interested', 'registered', 'declined', 'do_not_contact')),
  agent_id          UUID REFERENCES agents(id) ON DELETE SET NULL,
  notes             TEXT,
  source            TEXT NOT NULL DEFAULT 'hudhomestore',
  first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_contacted_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hud_brokers_state_region ON hud_brokers (state, economic_region);
CREATE INDEX IF NOT EXISTS idx_hud_brokers_city ON hud_brokers (state, lower(city));
CREATE INDEX IF NOT EXISTS idx_hud_brokers_status ON hud_brokers (status);
ALTER TABLE hud_brokers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage hud_brokers" ON hud_brokers;
CREATE POLICY "Admins manage hud_brokers" ON hud_brokers
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION set_hud_broker_economic_region() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.economic_region := economic_region_for(NEW.state, NEW.county);
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_hud_broker_economic_region ON hud_brokers;
CREATE TRIGGER trg_hud_broker_economic_region BEFORE INSERT OR UPDATE ON hud_brokers
  FOR EACH ROW EXECUTE FUNCTION set_hud_broker_economic_region();

-- When regions change, re-file that state's properties and brokers
CREATE OR REPLACE FUNCTION refresh_economic_regions_for_state() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s TEXT;
BEGIN
  FOR s IN SELECT DISTINCT x FROM unnest(ARRAY[
      CASE WHEN TG_OP <> 'INSERT' THEN OLD.state END,
      CASE WHEN TG_OP <> 'DELETE' THEN NEW.state END]) x WHERE x IS NOT NULL
  LOOP
    UPDATE properties SET economic_region = economic_region_for(state, county)
      WHERE state = s AND economic_region IS DISTINCT FROM economic_region_for(state, county);
    UPDATE hud_brokers SET economic_region = economic_region_for(state, county)
      WHERE state = s AND economic_region IS DISTINCT FROM economic_region_for(state, county);
  END LOOP;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_refresh_economic_regions ON economic_regions;
CREATE TRIGGER trg_refresh_economic_regions AFTER INSERT OR UPDATE OR DELETE ON economic_regions
  FOR EACH ROW EXECUTE FUNCTION refresh_economic_regions_for_state();

-- ─── HUD search cache (avoid repeating the same HUD lookup) ────────────────
CREATE TABLE IF NOT EXISTS hud_broker_searches (
  query        TEXT PRIMARY KEY,                    -- e.g. 'ZIP:28472' or 'CITY:NC:whiteville'
  result_count INTEGER NOT NULL DEFAULT 0,
  searched_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE hud_broker_searches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read hud_broker_searches" ON hud_broker_searches;
CREATE POLICY "Admins read hud_broker_searches" ON hud_broker_searches
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- ─── Referral requests to brokers ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broker_referral_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token               TEXT NOT NULL UNIQUE,
  broker_id           UUID NOT NULL REFERENCES hud_brokers(id) ON DELETE CASCADE,
  property_id         UUID REFERENCES properties(id) ON DELETE SET NULL,
  case_number         TEXT,
  property_address    TEXT,
  property_city       TEXT,
  property_state      VARCHAR(2),
  property_price      NUMERIC,
  lead_id             UUID REFERENCES leads(id) ON DELETE SET NULL,
  distance_miles      NUMERIC(6,1),
  note                TEXT,                         -- admin's message to the broker
  email               TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'sent', 'opened', 'accepted', 'declined', 'failed')),
  wants_more_leads    BOOLEAN NOT NULL DEFAULT false,
  regions_requested   TEXT[] NOT NULL DEFAULT '{}',  -- region slugs in property_state
  response_note       TEXT,
  last_error          TEXT,
  send_count          INTEGER NOT NULL DEFAULT 0,
  created_by          UUID,
  sent_at             TIMESTAMPTZ,
  opened_at           TIMESTAMPTZ,
  responded_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_broker_referral_requests_broker ON broker_referral_requests (broker_id);
CREATE INDEX IF NOT EXISTS idx_broker_referral_requests_property ON broker_referral_requests (property_id);
CREATE INDEX IF NOT EXISTS idx_broker_referral_requests_lead ON broker_referral_requests (lead_id);
ALTER TABLE broker_referral_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage broker_referral_requests" ON broker_referral_requests;
CREATE POLICY "Admins manage broker_referral_requests" ON broker_referral_requests
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
-- Brokers reach their request only through /api/broker-finder with the token (service key).

-- ─── Regions on broker applications and agents ─────────────────────────────
ALTER TABLE agent_applications ADD COLUMN IF NOT EXISTS economic_regions JSONB NOT NULL DEFAULT '[]';
ALTER TABLE agent_applications ADD COLUMN IF NOT EXISTS referral_token TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS economic_regions JSONB NOT NULL DEFAULT '[]';
-- economic_regions holds keys like "NC:southeast"; an empty list means the whole state.

-- A broker who registers from a referral email is marked registered in the directory
CREATE OR REPLACE FUNCTION link_application_to_referral() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referral_token IS NOT NULL THEN
    UPDATE hud_brokers b SET status = 'registered',
      email = coalesce(b.email, NEW.email)
    FROM broker_referral_requests r
    WHERE r.token = NEW.referral_token AND r.broker_id = b.id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_link_application_to_referral ON agent_applications;
CREATE TRIGGER trg_link_application_to_referral AFTER INSERT ON agent_applications
  FOR EACH ROW EXECUTE FUNCTION link_application_to_referral();

-- ─── Seed: North Carolina Prosperity Zones (G.S. 143B-28.1) ─────────────────
INSERT INTO economic_regions (state, slug, name, sort_order, counties) VALUES
 ('NC', 'western', 'Western', 1, ARRAY['Buncombe','Cherokee','Clay','Graham','Haywood','Henderson','Jackson','Macon','Madison','Polk','Rutherford','Swain','Transylvania']),
 ('NC', 'northwest', 'Northwest', 2, ARRAY['Alexander','Alleghany','Ashe','Avery','Burke','Caldwell','Catawba','McDowell','Mitchell','Watauga','Wilkes','Yancey']),
 ('NC', 'southwest', 'Southwest', 3, ARRAY['Anson','Cabarrus','Cleveland','Gaston','Iredell','Lincoln','Mecklenburg','Rowan','Stanly','Union']),
 ('NC', 'piedmont-triad', 'Piedmont-Triad', 4, ARRAY['Alamance','Caswell','Davidson','Davie','Forsyth','Guilford','Randolph','Rockingham','Stokes','Surry','Yadkin']),
 ('NC', 'north-central', 'North Central', 5, ARRAY['Chatham','Durham','Edgecombe','Franklin','Granville','Harnett','Johnston','Lee','Nash','Orange','Person','Vance','Wake','Warren','Wilson']),
 ('NC', 'sandhills', 'Sandhills', 6, ARRAY['Bladen','Columbus','Cumberland','Hoke','Montgomery','Moore','Richmond','Robeson','Sampson','Scotland']),
 ('NC', 'northeast', 'Northeast', 7, ARRAY['Beaufort','Bertie','Camden','Chowan','Currituck','Dare','Gates','Halifax','Hertford','Hyde','Martin','Northampton','Pasquotank','Perquimans','Pitt','Tyrrell','Washington']),
 ('NC', 'southeast', 'Southeast', 8, ARRAY['Brunswick','Carteret','Craven','Duplin','Greene','Jones','Lenoir','New Hanover','Onslow','Pamlico','Pender','Wayne'])
ON CONFLICT (state, slug) DO NOTHING;
UPDATE economic_regions SET description = 'N.C. Prosperity Zone (G.S. 143B-28.1)' WHERE state = 'NC' AND description IS NULL;

-- Backfill properties (the economic_regions trigger also does this for NC)
UPDATE properties SET economic_region = economic_region_for(state, county)
  WHERE economic_region IS DISTINCT FROM economic_region_for(state, county);
