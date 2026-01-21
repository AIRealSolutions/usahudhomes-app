-- ============================================
-- LEAD MANAGEMENT SYSTEM - Migration with Data Merge
-- Purpose: Drop old leads view, create new leads table, migrate existing data
-- Date: January 20, 2026
-- ============================================

-- ============================================
-- STEP 1: Backup existing leads view data to temporary table
-- ============================================
CREATE TEMP TABLE leads_backup AS 
SELECT * FROM leads;

-- Count records for verification
SELECT COUNT(*) as backed_up_leads FROM leads_backup;

-- ============================================
-- STEP 2: Drop the existing leads view
-- ============================================
DROP VIEW IF EXISTS leads CASCADE;

-- ============================================
-- STEP 3: Create new leads table
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Contact Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  
  -- Location & Preferences
  state VARCHAR(2),
  budget_min DECIMAL(12, 2),
  budget_max DECIMAL(12, 2),
  timeline VARCHAR(100),
  message TEXT,
  
  -- Property-Specific Fields (for property inquiries)
  property_case_number VARCHAR(50),
  property_address TEXT,
  property_price DECIMAL(12, 2),
  
  -- Lead Tracking
  source VARCHAR(100) NOT NULL DEFAULT 'unknown',
  status VARCHAR(50) DEFAULT 'new_lead',
  ip_address VARCHAR(45),
  
  -- Conversion Tracking
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  converted_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- STEP 4: Migrate data from backup to new table
-- This attempts to map old structure to new structure
-- Adjust column mappings based on your actual view structure
-- ============================================

-- First, let's try a safe migration that handles common field names
INSERT INTO leads (
  id,
  first_name,
  last_name,
  email,
  phone,
  state,
  budget_min,
  budget_max,
  timeline,
  message,
  property_case_number,
  property_address,
  property_price,
  source,
  status,
  created_at,
  updated_at
)
SELECT 
  -- Try to preserve ID if it exists, otherwise generate new
  COALESCE(
    (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='id') 
     THEN id ELSE NULL END),
    gen_random_uuid()
  ),
  
  -- Name fields - try common variations
  COALESCE(
    (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='first_name') 
     THEN first_name ELSE NULL END),
    SPLIT_PART(
      COALESCE(
        (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='name') 
         THEN name ELSE NULL END),
        (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='customer_name') 
         THEN customer_name ELSE 'Unknown' END)
      ), ' ', 1
    )
  ),
  
  COALESCE(
    (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='last_name') 
     THEN last_name ELSE NULL END),
    SPLIT_PART(
      COALESCE(
        (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='name') 
         THEN name ELSE NULL END),
        (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='customer_name') 
         THEN customer_name ELSE 'Unknown' END)
      ), ' ', 2
    )
  ),
  
  -- Email
  COALESCE(
    (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='email') 
     THEN email ELSE NULL END),
    (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='customer_email') 
     THEN customer_email ELSE NULL END)
  ),
  
  -- Phone
  COALESCE(
    (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='phone') 
     THEN phone ELSE NULL END),
    (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='customer_phone') 
     THEN customer_phone ELSE NULL END)
  ),
  
  -- State
  COALESCE(
    (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='state') 
     THEN state ELSE NULL END),
    (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='preferred_state') 
     THEN preferred_state ELSE NULL END)
  ),
  
  -- Budget fields
  (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='budget_min') 
   THEN budget_min ELSE NULL END),
  (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='budget_max') 
   THEN budget_max ELSE NULL END),
  
  -- Timeline
  (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='timeline') 
   THEN timeline ELSE NULL END),
  
  -- Message
  COALESCE(
    (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='message') 
     THEN message ELSE NULL END),
    (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='notes') 
     THEN notes ELSE NULL END)
  ),
  
  -- Property fields
  (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='property_case_number') 
   THEN property_case_number ELSE NULL END),
  (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='property_address') 
   THEN property_address ELSE NULL END),
  (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='property_price') 
   THEN property_price ELSE NULL END),
  
  -- Source
  COALESCE(
    (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='source') 
     THEN source ELSE NULL END),
    (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='lead_source') 
     THEN lead_source ELSE 'migrated' END)
  ),
  
  -- Status - map old statuses to new ones
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='status') THEN
      CASE status
        WHEN 'new' THEN 'new_lead'
        WHEN 'contacted' THEN 'contacted'
        WHEN 'qualified' THEN 'under_review'
        WHEN 'converted' THEN 'onboarded'
        ELSE 'new_lead'
      END
    ELSE 'new_lead'
  END,
  
  -- Timestamps
  COALESCE(
    (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='created_at') 
     THEN created_at ELSE NOW() END)
  ),
  COALESCE(
    (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads_backup' AND column_name='updated_at') 
     THEN updated_at ELSE NOW() END)
  )
FROM leads_backup;

-- Verify migration
SELECT COUNT(*) as migrated_leads FROM leads;

-- ============================================
-- STEP 5: Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_state ON leads(state);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_customer_id ON leads(customer_id);

-- ============================================
-- STEP 6: Create other tables
-- ============================================

-- Lead Events Table
CREATE TABLE IF NOT EXISTS lead_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES agents(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id ON lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_type ON lead_events(event_type);
CREATE INDEX IF NOT EXISTS idx_lead_events_created_at ON lead_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_events_created_by ON lead_events(created_by);

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  merge_fields JSONB DEFAULT '[]'::jsonb,
  video_url VARCHAR(500),
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_email_templates_primary ON email_templates(is_primary);

-- Onboarding Consents Table
CREATE TABLE IF NOT EXISTS onboarding_consents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  consent_type VARCHAR(100) NOT NULL,
  consent_text TEXT NOT NULL,
  agreed BOOLEAN DEFAULT FALSE,
  signature_data TEXT,
  signature_method VARCHAR(50),
  ip_address VARCHAR(45),
  user_agent TEXT,
  agreed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consents_customer_id ON onboarding_consents(customer_id);
CREATE INDEX IF NOT EXISTS idx_consents_type ON onboarding_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_consents_agreed ON onboarding_consents(agreed);

-- ============================================
-- STEP 7: Update existing tables
-- ============================================

-- Update customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS preferred_states JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_cities TEXT,
  ADD COLUMN IF NOT EXISTS budget_min DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS budget_max DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS bedrooms_min INTEGER,
  ADD COLUMN IF NOT EXISTS bathrooms_min DECIMAL(3, 1),
  ADD COLUMN IF NOT EXISTS property_type_preferences JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS must_have_features JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS timeline VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pre_qualified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lender_info TEXT,
  ADD COLUMN IF NOT EXISTS first_time_buyer BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS needs_financing BOOLEAN DEFAULT TRUE;

-- Update referrals table
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_binding BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consents_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS buyer_agency_signed BOOLEAN DEFAULT FALSE;

-- ============================================
-- STEP 8: Seed email templates
-- ============================================

INSERT INTO email_templates (name, description, subject, body, merge_fields, is_primary, video_url)
VALUES (
  'Send Opt-In Request',
  'Primary onboarding email with video explaining the process',
  'Welcome to USAHUDhomes.com - Start Your Home Buying Journey',
  '<html><body>
<p>Hi {{first_name}},</p>
<p>Thank you for your interest in finding your perfect HUD home!</p>
<p>We''d love to help you through the home buying process. Before we can connect you with one of our licensed real estate agents, please watch this short video to understand how we work:</p>
<div style="text-align: center; margin: 30px 0;">
  <video width="560" height="315" controls>
    <source src="{{video_url}}" type="video/mp4">
  </video>
</div>
<p>Ready to get started? Click below to begin your onboarding:</p>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{opt_in_link}}" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Start My Journey →</a>
</div>
<p>Questions? Call us at (910) 363-6147 or reply to this email.</p>
<p>Best regards,<br>Lightkeeper Realty Team</p>
</body></html>',
  '["first_name", "video_url", "opt_in_link"]'::jsonb,
  TRUE,
  'https://example.com/onboarding-video.mp4'
)
ON CONFLICT DO NOTHING;

INSERT INTO email_templates (name, description, subject, body, merge_fields)
VALUES (
  'Request More Information',
  'Ask lead for additional details about their home search',
  'We''d love to learn more about your home search',
  '<html><body>
<p>Hi {{first_name}},</p>
<p>Thanks for reaching out! To better assist you, could you provide a bit more information about what you''re looking for?</p>
<ul>
  <li>What''s your budget range?</li>
  <li>Which areas are you interested in?</li>
  <li>When are you looking to purchase?</li>
  <li>Any specific features you need?</li>
</ul>
<p>Reply to this email or give us a call at (910) 363-6147.</p>
<p>Looking forward to helping you!</p>
<p>Best,<br>Lightkeeper Realty Team</p>
</body></html>',
  '["first_name"]'::jsonb
)
ON CONFLICT DO NOTHING;

INSERT INTO email_templates (name, description, subject, body, merge_fields)
VALUES (
  'Schedule Phone Call',
  'Invite lead to schedule a call',
  'Let''s schedule a call to discuss your home search',
  '<html><body>
<p>Hi {{first_name}},</p>
<p>I''d love to chat with you about your home buying goals!</p>
<p>When would be a good time for a quick 15-minute call?</p>
<p>You can:</p>
<ul>
  <li>Reply with your availability</li>
  <li>Call me directly at (910) 363-6147</li>
</ul>
<p>Talk soon!</p>
<p>Best,<br>Lightkeeper Realty Team</p>
</body></html>',
  '["first_name"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 9: Create initial events for migrated leads
-- ============================================

INSERT INTO lead_events (lead_id, event_type, event_data, created_at)
SELECT 
  id,
  'lead_received',
  jsonb_build_object('note', 'Migrated from previous system', 'source', source),
  created_at
FROM leads;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
SELECT 
  (SELECT COUNT(*) FROM leads_backup) as original_count,
  (SELECT COUNT(*) FROM leads) as migrated_count,
  (SELECT COUNT(*) FROM lead_events) as events_created,
  (SELECT COUNT(*) FROM email_templates) as templates_created,
  'Migration completed successfully!' as status;
