/**
 * Property Database Service
 * Handles all property-related database operations with Supabase
 */

import { supabase, TABLES, formatSupabaseResponse } from '../../config/supabase'

class PropertyService {
  /**
   * Get all properties
   * @param {Object} filters - Optional filters (state, city, status, etc.)
   * @returns {Promise<Array>} List of properties
   */
  async getAllProperties(filters = {}) {
    try {
      let query = supabase
        .from(TABLES.PROPERTIES)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.state) {
        query = query.eq('state', filters.state)
      }
      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.minPrice) {
        query = query.gte('price', filters.minPrice)
      }
      if (filters.maxPrice) {
        query = query.lte('price', filters.maxPrice)
      }
      if (filters.beds) {
        query = query.gte('beds', filters.beds)
      }
      if (filters.baths) {
        query = query.gte('baths', filters.baths)
      }

      const { data, error } = await query

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching properties:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  /**
   * Get property by case number
   * @param {string} caseNumber - Property case number
   * @returns {Promise<Object>} Property details
   */
  async getPropertyByCaseNumber(caseNumber) {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROPERTIES)
        .select('*')
        .eq('case_number', caseNumber)
        .eq('is_active', true)
        .single()

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching property:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Get property by ID
   * @param {string} id - Property UUID
   * @returns {Promise<Object>} Property details
   */
  async getPropertyById(id) {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROPERTIES)
        .select('*')
        .eq('id', id)
        .single()

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching property:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Search properties
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Matching properties
   */
  async searchProperties(searchTerm) {
    try {
      const { data, error} = await supabase
        .from(TABLES.PROPERTIES)
        .select('*')
        .eq('is_active', true)
        .or(`address.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,county.ilike.%${searchTerm}%,case_number.ilike.%${searchTerm}%`)
        .order('price', { ascending: false })

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error searching properties:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  /**
   * Add new property
   * @param {Object} propertyData - Property information
   * @returns {Promise<Object>} Created property
   */
  async addProperty(propertyData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROPERTIES)
        .insert([{
          case_number: propertyData.caseNumber,
          address: propertyData.address,
          city: propertyData.city,
          state: propertyData.state,
          zip_code: propertyData.zipCode,
          county: propertyData.county,
          price: propertyData.price,
          beds: propertyData.beds,
          baths: propertyData.baths,
          sq_ft: propertyData.sqFt,
          lot_size: propertyData.lotSize,
          year_built: propertyData.yearBuilt,
          status: propertyData.status || 'AVAILABLE',
          property_type: propertyData.propertyType || 'Single Family',
          description: propertyData.description,
          features: propertyData.features || [],
          images: propertyData.images || [],
          main_image: propertyData.mainImage,
          bid_deadline: propertyData.bidDeadline,
          is_active: true
        }])
        .select()
        .single()

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error adding property:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Update property
   * @param {string} id - Property ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated property
   */
  async updateProperty(id, updates) {
    try {
      const updateData = {}
      
      if (updates.caseNumber) updateData.case_number = updates.caseNumber
      if (updates.address) updateData.address = updates.address
      if (updates.city) updateData.city = updates.city
      if (updates.state) updateData.state = updates.state
      if (updates.zipCode) updateData.zip_code = updates.zipCode
      if (updates.county) updateData.county = updates.county
      if (updates.price !== undefined) updateData.price = updates.price
      if (updates.beds !== undefined) updateData.beds = updates.beds
      if (updates.baths !== undefined) updateData.baths = updates.baths
      if (updates.sqFt !== undefined) updateData.sq_ft = updates.sqFt
      if (updates.lotSize) updateData.lot_size = updates.lotSize
      if (updates.yearBuilt) updateData.year_built = updates.yearBuilt
      if (updates.status) updateData.status = updates.status
      if (updates.propertyType) updateData.property_type = updates.propertyType
      if (updates.description) updateData.description = updates.description
      if (updates.features) updateData.features = updates.features
      if (updates.images) updateData.images = updates.images
      if (updates.mainImage) updateData.main_image = updates.mainImage
      if (updates.bidDeadline) updateData.bid_deadline = updates.bidDeadline
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive

      const { data, error } = await supabase
        .from(TABLES.PROPERTIES)
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error updating property:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Delete property (soft delete)
   * @param {string} id - Property ID
   * @returns {Promise<Object>} Result
   */
  async deleteProperty(id) {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROPERTIES)
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error deleting property:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Get property statistics
   * @returns {Promise<Object>} Statistics
   */
  async getPropertyStats() {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROPERTIES)
        .select('price, status')
        .eq('is_active', true)

      if (error) throw error

      const stats = {
        total: data.length,
        averagePrice: data.length > 0 
          ? data.reduce((sum, p) => sum + parseFloat(p.price), 0) / data.length 
          : 0,
        bidsOpen: data.filter(p => p.status === 'BIDS OPEN').length,
        priceReduced: data.filter(p => p.status === 'PRICE REDUCED').length,
        available: data.filter(p => p.status === 'AVAILABLE').length
      }

      return { success: true, data: stats }
    } catch (error) {
      console.error('Error getting property stats:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Get properties by state
   * @param {string} state - State code (e.g., 'NC', 'TN')
   * @returns {Promise<Array>} Properties in that state
   */
  async getPropertiesByState(state) {
    return this.getAllProperties({ state })
  }

  /**
   * Get featured properties
   * @param {number} limit - Number of properties to return
   * @returns {Promise<Array>} Featured properties
   */
  async getFeaturedProperties(limit = 6) {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROPERTIES)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit)

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching featured properties:', error)
      return { success: false, error: error.message, data: [] }
    }
  }
}

// Export singleton instance
export const propertyService = new PropertyService()
export default propertyService
