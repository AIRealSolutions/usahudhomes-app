-- Do-not-contact list for brokers, and a contact snapshot on every referral request.
--
-- hud_brokers rows come from HUD's listing and can change (a new company name or office
-- ZIP makes a new row), so an opt-out stored only on that row could be lost. This list is
-- keyed on phone number and email instead: any directory broker matching it, now or
-- added later, is kept at status 'do_not_contact', and their company is marked
-- do_not_contact in Broker Leads (hud_broker_companies).

-- Last ten digits of a phone number: "(910) 653-2928" and "+1 910.653.2928" match
CREATE OR REPLACE FUNCTION phone_digits(p_phone TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT nullif(right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10), '')
$$;

CREATE TABLE IF NOT EXISTS broker_suppressions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_digits  TEXT,
  email         TEXT,
  company_name  TEXT,
  contact_name  TEXT,
  state         VARCHAR(2),
  broker_id     UUID REFERENCES hud_brokers(id) ON DELETE SET NULL,
  request_id    UUID REFERENCES broker_referral_requests(id) ON DELETE SET NULL,
  source        TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('referral_link', 'admin')),
  reason        TEXT,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (phone_digits IS NOT NULL OR email IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_broker_suppressions_phone ON broker_suppressions (phone_digits) WHERE phone_digits IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_broker_suppressions_email ON broker_suppressions (email) WHERE email IS NOT NULL;
ALTER TABLE broker_suppressions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage broker_suppressions" ON broker_suppressions;
CREATE POLICY "Admins manage broker_suppressions" ON broker_suppressions
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION is_broker_suppressed(p_phone TEXT, p_email TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM broker_suppressions s
    WHERE (s.phone_digits IS NOT NULL AND s.phone_digits = phone_digits(p_phone))
       OR (s.email IS NOT NULL AND s.email = lower(nullif(trim(p_email), '')))
  )
$$;

-- New or updated directory brokers that match the list stay do-not-contact
CREATE OR REPLACE FUNCTION keep_broker_suppressed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF is_broker_suppressed(NEW.phone, NEW.email) THEN
    NEW.status := 'do_not_contact';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_keep_broker_suppressed ON hud_brokers;
CREATE TRIGGER trg_keep_broker_suppressed BEFORE INSERT OR UPDATE ON hud_brokers
  FOR EACH ROW EXECUTE FUNCTION keep_broker_suppressed();

-- Adding to the list marks matching brokers and their company; removing reopens them
CREATE OR REPLACE FUNCTION apply_broker_suppression() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hud_brokers SET status = 'do_not_contact'
      WHERE status <> 'do_not_contact'
        AND ((NEW.phone_digits IS NOT NULL AND phone_digits(phone) = NEW.phone_digits)
          OR (NEW.email IS NOT NULL AND lower(email) = NEW.email));
    IF NEW.company_name IS NOT NULL AND broker_name_key(NEW.company_name) IS NOT NULL THEN
      UPDATE hud_broker_companies SET lead_status = 'do_not_contact', updated_at = now()
        WHERE name_key = broker_name_key(NEW.company_name) AND lead_status <> 'do_not_contact';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hud_brokers SET status = 'declined'
      WHERE status = 'do_not_contact'
        AND ((OLD.phone_digits IS NOT NULL AND phone_digits(phone) = OLD.phone_digits)
          OR (OLD.email IS NOT NULL AND lower(email) = OLD.email))
        AND NOT EXISTS (SELECT 1 FROM broker_suppressions s WHERE s.id <> OLD.id
          AND ((s.phone_digits IS NOT NULL AND s.phone_digits = phone_digits(hud_brokers.phone))
            OR (s.email IS NOT NULL AND s.email = lower(hud_brokers.email))));
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_apply_broker_suppression ON broker_suppressions;
CREATE TRIGGER trg_apply_broker_suppression AFTER INSERT OR DELETE ON broker_suppressions
  FOR EACH ROW EXECUTE FUNCTION apply_broker_suppression();

-- Who a link or request went to, as they were listed at the time
ALTER TABLE broker_referral_requests
  ADD COLUMN IF NOT EXISTS broker_company TEXT,
  ADD COLUMN IF NOT EXISTS broker_contact TEXT,
  ADD COLUMN IF NOT EXISTS broker_phone   TEXT;
UPDATE broker_referral_requests r
  SET broker_company = b.company_name, broker_contact = b.contact_name, broker_phone = b.phone
  FROM hud_brokers b
  WHERE b.id = r.broker_id AND r.broker_company IS NULL;

-- Brokers already marked do-not-contact go on the list
INSERT INTO broker_suppressions (phone_digits, email, company_name, contact_name, state, broker_id, source, reason)
SELECT DISTINCT ON (coalesce(phone_digits(b.phone), lower(b.email)))
  phone_digits(b.phone), lower(nullif(trim(b.email), '')), b.company_name, b.contact_name, b.state, b.id, 'admin',
  'Marked do-not-contact before the list existed'
FROM hud_brokers b
WHERE b.status = 'do_not_contact' AND (phone_digits(b.phone) IS NOT NULL OR nullif(trim(b.email), '') IS NOT NULL)
ON CONFLICT DO NOTHING;
