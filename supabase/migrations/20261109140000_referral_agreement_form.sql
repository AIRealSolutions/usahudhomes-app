-- Referral agreement (NC REALTORS® Form 730) for Broker Finder referrals.
--
-- * Terms stored on each referral request, filled into the form when the broker accepts.
-- * A private Storage bucket for the admin's copy of the blank form. Only admins can
--   upload or read it from the browser; the server reads it with the service key and
--   only sends it out filled in, to the broker who accepted that referral.

ALTER TABLE broker_referral_requests
  ADD COLUMN IF NOT EXISTS fee_percent     NUMERIC(5,2) NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS agreement_end_date DATE,
  ADD COLUMN IF NOT EXISTS payment_days    INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS prospect_aware  BOOLEAN,
  ADD COLUMN IF NOT EXISTS receiving_agent_license TEXT,
  ADD COLUMN IF NOT EXISTS receiving_firm_license  TEXT,
  ADD COLUMN IF NOT EXISTS agreement_sent_at TIMESTAMPTZ;

INSERT INTO storage.buckets (id, name, public)
VALUES ('private-forms', 'private-forms', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins read private forms" ON storage.objects;
CREATE POLICY "Admins read private forms" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'private-forms' AND is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins upload private forms" ON storage.objects;
CREATE POLICY "Admins upload private forms" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'private-forms' AND is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins replace private forms" ON storage.objects;
CREATE POLICY "Admins replace private forms" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'private-forms' AND is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'private-forms' AND is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins delete private forms" ON storage.objects;
CREATE POLICY "Admins delete private forms" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'private-forms' AND is_admin(auth.uid()));
