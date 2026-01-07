import { supabase } from '../config/supabase'
import { eventService, EVENT_TYPES, EVENT_CATEGORIES, EVENT_SOURCES } from './database/eventService'

/**
 * Facebook Leads Import Service
 * Handles importing leads from Facebook Lead Ads CSV exports
 */

class FacebookLeadsImportService {
  /**
   * Parse Facebook CSV file
   * @param {File} file - CSV file from Facebook
   * @returns {Promise<Object>} Parsed leads data
   */
  async parseCSV(file) {
    try {
      const text = await file.text()
      
      // Split into lines
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        return { success: false, error: 'CSV file is empty or invalid' }
      }

      // Parse header
      const headers = this.parseCSVLine(lines[0])
      
      // Parse data rows
      const leads = []
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i])
        if (values.length === headers.length) {
          const lead = {}
          headers.forEach((header, index) => {
            lead[header] = values[index]
          })
          leads.push(lead)
        }
      }

      return {
        success: true,
        leads: leads,
        count: leads.length
      }
    } catch (error) {
      console.error('Error parsing CSV:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Parse a single CSV line (handles quoted fields with tabs)
   */
  parseCSVLine(line) {
    const result = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"'
          i++
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
        }
      } else if (char === '\t' && !inQuotes) {
        // Field separator (tab)
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    // Add last field
    result.push(current.trim())
    
    return result
  }

  /**
   * Transform Facebook lead to consultation format
   * @param {Object} fbLead - Raw Facebook lead data
   * @returns {Object} Transformed consultation data
   */
  transformLead(fbLead) {
    // Extract name parts
    const fullName = fbLead.full_name || ''
    const nameParts = fullName.split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    // Clean phone number
    const phone = this.cleanPhoneNumber(fbLead.phone)

    // Clean email
    const email = (fbLead.email || '').trim().toLowerCase()

    // Parse budget
    const budget = this.parseBudget(fbLead['Purchase Price Range?'])

    // Parse location
    const location = this.parseLocation(fbLead['Areas of Interest?'])

    // Parse timeline
    const timeline = this.parseTimeline(fbLead['Time frame to buy?'])

    // Extract Facebook metadata
    const facebookId = fbLead.id || ''
    const createdTime = fbLead.created_time || new Date().toISOString()
    const platform = fbLead.platform || 'fb' // fb or ig
    const adName = fbLead.ad_name || ''
    const campaignName = fbLead.campaign_name || ''

    return {
      // Customer info
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      
      // Consultation details
      budget_min: budget.min,
      budget_max: budget.max,
      preferred_location: location.city,
      state: location.state,
      timeline: timeline,
      
      // Additional info
      notes: this.buildNotes(fbLead),
      
      // Source tracking
      source: 'facebook_lead_ad',
      source_details: {
        facebook_id: facebookId,
        platform: platform,
        ad_name: adName,
        campaign_name: campaignName,
        form_name: fbLead.form_name,
        created_time: createdTime,
        raw_budget: fbLead['Purchase Price Range?'],
        raw_location: fbLead['Areas of Interest?'],
        raw_timeline: fbLead['Time frame to buy?']
      },
      
      // Status
      status: 'new',
      priority: this.calculatePriority(timeline, budget.min),
      
      // Timestamps
      created_at: new Date(createdTime).toISOString(),
      consultation_date: new Date().toISOString()
    }
  }

  /**
   * Clean phone number to standard format
   */
  cleanPhoneNumber(phone) {
    if (!phone) return ''
    
    // Remove 'p:' prefix if present
    let cleaned = phone.replace(/^p:/, '')
    
    // Remove all non-digit characters except +
    cleaned = cleaned.replace(/[^\d+]/g, '')
    
    // If starts with +1, keep it; otherwise add it for US numbers
    if (!cleaned.startsWith('+')) {
      cleaned = '+1' + cleaned
    }
    
    return cleaned
  }

  /**
   * Parse budget from various formats
   */
  parseBudget(budgetStr) {
    if (!budgetStr) return { min: null, max: null }
    
    // Remove quotes and clean
    const cleaned = budgetStr.replace(/[",]/g, '').trim()
    
    // Handle "No", "Yes", "don't know", etc.
    if (/^(no|yes|don'?t know|any)$/i.test(cleaned)) {
      return { min: null, max: null }
    }
    
    // Extract numbers
    const numbers = cleaned.match(/\d+/g)
    if (!numbers || numbers.length === 0) {
      return { min: null, max: null }
    }
    
    // Convert to integers
    const values = numbers.map(n => parseInt(n))
    
    // Handle range (e.g., "300.000-600.000" or "65,000-75,000")
    if (values.length >= 2) {
      return {
        min: Math.min(...values),
        max: Math.max(...values)
      }
    }
    
    // Single value
    return {
      min: values[0],
      max: values[0]
    }
  }

  /**
   * Parse location from various formats
   */
  parseLocation(locationStr) {
    if (!locationStr) return { city: '', state: '' }
    
    // Remove quotes and clean
    const cleaned = locationStr.replace(/"/g, '').trim()
    
    // Handle "Any"
    if (/^any$/i.test(cleaned)) {
      return { city: '', state: '' }
    }
    
    // Try to extract state abbreviations (e.g., "Walterbo SC", "Roper nc")
    const stateMatch = cleaned.match(/\b([A-Z]{2})\b/i)
    const state = stateMatch ? stateMatch[1].toUpperCase() : ''
    
    // Extract city (everything before state or full string)
    let city = cleaned
    if (state) {
      city = cleaned.replace(new RegExp(`\\s*${state}\\s*$`, 'i'), '').trim()
    }
    
    // Handle ZIP codes (5 digits)
    const zipMatch = cleaned.match(/\b\d{5}\b/)
    if (zipMatch && !city) {
      city = zipMatch[0]
    }
    
    return {
      city: city,
      state: state
    }
  }

  /**
   * Parse timeline from various formats
   */
  parseTimeline(timelineStr) {
    if (!timelineStr) return ''
    
    // Remove quotes and clean
    const cleaned = timelineStr.replace(/"/g, '').trim().toLowerCase()
    
    // Normalize common patterns
    if (/asap|immediately|now/i.test(cleaned)) {
      return 'ASAP'
    }
    if (/1\s*-?\s*3\s*month/i.test(cleaned)) {
      return '1-3 months'
    }
    if (/3\s*-?\s*6\s*month/i.test(cleaned)) {
      return '3-6 months'
    }
    if (/6\s*month/i.test(cleaned)) {
      return '6 months'
    }
    if (/1\s*year/i.test(cleaned)) {
      return '1 year'
    }
    if (/60\s*day/i.test(cleaned)) {
      return '60 days'
    }
    
    // Return original if no pattern matched
    return cleaned
  }

  /**
   * Build notes from Facebook lead data
   */
  buildNotes(fbLead) {
    const notes = []
    
    // Add budget info
    if (fbLead['Purchase Price Range?']) {
      notes.push(`Budget: ${fbLead['Purchase Price Range?']}`)
    }
    
    // Add location info
    if (fbLead['Areas of Interest?']) {
      notes.push(`Location: ${fbLead['Areas of Interest?']}`)
    }
    
    // Add timeline
    if (fbLead['Time frame to buy?']) {
      notes.push(`Timeline: ${fbLead['Time frame to buy?']}`)
    }
    
    // Add platform
    notes.push(`Source: Facebook ${fbLead.platform === 'ig' ? 'Instagram' : 'Lead'} Ad`)
    
    // Add campaign info
    if (fbLead.campaign_name) {
      notes.push(`Campaign: ${fbLead.campaign_name}`)
    }
    
    return notes.join('\n')
  }

  /**
   * Calculate priority based on timeline and budget
   */
  calculatePriority(timeline, budget) {
    const timelineLower = (timeline || '').toLowerCase()
    
    // High priority: ASAP or high budget
    if (timelineLower.includes('asap') || timelineLower.includes('immediately')) {
      return 'high'
    }
    if (budget && budget >= 200000) {
      return 'high'
    }
    
    // Medium priority: 1-3 months
    if (timelineLower.includes('1') || timelineLower.includes('60 day')) {
      return 'medium'
    }
    
    // Low priority: 6+ months
    if (timelineLower.includes('6 month') || timelineLower.includes('year')) {
      return 'low'
    }
    
    return 'medium'
  }

  /**
   * Import leads into database
   * @param {Array} leads - Array of transformed lead objects
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Import results
   */
  async importLeads(leads, options = {}) {
    const {
      skipDuplicates = true,
      assignToAgent = null,
      defaultStatus = 'new'
    } = options

    const results = {
      success: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      imported: []
    }

    for (const lead of leads) {
      try {
        // Check for duplicates by email or phone
        if (skipDuplicates) {
          const { data: existing } = await supabase
            .from('consultations')
            .select('id, email, phone')
            .or(`email.eq.${lead.email},phone.eq.${lead.phone}`)
            .limit(1)

          if (existing && existing.length > 0) {
            results.skipped++
            continue
          }
        }

        // Create customer first
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .insert({
            first_name: lead.first_name,
            last_name: lead.last_name,
            email: lead.email,
            phone: lead.phone,
            lead_source: 'facebook_lead_ad',
            created_at: lead.created_at
          })
          .select()
          .single()

        if (customerError) {
          results.failed++
          results.errors.push({
            lead: `${lead.first_name} ${lead.last_name}`,
            error: customerError.message
          })
          continue
        }

        // Create consultation
        const consultationData = {
          customer_id: customer.id,
          first_name: lead.first_name,
          last_name: lead.last_name,
          email: lead.email,
          phone: lead.phone,
          budget_min: lead.budget_min,
          budget_max: lead.budget_max,
          preferred_location: lead.preferred_location,
          state: lead.state,
          timeline: lead.timeline,
          notes: lead.notes,
          source: lead.source,
          source_details: lead.source_details,
          status: defaultStatus,
          priority: lead.priority,
          consultation_date: lead.consultation_date,
          created_at: lead.created_at
        }

        // Assign to agent if specified
        if (assignToAgent) {
          consultationData.assigned_agent_id = assignToAgent
        }

        const { data: consultation, error: consultationError } = await supabase
          .from('consultations')
          .insert(consultationData)
          .select()
          .single()

        if (consultationError) {
          results.failed++
          results.errors.push({
            lead: `${lead.first_name} ${lead.last_name}`,
            error: consultationError.message
          })
          continue
        }

        // Log Facebook lead import event with all original data
        try {
          await eventService.logEvent({
            customerId: customer.id,
            consultationId: consultation.id,
            agentId: assignToAgent || null,
            eventType: EVENT_TYPES.FACEBOOK_LEAD_IMPORTED,
            eventCategory: EVENT_CATEGORIES.ONBOARDING,
            eventTitle: 'Facebook Lead Imported',
            eventDescription: `Lead imported from Facebook ${lead.source_details.platform === 'ig' ? 'Instagram' : 'Lead'} Ad`,
            eventData: {
              facebook_id: lead.source_details.facebook_id,
              platform: lead.source_details.platform,
              campaign_name: lead.source_details.campaign_name,
              ad_name: lead.source_details.ad_name,
              form_name: lead.source_details.form_name,
              created_time: lead.source_details.created_time,
              original_data: {
                full_name: `${lead.first_name} ${lead.last_name}`,
                email: lead.email,
                phone: lead.phone,
                raw_budget: lead.source_details.raw_budget,
                raw_location: lead.source_details.raw_location,
                raw_timeline: lead.source_details.raw_timeline
              },
              parsed_data: {
                budget_min: lead.budget_min,
                budget_max: lead.budget_max,
                preferred_location: lead.preferred_location,
                state: lead.state,
                timeline: lead.timeline,
                priority: lead.priority
              }
            },
            source: EVENT_SOURCES.SYSTEM
          })
        } catch (eventError) {
          console.error('Failed to log Facebook import event:', eventError)
          // Don't fail the import if event logging fails
        }

        results.success++
        results.imported.push(consultation)
      } catch (error) {
        results.failed++
        results.errors.push({
          lead: `${lead.first_name} ${lead.last_name}`,
          error: error.message
        })
      }
    }

    return {
      success: true,
      results: results
    }
  }

  /**
   * Preview leads before import (validate and transform)
   * @param {File} file - CSV file
   * @returns {Promise<Object>} Preview data
   */
  async previewImport(file) {
    try {
      // Parse CSV
      const parseResult = await this.parseCSV(file)
      if (!parseResult.success) {
        return parseResult
      }

      // Transform leads
      const transformedLeads = parseResult.leads.map(lead => 
        this.transformLead(lead)
      )

      // Validate leads
      const validation = this.validateLeads(transformedLeads)

      return {
        success: true,
        leads: transformedLeads,
        count: transformedLeads.length,
        validation: validation
      }
    } catch (error) {
      console.error('Error previewing import:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Validate transformed leads
   */
  validateLeads(leads) {
    const validation = {
      valid: 0,
      invalid: 0,
      warnings: []
    }

    leads.forEach((lead, index) => {
      let isValid = true
      
      // Check required fields
      if (!lead.first_name) {
        validation.warnings.push(`Row ${index + 1}: Missing first name`)
        isValid = false
      }
      if (!lead.email && !lead.phone) {
        validation.warnings.push(`Row ${index + 1}: Missing both email and phone`)
        isValid = false
      }
      if (lead.email && !this.isValidEmail(lead.email)) {
        validation.warnings.push(`Row ${index + 1}: Invalid email format`)
        isValid = false
      }
      
      if (isValid) {
        validation.valid++
      } else {
        validation.invalid++
      }
    })

    return validation
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}

export const facebookLeadsImportService = new FacebookLeadsImportService()
export default facebookLeadsImportService
