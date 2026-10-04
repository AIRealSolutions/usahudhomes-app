-- HUD home alert subscriptions and the record of what each subscriber was sent.
--
-- The /alerts form creates a lead (for follow-up) and a subscription. A daily
-- Vercel cron (/api/notifications?action=send-alerts) emails each active
-- subscriber up to 10 active listings in their state that match their areas,
-- budget and bedrooms and that they have not been sent before.
-- Visitors may only create subscriptions; admins can read and manage them.
-- The cron and unsubscribe link use the service key.

CREATE TABLE IF NOT EXISTS property_alert_subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           UUID REFERENCES leads(id) ON DELETE SET NULL,
  email             TEXT NOT NULL,
  first_name        TEXT,
  state             TEXT NOT NULL,
  areas             TEXT[] NOT NULL DEFAULT '{}',   -- cities or counties, as typed
  budget_min        NUMERIC,
  budget_max        NUMERIC,
  bedrooms_min      INTEGER,
  buyer_type        TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  last_sent_at      TIMESTAMPTZ,
  unsubscribed_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_subs_active ON property_alert_subscriptions(is_active, state);
CREATE INDEX IF NOT EXISTS idx_alert_subs_email ON property_alert_subscriptions(lower(email));

CREATE TABLE IF NOT EXISTS property_alert_sends (
  subscription_id UUID NOT NULL REFERENCES property_alert_subscriptions(id) ON DELETE CASCADE,
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (subscription_id, property_id)
);

ALTER TABLE property_alert_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_alert_sends ENABLE ROW LEVEL SECURITY;

-- Visitors can sign up but not read anything back (the token stays private)
CREATE POLICY "Public can subscribe to alerts" ON property_alert_subscriptions
  FOR INSERT TO anon, authenticated
  WITH CHECK (is_active = true AND unsubscribed_at IS NULL AND last_sent_at IS NULL);

CREATE POLICY "Admins manage alert subscriptions" ON property_alert_subscriptions
  FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins read alert sends" ON property_alert_sends
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

GRANT INSERT ON property_alert_subscriptions TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON property_alert_subscriptions TO authenticated;
GRANT SELECT ON property_alert_sends TO authenticated;
