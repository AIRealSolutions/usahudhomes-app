/**
 * Notification Service
 * Sends email notifications for new consultation inquiries
 */

const NOTIFICATION_EMAIL = '9103636147@verizon.net'
const NOTIFICATION_API_URL = 'https://api.usahudhomes.com/send-notification' // You'll need to set this up

/**
 * Send notification for new consultation
 * @param {Object} consultation - The consultation data
 * @returns {Promise<boolean>} Success status
 */
export async function sendConsultationNotification(consultation) {
  try {
    // Format phone number for links
    const phoneDigits = consultation.customer_phone.replace(/\D/g, '')
    
    // Create the notification message
    const subject = `New HUD Inquiry: ${consultation.customer_name}`
    
    const message = `
NEW CONSULTATION REQUEST

Name: ${consultation.customer_name}
Phone: ${consultation.customer_phone}
Email: ${consultation.customer_email}

Property: ${consultation.property_address || 'Not specified'}
Case: ${consultation.case_number || 'Not specified'}
State: ${consultation.state || 'Not specified'}

${consultation.message ? `Message: ${consultation.message}` : ''}

QUICK ACTIONS:
Call: tel:${phoneDigits}
Text: sms:${phoneDigits}
Email: mailto:${consultation.customer_email}

View Details: https://usahudhomes.com/broker-dashboard
`.trim()

    // For now, we'll use a simple mailto approach as a fallback
    // In production, you'd want to use a proper email service
    console.log('Sending notification:', { subject, message, to: NOTIFICATION_EMAIL })
    
    // Option 1: Use Supabase Edge Function (recommended)
    // Uncomment when Edge Function is deployed
    /*
    const { data, error } = await supabase.functions.invoke('send-consultation-notification', {
      body: { consultation }
    })
    
    if (error) throw error
    return true
    */
    
    // Option 2: Use a third-party email service (Resend, SendGrid, etc.)
    // This requires setting up an API endpoint
    
    // For now, just log it (you'll need to set up the actual email service)
    console.log('Notification would be sent to:', NOTIFICATION_EMAIL)
    console.log('Subject:', subject)
    console.log('Message:', message)
    
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
