/**
 * Customer Database Service
 * Handles all customer-related database operations with Supabase
 */

import { supabase, TABLES, formatSupabaseResponse } from '../../config/supabase'

class CustomerService {
  /**
   * Get all customers
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} List of customers
   */
  async getAllCustomers(filters = {}) {
    try {
      let query = supabase
        .from(TABLES.CUSTOMERS)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.state) {
        query = query.eq('state', filters.state)
      }

      const { data, error } = await query

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching customers:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  /**
   * Get customer by ID
   * @param {string} id - Customer UUID
   * @returns {Promise<Object>} Customer details
   */
  async getCustomerById(id) {
    try {
      const { data, error } = await supabase
        .from(TABLES.CUSTOMERS)
        .select('*')
        .eq('id', id)
        .single()

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching customer:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Get customer by email
   * @param {string} email - Customer email
   * @returns {Promise<Object>} Customer details
   */
  async getCustomerByEmail(email) {
    try {
      const { data, error } = await supabase
        .from(TABLES.CUSTOMERS)
        .select('*')
        .eq('email', email)
        .eq('is_active', true)

      // If no customer found, return success: false with null data
      if (!data || data.length === 0) {
        return { success: false, error: 'Customer not found', data: null }
      }

      if (error) {
        console.error('Supabase error:', error)
        return { success: false, error: error.message, data: null }
      }

      // Return the first customer found
      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error fetching customer:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Search customers
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Matching customers
   */
  async searchCustomers(searchTerm) {
    try {
      const { data, error } = await supabase
        .from(TABLES.CUSTOMERS)
        .select('*')
        .eq('is_active', true)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error searching customers:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  /**
   * Add new customer
   * @param {Object} customerData - Customer information
   * @returns {Promise<Object>} Created customer
   */
  async addCustomer(customerData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.CUSTOMERS)
        .insert([{
          first_name: customerData.firstName || customerData.first_name,
          last_name: customerData.lastName || customerData.last_name,
          email: customerData.email,
          phone: customerData.phone,
          address: customerData.address,
          city: customerData.city,
          state: customerData.state,
          zip_code: customerData.zipCode || customerData.zip_code,
          status: customerData.status || 'new',
          lead_source: customerData.leadSource || customerData.lead_source,
          notes: customerData.notes,
          tags: customerData.tags || [],
          is_active: true
        }])
        .select()

      if (error) {
        console.error('Supabase insert error:', error)
        return { success: false, error: error.message, data: null }
      }

      return { success: true, data: data && data.length > 0 ? data[0] : null }
    } catch (error) {
      console.error('Error adding customer:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Update customer
   * @param {string} id - Customer ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated customer
   */
  async updateCustomer(id, updates) {
    try {
      const updateData = {}
      
      if (updates.firstName || updates.first_name) updateData.first_name = updates.firstName || updates.first_name
      if (updates.lastName || updates.last_name) updateData.last_name = updates.lastName || updates.last_name
      if (updates.email) updateData.email = updates.email
      if (updates.phone) updateData.phone = updates.phone
      if (updates.address) updateData.address = updates.address
      if (updates.city) updateData.city = updates.city
      if (updates.state) updateData.state = updates.state
      if (updates.zipCode || updates.zip_code) updateData.zip_code = updates.zipCode || updates.zip_code
      if (updates.status) updateData.status = updates.status
      if (updates.leadSource || updates.lead_source) updateData.lead_source = updates.leadSource || updates.lead_source
      if (updates.notes) updateData.notes = updates.notes
      if (updates.tags) updateData.tags = updates.tags
      if (updates.isActive !== undefined || updates.is_active !== undefined) updateData.is_active = updates.isActive !== undefined ? updates.isActive : updates.is_active

      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from(TABLES.CUSTOMERS)
        .update(updateData)
        .eq('id', id)
        .select()

      if (error) {
        console.error('Supabase update error:', error)
        return { success: false, error: error.message, data: null }
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'Customer not found', data: null }
      }

      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error updating customer:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Delete customer (soft delete)
   * @param {string} id - Customer ID
   * @returns {Promise<Object>} Result
   */
  async deleteCustomer(id) {
    try {
      const { data, error } = await supabase
        .from(TABLES.CUSTOMERS)
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()

      if (error) {
        console.error('Supabase delete error:', error)
        return { success: false, error: error.message, data: null }
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'Customer not found', data: null }
      }

      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error deleting customer:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Get customer statistics
   * @returns {Promise<Object>} Statistics
   */
  async getCustomerStats() {
    try {
      const { data, error } = await supabase
        .from(TABLES.CUSTOMERS)
        .select('status, created_at')
        .eq('is_active', true)

      if (error) throw error

      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const stats = {
        total: data.length,
        thisWeek: data.filter(c => new Date(c.created_at) >= oneWeekAgo).length,
        new: data.filter(c => c.status === 'new').length,
        active: data.filter(c => c.status === 'active').length,
        closed: data.filter(c => c.status === 'closed').length
      }

      return { success: true, data: stats }
    } catch (error) {
      console.error('Error getting customer stats:', error)
      return { success: false, error: error.message, data: null }
    }
  }
}

// Export singleton instance
export const customerService = new CustomerService()
export default customerService
