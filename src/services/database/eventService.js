/**
 * Customer Events Service
 * Comprehensive event logging for customer lifecycle tracking
 */

import { supabase, TABLES, formatSupabaseResponse } from '../../config/supabase'

// Event types enum
export const EVENT_TYPES = {
  // Onboarding
  CUSTOMER_CREATED: 'customer_created',
  CUSTOMER_UPDATED: 'customer_updated',
  CUSTOMER_DELETED: 'customer_deleted',
  
  // Consultations
  CONSULTATION_CREATED: 'consultation_created',
  CONSULTATION_ASSIGNED: 'consultation_assigned',
  CONSULTATION_REASSIGNED: 'consultation_reassigned',
  CONSULTATION_STATUS_CHANGED: 'consultation_status_changed',
  CONSULTATION_UPDATED: 'consultation_updated',
  CONSULTATION_COMPLETED: 'consultation_completed',
  CONSULTATION_CANCELLED: 'consultation_cancelled',
  
  // Referrals
  REFERRAL_SENT: 'referral_sent',
  REFERRAL_ACCEPTED: 'referral_accepted',
  REFERRAL_DECLINED: 'referral_declined',
  REFERRAL_EXPIRED: 'referral_expired',
  
  // Communications
  EMAIL_SENT: 'email_sent',
  EMAIL_OPENED: 'email_opened',
  EMAIL_CLICKED: 'email_clicked',
  SMS_SENT: 'sms_sent',
  SMS_DELIVERED: 'sms_delivered',
  SMS_FAILED: 'sms_failed',
  CALL_MADE: 'call_made',
  CALL_RECEIVED: 'call_received',
  CALL_MISSED: 'call_missed',
  VOICEMAIL_LEFT: 'voicemail_left',
  
  // Interactions
  NOTE_ADDED: 'note_added',
  DOCUMENT_UPLOADED: 'document_uploaded',
  DOCUMENT_VIEWED: 'document_viewed',
  PROPERTY_VIEWED: 'property_viewed',
  PROPERTY_FAVORITED: 'property_favorited',
  PROPERTY_SHARED: 'property_shared',
  
  // Status Changes
  STATUS_CHANGED: 'status_changed',
  PRIORITY_CHANGED: 'priority_changed',
  TAG_ADDED: 'tag_added',
  TAG_REMOVED: 'tag_removed',
  
  // System Events
  LOGIN: 'login',
  LOGOUT: 'logout',
  PASSWORD_RESET: 'password_reset',
  PROFILE_UPDATED: 'profile_updated',
  NOTIFICATION_SENT: 'notification_sent'
}

// Event categories enum
export const EVENT_CATEGORIES = {
  ONBOARDING: 'onboarding',
  CONSULTATION: 'consultation',
  COMMUNICATION: 'communication',
  INTERACTION: 'interaction',
  STATUS: 'status',
  SYSTEM: 'system'
}

// Event source enum
export const EVENT_SOURCES = {
  SYSTEM: 'system',
  ADMIN: 'admin',
  BROKER: 'broker',
  CUSTOMER: 'customer',
  API: 'api'
}

class EventService {
  /**
   * Log a customer event
   * @param {Object} eventData - Event information
   * @returns {Promise<Object>} Created event
   */
  async logEvent(eventData) {
    try {
      const {
        customerId,
        consultationId = null,
        agentId = null,
        eventType,
        eventCategory,
        eventTitle,
        eventDescription = null,
        eventData: data = {},
        source = EVENT_SOURCES.SYSTEM,
        ipAddress = null,
        userAgent = null
      } = eventData

      // Validate required fields
      if (!customerId || !eventType || !eventCategory || !eventTitle) {
        console.error('Missing required event fields:', eventData)
        return { success: false, error: 'Missing required event fields', data: null }
      }

      const { data: event, error } = await supabase
        .from(TABLES.CUSTOMER_EVENTS)
        .insert([{
          customer_id: customerId,
          consultation_id: consultationId,
          agent_id: agentId,
          event_type: eventType,
          event_category: eventCategory,
          event_title: eventTitle,
          event_description: eventDescription,
          event_data: data,
          source: source,
          ip_address: ipAddress,
          user_agent: userAgent
        }])
        .select()

      if (error) {
        console.error('Error logging event:', error)
        return { success: false, error: error.message, data: null }
      }

      return { success: true, data: event && event.length > 0 ? event[0] : null }
    } catch (error) {
      console.error('Error in logEvent:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Get all events for a customer
   * @param {string} customerId - Customer UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} List of events
   */
  async getCustomerEvents(customerId, filters = {}) {
    try {
      let query = supabase
        .from(TABLES.CUSTOMER_EVENTS)
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (filters.eventCategory) {
        query = query.eq('event_category', filters.eventCategory)
      }
      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType)
      }
      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching customer events:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  /**
   * Get events for a consultation
   * @param {string} consultationId - Consultation UUID
   * @returns {Promise<Array>} List of events
   */
  async getConsultationEvents(consultationId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.CUSTOMER_EVENTS)
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: false })

      return formatSupabaseResponse(data, error)
    } catch (error) {
      console.error('Error fetching consultation events:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  /**
   * Get customer event summary
   * @param {string} customerId - Customer UUID
   * @returns {Promise<Object>} Event summary statistics
   */
  async getCustomerEventSummary(customerId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.CUSTOMER_EVENTS)
        .select('event_type, event_category, created_at')
        .eq('customer_id', customerId)

      if (error) {
        return { success: false, error: error.message, data: null }
      }

      // Calculate summary statistics
      const summary = {
        totalEvents: data.length,
        totalCommunications: data.filter(e => e.event_category === EVENT_CATEGORIES.COMMUNICATION).length,
        totalEmails: data.filter(e => e.event_type === EVENT_TYPES.EMAIL_SENT).length,
        totalSMS: data.filter(e => e.event_type === EVENT_TYPES.SMS_SENT).length,
        totalCalls: data.filter(e => e.event_type === EVENT_TYPES.CALL_MADE).length,
        lastContactDate: null,
        firstContactDate: null
      }

      const communications = data
        .filter(e => e.event_category === EVENT_CATEGORIES.COMMUNICATION)
        .map(e => new Date(e.created_at))
        .sort((a, b) => b - a)

      if (communications.length > 0) {
        summary.lastContactDate = communications[0]
        summary.firstContactDate = communications[communications.length - 1]
      }

      return { success: true, data: summary }
    } catch (error) {
      console.error('Error getting event summary:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  // ============================================
  // Convenience methods for common events
  // ============================================

  /**
   * Log customer onboarding
   */
  async logCustomerCreated(customerId, customerData) {
    return this.logEvent({
      customerId,
      eventType: EVENT_TYPES.CUSTOMER_CREATED,
      eventCategory: EVENT_CATEGORIES.ONBOARDING,
      eventTitle: 'Customer Profile Created',
      eventDescription: `New customer ${customerData.name} was added to the system`,
      eventData: {
        customer_name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        state: customerData.state,
        lead_source: customerData.leadSource || 'website'
      },
      source: EVENT_SOURCES.SYSTEM
    })
  }

  /**
   * Log consultation creation
   */
  async logConsultationCreated(customerId, consultationId, consultationData) {
    return this.logEvent({
      customerId,
      consultationId,
      eventType: EVENT_TYPES.CONSULTATION_CREATED,
      eventCategory: EVENT_CATEGORIES.CONSULTATION,
      eventTitle: 'Consultation Request Submitted',
      eventDescription: `Customer submitted a ${consultationData.type || 'general'} consultation request`,
      eventData: {
        consultation_type: consultationData.type,
        case_number: consultationData.caseNumber,
        message: consultationData.message
      },
      source: EVENT_SOURCES.CUSTOMER
    })
  }

  /**
   * Log consultation assignment
   */
  async logConsultationAssigned(customerId, consultationId, agentId, agentName) {
    return this.logEvent({
      customerId,
      consultationId,
      agentId,
      eventType: EVENT_TYPES.CONSULTATION_ASSIGNED,
      eventCategory: EVENT_CATEGORIES.CONSULTATION,
      eventTitle: 'Consultation Assigned to Broker',
      eventDescription: `Consultation was assigned to ${agentName}`,
      eventData: {
        agent_id: agentId,
        agent_name: agentName
      },
      source: EVENT_SOURCES.ADMIN
    })
  }

  /**
   * Log referral acceptance
   */
  async logReferralAccepted(customerId, consultationId, agentId, agentName) {
    return this.logEvent({
      customerId,
      consultationId,
      agentId,
      eventType: EVENT_TYPES.REFERRAL_ACCEPTED,
      eventCategory: EVENT_CATEGORIES.CONSULTATION,
      eventTitle: 'Referral Accepted by Broker',
      eventDescription: `${agentName} accepted the referral`,
      eventData: {
        agent_id: agentId,
        agent_name: agentName
      },
      source: EVENT_SOURCES.BROKER
    })
  }

  /**
   * Log email sent
   */
  async logEmailSent(customerId, consultationId, agentId, emailData) {
    return this.logEvent({
      customerId,
      consultationId,
      agentId,
      eventType: EVENT_TYPES.EMAIL_SENT,
      eventCategory: EVENT_CATEGORIES.COMMUNICATION,
      eventTitle: 'Email Sent to Customer',
      eventDescription: `Email: "${emailData.subject}"`,
      eventData: {
        to: emailData.to,
        subject: emailData.subject,
        preview: emailData.body?.substring(0, 100)
      },
      source: EVENT_SOURCES.BROKER
    })
  }

  /**
   * Log SMS sent
   */
  async logSMSSent(customerId, consultationId, agentId, smsData) {
    return this.logEvent({
      customerId,
      consultationId,
      agentId,
      eventType: EVENT_TYPES.SMS_SENT,
      eventCategory: EVENT_CATEGORIES.COMMUNICATION,
      eventTitle: 'SMS Sent to Customer',
      eventDescription: `SMS: "${smsData.message?.substring(0, 50)}..."`,
      eventData: {
        to: smsData.to,
        message: smsData.message
      },
      source: EVENT_SOURCES.BROKER
    })
  }

  /**
   * Log call made
   */
  async logCallMade(customerId, consultationId, agentId, callData) {
    return this.logEvent({
      customerId,
      consultationId,
      agentId,
      eventType: EVENT_TYPES.CALL_MADE,
      eventCategory: EVENT_CATEGORIES.COMMUNICATION,
      eventTitle: 'Phone Call Made to Customer',
      eventDescription: `Called ${callData.phone}`,
      eventData: {
        phone: callData.phone,
        duration: callData.duration,
        notes: callData.notes
      },
      source: EVENT_SOURCES.BROKER
    })
  }

  /**
   * Log status change
   */
  async logStatusChanged(customerId, consultationId, agentId, oldStatus, newStatus) {
    return this.logEvent({
      customerId,
      consultationId,
      agentId,
      eventType: EVENT_TYPES.CONSULTATION_STATUS_CHANGED,
      eventCategory: EVENT_CATEGORIES.STATUS,
      eventTitle: `Status Changed: ${oldStatus} → ${newStatus}`,
      eventDescription: `Consultation status updated from ${oldStatus} to ${newStatus}`,
      eventData: {
        old_status: oldStatus,
        new_status: newStatus
      },
      source: EVENT_SOURCES.BROKER
    })
  }

  /**
   * Log note added
   */
  async logNoteAdded(customerId, consultationId, agentId, noteData) {
    return this.logEvent({
      customerId,
      consultationId,
      agentId,
      eventType: EVENT_TYPES.NOTE_ADDED,
      eventCategory: EVENT_CATEGORIES.INTERACTION,
      eventTitle: 'Note Added',
      eventDescription: noteData.note?.substring(0, 100),
      eventData: {
        note: noteData.note
      },
      source: EVENT_SOURCES.BROKER
    })
  }
}

// Export singleton instance
export const eventService = new EventService()
export default eventService
