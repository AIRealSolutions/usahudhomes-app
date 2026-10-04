-- Property activity timeline + saved homes.
--
-- Every listing, price change and status change on a property is logged to
-- property_activity by triggers, so the history is complete no matter what changed
-- the row (HUD sync, admin edit, bid results). Buyers can save homes to their
-- profile (saved_properties). Supersedes the unused property_status_events table.

-- ─── Activity log ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_activity (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number     VARCHAR(20) NOT NULL,
  property_id     UUID REFERENCES properties(id) ON DELETE SET NULL,
  state           VARCHAR(2),
  event           VARCHAR(20) NOT NULL CHECK (event IN ('listed', 'price_change', 'status_change', 'under_contract', 'back_on_market')),
  list_price      NUMERIC(12,2),
  previous_price  NUMERIC(12,2),
  status          VARCHAR(50),
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_property_activity_case ON property_activity (case_number, occurred_at DESC);
ALTER TABLE property_activity ENABLE ROW LEVEL SECURITY;
-- Price and listing history is public (search and property pages show it)
CREATE POLICY "Anyone reads property_activity" ON property_activity
  FOR SELECT TO anon, authenticated USING (true);

-- Before write: remember the first list price and when a home went under contract
CREATE OR REPLACE FUNCTION set_property_tracking_fields() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.original_list_price IS NULL THEN
    NEW.original_list_price := COALESCE(CASE WHEN TG_OP = 'UPDATE' THEN OLD.price END, NEW.price);
  END IF;
  IF upper(coalesce(NEW.status, '')) = 'UNDER CONTRACT' AND NOT coalesce(NEW.is_active, false) THEN
    IF TG_OP = 'INSERT' OR upper(coalesce(OLD.status, '')) <> 'UNDER CONTRACT' OR OLD.is_active THEN
      NEW.under_contract_at := COALESCE(NEW.under_contract_at, now());
    END IF;
  ELSIF NEW.is_active THEN
    NEW.under_contract_at := NULL;
  END IF;
  RETURN NEW;
END $$;

-- After write: log what changed
CREATE OR REPLACE FUNCTION log_property_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO property_activity (case_number, property_id, state, event, list_price, status)
    VALUES (NEW.case_number, NEW.id, NEW.state, 'listed', NEW.price, NEW.status);
    RETURN NEW;
  END IF;

  IF NEW.price IS DISTINCT FROM OLD.price AND NEW.price IS NOT NULL AND OLD.price IS NOT NULL THEN
    INSERT INTO property_activity (case_number, property_id, state, event, list_price, previous_price, status)
    VALUES (NEW.case_number, NEW.id, NEW.state, 'price_change', NEW.price, OLD.price, NEW.status);
  END IF;

  IF coalesce(OLD.is_active, false) AND NOT coalesce(NEW.is_active, false) AND upper(coalesce(NEW.status, '')) = 'UNDER CONTRACT' THEN
    INSERT INTO property_activity (case_number, property_id, state, event, list_price, status)
    VALUES (NEW.case_number, NEW.id, NEW.state, 'under_contract', NEW.price, NEW.status);
  ELSIF NOT coalesce(OLD.is_active, false) AND coalesce(NEW.is_active, false) THEN
    INSERT INTO property_activity (case_number, property_id, state, event, list_price, status)
    VALUES (NEW.case_number, NEW.id, NEW.state, 'back_on_market', NEW.price, NEW.status);
    -- An accepted offer still open when the home is relisted fell through
    UPDATE accepted_offers SET outcome = 'fell_through', updated_at = now()
      WHERE case_number = NEW.case_number AND outcome = 'pending';
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND coalesce(NEW.is_active, false) THEN
    INSERT INTO property_activity (case_number, property_id, state, event, list_price, status)
    VALUES (NEW.case_number, NEW.id, NEW.state, 'status_change', NEW.price, NEW.status);
  END IF;
  RETURN NEW;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_property_tracking_fields') THEN
    CREATE TRIGGER trg_property_tracking_fields BEFORE INSERT OR UPDATE ON properties
      FOR EACH ROW EXECUTE FUNCTION set_property_tracking_fields();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_property_activity') THEN
    CREATE TRIGGER trg_property_activity AFTER INSERT OR UPDATE OF price, status, is_active ON properties
      FOR EACH ROW EXECUTE FUNCTION log_property_activity();
  END IF;
END $$;

-- Backfill: a "listed" entry for every home, and when known homes went under contract
INSERT INTO property_activity (case_number, property_id, state, event, list_price, occurred_at)
SELECT p.case_number, p.id, p.state, 'listed', COALESCE(p.original_list_price, p.price), COALESCE(p.listing_date, p.created_at)
FROM properties p
WHERE NOT EXISTS (SELECT 1 FROM property_activity e WHERE e.case_number = p.case_number AND e.event = 'listed');

INSERT INTO property_activity (case_number, property_id, state, event, list_price, status, occurred_at)
SELECT p.case_number, p.id, p.state, 'under_contract', p.price, p.status, p.under_contract_at
FROM properties p
WHERE p.status = 'UNDER CONTRACT' AND p.under_contract_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM property_activity e WHERE e.case_number = p.case_number AND e.event = 'under_contract');

-- ─── Saved homes ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_properties (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id    UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  case_number    VARCHAR(20) NOT NULL,
  price_at_save  NUMERIC(12,2),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT saved_properties_user_property_key UNIQUE (user_id, property_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_properties_user ON saved_properties (user_id, created_at DESC);
ALTER TABLE saved_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their saved homes" ON saved_properties
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins read saved homes" ON saved_properties
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));
