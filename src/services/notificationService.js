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
  try {
    console.log('Sending notification for:', consultation.customer_name)
    
    // Call the serverless function
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_name: consultation.customer_name,
        customer_email: consultation.customer_email,
        customer_phone: consultation.customer_phone,
        case_number: consultation.case_number,
        property_address: consultation.property_address,
        state: consultation.state,
        message: consultation.message
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      console.error('Notification API error:', error)
      return false
    }
    
    const data = await response.json()
    console.log('Notification sent successfully:', data)
    return true
    
  } catch (error) {
    console.error('Error sending notification:', error)
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
