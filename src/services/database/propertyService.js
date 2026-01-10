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
      console.error('Error fetching property by case number:', error)
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
          case_number: propertyData.case_number || propertyData.caseNumber,
          address: propertyData.address,
          city: propertyData.city,
          state: propertyData.state,
          zip_code: propertyData.zip_code || propertyData.zipCode,
          county: propertyData.county,
          price: propertyData.price,
          beds: propertyData.beds,
          baths: propertyData.baths,
          sq_ft: propertyData.sq_ft || propertyData.sqFt,
          lot_size: propertyData.lot_size || propertyData.lotSize,
          year_built: propertyData.year_built || propertyData.yearBuilt,
          status: propertyData.status || 'AVAILABLE',
          property_type: propertyData.property_type || propertyData.propertyType || 'Single Family',
          description: propertyData.description,
          features: propertyData.features || [],
          images: propertyData.images || [],
          main_image: propertyData.main_image || propertyData.mainImage,
          bid_deadline: propertyData.bid_deadline || propertyData.bidDeadline,
          is_active: true
        }])
        .select()

      if (error) {
        console.error('Supabase insert error:', error)
        return { success: false, error: error.message, data: null }
      }

      // Return the first inserted row
      return { success: true, data: data && data.length > 0 ? data[0] : null }
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
      
      if (updates.case_number || updates.caseNumber) updateData.case_number = updates.case_number || updates.caseNumber
      if (updates.address) updateData.address = updates.address
      if (updates.city) updateData.city = updates.city
      if (updates.state) updateData.state = updates.state
      if (updates.zip_code || updates.zipCode) updateData.zip_code = updates.zip_code || updates.zipCode
      if (updates.county) updateData.county = updates.county
      if (updates.price !== undefined) updateData.price = updates.price
      if (updates.beds !== undefined) updateData.beds = updates.beds
      if (updates.baths !== undefined) updateData.baths = updates.baths
      if (updates.sq_ft !== undefined || updates.sqFt !== undefined) updateData.sq_ft = updates.sq_ft || updates.sqFt
      if (updates.lot_size || updates.lotSize) updateData.lot_size = updates.lot_size || updates.lotSize
      if (updates.year_built || updates.yearBuilt) updateData.year_built = updates.year_built || updates.yearBuilt
      if (updates.status) updateData.status = updates.status
      if (updates.property_type || updates.propertyType) updateData.property_type = updates.property_type || updates.propertyType
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.features) updateData.features = updates.features
      if (updates.images) updateData.images = updates.images
      if (updates.main_image || updates.mainImage) updateData.main_image = updates.main_image || updates.mainImage
      if (updates.bid_deadline || updates.bidDeadline) updateData.bid_deadline = updates.bid_deadline || updates.bidDeadline
      if (updates.is_active !== undefined || updates.isActive !== undefined) updateData.is_active = updates.is_active !== undefined ? updates.is_active : updates.isActive

      // Add updated_at timestamp
      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from(TABLES.PROPERTIES)
        .update(updateData)
        .eq('id', id)
        .select()

      if (error) {
        console.error('Supabase update error:', error)
        return { success: false, error: error.message, data: null }
      }

      // Check if any rows were updated
      if (!data || data.length === 0) {
        return { success: false, error: 'Property not found', data: null }
      }

      // Return the first (and should be only) updated row
      return { success: true, data: data[0] }
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

      // Check if any rows were updated
      if (!data || data.length === 0) {
        return { success: false, error: 'Property not found', data: null }
      }

      return { success: true, data: data[0] }
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

  /**
   * Get random properties
   * @param {number} limit - Number of properties to return
   * @returns {Promise<Array>} Random properties
   */
  async getRandomProperties(limit = 5) {
    try {
      // First, get all active properties
      const { data: allProperties, error: fetchError } = await supabase
        .from(TABLES.PROPERTIES)
        .select('*')
        .eq('is_active', true)

      if (fetchError) {
        console.error('Error fetching properties:', fetchError)
        return { success: false, error: fetchError.message, data: [] }
      }

      // If we have properties, shuffle and return the requested number
      if (allProperties && allProperties.length > 0) {
        // Shuffle array using Fisher-Yates algorithm
        const shuffled = [...allProperties]
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        
        // Return the first 'limit' items
        const randomProperties = shuffled.slice(0, Math.min(limit, shuffled.length))
        return { success: true, data: randomProperties }
      }

      return { success: true, data: [] }
    } catch (error) {
      console.error('Error fetching random properties:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  /**
   * Get state statistics from actual database
   * @returns {Promise<Object>} State statistics
   */
  async getStateStatistics() {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROPERTIES)
        .select('state, city, price')
        .eq('is_active', true)

      if (error) {
        console.error('Error fetching state statistics:', error)
        return { success: false, error: error.message, data: {} }
      }

      // Group properties by state and calculate statistics
      const stateStats = {}
      
      if (data && data.length > 0) {
        data.forEach(property => {
          const state = property.state
          if (!state) return

          if (!stateStats[state]) {
            stateStats[state] = {
              total_properties: 0,
              prices: [],
              cities: new Set()
            }
          }

          stateStats[state].total_properties++
          stateStats[state].prices.push(parseFloat(property.price) || 0)
          if (property.city) {
            stateStats[state].cities.add(property.city)
          }
        })

        // Calculate averages and format output
        Object.keys(stateStats).forEach(state => {
          const stats = stateStats[state]
          const prices = stats.prices.sort((a, b) => a - b)
          
          stateStats[state] = {
            total_properties: stats.total_properties,
            avg_price: Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length),
            min_price: prices[0],
            max_price: prices[prices.length - 1],
            cities: Array.from(stats.cities)
          }
        })
      }

      return { success: true, data: stateStats }
    } catch (error) {
      console.error('Error calculating state statistics:', error)
      return { success: false, error: error.message, data: {} }
    }
  }
}

// Export singleton instance
export const propertyService = new PropertyService()
export default propertyService
