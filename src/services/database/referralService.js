/**
 * Referral Workflow Service
 * Handles lead assignment and referral workflow for agents
 */

import { supabase, TABLES, formatSupabaseResponse } from '../../config/supabase'
import { agentService } from './agentService'

class ReferralService {
  /**
   * Assign a consultation to an agent
   * @param {string} consultationId - Consultation UUID
   * @param {string} agentId - Agent UUID (optional, will auto-assign if not provided)
   * @returns {Promise<Object>} Updated consultation
   */
  async assignConsultationToAgent(consultationId, agentId = null) {
    try {
      // If no agent specified, auto-assign based on state
      if (!agentId) {
        // Get consultation details
        const { data: consultation } = await supabase
          .from(TABLES.CONSULTATIONS)
          .select('*, properties(state)')
          .eq('id', consultationId)
          .single()

        if (!consultation) {
          return { success: false, error: 'Consultation not found' }
        }

        // Find available agent for the state
        const state = consultation.properties?.state || consultation.state
        const agent = await this.findAvailableAgent(state)
        
        if (!agent) {
          return { success: false, error: 'No available agents found for this state' }
        }

        agentId = agent.id
      }

      // Update consultation with agent assignment
      const now = new Date().toISOString()
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours

      const { data, error } = await supabase
        .from(TABLES.CONSULTATIONS)
        .update({
          agent_id: agentId,
          assigned_at: now,
          referral_expires_at: expiresAt,
          status: 'referred'
        })
        .eq('id', consultationId)
        .select('*, agents(*)')
        .single()

      if (error) throw error

      // Log activity
      await this.logReferralActivity(consultationId, agentId, 'assigned')

      return formatSupabaseResponse(data, null)
    } catch (error) {
      console.error('Error assigning consultation:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Find available agent for a state
   * @param {string} state - State code
   * @returns {Promise<Object>} Agent
   */
  async findAvailableAgent(state) {
    try {
      // Get all active agents covering this state
      const result = await agentService.getAgentsByState(state)
      
      if (!result.success || !result.data || result.data.length === 0) {
        return null
      }

      // For now, return the first available agent
      // TODO: Implement round-robin or load balancing
      return result.data[0]
    } catch (error) {
      console.error('Error finding available agent:', error)
      return null
    }
  }

  /**
   * Agent accepts a referral
   * @param {string} consultationId - Consultation UUID
   * @param {string} agentId - Agent UUID
   * @returns {Promise<Object>} Updated consultation
   */
  async acceptReferral(consultationId, agentId) {
    try {
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from(TABLES.CONSULTATIONS)
        .update({
          accepted_at: now,
          status: 'accepted'
        })
        .eq('id', consultationId)
        .eq('agent_id', agentId)
        .select()
        .single()

      if (error) throw error

      // Log activity
      await this.logReferralActivity(consultationId, agentId, 'accepted')
      
      // Log event
      if (data && data.customer_id) {
        const { eventService } = await import('./eventService')
        const agentResult = await agentService.getAgentById(agentId)
        const agentName = agentResult.success && agentResult.data
          ? `${agentResult.data.first_name} ${agentResult.data.last_name}`
          : 'Unknown Agent'
        
        eventService.logReferralAccepted(
          data.customer_id,
          consultationId,
          agentId,
          agentName
        ).catch(err => console.error('Failed to log referral accepted event:', err))
      }

      return formatSupabaseResponse(data, null)
    } catch (error) {
      console.error('Error accepting referral:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Agent declines a referral
   * @param {string} consultationId - Consultation UUID
   * @param {string} agentId - Agent UUID
   * @param {string} reason - Decline reason
   * @param {string} notes - Optional notes
   * @returns {Promise<Object>} Updated consultation
   */
  async declineReferral(consultationId, agentId, reason, notes = null) {
    try {
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from(TABLES.CONSULTATIONS)
        .update({
          declined_at: now,
          decline_reason: reason,
          decline_notes: notes,
          status: 'declined'
        })
        .eq('id', consultationId)
        .eq('agent_id', agentId)
        .select()
        .single()

      if (error) throw error

      // Log activity
      await this.logReferralActivity(consultationId, agentId, 'declined', { reason, notes })

      // Try to reassign to another agent
      await this.reassignConsultation(consultationId)

      return formatSupabaseResponse(data, null)
    } catch (error) {
      console.error('Error declining referral:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Reassign consultation to another agent
   * @param {string} consultationId - Consultation UUID
   * @returns {Promise<Object>} Result
   */
  async reassignConsultation(consultationId) {
    try {
      // Reset assignment fields
      const { data, error } = await supabase
        .from(TABLES.CONSULTATIONS)
        .update({
          agent_id: null,
          assigned_at: null,
          referral_expires_at: null,
          status: 'pending'
        })
        .eq('id', consultationId)
        .select()
        .single()

      if (error) throw error

      // Try to auto-assign again
      return await this.assignConsultationToAgent(consultationId)
    } catch (error) {
      console.error('Error reassigning consultation:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Check for expired referrals and reassign
   * @returns {Promise<Object>} Result
   */
  async processExpiredReferrals() {
    try {
      const now = new Date().toISOString()

      // Find expired referrals that haven't been accepted
      const { data: expiredReferrals, error } = await supabase
        .from(TABLES.CONSULTATIONS)
        .select('*')
        .eq('status', 'referred')
        .lt('referral_expires_at', now)
        .is('accepted_at', null)

      if (error) throw error

      if (!expiredReferrals || expiredReferrals.length === 0) {
        return { success: true, data: { expired: 0, reassigned: 0 } }
      }

      // Mark as expired and reassign
      let reassigned = 0
      for (const consultation of expiredReferrals) {
        await supabase
          .from(TABLES.CONSULTATIONS)
          .update({
            expired_at: now,
            status: 'expired'
          })
          .eq('id', consultation.id)

        // Log activity
        await this.logReferralActivity(consultation.id, consultation.agent_id, 'expired')

        // Try to reassign
        const result = await this.reassignConsultation(consultation.id)
        if (result.success) reassigned++
      }

      return {
        success: true,
        data: {
          expired: expiredReferrals.length,
          reassigned: reassigned
        }
      }
    } catch (error) {
      console.error('Error processing expired referrals:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Get agent's assigned consultations
   * @param {string} agentId - Agent UUID
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} Consultations
   */
  async getAgentConsultations(agentId, status = null) {
    try {
      let query = supabase
        .from(TABLES.CONSULTATIONS)
        .select('*, customers(*), properties(*)')
        .eq('agent_id', agentId)
        .order('assigned_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching agent consultations:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  /**
   * Get pending referrals for an agent
   * @param {string} agentId - Agent UUID
   * @returns {Promise<Array>} Pending referrals
   */
  async getPendingReferrals(agentId) {
    return this.getAgentConsultations(agentId, 'referred')
  }

  /**
   * Get accepted consultations for an agent
   * @param {string} agentId - Agent UUID
   * @returns {Promise<Array>} Accepted consultations
   */
  async getAcceptedConsultations(agentId) {
    return this.getAgentConsultations(agentId, 'accepted')
  }

  /**
   * Update consultation outcome
   * @param {string} consultationId - Consultation UUID
   * @param {string} outcome - Outcome (e.g., 'sold', 'lost', 'in_progress')
   * @param {string} notes - Optional notes
   * @returns {Promise<Object>} Updated consultation
   */
  async updateConsultationOutcome(consultationId, outcome, notes = null) {
    try {
      const { data, error } = await supabase
        .from(TABLES.CONSULTATIONS)
        .update({
          outcome: outcome,
          outcome_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', consultationId)
        .select()
        .single()

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error updating consultation outcome:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Log referral activity
   * @param {string} consultationId - Consultation UUID
   * @param {string} agentId - Agent UUID
   * @param {string} action - Action type
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<Object>} Activity log
   */
  async logReferralActivity(consultationId, agentId, action, metadata = {}) {
    try {
      const { data, error} = await supabase
        .from(TABLES.ACTIVITIES)
        .insert([{
          consultation_id: consultationId,
          agent_id: agentId,
          activity_type: `referral_${action}`,
          description: `Referral ${action}`,
          metadata: metadata
        }])
        .select()
        .single()

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error logging activity:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Get referral statistics for an agent
   * @param {string} agentId - Agent UUID
   * @returns {Promise<Object>} Statistics
   */
  async getAgentReferralStats(agentId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.CONSULTATIONS)
        .select('status, outcome')
        .eq('agent_id', agentId)

      if (error) throw error

      const stats = {
        total: data.length,
        pending: data.filter(c => c.status === 'referred').length,
        accepted: data.filter(c => c.status === 'accepted').length,
        declined: data.filter(c => c.status === 'declined').length,
        expired: data.filter(c => c.status === 'expired').length,
        sold: data.filter(c => c.outcome === 'sold').length,
        lost: data.filter(c => c.outcome === 'lost').length,
        inProgress: data.filter(c => c.outcome === 'in_progress').length
      }

      return { success: true, data: stats }
    } catch (error) {
      console.error('Error getting agent referral stats:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Create a referral (alias for assignConsultationToAgent)
   * @param {Object} referralData - Referral data
   * @param {string} referralData.consultation_id - Consultation UUID
   * @param {string} referralData.agent_id - Agent UUID
   * @param {string} referralData.status - Referral status (optional)
   * @returns {Promise<Object>} Created referral
   */
  async createReferral({ consultation_id, agent_id, status = 'referred' }) {
    console.log('createReferral called with:', { consultation_id, agent_id, status })
    
    try {
      // Use the existing assignConsultationToAgent method
      const result = await this.assignConsultationToAgent(consultation_id, agent_id)
      console.log('assignConsultationToAgent result:', result)
      
      return result
    } catch (error) {
      console.error('Error in createReferral:', error)
      return { success: false, error: error.message, data: null }
    }
  }
}

// Export singleton instance
export const referralService = new ReferralService()
export default referralService
