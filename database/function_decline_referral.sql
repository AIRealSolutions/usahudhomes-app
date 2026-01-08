-- Function to decline/reject a referral
-- When a broker declines a lead, it should:
-- 1. Set status to 'rejected'
-- 2. Clear agent_id so it goes back to admin Leads tab
-- 3. Log the decline reason

CREATE OR REPLACE FUNCTION decline_referral(
  p_consultation_id UUID,
  p_broker_id UUID,
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Update consultation: set status to rejected and clear agent
  UPDATE consultations
  SET 
    status = 'rejected',
    agent_id = NULL,
    assigned_agent_id = NULL,
    updated_at = NOW()
  WHERE id = p_consultation_id
    AND agent_id = p_broker_id;  -- Only if this broker is assigned
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consultation not found or not assigned to this broker';
  END IF;
  
  -- Log the decline in customer_events (if table exists)
  BEGIN
    INSERT INTO customer_events (
      customer_id,
      event_type,
      event_data,
      created_at
    )
    SELECT 
      customer_id,
      'referral_declined',
      jsonb_build_object(
        'consultation_id', p_consultation_id,
        'broker_id', p_broker_id,
        'reason', p_reason,
        'notes', p_notes,
        'declined_at', NOW()
      ),
      NOW()
    FROM consultations
    WHERE id = p_consultation_id
      AND customer_id IS NOT NULL;
  EXCEPTION
    WHEN undefined_table THEN
      -- customer_events table doesn't exist, skip logging
      NULL;
  END;
  
  -- Return success
  v_result := json_build_object(
    'success', true,
    'message', 'Referral declined successfully'
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION decline_referral(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_referral(UUID, UUID, TEXT, TEXT) TO anon;
