/**
 * Property Request Service
 * Handles property inquiries and requests from authenticated users
 */

import { supabase } from '../config/supabase'

class PropertyRequestService {
  /**
   * Submit a property request/inquiry
   * @param {string} userId - Authenticated user ID
   * @param {Object} propertyData - Property information
   * @returns {Promise<Object>} Result with request data
   */
  async submitPropertyRequest(userId, propertyData) {
    try {
      if (!userId) {
        return { success: false, error: 'User must be authenticated', data: null }
      }

      const { caseNumber, address, city, state, listPrice } = propertyData

      if (!caseNumber) {
        return { success: false, error: 'Case number is required', data: null }
      }

      const { data, error } = await supabase
        .from('property_requests')
        .insert({
          user_id: userId,
          case_number: caseNumber,
          address,
          city,
          state,
          list_price: listPrice,
          status: 'new'
        })
        .select()
        .single()

      if (error) {
        console.error('Property request error:', error)
        return { success: false, error: error.message, data: null }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error in submitPropertyRequest:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Get all property requests for a user
   * @param {string} userId - Authenticated user ID
   * @returns {Promise<Object>} Result with array of requests
   */
  async getUserPropertyRequests(userId) {
    try {
      if (!userId) {
        return { success: false, error: 'User must be authenticated', data: null }
      }

      const { data, error } = await supabase
        .from('property_requests')
        .select('*')
        .eq('user_id', userId)
        .order('requested_at', { ascending: false })

      if (error) {
        console.error('Fetch requests error:', error)
        return { success: false, error: error.message, data: null }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error in getUserPropertyRequests:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Get a specific property request
   * @param {string} requestId - Request ID
   * @param {string} userId - Authenticated user ID (for verification)
   * @returns {Promise<Object>} Result with request data
   */
  async getPropertyRequest(requestId, userId) {
    try {
      const { data, error } = await supabase
        .from('property_requests')
        .select('*')
        .eq('id', requestId)
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Fetch request error:', error)
        return { success: false, error: error.message, data: null }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error in getPropertyRequest:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Update property request status
   * @param {string} requestId - Request ID
   * @param {string} userId - Authenticated user ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Result with updated request
   */
  async updatePropertyRequestStatus(requestId, userId, status) {
    try {
      const { data, error } = await supabase
        .from('property_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('Update request error:', error)
        return { success: false, error: error.message, data: null }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error in updatePropertyRequestStatus:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Delete a property request
   * @param {string} requestId - Request ID
   * @param {string} userId - Authenticated user ID
   * @returns {Promise<Object>} Result
   */
  async deletePropertyRequest(requestId, userId) {
    try {
      const { error } = await supabase
        .from('property_requests')
        .delete()
        .eq('id', requestId)
        .eq('user_id', userId)

      if (error) {
        console.error('Delete request error:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in deletePropertyRequest:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Check if user has already requested a property
   * @param {string} userId - Authenticated user ID
   * @param {string} caseNumber - Property case number
   * @returns {Promise<Object>} Result with boolean indicating if requested
   */
  async hasRequestedProperty(userId, caseNumber) {
    try {
      const { data, error } = await supabase
        .from('property_requests')
        .select('id')
        .eq('user_id', userId)
        .eq('case_number', caseNumber)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows found" which is expected
        console.error('Check request error:', error)
        return { success: false, error: error.message, requested: false }
      }

      return { success: true, requested: !!data }
    } catch (error) {
      console.error('Error in hasRequestedProperty:', error)
      return { success: false, error: error.message, requested: false }
    }
  }
}

export const propertyRequestService = new PropertyRequestService()
