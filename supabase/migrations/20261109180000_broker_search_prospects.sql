-- Every broker found in a HUD broker search (Broker Finder, the map's directory fill,
-- any later search) is also a prospect in Broker Leads (hud_broker_companies).
--
-- A trigger on hud_brokers finds or creates the broker's company: by exact name key,
-- or by prefix when the existing name came from HUD's accepted-offer feed, which cuts
-- names off at about 30 characters. Contact, phone, email and office are filled in
-- only where the prospect has none, so admin edits are kept. Outreach status moves
-- the company forward (contacted / interested / partner), never back, and
-- do-not-contact always applies.

ALTER TABLE hud_broker_companies
  ADD COLUMN IF NOT EXISTS in_broker_search BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS broker_search_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS search_states    TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_hud_broker_companies_search ON hud_broker_companies (in_broker_search);

ALTER TABLE hud_brokers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES hud_broker_companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_hud_brokers_company ON hud_brokers (company_id);

CREATE OR REPLACE FUNCTION link_broker_to_prospect() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  k TEXT := broker_name_key(NEW.company_name);
  cid UUID;
  st TEXT := upper(nullif(trim(NEW.state), ''));
BEGIN
  IF k IS NULL THEN RETURN NEW; END IF;

  -- Find or create the company when the broker is new, unlinked, or renamed
  IF TG_OP = 'INSERT' OR NEW.company_id IS NULL OR NEW.company_name IS DISTINCT FROM OLD.company_name THEN
    SELECT id INTO cid FROM hud_broker_companies WHERE name_key = k LIMIT 1;
    IF cid IS NULL THEN
      SELECT id INTO cid FROM hud_broker_companies
        WHERE length(name_key) >= 25 AND k LIKE replace(replace(name_key, '%', '\%'), '_', '\_') || '%'
        ORDER BY length(name_key) DESC LIMIT 1;
    END IF;
    IF cid IS NULL THEN
      INSERT INTO hud_broker_companies (name, name_key, contact_name, phone, email, office_city, office_state,
                                        lead_status, notes, in_broker_search, broker_search_at, search_states)
      VALUES (left(trim(NEW.company_name), 255), k, NEW.contact_name, NEW.phone, NEW.email, NEW.city, st,
              CASE WHEN NEW.status = 'do_not_contact' THEN 'do_not_contact' ELSE 'new' END,
              'Found in HUD broker search', true, now(), CASE WHEN st IS NULL THEN '{}' ELSE ARRAY[st] END)
      ON CONFLICT (name_key) DO NOTHING
      RETURNING id INTO cid;
      IF cid IS NULL THEN SELECT id INTO cid FROM hud_broker_companies WHERE name_key = k; END IF;
    END IF;
    NEW.company_id := cid;
  END IF;

  -- Keep the prospect's details and outreach status in step (never overwrite admin edits)
  UPDATE hud_broker_companies c SET
    contact_name     = coalesce(c.contact_name, NEW.contact_name),
    phone            = coalesce(c.phone, NEW.phone),
    email            = coalesce(c.email, NEW.email),
    office_city      = coalesce(c.office_city, NEW.city),
    office_state     = coalesce(c.office_state, st),
    in_broker_search = true,
    broker_search_at = now(),
    search_states    = CASE WHEN st IS NULL OR st = ANY (c.search_states) THEN c.search_states ELSE c.search_states || st END,
    lead_status = CASE
      WHEN c.lead_status = 'do_not_contact' OR NEW.status = 'do_not_contact' THEN 'do_not_contact'
      WHEN NEW.status = 'registered' THEN 'partner'
      WHEN NEW.status = 'interested' AND c.lead_status IN ('new', 'researching', 'contacted') THEN 'interested'
      WHEN NEW.status = 'contacted' AND c.lead_status IN ('new', 'researching') THEN 'contacted'
      ELSE c.lead_status END,
    last_contacted_at = CASE WHEN NEW.last_contacted_at IS NOT NULL
      AND (c.last_contacted_at IS NULL OR NEW.last_contacted_at > c.last_contacted_at) THEN NEW.last_contacted_at ELSE c.last_contacted_at END,
    updated_at = now()
  WHERE c.id = NEW.company_id;
  RETURN NEW;
END $$;

-- Runs after the region and do-not-contact triggers (alphabetical), so it sees the final status
DROP TRIGGER IF EXISTS trg_link_broker_prospect ON hud_brokers;
CREATE TRIGGER trg_link_broker_prospect BEFORE INSERT OR UPDATE ON hud_brokers
  FOR EACH ROW EXECUTE FUNCTION link_broker_to_prospect();

-- Import the brokers already found
UPDATE hud_brokers SET updated_at = now() WHERE company_id IS NULL;
