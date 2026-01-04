/**
 * Vercel Serverless Function: Referral Workflow API
 * Handles referral assignment, acceptance, and management
 */

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  try {
    // Get Supabase credentials
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { action, consultationId, agentId, reason, notes, outcome } = req.body

    switch (action) {
      case 'assign':
        return await assignConsultation(supabase, res, consultationId, agentId)
      
      case 'accept':
        return await acceptReferral(supabase, res, consultationId, agentId)
      
      case 'decline':
        return await declineReferral(supabase, res, consultationId, agentId, reason, notes)
      
      case 'update_outcome':
        return await updateOutcome(supabase, res, consultationId, outcome, notes)
      
      case 'get_agent_referrals':
        return await getAgentReferrals(supabase, res, agentId)
      
      case 'process_expired':
        return await processExpired(supabase, res)
      
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }

  } catch (error) {
    console.error('Error in referral API:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}

async function assignConsultation(supabase, res, consultationId, agentId) {
  try {
    // If no agent specified, auto-assign
    if (!agentId) {
      // Get consultation details
      const { data: consultation } = await supabase
        .from('consultations')
        .select('*, properties(state)')
        .eq('id', consultationId)
        .single()

      if (!consultation) {
        return res.status(404).json({ error: 'Consultation not found' })
      }

      // Find available agent for the state
      const state = consultation.properties?.state || consultation.state
      const { data: agents } = await supabase
        .from('agents')
        .select('*')
        .eq('is_active', true)
        .contains('states_covered', [state])
        .limit(1)

      if (!agents || agents.length === 0) {
        return res.status(404).json({ error: 'No available agents found' })
      }

      agentId = agents[0].id
    }

    // Update consultation
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('consultations')
      .update({
        assigned_broker_id: agentId,
        assigned_at: now,
        referral_expires_at: expiresAt,
        status: 'referred'
      })
      .eq('id', consultationId)
      .select('*, agents(*)')
      .single()

    if (error) throw error

    // Log activity
    await supabase.from('activities').insert([{
      consultation_id: consultationId,
      agent_id: agentId,
      activity_type: 'referral_assigned',
      description: 'Referral assigned'
    }])

    return res.status(200).json({ success: true, data })

  } catch (error) {
    console.error('Error assigning consultation:', error)
    return res.status(500).json({ error: error.message })
  }
}

async function acceptReferral(supabase, res, consultationId, agentId) {
  try {
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('consultations')
      .update({
        accepted_at: now,
        status: 'accepted'
      })
      .eq('id', consultationId)
      .eq('assigned_broker_id', agentId)
      .select()
      .single()

    if (error) throw error

    // Log activity
    await supabase.from('activities').insert([{
      consultation_id: consultationId,
      agent_id: agentId,
      activity_type: 'referral_accepted',
      description: 'Referral accepted'
    }])

    return res.status(200).json({ success: true, data })

  } catch (error) {
    console.error('Error accepting referral:', error)
    return res.status(500).json({ error: error.message })
  }
}

async function declineReferral(supabase, res, consultationId, agentId, reason, notes) {
  try {
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('consultations')
      .update({
        declined_at: now,
        decline_reason: reason,
        decline_notes: notes,
        status: 'declined'
      })
      .eq('id', consultationId)
      .eq('assigned_broker_id', agentId)
      .select()
      .single()

    if (error) throw error

    // Log activity
    await supabase.from('activities').insert([{
      consultation_id: consultationId,
      agent_id: agentId,
      activity_type: 'referral_declined',
      description: 'Referral declined',
      metadata: { reason, notes }
    }])

    return res.status(200).json({ success: true, data })

  } catch (error) {
    console.error('Error declining referral:', error)
    return res.status(500).json({ error: error.message })
  }
}

async function updateOutcome(supabase, res, consultationId, outcome, notes) {
  try {
    const { data, error } = await supabase
      .from('consultations')
      .update({
        outcome: outcome,
        outcome_notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', consultationId)
      .select()
      .single()

    if (error) throw error

    return res.status(200).json({ success: true, data })

  } catch (error) {
    console.error('Error updating outcome:', error)
    return res.status(500).json({ error: error.message })
  }
}

async function getAgentReferrals(supabase, res, agentId) {
  try {
    const { data, error } = await supabase
      .from('consultations')
      .select('*, customers(*), properties(*)')
      .eq('assigned_broker_id', agentId)
      .order('assigned_at', { ascending: false })

    if (error) throw error

    return res.status(200).json({ success: true, data })

  } catch (error) {
    console.error('Error fetching agent referrals:', error)
    return res.status(500).json({ error: error.message })
  }
}

async function processExpired(supabase, res) {
  try {
    const now = new Date().toISOString()

    // Find expired referrals
    const { data: expiredReferrals, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('status', 'referred')
      .lt('referral_expires_at', now)
      .is('accepted_at', null)

    if (error) throw error

    if (!expiredReferrals || expiredReferrals.length === 0) {
      return res.status(200).json({
        success: true,
        data: { expired: 0, reassigned: 0 }
      })
    }

    // Mark as expired
    for (const consultation of expiredReferrals) {
      await supabase
        .from('consultations')
        .update({
          expired_at: now,
          status: 'expired'
        })
        .eq('id', consultation.id)

      // Log activity
      await supabase.from('activities').insert([{
        consultation_id: consultation.id,
        agent_id: consultation.assigned_broker_id,
        activity_type: 'referral_expired',
        description: 'Referral expired'
      }])
    }

    return res.status(200).json({
      success: true,
      data: {
        expired: expiredReferrals.length,
        reassigned: 0
      }
    })

  } catch (error) {
    console.error('Error processing expired referrals:', error)
    return res.status(500).json({ error: error.message })
  }
}
