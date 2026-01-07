import { supabase } from '../config/supabase'

/**
 * Property Sharing Service
 * Handles sharing properties with leads via multiple channels and tracks engagement
 */

class PropertyShareService {
  /**
   * Share a property with a lead
   * @param {Object} shareData - Share configuration
   * @returns {Promise<Object>} Share result with tracking link
   */
  async shareProperty(shareData) {
    try {
      const {
        agentId,
        customerId,
        consultationId,
        propertyId,
        caseNumber,
        shareMethod, // 'email', 'sms', 'facebook', 'instagram', 'whatsapp', 'link'
        message,
        subject,
        includeAgentInfo = true,
        includePropertyDetails = true
      } = shareData

      // Generate unique tracking token
      const shareToken = this.generateShareToken()
      const shareLink = this.generateShareLink(shareToken, propertyId || caseNumber)

      // Create share record in database
      const { data: share, error } = await supabase
        .from('property_shares')
        .insert({
          agent_id: agentId,
          customer_id: customerId,
          consultation_id: consultationId,
          property_id: propertyId,
          case_number: caseNumber,
          share_method: shareMethod,
          message: message,
          subject: subject,
          share_link: shareLink,
          share_token: shareToken,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating share record:', error)
        return { success: false, error: error.message }
      }

      // Log the share event
      await this.logShareEvent(share.id, 'shared', {
        method: shareMethod,
        hasMessage: !!message,
        hasSubject: !!subject
      })

      // Send via selected channel
      let deliveryResult
      switch (shareMethod) {
        case 'email':
          deliveryResult = await this.sendViaEmail(share, shareData)
          break
        case 'sms':
          deliveryResult = await this.sendViaSMS(share, shareData)
          break
        case 'facebook':
        case 'instagram':
        case 'whatsapp':
          deliveryResult = await this.sendViaSocial(share, shareData)
          break
        case 'link':
          deliveryResult = { success: true, link: shareLink }
          break
        default:
          deliveryResult = { success: false, error: 'Invalid share method' }
      }

      return {
        success: true,
        share: share,
        shareLink: shareLink,
        shareToken: shareToken,
        delivery: deliveryResult
      }
    } catch (error) {
      console.error('Error sharing property:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Share multiple properties (collection)
   * @param {Object} collectionData - Collection configuration
   * @returns {Promise<Object>} Collection result
   */
  async sharePropertyCollection(collectionData) {
    try {
      const {
        agentId,
        customerId,
        consultationId,
        name,
        description,
        propertyIds,
        caseNumbers,
        shareMethod,
        message
      } = collectionData

      // Generate tracking token
      const shareToken = this.generateShareToken()
      const shareLink = this.generateCollectionLink(shareToken)

      // Create collection
      const { data: collection, error } = await supabase
        .from('property_collections')
        .insert({
          agent_id: agentId,
          customer_id: customerId,
          consultation_id: consultationId,
          name: name,
          description: description,
          property_ids: propertyIds,
          case_numbers: caseNumbers,
          is_shared: true,
          shared_at: new Date().toISOString(),
          share_link: shareLink,
          share_token: shareToken
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // Share each property individually for tracking
      const sharePromises = []
      
      if (propertyIds && propertyIds.length > 0) {
        propertyIds.forEach(propertyId => {
          sharePromises.push(
            this.shareProperty({
              agentId,
              customerId,
              consultationId,
              propertyId,
              shareMethod,
              message: `${message}\n\nPart of collection: ${name}`
            })
          )
        })
      }

      if (caseNumbers && caseNumbers.length > 0) {
        caseNumbers.forEach(caseNumber => {
          sharePromises.push(
            this.shareProperty({
              agentId,
              customerId,
              consultationId,
              caseNumber,
              shareMethod,
              message: `${message}\n\nPart of collection: ${name}`
            })
          )
        })
      }

      const shareResults = await Promise.all(sharePromises)

      return {
        success: true,
        collection: collection,
        shareLink: shareLink,
        shares: shareResults
      }
    } catch (error) {
      console.error('Error sharing collection:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Track property view
   * @param {string} shareToken - Share tracking token
   * @param {Object} viewData - View metadata
   */
  async trackView(shareToken, viewData = {}) {
    try {
      // Find share by token
      const { data: share, error: findError } = await supabase
        .from('property_shares')
        .select('*')
        .eq('share_token', shareToken)
        .single()

      if (findError || !share) {
        return { success: false, error: 'Share not found' }
      }

      // Update share record
      const updates = {
        view_count: (share.view_count || 0) + 1,
        last_viewed_at: new Date().toISOString()
      }

      if (!share.viewed_at) {
        updates.viewed_at = new Date().toISOString()
      }

      await supabase
        .from('property_shares')
        .update(updates)
        .eq('id', share.id)

      // Log event
      await this.logShareEvent(share.id, 'view', viewData)

      return { success: true, share: share }
    } catch (error) {
      console.error('Error tracking view:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Track property click
   * @param {string} shareToken - Share tracking token
   * @param {Object} clickData - Click metadata
   */
  async trackClick(shareToken, clickData = {}) {
    try {
      const { data: share, error: findError } = await supabase
        .from('property_shares')
        .select('*')
        .eq('share_token', shareToken)
        .single()

      if (findError || !share) {
        return { success: false, error: 'Share not found' }
      }

      const updates = {
        click_count: (share.click_count || 0) + 1,
        last_clicked_at: new Date().toISOString()
      }

      if (!share.clicked_at) {
        updates.clicked_at = new Date().toISOString()
      }

      await supabase
        .from('property_shares')
        .update(updates)
        .eq('id', share.id)

      await this.logShareEvent(share.id, 'click', clickData)

      return { success: true, share: share }
    } catch (error) {
      console.error('Error tracking click:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Record lead response to shared property
   * @param {string} shareId - Share ID
   * @param {string} responseStatus - Response status
   * @param {string} notes - Response notes
   */
  async recordResponse(shareId, responseStatus, notes = '') {
    try {
      const { data, error } = await supabase
        .from('property_shares')
        .update({
          response_status: responseStatus,
          response_notes: notes,
          responded_at: new Date().toISOString()
        })
        .eq('id', shareId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // Log event
      await this.logShareEvent(shareId, 'inquiry', {
        responseStatus,
        hasNotes: !!notes
      })

      // Create or update lead property interest
      if (data.customer_id && data.property_id) {
        await this.updateLeadInterest(data.customer_id, data.property_id, responseStatus, shareId)
      }

      return { success: true, data: data }
    } catch (error) {
      console.error('Error recording response:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update lead property interest
   */
  async updateLeadInterest(customerId, propertyId, interestLevel, shareId) {
    try {
      const interestLevelMap = {
        'interested': 'high',
        'showing_scheduled': 'high',
        'offer_made': 'high',
        'not_interested': 'not_interested',
        'no_response': 'unknown'
      }

      const { data, error } = await supabase
        .from('lead_property_interests')
        .upsert({
          customer_id: customerId,
          property_id: propertyId,
          interest_level: interestLevelMap[interestLevel] || 'medium',
          source: 'shared_property',
          source_share_id: shareId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'customer_id,property_id'
        })
        .select()

      return { success: !error, data, error }
    } catch (error) {
      console.error('Error updating lead interest:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get share analytics for an agent
   * @param {string} agentId - Agent ID
   * @param {Object} filters - Optional filters
   */
  async getShareAnalytics(agentId, filters = {}) {
    try {
      let query = supabase
        .from('property_share_analytics')
        .select('*')
        .eq('agent_id', agentId)
        .order('shared_at', { ascending: false })

      if (filters.customerId) {
        query = query.eq('customer_id', filters.customerId)
      }

      if (filters.startDate) {
        query = query.gte('shared_at', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('shared_at', filters.endDate)
      }

      const { data, error } = await query

      if (error) {
        return { success: false, error: error.message }
      }

      // Calculate summary stats
      const stats = {
        totalShares: data.length,
        totalViews: data.reduce((sum, s) => sum + (s.view_count || 0), 0),
        totalClicks: data.reduce((sum, s) => sum + (s.click_count || 0), 0),
        responseRate: data.filter(s => s.response_status).length / data.length * 100,
        interestedCount: data.filter(s => s.response_status === 'interested').length,
        showingsScheduled: data.filter(s => s.response_status === 'showing_scheduled').length
      }

      return {
        success: true,
        data: data,
        stats: stats
      }
    } catch (error) {
      console.error('Error getting share analytics:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get shares for a specific lead
   * @param {string} customerId - Customer ID
   */
  async getLeadShares(customerId) {
    try {
      const { data, error } = await supabase
        .from('property_shares')
        .select(`
          *,
          property:properties(*),
          agent:agents(first_name, last_name, email, phone)
        `)
        .eq('customer_id', customerId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data }
    } catch (error) {
      console.error('Error getting lead shares:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Log share event
   */
  async logShareEvent(shareId, eventType, eventData = {}) {
    try {
      await supabase
        .from('property_share_events')
        .insert({
          share_id: shareId,
          event_type: eventType,
          event_data: eventData,
          ip_address: eventData.ipAddress,
          user_agent: eventData.userAgent,
          device_type: eventData.deviceType,
          created_at: new Date().toISOString()
        })

      return { success: true }
    } catch (error) {
      console.error('Error logging share event:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Generate unique share token
   */
  generateShareToken() {
    return 'share_' + Date.now() + '_' + Math.random().toString(36).substr(2, 12)
  }

  /**
   * Generate share link
   */
  generateShareLink(token, propertyIdentifier) {
    const baseUrl = window.location.origin
    return `${baseUrl}/shared/property/${token}?ref=${propertyIdentifier}`
  }

  /**
   * Generate collection link
   */
  generateCollectionLink(token) {
    const baseUrl = window.location.origin
    return `${baseUrl}/shared/collection/${token}`
  }

  /**
   * Send property via email
   */
  async sendViaEmail(share, shareData) {
    try {
      // This would integrate with your email service (Resend)
      const emailData = {
        to: shareData.customerEmail,
        subject: share.subject || 'Check out this HUD property!',
        html: this.generateEmailHTML(share, shareData),
        trackingToken: share.share_token
      }

      // Call email API
      const response = await fetch('/api/send-property-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      })

      const result = await response.json()
      return { success: result.success, messageId: result.messageId }
    } catch (error) {
      console.error('Error sending email:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Send property via SMS
   */
  async sendViaSMS(share, shareData) {
    try {
      const smsData = {
        to: shareData.customerPhone,
        message: this.generateSMSMessage(share, shareData),
        trackingLink: share.share_link
      }

      // Call SMS API (Twilio)
      const response = await fetch('/api/send-property-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smsData)
      })

      const result = await response.json()
      return { success: result.success, messageId: result.messageId }
    } catch (error) {
      console.error('Error sending SMS:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Send via social media
   */
  async sendViaSocial(share, shareData) {
    // Placeholder for social media integration
    return {
      success: true,
      message: `Social media sharing for ${share.share_method} is coming soon!`,
      shareLink: share.share_link
    }
  }

  /**
   * Generate email HTML
   */
  generateEmailHTML(share, shareData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .property-card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏠 New HUD Property for You!</h1>
          </div>
          <div class="content">
            <p>Hi ${shareData.customerName || 'there'},</p>
            <p>${share.message || 'I found a property that might interest you!'}</p>
            
            <div class="property-card">
              <h2>${shareData.propertyAddress || 'HUD Home Opportunity'}</h2>
              <p><strong>Case Number:</strong> ${share.case_number || 'N/A'}</p>
              <p><strong>Price:</strong> ${shareData.propertyPrice || 'Contact for details'}</p>
              
              <a href="${share.share_link}" class="button">View Property Details</a>
            </div>
            
            <p>Click the button above to see photos, details, and schedule a showing!</p>
            
            <p>Best regards,<br>${shareData.agentName || 'Your Real Estate Agent'}</p>
          </div>
          <div class="footer">
            <p>This email was sent by ${shareData.agentCompany || 'USA HUD Homes'}</p>
            <p><a href="${share.share_link}">View in browser</a></p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Generate SMS message
   */
  generateSMSMessage(share, shareData) {
    return `Hi ${shareData.customerName || 'there'}! ${share.message || 'Check out this HUD property!'} View details: ${share.share_link} - ${shareData.agentName || 'Your Agent'}`
  }
}

export const propertyShareService = new PropertyShareService()
export default propertyShareService
