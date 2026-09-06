-- Phase 3: Add address field to profiles and create property_requests table
-- This migration adds address-gating support for the property detail funnel

-- Add address column to profiles table (if it doesn't exist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address VARCHAR(255);

-- Create property_requests table for tracking user inquiries
CREATE TABLE IF NOT EXISTS property_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    case_number VARCHAR(50) NOT NULL,
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    list_price DECIMAL(12, 2),
    status VARCHAR(50) DEFAULT 'new',
    requested_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for property_requests
CREATE INDEX IF NOT EXISTS idx_property_requests_user ON property_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_property_requests_case_number ON property_requests(case_number);
CREATE INDEX IF NOT EXISTS idx_property_requests_status ON property_requests(status);

-- Add RLS policy for property_requests
ALTER TABLE property_requests ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own property requests
CREATE POLICY "Users can view their own property requests" ON property_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to create property requests
CREATE POLICY "Users can create property requests" ON property_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own property requests
CREATE POLICY "Users can update their own property requests" ON property_requests
    FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for property_requests updated_at
CREATE TRIGGER update_property_requests_updated_at BEFORE UPDATE ON property_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
