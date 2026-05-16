-- ─── Agent SMS Notification Fields ──────────────────────────────────────────
-- Run this in Supabase SQL Editor to enable per-agent SMS notifications.
--
-- notification_phone:        The 10-digit US number to receive SMS alerts
-- sms_carrier:               Carrier key (verizon, att, tmobile, etc.)
-- sms_notifications_enabled: Master toggle — false = no SMS sent to this agent

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS notification_phone        TEXT,
  ADD COLUMN IF NOT EXISTS sms_carrier               TEXT DEFAULT 'verizon',
  ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT false;

-- Index for quick lookup of agents with SMS enabled
CREATE INDEX IF NOT EXISTS idx_agents_sms_enabled
  ON agents(sms_notifications_enabled)
  WHERE sms_notifications_enabled = true;

-- Comment for documentation
COMMENT ON COLUMN agents.notification_phone        IS '10-digit US phone number for SMS lead alerts';
COMMENT ON COLUMN agents.sms_carrier               IS 'Mobile carrier key: verizon, att, tmobile, sprint, boost, cricket, metro, uscellular, virgin, tracfone, straighttalk, consumer, other';
COMMENT ON COLUMN agents.sms_notifications_enabled IS 'When true, agent receives SMS text alerts for new and assigned leads';
