-- HUD broker companies: every company that has had a HUD home under contract
-- (the winning broker on an accepted offer). A warm-lead list for broker partners.
--
-- accepted_offers rows are linked by company_id and the stats (contracts, states,
-- volume, first/last contract) are kept current by triggers, so the list grows by
-- itself as the daily accepted-offer sync runs. Contact and outreach fields are
-- edited in Admin > Broker Leads.

CREATE TABLE IF NOT EXISTS hud_broker_companies (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   VARCHAR(255) NOT NULL,        -- as HUD publishes it (often truncated at 30 chars)
  name_key               VARCHAR(255) NOT NULL UNIQUE, -- normalized for matching
  -- Activity, maintained from accepted_offers
  total_contracts        INTEGER NOT NULL DEFAULT 0,
  owner_occupant_deals   INTEGER NOT NULL DEFAULT 0,
  investor_deals         INTEGER NOT NULL DEFAULT 0,
  fell_through           INTEGER NOT NULL DEFAULT 0,
  total_net_to_hud       NUMERIC(14,2) NOT NULL DEFAULT 0,
  states                 TEXT[] NOT NULL DEFAULT '{}',
  cities                 TEXT[] NOT NULL DEFAULT '{}',
  first_contract_at      TIMESTAMP,
  last_contract_at       TIMESTAMP,
  -- Outreach
  lead_status            VARCHAR(20) NOT NULL DEFAULT 'new'
                           CHECK (lead_status IN ('new', 'researching', 'contacted', 'interested', 'partner', 'not_interested', 'do_not_contact')),
  contact_name           VARCHAR(255),
  email                  VARCHAR(255),
  phone                  VARCHAR(50),
  website                VARCHAR(255),
  office_city            VARCHAR(100),
  office_state           VARCHAR(2),
  notes                  TEXT,
  last_contacted_at      TIMESTAMPTZ,
  next_follow_up         DATE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hud_broker_companies_last ON hud_broker_companies (last_contract_at DESC);
CREATE INDEX IF NOT EXISTS idx_hud_broker_companies_status ON hud_broker_companies (lead_status);

ALTER TABLE accepted_offers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES hud_broker_companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_accepted_offers_company ON accepted_offers (company_id);

-- Admin-only: this is our prospect list
ALTER TABLE hud_broker_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage hud_broker_companies" ON hud_broker_companies
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION broker_name_key(p_name TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT nullif(upper(regexp_replace(regexp_replace(trim(coalesce(p_name, '')), '[.,]', '', 'g'), '\s+', ' ', 'g')), '')
$$;

-- Recompute one company's activity from its accepted offers
CREATE OR REPLACE FUNCTION refresh_hud_broker_company(p_id UUID) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE hud_broker_companies c SET
    total_contracts      = s.total,
    owner_occupant_deals = s.oo,
    investor_deals       = s.inv,
    fell_through         = s.ft,
    total_net_to_hud     = s.net,
    states               = s.states,
    cities               = s.cities,
    first_contract_at    = s.first_at,
    last_contract_at     = s.last_at,
    updated_at           = now()
  FROM (
    SELECT count(*) AS total,
      count(*) FILTER (WHERE purchaser_type ILIKE 'owner%') AS oo,
      count(*) FILTER (WHERE purchaser_type ILIKE 'invest%') AS inv,
      count(*) FILTER (WHERE outcome = 'fell_through') AS ft,
      coalesce(sum(net_to_hud), 0) AS net,
      coalesce(array_agg(DISTINCT state ORDER BY state) FILTER (WHERE state IS NOT NULL), '{}') AS states,
      coalesce(array_agg(DISTINCT city || ', ' || state) FILTER (WHERE city IS NOT NULL), '{}') AS cities,
      min(accepted_at) AS first_at, max(accepted_at) AS last_at
    FROM accepted_offers WHERE company_id = p_id
  ) s
  WHERE c.id = p_id
$$;

-- Before an offer is saved: find or create its company
CREATE OR REPLACE FUNCTION link_offer_to_broker_company() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k TEXT := broker_name_key(NEW.broker_name);
BEGIN
  IF k IS NULL THEN
    NEW.company_id := NULL;
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.company_id IS NULL OR broker_name_key(OLD.broker_name) IS DISTINCT FROM k THEN
    INSERT INTO hud_broker_companies (name, name_key) VALUES (trim(NEW.broker_name), k)
      ON CONFLICT (name_key) DO NOTHING;
    SELECT id INTO NEW.company_id FROM hud_broker_companies WHERE name_key = k;
  END IF;
  RETURN NEW;
END $$;

-- After an offer changes: refresh the affected companies' stats
CREATE OR REPLACE FUNCTION refresh_broker_company_from_offer() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.company_id IS NOT NULL THEN
    PERFORM refresh_hud_broker_company(NEW.company_id);
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.company_id IS NOT NULL
     AND (TG_OP = 'DELETE' OR OLD.company_id IS DISTINCT FROM NEW.company_id) THEN
    PERFORM refresh_hud_broker_company(OLD.company_id);
  END IF;
  RETURN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_link_offer_company') THEN
    CREATE TRIGGER trg_link_offer_company BEFORE INSERT OR UPDATE OF broker_name ON accepted_offers
      FOR EACH ROW EXECUTE FUNCTION link_offer_to_broker_company();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_offer_company') THEN
    CREATE TRIGGER trg_refresh_offer_company AFTER INSERT OR UPDATE OR DELETE ON accepted_offers
      FOR EACH ROW EXECUTE FUNCTION refresh_broker_company_from_offer();
  END IF;
END $$;

-- Backfill from the offers already collected
INSERT INTO hud_broker_companies (name, name_key)
SELECT DISTINCT ON (broker_name_key(broker_name)) trim(broker_name), broker_name_key(broker_name)
FROM accepted_offers
WHERE broker_name_key(broker_name) IS NOT NULL
ORDER BY broker_name_key(broker_name), accepted_at DESC
ON CONFLICT (name_key) DO NOTHING;

UPDATE accepted_offers o SET company_id = c.id
FROM hud_broker_companies c
WHERE c.name_key = broker_name_key(o.broker_name) AND o.company_id IS DISTINCT FROM c.id;

SELECT refresh_hud_broker_company(id) FROM hud_broker_companies;
