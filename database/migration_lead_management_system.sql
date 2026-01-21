-- ============================================
-- LEAD MANAGEMENT SYSTEM - Complete Database Schema
-- Purpose: Implement proper lead-to-customer-to-referral workflow
-- Date: January 20, 2026
-- ============================================

-- ============================================
-- 1. LEADS TABLE
-- Stores all incoming leads before onboarding
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
  source VARCHAR(100) NOT NULL, -- website, property_inquiry, facebook, manual
  status VARCHAR(50) DEFAULT 'new_lead', -- new_lead, under_review, contacted, opt_in_sent, opted_in, onboarding, onboarded, opted_out, archived
  ip_address VARCHAR(45),
  
  -- Conversion Tracking
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL, -- Set when lead becomes customer
  converted_at TIMESTAMP, -- When lead completed onboarding
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for leads table
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_state ON leads(state);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_customer_id ON leads(customer_id);

-- Comments
COMMENT ON TABLE leads IS 'Stores all incoming leads before they complete onboarding';
COMMENT ON COLUMN leads.status IS 'Lead status: new_lead, under_review, contacted, opt_in_sent, opted_in, onboarding, onboarded, opted_out, archived';
COMMENT ON COLUMN leads.source IS 'Where the lead came from: website, property_inquiry, facebook, manual';
COMMENT ON COLUMN leads.customer_id IS 'Links to customer record once lead completes onboarding';

-- ============================================
-- 2. LEAD_EVENTS TABLE
-- Tracks all interactions and communications with leads
-- ============================================
CREATE TABLE IF NOT EXISTS lead_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  
  -- Event Details
  event_type VARCHAR(50) NOT NULL, -- lead_received, call_made, text_sent, email_sent, note_added, status_changed, email_opened, link_clicked, video_viewed
  event_data JSONB DEFAULT '{}'::jsonb, -- Flexible storage for event-specific data
  
  -- Who performed the action
  created_by UUID REFERENCES agents(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for lead_events table
CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id ON lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_type ON lead_events(event_type);
CREATE INDEX IF NOT EXISTS idx_lead_events_created_at ON lead_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_events_created_by ON lead_events(created_by);

-- Comments
COMMENT ON TABLE lead_events IS 'Logs all interactions and communications with leads';
COMMENT ON COLUMN lead_events.event_type IS 'Type of event: lead_received, call_made, text_sent, email_sent, note_added, status_changed, etc.';
COMMENT ON COLUMN lead_events.event_data IS 'JSON object containing event-specific data (email subject, note text, status change, etc.)';

-- ============================================
-- 3. EMAIL_TEMPLATES TABLE
-- Stores preset email templates for lead communication
-- ============================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Template Details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL, -- HTML email body
  
  -- Template Configuration
  merge_fields JSONB DEFAULT '[]'::jsonb, -- Array of available merge fields
  video_url VARCHAR(500), -- Optional video to embed
  is_primary BOOLEAN DEFAULT FALSE, -- Is this the main opt-in template?
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for email_templates table
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_email_templates_primary ON email_templates(is_primary);

-- Comments
COMMENT ON TABLE email_templates IS 'Preset email templates for communicating with leads';
COMMENT ON COLUMN email_templates.merge_fields IS 'Array of merge field names available in this template (e.g., ["first_name", "opt_in_link"])';
COMMENT ON COLUMN email_templates.is_primary IS 'If true, this is the main opt-in request template';

-- ============================================
-- 4. ONBOARDING_CONSENTS TABLE
-- Tracks all consents given during customer onboarding
-- ============================================
CREATE TABLE IF NOT EXISTS onboarding_consents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Consent Details
  consent_type VARCHAR(100) NOT NULL, -- data_sharing, communication, buyer_agency
  consent_text TEXT NOT NULL, -- Full text of what they agreed to
  agreed BOOLEAN DEFAULT FALSE,
  
  -- Digital Signature (for buyer agency agreement)
  signature_data TEXT, -- Base64 encoded signature image or typed name
  signature_method VARCHAR(50), -- typed, drawn, uploaded
  
  -- Tracking
  ip_address VARCHAR(45),
  user_agent TEXT,
  agreed_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for onboarding_consents table
CREATE INDEX IF NOT EXISTS idx_consents_customer_id ON onboarding_consents(customer_id);
CREATE INDEX IF NOT EXISTS idx_consents_type ON onboarding_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_consents_agreed ON onboarding_consents(agreed);

-- Comments
COMMENT ON TABLE onboarding_consents IS 'Tracks all consents given during customer onboarding process';
COMMENT ON COLUMN onboarding_consents.consent_type IS 'Type of consent: data_sharing, communication, buyer_agency';
COMMENT ON COLUMN onboarding_consents.signature_data IS 'Digital signature for buyer agency agreement (base64 encoded image or typed name)';

-- ============================================
-- 5. UPDATE CUSTOMERS TABLE
-- Add onboarding-related fields
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

-- Comments for new customer fields
COMMENT ON COLUMN customers.onboarding_completed IS 'Whether customer has completed full onboarding process';
COMMENT ON COLUMN customers.preferred_states IS 'Array of state codes customer is interested in';
COMMENT ON COLUMN customers.property_type_preferences IS 'Array of property types (Single Family, Condo, Townhouse, etc.)';
COMMENT ON COLUMN customers.must_have_features IS 'Array of required features (garage, pool, etc.)';

-- ============================================
-- 6. UPDATE REFERRALS TABLE
-- Add binding agreement and customer link
-- ============================================
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_binding BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consents_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS buyer_agency_signed BOOLEAN DEFAULT FALSE;

-- Comments for new referral fields
COMMENT ON COLUMN referrals.customer_id IS 'Links to fully onboarded customer (required for referral creation)';
COMMENT ON COLUMN referrals.is_binding IS 'If true, this is a binding referral - broker commits to customer';
COMMENT ON COLUMN referrals.consents_verified IS 'Admin verified all consents are in place';
COMMENT ON COLUMN referrals.buyer_agency_signed IS 'Customer signed buyer agency agreement';

-- ============================================
-- 7. SEED DEFAULT EMAIL TEMPLATES
-- ============================================

-- Template 1: Opt-In Request (Primary)
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
  'https://example.com/onboarding-video.mp4' -- Replace with actual video URL
);

-- Template 2: Request More Information
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

-- Template 3: Schedule Phone Call
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
-- MIGRATION COMPLETE
-- ============================================
SELECT 'Lead Management System migration completed successfully' AS result;
