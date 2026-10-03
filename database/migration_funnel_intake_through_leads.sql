-- Funnel every inbound request through the leads table.
--
-- The agent-request form and the Facebook import used to write straight into
-- consultations. They now create a lead (status new_lead) that an admin assigns
-- from the Leads Hub, which is what creates the consultation. These columns let
-- the leads table hold everything those intakes capture so it carries over on
-- assignment. All columns are nullable; no existing data changes.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS preferred_location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS source_details JSONB,
  ADD COLUMN IF NOT EXISTS financing_type VARCHAR(60),
  ADD COLUMN IF NOT EXISTS down_payment VARCHAR(60),
  ADD COLUMN IF NOT EXISTS credit_score_range VARCHAR(60),
  ADD COLUMN IF NOT EXISTS pre_approved BOOLEAN,
  ADD COLUMN IF NOT EXISTS buyer_type VARCHAR(60),
  ADD COLUMN IF NOT EXISTS experience_level VARCHAR(60),
  ADD COLUMN IF NOT EXISTS price_range_min NUMERIC,
  ADD COLUMN IF NOT EXISTS price_range_max NUMERIC,
  ADD COLUMN IF NOT EXISTS property_preferences JSONB,
  ADD COLUMN IF NOT EXISTS hear_about_us VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
