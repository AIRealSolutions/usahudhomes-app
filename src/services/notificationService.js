/**
 * Notification Service
 * Sends email/SMS notifications for new consultation inquiries
 */

/**
 * Send notification for new consultation
 * @param {Object} consultation - The consultation data
 * @returns {Promise<boolean>} Success status
 */
export async function sendConsultationNotification(consultation) {
  console.log('=== NOTIFICATION SERVICE CALLED ===')
  console.log('Consultation data received:', JSON.stringify(consultation, null, 2))
  
  try {
    console.log('Attempting to send notification...')
    
    const payload = {
      customer_name: consultation.customer_name,
      customer_email: consultation.customer_email,
      customer_phone: consultation.customer_phone,
      case_number: consultation.case_number,
      property_address: consultation.property_address,
      state: consultation.state,
      message: consultation.message
    }
    
    console.log('API payload:', JSON.stringify(payload, null, 2))
    
    // Call the serverless function
    console.log('Calling /api/send-notification...')
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    console.log('API response status:', response.status)
    console.log('API response ok:', response.ok)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Notification API error response:', errorText)
      try {
        const errorJson = JSON.parse(errorText)
        console.error('Notification API error (parsed):', errorJson)
      } catch (e) {
        console.error('Could not parse error as JSON')
      }
      return false
    }
    
    const data = await response.json()
    console.log('✅ Notification sent successfully!', data)
    return true
    
  } catch (error) {
    console.error('❌ ERROR sending notification:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    return false
  }
}

/**
 * Format phone number for display
 * @param {string} phone - Raw phone number
 * @returns {string} Formatted phone number
 */
export function formatPhoneNumber(phone) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}

/**
 * Get clickable phone link
 * @param {string} phone - Phone number
 * @returns {string} tel: link
 */
export function getPhoneLink(phone) {
  const digits = phone.replace(/\D/g, '')
  return `tel:${digits}`
}

/**
 * Get clickable SMS link
 * @param {string} phone - Phone number
 * @returns {string} sms: link
 */
export function getSMSLink(phone) {
  const digits = phone.replace(/\D/g, '')
  return `sms:${digits}`
}

/**
 * Get clickable email link
 * @param {string} email - Email address
 * @returns {string} mailto: link
 */
export function getEmailLink(email) {
  return `mailto:${email}`
}
