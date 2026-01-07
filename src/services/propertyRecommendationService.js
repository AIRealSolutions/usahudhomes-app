/**
 * Property Recommendation & Sharing Service
 * AI-powered property matching and sharing for brokers
 */

import { supabase } from '../config/supabase'
import communicationService from './communicationService'

export const propertyRecommendationService = {
  /**
   * Find matching properties for a client based on their preferences
   */
  async findMatchingProperties(clientPreferences) {
    try {
      const {
        budget,
        minBedrooms,
        maxBedrooms,
        minBathrooms,
        location,
        propertyType,
        maxPrice,
        minPrice
      } = clientPreferences

      // Query properties from database
      let query = supabase
        .from('properties')
        .select('*')
        .eq('status', 'available')

      // Apply filters
      if (minPrice) query = query.gte('list_price', minPrice)
      if (maxPrice || budget) query = query.lte('list_price', maxPrice || budget)
      if (minBedrooms) query = query.gte('bedrooms', minBedrooms)
      if (maxBedrooms) query = query.lte('bedrooms', maxBedrooms)
      if (minBathrooms) query = query.gte('bathrooms', minBathrooms)
      if (location) query = query.ilike('city', `%${location}%`)
      if (propertyType) query = query.eq('property_type', propertyType)

      const { data: properties, error } = await query
        .order('list_price', { ascending: true })
        .limit(20)

      if (error) throw error

      // Score and rank properties
      const scoredProperties = properties.map(property => ({
        ...property,
        matchScore: this.calculateMatchScore(property, clientPreferences)
      }))

      // Sort by match score
      scoredProperties.sort((a, b) => b.matchScore - a.matchScore)

      return {
        success: true,
        properties: scoredProperties.slice(0, 10), // Top 10 matches
        totalFound: properties.length
      }
    } catch (error) {
      console.error('Error finding matching properties:', error)
      return {
        success: false,
        error: error.message,
        properties: []
      }
    }
  },

  /**
   * Calculate match score between property and client preferences
   */
  calculateMatchScore(property, preferences) {
    let score = 0
    const maxScore = 100

    // Price match (30 points)
    if (preferences.budget || preferences.maxPrice) {
      const targetPrice = preferences.budget || preferences.maxPrice
      const priceDiff = Math.abs(property.list_price - targetPrice)
      const priceScore = Math.max(0, 30 - (priceDiff / targetPrice) * 30)
      score += priceScore
    }

    // Bedroom match (20 points)
    if (preferences.minBedrooms) {
      if (property.bedrooms >= preferences.minBedrooms) {
        score += 20
      } else {
        score += Math.max(0, 20 - (preferences.minBedrooms - property.bedrooms) * 5)
      }
    }

    // Bathroom match (15 points)
    if (preferences.minBathrooms) {
      if (property.bathrooms >= preferences.minBathrooms) {
        score += 15
      } else {
        score += Math.max(0, 15 - (preferences.minBathrooms - property.bathrooms) * 5)
      }
    }

    // Location match (20 points)
    if (preferences.location) {
      const locationMatch = property.city?.toLowerCase().includes(preferences.location.toLowerCase()) ||
                           property.state?.toLowerCase().includes(preferences.location.toLowerCase())
      if (locationMatch) score += 20
    }

    // Property type match (15 points)
    if (preferences.propertyType) {
      if (property.property_type === preferences.propertyType) {
        score += 15
      }
    }

    return Math.min(score, maxScore)
  },

  /**
   * Share properties with a client
   */
  async shareProperties(shareData) {
    try {
      const {
        leadId,
        brokerId,
        properties,
        channel = 'email',
        customMessage = '',
        clientEmail,
        clientPhone,
        clientName
      } = shareData

      // Generate property list content
      const propertyList = this.formatPropertyList(properties)
      
      // Create message based on channel
      let messageContent
      if (channel === 'email') {
        messageContent = {
          to: clientEmail,
          subject: `${properties.length} Perfect HUD Homes for You!`,
          body: this.generatePropertyEmailContent(clientName, properties, customMessage),
          leadId,
          brokerId
        }
      } else if (channel === 'sms') {
        messageContent = {
          to: clientPhone,
          body: this.generatePropertySMSContent(clientName, properties, customMessage),
          leadId,
          brokerId
        }
      }

      // Send via communication service
      const result = await communicationService.sendMessage(channel, messageContent)

      // Log the property share
      if (result.success) {
        await this.logPropertyShare({
          leadId,
          brokerId,
          propertyIds: properties.map(p => p.id),
          channel,
          sharedAt: new Date().toISOString()
        })
      }

      return result
    } catch (error) {
      console.error('Error sharing properties:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Generate email content for property sharing
   */
  generatePropertyEmailContent(clientName, properties, customMessage) {
    const propertyDetails = properties.map((property, index) => `
${index + 1}. ${property.address}
   ${property.city}, ${property.state} ${property.zip}
   ${property.bedrooms} Bed | ${property.bathrooms} Bath | ${property.sqft ? property.sqft.toLocaleString() + ' sqft' : 'N/A'}
   List Price: $${property.list_price.toLocaleString()}
   ${property.estimated_value ? `Estimated Value: $${property.estimated_value.toLocaleString()}` : ''}
   ${property.estimated_value && property.list_price ? `Potential Savings: $${(property.estimated_value - property.list_price).toLocaleString()}` : ''}
   
   View Details: https://usahudhomes.com/properties/${property.case_number}
    `).join('\n')

    return `Hi ${clientName},

${customMessage || "Great news! I found some fantastic HUD properties that match what you're looking for."}

Here are my top recommendations:

${propertyDetails}

These HUD properties offer significant savings compared to traditional market listings. Each one has been carefully selected based on your preferences and budget.

Would you like to schedule showings for any of these properties? I'm happy to answer any questions you may have.

Let me know which ones interest you most, and we can discuss next steps!

Best regards,
[Your Name]
USA HUD Homes

P.S. HUD properties move quickly! Let me know if you'd like to submit an offer on any of these.`
  },

  /**
   * Generate SMS content for property sharing
   */
  generatePropertySMSContent(clientName, properties, customMessage) {
    if (properties.length === 1) {
      const p = properties[0]
      return `Hi ${clientName}! Found a great HUD home for you: ${p.address}, ${p.city} - ${p.bedrooms}BR/${p.bathrooms}BA - $${p.list_price.toLocaleString()}. View: usahudhomes.com/properties/${p.case_number} Interested?`
    }
    
    return `Hi ${clientName}! I found ${properties.length} HUD homes matching your criteria. Check your email for details, or reply to schedule showings. They won't last long!`
  },

  /**
   * Format property list for display
   */
  formatPropertyList(properties) {
    return properties.map(p => ({
      address: p.address,
      city: p.city,
      state: p.state,
      price: p.list_price,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      caseNumber: p.case_number
    }))
  },

  /**
   * Log property share activity
   */
  async logPropertyShare(logData) {
    try {
      const shares = JSON.parse(localStorage.getItem('property_shares') || '[]')
      shares.push({
        id: Date.now().toString(),
        ...logData,
        createdAt: new Date().toISOString()
      })
      localStorage.setItem('property_shares', JSON.stringify(shares))
      
      return { success: true }
    } catch (error) {
      console.error('Error logging property share:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Get property share history for a lead
   */
  async getPropertyShareHistory(leadId) {
    try {
      const shares = JSON.parse(localStorage.getItem('property_shares') || '[]')
      return shares.filter(share => share.leadId === leadId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } catch (error) {
      console.error('Error getting property share history:', error)
      return []
    }
  },

  /**
   * Create shareable property link
   */
  async createShareableLink(properties, brokerId) {
    try {
      // Generate unique share ID
      const shareId = Math.random().toString(36).substring(2, 15)
      
      // Store share data
      const shareData = {
        id: shareId,
        brokerId,
        properties: properties.map(p => p.id),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        views: 0
      }
      
      const shares = JSON.parse(localStorage.getItem('shareable_links') || '[]')
      shares.push(shareData)
      localStorage.setItem('shareable_links', JSON.stringify(shares))
      
      // Generate link
      const link = `${window.location.origin}/shared/${shareId}`
      
      return {
        success: true,
        link,
        shareId
      }
    } catch (error) {
      console.error('Error creating shareable link:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Get properties from shareable link
   */
  async getSharedProperties(shareId) {
    try {
      const shares = JSON.parse(localStorage.getItem('shareable_links') || '[]')
      const share = shares.find(s => s.id === shareId)
      
      if (!share) {
        return {
          success: false,
          error: 'Share link not found or expired'
        }
      }
      
      // Check if expired
      if (new Date(share.expiresAt) < new Date()) {
        return {
          success: false,
          error: 'This share link has expired'
        }
      }
      
      // Increment view count
      share.views += 1
      localStorage.setItem('shareable_links', JSON.stringify(shares))
      
      // Get properties
      const { data: properties, error } = await supabase
        .from('properties')
        .select('*')
        .in('id', share.properties)
      
      if (error) throw error
      
      return {
        success: true,
        properties,
        shareData: share
      }
    } catch (error) {
      console.error('Error getting shared properties:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Generate AI property description
   */
  async generatePropertyDescription(property) {
    // This would call OpenAI API in production
    // For now, generate a template description
    
    const highlights = []
    
    if (property.estimated_value && property.list_price) {
      const savings = property.estimated_value - property.list_price
      if (savings > 0) {
        highlights.push(`Save $${savings.toLocaleString()} below market value!`)
      }
    }
    
    if (property.bedrooms >= 4) {
      highlights.push('Spacious family home')
    }
    
    if (property.sqft > 2000) {
      highlights.push('Generous living space')
    }
    
    return {
      headline: `Beautiful ${property.bedrooms}-Bedroom HUD Home in ${property.city}`,
      description: `This ${property.property_type || 'home'} features ${property.bedrooms} bedrooms and ${property.bathrooms} bathrooms with ${property.sqft ? property.sqft.toLocaleString() + ' square feet' : 'ample space'}. ${highlights.join(' ')} Located in ${property.city}, ${property.state}. Perfect opportunity for first-time buyers or investors!`,
      highlights
    }
  }
}

export default propertyRecommendationService
