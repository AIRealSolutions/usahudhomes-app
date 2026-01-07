-- Migration: Fix customer_events agent_id foreign key constraint
-- Date: January 7, 2026
-- Purpose: Make agent_id nullable to allow event logging without requiring valid agent

-- Step 1: Drop the existing foreign key constraint if it exists
ALTER TABLE IF EXISTS customer_events 
DROP CONSTRAINT IF EXISTS customer_events_agent_id_fkey;

-- Step 2: Modify agent_id column to allow NULL values
ALTER TABLE IF EXISTS customer_events 
ALTER COLUMN agent_id DROP NOT NULL;

-- Step 3: Re-add the foreign key constraint with ON DELETE SET NULL
-- This allows events to be logged even if agent_id is null
-- and sets agent_id to null if the agent is deleted
ALTER TABLE IF EXISTS customer_events
ADD CONSTRAINT customer_events_agent_id_fkey 
FOREIGN KEY (agent_id) 
REFERENCES agents(id) 
ON DELETE SET NULL;

-- Step 4: Create an index on agent_id for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_events_agent_id 
ON customer_events(agent_id) 
WHERE agent_id IS NOT NULL;

-- Verification query (optional - comment out in production)
-- SELECT 
--   column_name, 
--   is_nullable, 
--   data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'customer_events' 
-- AND column_name = 'agent_id';
