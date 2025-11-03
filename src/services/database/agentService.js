/**
 * Agent Database Service
 * Handles all agent-related database operations with Supabase
 */

import { supabase, TABLES, formatSupabaseResponse } from '../../config/supabase'

class AgentService {
  /**
   * Get all agents
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} List of agents
   */
  async getAllAgents(filters = {}) {
    try {
      let query = supabase
        .from(TABLES.AGENTS)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (filters.state) {
        query = query.contains('states_covered', [filters.state])
      }

      const { data, error } = await query

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching agents:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  /**
   * Get agent by ID
   * @param {string} id - Agent UUID
   * @returns {Promise<Object>} Agent details
   */
  async getAgentById(id) {
    try {
      const { data, error } = await supabase
        .from(TABLES.AGENTS)
        .select('*')
        .eq('id', id)
        .single()

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching agent:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Get agent by email
   * @param {string} email - Agent email
   * @returns {Promise<Object>} Agent details
   */
  async getAgentByEmail(email) {
    try {
      const { data, error } = await supabase
        .from(TABLES.AGENTS)
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single()

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching agent:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Search agents
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Matching agents
   */
  async searchAgents(searchTerm) {
    try {
      const { data, error } = await supabase
        .from(TABLES.AGENTS)
        .select('*')
        .eq('is_active', true)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error searching agents:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  /**
   * Add new agent
   * @param {Object} agentData - Agent information
   * @returns {Promise<Object>} Created agent
   */
  async addAgent(agentData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.AGENTS)
        .insert([{
          first_name: agentData.firstName,
          last_name: agentData.lastName,
          email: agentData.email,
          phone: agentData.phone,
          company: agentData.company,
          license_number: agentData.licenseNumber,
          license_state: agentData.licenseState,
          specialties: agentData.specialties || [],
          states_covered: agentData.statesCovered || [],
          years_experience: agentData.yearsExperience,
          bio: agentData.bio,
          profile_image: agentData.profileImage,
          is_admin: agentData.isAdmin || false,
          is_active: true,
          total_listings: 0,
          total_sales: 0
        }])
        .select()
        .single()

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error adding agent:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Update agent
   * @param {string} id - Agent ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated agent
   */
  async updateAgent(id, updates) {
    try {
      const updateData = {}
      
      if (updates.firstName) updateData.first_name = updates.firstName
      if (updates.lastName) updateData.last_name = updates.lastName
      if (updates.email) updateData.email = updates.email
      if (updates.phone) updateData.phone = updates.phone
      if (updates.company) updateData.company = updates.company
      if (updates.licenseNumber) updateData.license_number = updates.licenseNumber
      if (updates.licenseState) updateData.license_state = updates.licenseState
      if (updates.specialties) updateData.specialties = updates.specialties
      if (updates.statesCovered) updateData.states_covered = updates.statesCovered
      if (updates.yearsExperience !== undefined) updateData.years_experience = updates.yearsExperience
      if (updates.bio) updateData.bio = updates.bio
      if (updates.profileImage) updateData.profile_image = updates.profileImage
      if (updates.isAdmin !== undefined) updateData.is_admin = updates.isAdmin
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive
      if (updates.totalListings !== undefined) updateData.total_listings = updates.totalListings
      if (updates.totalSales !== undefined) updateData.total_sales = updates.totalSales

      const { data, error } = await supabase
        .from(TABLES.AGENTS)
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error updating agent:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Delete agent (soft delete)
   * @param {string} id - Agent ID
   * @returns {Promise<Object>} Result
   */
  async deleteAgent(id) {
    try {
      const { data, error } = await supabase
        .from(TABLES.AGENTS)
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error deleting agent:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Get agent statistics
   * @returns {Promise<Object>} Statistics
   */
  async getAgentStats() {
    try {
      const { data, error } = await supabase
        .from(TABLES.AGENTS)
        .select('total_listings, total_sales, is_active')
        .eq('is_active', true)

      if (error) throw error

      const stats = {
        total: data.length,
        active: data.filter(a => a.is_active).length,
        totalListings: data.reduce((sum, a) => sum + (a.total_listings || 0), 0),
        totalSales: data.reduce((sum, a) => sum + (a.total_sales || 0), 0)
      }

      return { success: true, data: stats }
    } catch (error) {
      console.error('Error getting agent stats:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Get agents by state
   * @param {string} state - State code
   * @returns {Promise<Array>} Agents covering that state
   */
  async getAgentsByState(state) {
    return this.getAllAgents({ state })
  }
}

// Export singleton instance
export const agentService = new AgentService()
export default agentService
