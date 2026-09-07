/**
 * Referral Service
 * Manages agent referrals and callback requests from authenticated users
 */

import { supabase } from '../config/supabase'

class ReferralService {
  /**
   * Submit an agent callback request (creates referral)
   * @param {string} userId - Authenticated user ID
   * @param {Object} referralData - Complete referral information
   * @returns {Promise<Object>} Result with referral data
   */
  async submitAgentRequest(userId, referralData) {
    try {
      if (!userId) {
        return { success: false, error: 'User must be authenticated', data: null }
      }

      const {
        // Basic info
        firstName,
        lastName,
        email,
        phone,
        userAddress,
        state,
        preferredContact,

        // Financing
        financingType,
        downPayment,
        creditScoreRange,
        preApproved,

        // Timeline & Status
        timeline,
        buyerType,
        experienceLevel,

        // Property Preferences
        priceRangeMin,
        priceRangeMax,
        propertyPreferences,

        // Additional
        questions,
        hearAboutUs
      } = referralData

      // Validate required fields
      if (!firstName || !lastName || !email || !phone || !state) {
        return {
          success: false,
          error: 'Missing required fields: name, email, phone, state',
          data: null
        }
      }

      // Create referral record
      const { data, error } = await supabase
        .from('referrals')
        .insert({
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          user_address: userAddress,
          state,
          preferred_contact: preferredContact || 'call',
          financing_type: financingType,
          down_payment: downPayment,
          credit_score_range: creditScoreRange,
          pre_approved: preApproved,
          timeline,
          buyer_type: buyerType,
          experience_level: experienceLevel,
          price_range_min: priceRangeMin,
          price_range_max: priceRangeMax,
          property_preferences: propertyPreferences,
          questions,
          hear_about_us: hearAboutUs,
          assignment_status: 'pending_assignment',
          status: 'new'
        })
        .select()
        .single()

      if (error) {
        console.error('Referral creation error:', error)
        return { success: false, error: error.message, data: null }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error in submitAgentRequest:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Get all referrals for a user
   * @param {string} userId - Authenticated user ID
   * @returns {Promise<Object>} Result with array of referrals
   */
  async getUserReferrals(userId) {
    try {
      if (!userId) {
        return { success: false, error: 'User must be authenticated', data: null }
      }

      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Fetch referrals error:', error)
        return { success: false, error: error.message, data: null }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error in getUserReferrals:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Get a specific referral
   * @param {string} referralId - Referral ID
   * @param {string} userId - User ID (for verification)
   * @returns {Promise<Object>} Result with referral data
   */
  async getReferral(referralId, userId) {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('id', referralId)
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Fetch referral error:', error)
        return { success: false, error: error.message, data: null }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error in getReferral:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Update referral status
   * @param {string} referralId - Referral ID
   * @param {string} userId - User ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Result with updated referral
   */
  async updateReferralStatus(referralId, userId, status) {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .update({
          assignment_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', referralId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('Update referral error:', error)
        return { success: false, error: error.message, data: null }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error in updateReferralStatus:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Check if user has already submitted a callback request (in same state)
   * @param {string} userId - User ID
   * @param {string} state - State to check
   * @returns {Promise<Object>} Result with boolean indicating if exists
   */
  async hasPendingRequest(userId, state) {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('id')
        .eq('user_id', userId)
        .eq('state', state)
        .eq('assignment_status', 'pending_assignment')
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows found" which is expected
        console.error('Check request error:', error)
        return { success: false, error: error.message, hasPending: false }
      }

      return { success: true, hasPending: !!data }
    } catch (error) {
      console.error('Error in hasPendingRequest:', error)
      return { success: false, error: error.message, hasPending: false }
    }
  }

  /**
   * Link property request to referral
   * @param {string} referralId - Referral ID
   * @param {string} propertyRequestId - Property request ID
   * @returns {Promise<Object>} Result
   */
  async linkPropertyRequest(referralId, propertyRequestId) {
    try {
      const { error } = await supabase
        .from('referrals')
        .update({
          notes: propertyRequestId
          // Alternative: add property_request_id field if needed
        })
        .eq('id', referralId)

      if (error) {
        console.error('Link request error:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in linkPropertyRequest:', error)
      return { success: false, error: error.message }
    }
  }
}

export const referralService = new ReferralService()
