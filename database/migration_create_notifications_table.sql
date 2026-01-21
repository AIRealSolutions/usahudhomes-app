-- Create notifications table for broker alerts
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL,
  referral_id UUID,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_agent
    FOREIGN KEY (agent_id)
    REFERENCES agents(id)
    ON DELETE CASCADE,
    
  CONSTRAINT fk_referral
    FOREIGN KEY (referral_id)
    REFERENCES referrals(id)
    ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_agent_id ON notifications(agent_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Add comment
COMMENT ON TABLE notifications IS 'Stores notifications for brokers about new referrals and updates';
