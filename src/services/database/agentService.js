/**
 * Agent Database Service
 * Handles all agent-related database operations with Supabase
 */

import { supabase, TABLES, formatSupabaseResponse } from '../../config/supabase'
import { agentInvitationService } from '../agentInvitationService'
import { agentApplicationService } from '../agentApplicationService'

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
        // states_covered is jsonb, so pass a JSON array (a JS array would be sent as a Postgres array literal)
        query = query.contains('states_covered', JSON.stringify([filters.state]))
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
      // Commas and parentheses would break the PostgREST or() filter
      const term = String(searchTerm).replace(/[,()]/g, ' ').trim()
      const { data, error } = await supabase
        .from(TABLES.AGENTS)
        .select('*')
        .eq('is_active', true)
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,company.ilike.%${term}%,phone.ilike.%${term}%,license_state.ilike.%${term}%`)
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
  async addAgent(agentData, { invite = true } = {}) {
    try {
      // Accept both the form's camelCase shape and snake_case rows (e.g. an Export backup)
      const pick = (camel, snake) => agentData[camel] ?? agentData[snake]
      const email = pick('email', 'email')
      const { data, error } = await supabase
        .from(TABLES.AGENTS)
        .insert([{
          first_name: pick('firstName', 'first_name'),
          last_name: pick('lastName', 'last_name'),
          email,
          phone: pick('phone', 'phone'),
          company: pick('company', 'company'),
          license_number: pick('licenseNumber', 'license_number'),
          license_state: pick('licenseState', 'license_state'),
          specialties: pick('specialties', 'specialties') || [],
          states_covered: pick('statesCovered', 'states_covered') || [],
          years_experience: pick('yearsExperience', 'years_experience'),
          bio: pick('bio', 'bio'),
          profile_image: pick('profileImage', 'profile_image'),
          is_admin: pick('isAdmin', 'is_admin') || false,
          is_active: true,
          status: 'approved',
          total_listings: pick('totalListings', 'total_listings') || 0,
          total_sales: pick('totalSales', 'total_sales') || 0
        }])
        .select()
        .single()

      const response = formatSupabaseResponse(data, error)

      // If agent was created successfully, create their login and give them broker access
      if (response.success && data && invite) {
        const inviteResult = await agentInvitationService.sendInvitation({
          email,
          firstName: data.first_name,
          lastName: data.last_name
        })

        if (!inviteResult.success) {
          console.warn('Agent created but invitation email failed:', inviteResult.error)
          // Still return success for agent creation, but note the email issue
          response.invitationSent = false
          response.invitationError = inviteResult.error
        } else {
          response.invitationSent = true
        }

        const roleResult = await agentApplicationService.grantBrokerRole(data)
        if (!roleResult.success) console.warn('Agent created but broker role not granted:', roleResult.error)
      }

      return response
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
      if (updates.company !== undefined) updateData.company = updates.company
      if (updates.licenseNumber !== undefined) updateData.license_number = updates.licenseNumber
      if (updates.licenseState) updateData.license_state = updates.licenseState
      if (updates.specialties) updateData.specialties = updates.specialties
      if (updates.statesCovered) updateData.states_covered = updates.statesCovered
      if (updates.yearsExperience !== undefined) updateData.years_experience = updates.yearsExperience
      if (updates.bio !== undefined) updateData.bio = updates.bio
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
