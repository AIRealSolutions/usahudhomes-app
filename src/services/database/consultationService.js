/**
 * Consultation & Lead Database Service
 * Handles consultations and leads database operations with Supabase
 */

import { supabase, TABLES, formatSupabaseResponse } from '../../config/supabase'

class ConsultationService {
  /**
   * Get all consultations
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} List of consultations
   */
  async getAllConsultations(filters = {}) {
    try {
      let query = supabase
        .from(TABLES.CONSULTATIONS)
        .select(`
          *,
          customer:customers(*),
          property:properties(*),
          agent:agents(*)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.customerId) {
        query = query.eq('customer_id', filters.customerId)
      }
      if (filters.propertyId) {
        query = query.eq('property_id', filters.propertyId)
      }

      const { data, error } = await query

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching consultations:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  /**
   * Get consultation by ID
   * @param {string} id - Consultation UUID
   * @returns {Promise<Object>} Consultation details
   */
  async getConsultationById(id) {
    try {
      const { data, error } = await supabase
        .from(TABLES.CONSULTATIONS)
        .select(`
          *,
          customer:customers(*),
          property:properties(*),
          agent:agents(*)
        `)
        .eq('id', id)
        .single()

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching consultation:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Add new consultation
   * @param {Object} consultationData - Consultation information
   * @returns {Promise<Object>} Created consultation
   */
  async addConsultation(consultationData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.CONSULTATIONS)
        .insert([{
          customer_id: consultationData.customerId,
          property_id: consultationData.propertyId,
          agent_id: consultationData.agentId,
          case_number: consultationData.caseNumber,
          consultation_type: consultationData.consultationType || 'property_inquiry',
          status: consultationData.status || 'pending',
          scheduled_date: consultationData.scheduledDate,
          notes: consultationData.notes,
          customer_name: consultationData.customerName,
          customer_email: consultationData.customerEmail,
          customer_phone: consultationData.customerPhone,
          message: consultationData.message
        }])
        .select()

      if (error) {
        console.error('Supabase insert error:', error)
        return { success: false, error: error.message, data: null }
      }

      return { success: true, data: data && data.length > 0 ? data[0] : null }
    } catch (error) {
      console.error('Error adding consultation:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Update consultation
   * @param {string} id - Consultation ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated consultation
   */
  async updateConsultation(id, updates) {
    try {
      const updateData = {}
      
      if (updates.status) updateData.status = updates.status
      if (updates.scheduledDate) updateData.scheduled_date = updates.scheduledDate
      if (updates.notes) updateData.notes = updates.notes
      if (updates.agentId) updateData.agent_id = updates.agentId

      const { data, error } = await supabase
        .from(TABLES.CONSULTATIONS)
        .update(updateData)
        .eq('id', id)
        .select()

      if (error) {
        console.error('Supabase update error:', error)
        return { success: false, error: error.message, data: null }
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'Consultation not found', data: null }
      }

      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error updating consultation:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Delete consultation (soft delete)
   * @param {string} id - Consultation ID
   * @returns {Promise<Object>} Result
   */
  async deleteConsultation(id) {
    try {
      const { data, error } = await supabase
        .from(TABLES.CONSULTATIONS)
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()

      if (error) {
        console.error('Supabase soft delete error:', error)
        return { success: false, error: error.message, data: null }
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'Consultation not found', data: null }
      }

      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error soft deleting consultation:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Restore deleted consultation
   * @param {string} id - Consultation ID
   * @returns {Promise<Object>} Result
   */
  async restoreConsultation(id) {
    try {
      const { data, error } = await supabase
        .from(TABLES.CONSULTATIONS)
        .update({
          is_deleted: false,
          deleted_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()

      if (error) {
        console.error('Supabase restore error:', error)
        return { success: false, error: error.message, data: null }
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'Consultation not found', data: null }
      }

      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error restoring consultation:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Get deleted consultations (for admin audit)
   * @returns {Promise<Array>} List of deleted consultations
   */
  async getDeletedConsultations() {
    try {
      const { data, error } = await supabase
        .from(TABLES.CONSULTATIONS)
        .select(`
          *,
          customer:customers(*),
          property:properties(*),
          agent:agents(*)
        `)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false })

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching deleted consultations:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  /**
   * Get consultation statistics
   * @returns {Promise<Object>} Statistics
   */
  async getConsultationStats() {
    try {
      const { data, error } = await supabase
        .from(TABLES.CONSULTATIONS)
        .select('status')

      if (error) throw error

      const stats = {
        total: data.length,
        pending: data.filter(c => c.status === 'pending').length,
        scheduled: data.filter(c => c.status === 'scheduled').length,
        completed: data.filter(c => c.status === 'completed').length,
        cancelled: data.filter(c => c.status === 'cancelled').length
      }

      return { success: true, data: stats }
    } catch (error) {
      console.error('Error getting consultation stats:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  // ============================================
  // LEADS MANAGEMENT
  // ============================================

  /**
   * Get all leads
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} List of leads
   */
  async getAllLeads(filters = {}) {
    try {
      let query = supabase
        .from(TABLES.LEADS)
        .select(`
          *,
          customer:customers(*),
          property:properties(*),
          agent:agents(*)
        `)
        .order('created_at', { ascending: false })

      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority)
      }
      if (filters.customerId) {
        query = query.eq('customer_id', filters.customerId)
      }

      const { data, error } = await query

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching leads:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  /**
   * Add new lead
   * @param {Object} leadData - Lead information
   * @returns {Promise<Object>} Created lead
   */
  async addLead(leadData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.LEADS)
        .insert([{
          customer_id: leadData.customerId,
          property_id: leadData.propertyId,
          agent_id: leadData.agentId,
          status: leadData.status || 'new',
          priority: leadData.priority || 'medium',
          source: leadData.source,
          notes: leadData.notes,
          follow_up_date: leadData.followUpDate
        }])
        .select()
        .single()

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error adding lead:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Update lead
   * @param {string} id - Lead ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated lead
   */
  async updateLead(id, updates) {
    try {
      const updateData = {}
      
      if (updates.status) updateData.status = updates.status
      if (updates.priority) updateData.priority = updates.priority
      if (updates.notes) updateData.notes = updates.notes
      if (updates.followUpDate) updateData.follow_up_date = updates.followUpDate
      if (updates.agentId) updateData.agent_id = updates.agentId

      const { data, error } = await supabase
        .from(TABLES.LEADS)
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error updating lead:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Delete lead
   * @param {string} id - Lead ID
   * @returns {Promise<Object>} Result
   */
  async deleteLead(id) {
    try {
      const { data, error } = await supabase
        .from(TABLES.LEADS)
        .delete()
        .eq('id', id)
        .select()
        .single()

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error deleting lead:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Get lead statistics
   * @returns {Promise<Object>} Statistics
   */
  async getLeadStats() {
    try {
      const { data, error } = await supabase
        .from(TABLES.LEADS)
        .select('status, priority')

      if (error) throw error

      const stats = {
        total: data.length,
        new: data.filter(l => l.status === 'new').length,
        contacted: data.filter(l => l.status === 'contacted').length,
        qualified: data.filter(l => l.status === 'qualified').length,
        converted: data.filter(l => l.status === 'converted').length,
        highPriority: data.filter(l => l.priority === 'high').length
      }

      return { success: true, data: stats }
    } catch (error) {
      console.error('Error getting lead stats:', error)
      return { success: false, error: error.message, data: null }
    }
  }
}

// Export singleton instance
export const consultationService = new ConsultationService()
export default consultationService

  /**
   * Get consultations for a specific broker
   * @param {string} brokerId - Broker UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} List of consultations
   */
  async getBrokerConsultations(brokerId, filters = {}) {
    try {
      let query = supabase
        .from(TABLES.CONSULTATIONS)
        .select(`
          *,
          customer:customers(*),
          property:properties(*)
        `)
        .eq('assigned_broker_id', brokerId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      const { data, error } = await query

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching broker consultations:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  /**
   * Get pending referrals for a broker
   * @param {string} brokerId - Broker UUID
   * @returns {Promise<Array>} List of pending referrals
   */
  async getPendingReferrals(brokerId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.CONSULTATIONS)
        .select(`
          *,
          customer:customers(*),
          property:properties(*)
        `)
        .eq('assigned_broker_id', brokerId)
        .eq('status', 'referred')
        .eq('is_deleted', false)
        .order('referred_at', { ascending: true })

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching pending referrals:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  /**
   * Assign consultation to broker
   * @param {string} consultationId - Consultation UUID
   * @param {string} brokerId - Broker UUID
   * @param {number} expiresHours - Hours until referral expires (default 24)
   * @returns {Promise<Object>} Result
   */
  async assignToBroker(consultationId, brokerId, expiresHours = 24) {
    try {
      const { data, error } = await supabase.rpc('assign_consultation_to_broker', {
        p_consultation_id: consultationId,
        p_broker_id: brokerId,
        p_expires_hours: expiresHours
      })

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error assigning consultation to broker:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Accept referral
   * @param {string} consultationId - Consultation UUID
   * @param {string} brokerId - Broker UUID
   * @param {string} notes - Optional notes
   * @returns {Promise<Object>} Result
   */
  async acceptReferral(consultationId, brokerId, notes = null) {
    try {
      const { data, error } = await supabase.rpc('accept_referral', {
        p_consultation_id: consultationId,
        p_broker_id: brokerId,
        p_notes: notes
      })

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error accepting referral:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Decline referral
   * @param {string} consultationId - Consultation UUID
   * @param {string} brokerId - Broker UUID
   * @param {string} reason - Decline reason
   * @param {string} notes - Optional notes
   * @returns {Promise<Object>} Result
   */
  async declineReferral(consultationId, brokerId, reason, notes = null) {
    try {
      const { data, error} = await supabase.rpc('decline_referral', {
        p_consultation_id: consultationId,
        p_broker_id: brokerId,
        p_reason: reason,
        p_notes: notes
      })

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error declining referral:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Log communication activity
   * @param {string} consultationId - Consultation UUID
   * @param {string} brokerId - Broker UUID
   * @param {string} activityType - Type of activity
   * @param {Object} activityData - Additional activity data
   * @returns {Promise<Object>} Result
   */
  async logCommunication(consultationId, brokerId, activityType, activityData = {}) {
    try {
      const { data, error } = await supabase.rpc('log_communication', {
        p_consultation_id: consultationId,
        p_broker_id: brokerId,
        p_activity_type: activityType,
        p_activity_data: activityData
      })

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error logging communication:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get activity history for a consultation
   * @param {string} consultationId - Consultation UUID
   * @returns {Promise<Array>} Activity history
   */
  async getActivityHistory(consultationId) {
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select(`
          *,
          broker:profiles(first_name, last_name, email)
        `)
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: false })

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching activity history:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  /**
   * Get broker statistics
   * @param {string} brokerId - Broker UUID
   * @returns {Promise<Object>} Broker stats
   */
  async getBrokerStats(brokerId) {
    try {
      const { data, error } = await supabase
        .from('broker_stats')
        .select('*')
        .eq('broker_id', brokerId)
        .single()

      if (error) throw error

      return { success: true, data: data || {} }
    } catch (error) {
      console.error('Error fetching broker stats:', error)
      return { success: false, error: error.message, data: {} }
    }
  }

  /**
   * Update consultation status
   * @param {string} consultationId - Consultation UUID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional data to update
   * @returns {Promise<Object>} Result
   */
  async updateStatus(consultationId, status, additionalData = {}) {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
        ...additionalData
      }

      const { data, error } = await supabase
        .from(TABLES.CONSULTATIONS)
        .update(updateData)
        .eq('id', consultationId)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        return { success: false, error: 'Consultation not found' }
      }

      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error updating consultation status:', error)
      return { success: false, error: error.message }
    }
  }
}

export const consultationService = new ConsultationService()
export default consultationService
