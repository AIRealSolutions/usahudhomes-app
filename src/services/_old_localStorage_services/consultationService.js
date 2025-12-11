// Consultation Service for handling form submissions and lead management
// This service manages consultation requests and integrates with email notifications

class ConsultationService {
  constructor() {
    this.consultations = new Map()
    this.initializeService()
  }

  initializeService() {
    // Load existing consultations from localStorage if available
    const stored = localStorage.getItem('hudConsultations')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        this.consultations = new Map(data)
      } catch (error) {
        console.error('Error loading stored consultations:', error)
      }
    }
  }

  // Submit a new consultation request
  async submitConsultation(formData, propertyData) {
    const consultation = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      property: {
        caseNumber: propertyData?.id || 'unknown',
        address: propertyData?.address || 'N/A',
        city: propertyData?.city || 'N/A',
        state: propertyData?.state || 'N/A',
        price: propertyData?.price || 0
      },
      client: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        preferredContact: formData.preferredContact || 'phone'
      },
      consultation: {
        type: formData.consultationType || 'general',
        message: formData.message || '',
        urgency: this.calculateUrgency(propertyData),
        status: 'pending'
      },
      source: 'property_consultation_page'
    }

    // Store consultation
    this.consultations.set(consultation.id, consultation)
    this.saveToStorage()

    // Send notification email (simulated)
    await this.sendNotificationEmail(consultation)

    // Send confirmation to client (simulated)
    await this.sendConfirmationEmail(consultation)

    return consultation
  }

  // Generate unique ID for consultation
  generateId() {
    return 'CONS-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
  }

  // Calculate urgency based on property bid deadline
  calculateUrgency(propertyData) {
    if (!propertyData?.bidDeadline) return 'normal'

    const now = new Date()
    const deadline = new Date(propertyData.bidDeadline)
    const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))

    if (daysRemaining <= 1) return 'urgent'
    if (daysRemaining <= 3) return 'high'
    if (daysRemaining <= 7) return 'medium'
    return 'normal'
  }

  // Send notification email to Marc Spencer (simulated)
  async sendNotificationEmail(consultation) {
    const emailData = {
      to: 'marcspencer28461@gmail.com',
      subject: `New HUD Property Consultation Request - ${consultation.property.caseNumber}`,
      body: this.generateNotificationEmailBody(consultation)
    }

    // In a real application, this would integrate with an email service
    console.log('Notification email sent:', emailData)
    
    // Simulate email sending delay
    return new Promise(resolve => setTimeout(resolve, 500))
  }

  // Send confirmation email to client (simulated)
  async sendConfirmationEmail(consultation) {
    const emailData = {
      to: consultation.client.email,
      subject: 'Your HUD Property Consultation Request Received',
      body: this.generateConfirmationEmailBody(consultation)
    }

    // In a real application, this would integrate with an email service
    console.log('Confirmation email sent:', emailData)
    
    // Simulate email sending delay
    return new Promise(resolve => setTimeout(resolve, 500))
  }

  // Generate notification email body for Marc Spencer
  generateNotificationEmailBody(consultation) {
    const urgencyEmoji = {
      urgent: '🚨',
      high: '⚠️',
      medium: '⏰',
      normal: '📋'
    }

    return `
${urgencyEmoji[consultation.consultation.urgency]} NEW HUD PROPERTY CONSULTATION REQUEST

PROPERTY DETAILS:
• Case Number: ${consultation.property.caseNumber}
• Address: ${consultation.property.address}
• Location: ${consultation.property.city}, ${consultation.property.state}
• Price: $${consultation.property.price.toLocaleString()}

CLIENT INFORMATION:
• Name: ${consultation.client.name}
• Email: ${consultation.client.email}
• Phone: ${consultation.client.phone}
• Preferred Contact: ${consultation.client.preferredContact}

CONSULTATION DETAILS:
• Type: ${consultation.consultation.type}
• Urgency: ${consultation.consultation.urgency.toUpperCase()}
• Message: ${consultation.consultation.message || 'No additional message'}

NEXT STEPS:
${consultation.consultation.urgency === 'urgent' 
  ? '⚠️ URGENT: Contact client immediately - bid deadline is within 24 hours!'
  : consultation.consultation.urgency === 'high'
  ? '⏰ HIGH PRIORITY: Contact within 2 hours - bid deadline approaching'
  : '📞 Contact client within 2 hours during business hours'
}

Consultation ID: ${consultation.id}
Submitted: ${new Date(consultation.timestamp).toLocaleString()}

---
USAhudHomes.com Property Consultation System
Lightkeeper Realty - "Helping people bid on HUD homes for 25 years"
    `.trim()
  }

  // Generate confirmation email body for client
  generateConfirmationEmailBody(consultation) {
    return `
Dear ${consultation.client.name},

Thank you for your interest in the HUD property at ${consultation.property.address}!

CONSULTATION REQUEST CONFIRMED
Your consultation request has been received and Marc Spencer from Lightkeeper Realty will contact you within 2 hours during business hours.

PROPERTY DETAILS:
• Case Number: ${consultation.property.caseNumber}
• Address: ${consultation.property.address}
• Location: ${consultation.property.city}, ${consultation.property.state}
• Price: $${consultation.property.price.toLocaleString()}

YOUR CONTACT INFORMATION:
• Preferred Contact Method: ${consultation.client.preferredContact}
• Phone: ${consultation.client.phone}
• Email: ${consultation.client.email}

WHAT HAPPENS NEXT:
1. Marc Spencer will contact you via ${consultation.client.preferredContact} within 2 hours
2. He'll answer all your questions about this property and the HUD buying process
3. If interested, he'll help you prepare and submit your bid
4. Free consultation and expert guidance throughout the entire process

ABOUT MARC SPENCER & LIGHTKEEPER REALTY:
• 25+ years of HUD home experience
• Registered HUD Buyer's Agency
• Specializes in owner-occupant benefits ($100 down, 3% closing cost assistance)
• Expert in 203k renovation loans
• Free consultations and competitive commission rates

URGENT REMINDERS:
${consultation.consultation.urgency === 'urgent' 
  ? '⚠️ URGENT: The bid deadline for this property is within 24 hours! Marc will contact you immediately.'
  : consultation.consultation.urgency === 'high'
  ? '⏰ The bid deadline is approaching soon. Marc will prioritize your consultation.'
  : '📅 Marc will contact you promptly to discuss this opportunity.'
}

CONTACT INFORMATION:
Marc Spencer, Broker
Lightkeeper Realty
Phone: (910) 363-6147
Email: marcspencer28461@gmail.com

Questions? Feel free to call Marc directly at (910) 363-6147.

Best regards,
The USAhudHomes.com Team

---
Consultation ID: ${consultation.id}
This is an automated confirmation. Please do not reply to this email.
    `.trim()
  }

  // Get consultation by ID
  getConsultation(id) {
    return this.consultations.get(id)
  }

  // Get all consultations
  getAllConsultations() {
    return Array.from(this.consultations.values())
  }

  // Get consultations by status
  getConsultationsByStatus(status) {
    return Array.from(this.consultations.values()).filter(
      consultation => consultation.consultation.status === status
    )
  }

  // Get consultations by urgency
  getConsultationsByUrgency(urgency) {
    return Array.from(this.consultations.values()).filter(
      consultation => consultation.consultation.urgency === urgency
    )
  }

  // Update consultation status
  updateConsultationStatus(id, status, notes = '') {
    const consultation = this.consultations.get(id)
    if (consultation) {
      consultation.consultation.status = status
      consultation.consultation.lastUpdated = new Date().toISOString()
      if (notes) {
        consultation.consultation.notes = notes
      }
      this.saveToStorage()
      return consultation
    }
    return null
  }

  // Get consultation statistics
  getStatistics() {
    const consultations = Array.from(this.consultations.values())
    const today = new Date().toDateString()
    const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    return {
      total: consultations.length,
      today: consultations.filter(c => new Date(c.timestamp).toDateString() === today).length,
      thisWeek: consultations.filter(c => new Date(c.timestamp) >= thisWeek).length,
      byStatus: {
        pending: consultations.filter(c => c.consultation.status === 'pending').length,
        contacted: consultations.filter(c => c.consultation.status === 'contacted').length,
        completed: consultations.filter(c => c.consultation.status === 'completed').length
      },
      byUrgency: {
        urgent: consultations.filter(c => c.consultation.urgency === 'urgent').length,
        high: consultations.filter(c => c.consultation.urgency === 'high').length,
        medium: consultations.filter(c => c.consultation.urgency === 'medium').length,
        normal: consultations.filter(c => c.consultation.urgency === 'normal').length
      }
    }
  }

  // Save consultations to localStorage
  saveToStorage() {
    try {
      const data = Array.from(this.consultations.entries())
      localStorage.setItem('hudConsultations', JSON.stringify(data))
    } catch (error) {
      console.error('Error saving consultations to storage:', error)
    }
  }

  // Validate form data
  validateFormData(formData) {
    const errors = []

    if (!formData.name || formData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long')
    }

    if (!formData.email || !this.isValidEmail(formData.email)) {
      errors.push('Please provide a valid email address')
    }

    if (!formData.phone || !this.isValidPhone(formData.phone)) {
      errors.push('Please provide a valid phone number')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Email validation
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Phone validation
  isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '')
    return cleanPhone.length >= 10 && phoneRegex.test(cleanPhone)
  }

  // Get consultation types
  getConsultationTypes() {
    return [
      { value: 'general', label: 'General Information', description: 'Basic questions about the property and process' },
      { value: 'financing', label: 'Financing Options', description: 'FHA loans, down payments, and qualification' },
      { value: 'bidding', label: 'Bidding Process', description: 'How to submit bids and competitive strategies' },
      { value: 'inspection', label: 'Property Inspection', description: 'Scheduling inspections and what to look for' },
      { value: '203k', label: '203k Renovation Loan', description: 'Financing repairs and improvements' },
      { value: 'investment', label: 'Investment Property', description: 'Buying HUD homes as rental properties' },
      { value: 'timeline', label: 'Timeline & Process', description: 'Step-by-step buying process and deadlines' }
    ]
  }

  // Get quick consultation templates
  getQuickTemplates() {
    return {
      firstTime: "I'm a first-time homebuyer interested in this HUD property. Can you explain the process and financing options?",
      investor: "I'm an investor looking at this property. What are the requirements and timeline for investment purchases?",
      urgent: "I need to submit a bid soon. Can you help me understand the process and prepare my offer?",
      financing: "I'd like to know about financing options, especially the $100 down payment and 203k loans.",
      inspection: "When can I inspect this property and what should I look for in a HUD home?"
    }
  }
}

// Create and export singleton instance
const consultationService = new ConsultationService()
export default consultationService
