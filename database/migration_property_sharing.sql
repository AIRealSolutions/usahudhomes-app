-- Property Sharing and Event Tracking System
-- This migration creates tables for tracking property shares and engagement

-- =====================================================
-- 1. Property Shares Table
-- =====================================================
-- Tracks when properties are shared with leads
CREATE TABLE IF NOT EXISTS property_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who shared it
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  
  -- What was shared
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  case_number VARCHAR(50), -- HUD case number for reference
  
  -- Who it was shared with
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  
  -- How it was shared
  share_method VARCHAR(50) NOT NULL, -- 'email', 'sms', 'facebook', 'instagram', 'whatsapp', 'link'
  
  -- Share details
  message TEXT, -- Custom message included with the share
  subject VARCHAR(255), -- Email subject line
  
  -- Tracking
  share_link VARCHAR(500), -- Unique tracking link
  share_token VARCHAR(100) UNIQUE, -- Token for tracking engagement
  
  -- Engagement metrics
  viewed_at TIMESTAMP, -- When the property was first viewed
  view_count INTEGER DEFAULT 0, -- Number of times viewed
  last_viewed_at TIMESTAMP, -- Most recent view
  
  clicked_at TIMESTAMP, -- When links were first clicked
  click_count INTEGER DEFAULT 0, -- Number of clicks
  last_clicked_at TIMESTAMP, -- Most recent click
  
  -- Lead response
  response_status VARCHAR(50), -- 'interested', 'not_interested', 'showing_scheduled', 'offer_made', 'no_response'
  response_notes TEXT,
  responded_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  
  -- Indexes for performance
  CONSTRAINT valid_share_method CHECK (share_method IN ('email', 'sms', 'facebook', 'instagram', 'whatsapp', 'link', 'direct'))
);

-- Indexes for property_shares
CREATE INDEX IF NOT EXISTS idx_property_shares_agent ON property_shares(agent_id);
CREATE INDEX IF NOT EXISTS idx_property_shares_customer ON property_shares(customer_id);
CREATE INDEX IF NOT EXISTS idx_property_shares_property ON property_shares(property_id);
CREATE INDEX IF NOT EXISTS idx_property_shares_consultation ON property_shares(consultation_id);
CREATE INDEX IF NOT EXISTS idx_property_shares_token ON property_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_property_shares_created ON property_shares(created_at DESC);

-- =====================================================
-- 2. Property Share Events Table
-- =====================================================
-- Tracks all events related to property shares (views, clicks, etc.)
CREATE TABLE IF NOT EXISTS property_share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Related share
  share_id UUID NOT NULL REFERENCES property_shares(id) ON DELETE CASCADE,
  
  -- Event details
  event_type VARCHAR(50) NOT NULL, -- 'view', 'click', 'email_open', 'email_click', 'sms_click', 'inquiry', 'showing_request'
  event_data JSONB, -- Additional event data (e.g., which link was clicked, device info)
  
  -- Tracking info
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
  referrer TEXT,
  
  -- Location data (if available)
  city VARCHAR(100),
  state VARCHAR(50),
  country VARCHAR(50),
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'shared', 'view', 'click', 'email_open', 'email_click', 'sms_click', 
    'inquiry', 'showing_request', 'favorite', 'unfavorite', 'compare'
  ))
);

-- Indexes for property_share_events
CREATE INDEX IF NOT EXISTS idx_share_events_share ON property_share_events(share_id);
CREATE INDEX IF NOT EXISTS idx_share_events_type ON property_share_events(event_type);
CREATE INDEX IF NOT EXISTS idx_share_events_created ON property_share_events(created_at DESC);

-- =====================================================
-- 3. Property Collections Table
-- =====================================================
-- Allows agents to create curated property lists for specific clients
CREATE TABLE IF NOT EXISTS property_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who created it
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Who it's for
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  
  -- Collection details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Properties in collection (array of property IDs or case numbers)
  property_ids UUID[],
  case_numbers VARCHAR(50)[],
  
  -- Sharing
  is_shared BOOLEAN DEFAULT FALSE,
  shared_at TIMESTAMP,
  share_link VARCHAR(500),
  share_token VARCHAR(100) UNIQUE,
  
  -- Engagement
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP
);

-- Indexes for property_collections
CREATE INDEX IF NOT EXISTS idx_collections_agent ON property_collections(agent_id);
CREATE INDEX IF NOT EXISTS idx_collections_customer ON property_collections(customer_id);
CREATE INDEX IF NOT EXISTS idx_collections_token ON property_collections(share_token);

-- =====================================================
-- 4. Lead Property Interests Table
-- =====================================================
-- Tracks which properties leads have shown interest in
CREATE TABLE IF NOT EXISTS lead_property_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who is interested
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  
  -- What they're interested in
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  case_number VARCHAR(50),
  
  -- Interest level
  interest_level VARCHAR(50), -- 'high', 'medium', 'low', 'not_interested'
  
  -- Details
  notes TEXT,
  showing_requested BOOLEAN DEFAULT FALSE,
  showing_scheduled_at TIMESTAMP,
  offer_made BOOLEAN DEFAULT FALSE,
  offer_amount DECIMAL(12, 2),
  
  -- Source of interest
  source VARCHAR(50), -- 'shared_property', 'search', 'recommendation', 'inquiry'
  source_share_id UUID REFERENCES property_shares(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  
  CONSTRAINT valid_interest_level CHECK (interest_level IN ('high', 'medium', 'low', 'not_interested', 'unknown'))
);

-- Indexes for lead_property_interests
CREATE INDEX IF NOT EXISTS idx_interests_customer ON lead_property_interests(customer_id);
CREATE INDEX IF NOT EXISTS idx_interests_property ON lead_property_interests(property_id);
CREATE INDEX IF NOT EXISTS idx_interests_level ON lead_property_interests(interest_level);

-- =====================================================
-- 5. Update Trigger for updated_at
-- =====================================================

-- Trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
DROP TRIGGER IF EXISTS update_property_shares_updated_at ON property_shares;
CREATE TRIGGER update_property_shares_updated_at
  BEFORE UPDATE ON property_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF NOT EXISTS update_property_collections_updated_at ON property_collections;
CREATE TRIGGER update_property_collections_updated_at
  BEFORE UPDATE ON property_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lead_property_interests_updated_at ON lead_property_interests;
CREATE TRIGGER update_lead_property_interests_updated_at
  BEFORE UPDATE ON lead_property_interests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. Helper Views
-- =====================================================

-- View for property share analytics
CREATE OR REPLACE VIEW property_share_analytics AS
SELECT 
  ps.id,
  ps.agent_id,
  ps.customer_id,
  ps.property_id,
  ps.case_number,
  ps.share_method,
  ps.created_at AS shared_at,
  ps.view_count,
  ps.click_count,
  ps.response_status,
  COUNT(DISTINCT pse.id) FILTER (WHERE pse.event_type = 'view') AS total_views,
  COUNT(DISTINCT pse.id) FILTER (WHERE pse.event_type = 'click') AS total_clicks,
  MAX(pse.created_at) FILTER (WHERE pse.event_type = 'view') AS last_view_at,
  MAX(pse.created_at) FILTER (WHERE pse.event_type = 'click') AS last_click_at,
  c.first_name || ' ' || c.last_name AS customer_name,
  c.email AS customer_email,
  a.first_name || ' ' || a.last_name AS agent_name
FROM property_shares ps
LEFT JOIN property_share_events pse ON ps.id = pse.share_id
LEFT JOIN customers c ON ps.customer_id = c.id
LEFT JOIN agents a ON ps.agent_id = a.id
WHERE ps.is_deleted = FALSE
GROUP BY ps.id, c.first_name, c.last_name, c.email, a.first_name, a.last_name;

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Property sharing and event tracking tables created successfully!';
  RAISE NOTICE 'Tables created: property_shares, property_share_events, property_collections, lead_property_interests';
  RAISE NOTICE 'View created: property_share_analytics';
END $$;
