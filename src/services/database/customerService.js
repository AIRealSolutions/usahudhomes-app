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
        .eq('is_deleted', false)
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
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()

      if (error) {
        console.error('Supabase soft delete error:', error)
        return { success: false, error: error.message, data: null }
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'Customer not found', data: null }
      }

      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error soft deleting customer:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Delete customer and all references (CASCADE DELETE)
   * This will permanently delete:
   * - All consultations/leads associated with this customer
   * - All activities related to those consultations
   * - The customer record itself
   * @param {string} customerId - Customer ID or email
   * @returns {Promise<Object>} Result with deletion counts
   */
  async deleteCustomerWithReferences(customerId) {
    try {
      console.log('Starting cascade delete for customer:', customerId)
      
      // First, get the customer to verify it exists
      let customer
      if (customerId.includes('@')) {
        // If email provided, look up by email
        const result = await this.getCustomerByEmail(customerId)
        if (!result.success) {
          return { success: false, error: 'Customer not found', data: null }
        }
        customer = result.data
      } else {
        // Look up by ID
        const result = await this.getCustomerById(customerId)
        if (!result.success) {
          return { success: false, error: 'Customer not found', data: null }
        }
        customer = result.data
      }

      const customerIdToDelete = customer.id
      console.log('Found customer to delete:', customerIdToDelete)

      // Step 1: Get all consultations for this customer
      const { data: consultations, error: consultError } = await supabase
        .from(TABLES.CONSULTATIONS)
        .select('id')
        .eq('customer_id', customerIdToDelete)

      if (consultError) {
        console.error('Error fetching consultations:', consultError)
        return { success: false, error: consultError.message, data: null }
      }

      const consultationIds = consultations?.map(c => c.id) || []
      console.log(`Found ${consultationIds.length} consultations to delete`)

      // Step 2: Delete all activities related to these consultations
      let activitiesDeleted = 0
      if (consultationIds.length > 0) {
        const { error: activitiesError, count } = await supabase
          .from(TABLES.ACTIVITIES)
          .delete()
          .in('consultation_id', consultationIds)

        if (activitiesError) {
          console.warn('Error deleting activities:', activitiesError)
        } else {
          activitiesDeleted = count || 0
          console.log(`Deleted ${activitiesDeleted} activities`)
        }
      }

      // Step 3: Delete all consultations for this customer
      let consultationsDeleted = 0
      if (consultationIds.length > 0) {
        const { error: consultDeleteError, count } = await supabase
          .from(TABLES.CONSULTATIONS)
          .delete()
          .eq('customer_id', customerIdToDelete)

        if (consultDeleteError) {
          console.error('Error deleting consultations:', consultDeleteError)
          return { success: false, error: consultDeleteError.message, data: null }
        }
        consultationsDeleted = count || consultationIds.length
        console.log(`Deleted ${consultationsDeleted} consultations`)
      }

      // Step 4: Delete the customer record itself (HARD DELETE)
      const { error: customerDeleteError } = await supabase
        .from(TABLES.CUSTOMERS)
        .delete()
        .eq('id', customerIdToDelete)

      if (customerDeleteError) {
        console.error('Error deleting customer:', customerDeleteError)
        return { success: false, error: customerDeleteError.message, data: null }
      }

      console.log('Customer deleted successfully')

      return {
        success: true,
        data: {
          customerId: customerIdToDelete,
          customerName: `${customer.first_name} ${customer.last_name}`,
          customerEmail: customer.email,
          consultationsDeleted,
          activitiesDeleted,
          message: `Successfully deleted customer and ${consultationsDeleted} consultation(s)`
        }
      }
    } catch (error) {
      console.error('Error in cascade delete:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Restore deleted customer
   * @param {string} id - Customer ID
   * @returns {Promise<Object>} Result
   */
  async restoreCustomer(id) {
    try {
      const { data, error } = await supabase
        .from(TABLES.CUSTOMERS)
        .update({
          is_deleted: false,
          deleted_at: null,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()

      if (error) {
        console.error('Supabase restore error:', error)
        return { success: false, error: error.message, data: null }
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'Customer not found', data: null }
      }

      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error restoring customer:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Get deleted customers (for admin audit)
   * @returns {Promise<Array>} List of deleted customers
   */
  async getDeletedCustomers() {
    try {
      const { data, error } = await supabase
        .from(TABLES.CUSTOMERS)
        .select('*')
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false })

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching deleted customers:', error)
      return { success: false, error: error.message, data: [] }
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
