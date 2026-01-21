-- ============================================
-- LEAD MANAGEMENT SYSTEM - Simple Migration with Data Merge
-- Purpose: Drop old leads view, create new leads table, migrate existing data
-- Date: January 20, 2026
-- ============================================

-- ============================================
-- STEP 1: Inspect the existing leads view structure
-- ============================================
-- Run this first to see what columns exist:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' 
ORDER BY ordinal_position;

-- ============================================
-- STEP 2: Backup existing leads view data
-- ============================================
CREATE TEMP TABLE leads_backup AS 
SELECT * FROM leads;

-- Count records for verification
SELECT COUNT(*) as backed_up_leads FROM leads_backup;

-- ============================================
-- STEP 3: Drop the existing leads view
-- ============================================
DROP VIEW IF EXISTS leads CASCADE;

-- ============================================
-- STEP 4: Create new leads table
-- ============================================
CREATE TABLE leads (
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
  source VARCHAR(100) NOT NULL DEFAULT 'migrated',
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
-- STEP 5: Migrate data from backup
-- IMPORTANT: Adjust this INSERT based on the column structure you saw in STEP 1
-- ============================================

-- Option A: If backup has similar structure (first_name, last_name, email, etc.)
-- Uncomment and adjust as needed:
/*
INSERT INTO leads (
  first_name,
  last_name,
  email,
  phone,
  state,
  budget_min,
  budget_max,
  timeline,
  message,
  source,
  status,
  created_at
)
SELECT 
  first_name,
  last_name,
  email,
  phone,
  state,
  budget_min,
  budget_max,
  timeline,
  message,
  COALESCE(source, 'migrated'),
  COALESCE(status, 'new_lead'),
  COALESCE(created_at, NOW())
FROM leads_backup;
*/

-- Option B: If backup has customer_name instead of first/last name
-- Uncomment and adjust as needed:
/*
INSERT INTO leads (
  first_name,
  last_name,
  email,
  phone,
  state,
  message,
  source,
  status,
  created_at
)
SELECT 
  SPLIT_PART(customer_name, ' ', 1) as first_name,
  SUBSTRING(customer_name FROM POSITION(' ' IN customer_name) + 1) as last_name,
  customer_email,
  customer_phone,
  state,
  message,
  COALESCE(source, 'migrated'),
  'new_lead',
  COALESCE(created_at, NOW())
FROM leads_backup;
*/

-- Option C: If backup is from consultations table
-- Uncomment and adjust as needed:
/*
INSERT INTO leads (
  first_name,
  last_name,
  email,
  phone,
  state,
  message,
  source,
  status,
  created_at
)
SELECT 
  COALESCE(first_name, SPLIT_PART(customer_name, ' ', 1)),
  COALESCE(last_name, SUBSTRING(customer_name FROM POSITION(' ' IN customer_name) + 1)),
  COALESCE(email, customer_email),
  COALESCE(phone, customer_phone),
  state,
  COALESCE(message, notes),
  COALESCE(source, 'migrated'),
  CASE status
    WHEN 'pending' THEN 'new_lead'
    WHEN 'active' THEN 'contacted'
    WHEN 'completed' THEN 'onboarded'
    ELSE 'new_lead'
  END,
  created_at
FROM leads_backup
WHERE status != 'completed'; -- Don't migrate completed consultations
*/

-- Verify migration (uncomment after running appropriate INSERT above)
-- SELECT COUNT(*) as migrated_leads FROM leads;

-- ============================================
-- STEP 6: Create indexes
-- ============================================
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_state ON leads(state);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_customer_id ON leads(customer_id);

-- ============================================
-- STEP 7: Create lead_events table
-- ============================================
CREATE TABLE lead_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES agents(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lead_events_lead_id ON lead_events(lead_id);
CREATE INDEX idx_lead_events_type ON lead_events(event_type);
CREATE INDEX idx_lead_events_created_at ON lead_events(created_at DESC);
CREATE INDEX idx_lead_events_created_by ON lead_events(created_by);

-- ============================================
-- STEP 8: Create email_templates table
-- ============================================
CREATE TABLE email_templates (
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

CREATE INDEX idx_email_templates_active ON email_templates(is_active);
CREATE INDEX idx_email_templates_primary ON email_templates(is_primary);

-- ============================================
-- STEP 9: Create onboarding_consents table
-- ============================================
CREATE TABLE onboarding_consents (
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

CREATE INDEX idx_consents_customer_id ON onboarding_consents(customer_id);
CREATE INDEX idx_consents_type ON onboarding_consents(consent_type);
CREATE INDEX idx_consents_agreed ON onboarding_consents(agreed);

-- ============================================
-- STEP 10: Update customers table
-- ============================================
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

-- ============================================
-- STEP 11: Update referrals table
-- ============================================
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_binding BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consents_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS buyer_agency_signed BOOLEAN DEFAULT FALSE;

-- ============================================
-- STEP 12: Seed email templates
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
);

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
);

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
);

-- ============================================
-- STEP 13: Create initial events for migrated leads (if any)
-- ============================================
-- Uncomment after you've migrated data:
/*
INSERT INTO lead_events (lead_id, event_type, event_data, created_at)
SELECT 
  id,
  'lead_received',
  jsonb_build_object('note', 'Migrated from previous system', 'source', source),
  created_at
FROM leads;
*/

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
SELECT 
  'Migration structure created successfully!' as status,
  'IMPORTANT: Review STEP 1 output and uncomment appropriate INSERT in STEP 5' as next_action;
