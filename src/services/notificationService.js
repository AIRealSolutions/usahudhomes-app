/**
 * Notification Service
 * Sends email/SMS notifications for new consultation inquiries via Resend
 */

const NOTIFICATION_EMAIL = '9103636147@vtext.com' // Verizon SMS gateway
const RESEND_API_KEY = import.meta.env.RESEND_API_KEY
const FROM_EMAIL = 'notifications@usahudhomes.com' // You may need to verify this domain in Resend

/**
 * Send notification for new consultation
 * @param {Object} consultation - The consultation data
 * @returns {Promise<boolean>} Success status
 */
export async function sendConsultationNotification(consultation) {
  try {
    console.log('Attempting to send notification for:', consultation.customer_name)
    
    // Check if API key is available
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not found in environment variables')
      return false
    }
    
    // Format phone number for links
    const phoneDigits = consultation.customer_phone.replace(/\D/g, '')
    
    // Create the notification message (plain text for SMS)
    const subject = `New HUD Inquiry: ${consultation.customer_name}`
    
    const textMessage = `
NEW HUD INQUIRY

Name: ${consultation.customer_name}
Phone: ${consultation.customer_phone}
Email: ${consultation.customer_email}

Property: ${consultation.property_address || 'Not specified'}
Case: ${consultation.case_number || 'Not specified'}
State: ${consultation.state || 'Not specified'}

${consultation.message ? `Message: ${consultation.message}` : ''}

Call: tel:${phoneDigits}
Text: sms:${phoneDigits}
Email: ${consultation.customer_email}

View: https://usahudhomes.com/broker-dashboard
`.trim()

    // HTML version for email clients
    const htmlMessage = `
<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <h2 style="color: #2563eb;">New HUD Inquiry</h2>
  
  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
    <p><strong>Name:</strong> ${consultation.customer_name}</p>
    <p><strong>Phone:</strong> <a href="tel:${phoneDigits}">${consultation.customer_phone}</a></p>
    <p><strong>Email:</strong> <a href="mailto:${consultation.customer_email}">${consultation.customer_email}</a></p>
  </div>
  
  <div style="margin: 15px 0;">
    <p><strong>Property:</strong> ${consultation.property_address || 'Not specified'}</p>
    <p><strong>Case:</strong> ${consultation.case_number || 'Not specified'}</p>
    <p><strong>State:</strong> ${consultation.state || 'Not specified'}</p>
    ${consultation.message ? `<p><strong>Message:</strong> ${consultation.message}</p>` : ''}
  </div>
  
  <div style="margin: 20px 0;">
    <a href="tel:${phoneDigits}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;">📞 Call</a>
    <a href="sms:${phoneDigits}" style="display: inline-block; background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;">💬 Text</a>
    <a href="mailto:${consultation.customer_email}" style="display: inline-block; background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;">✉️ Email</a>
  </div>
  
  <p><a href="https://usahudhomes.com/broker-dashboard" style="color: #2563eb;">View in Broker Dashboard →</a></p>
</div>
`
    
    console.log('Sending to:', NOTIFICATION_EMAIL)
    console.log('From:', FROM_EMAIL)
    
    // Send via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [NOTIFICATION_EMAIL],
        subject: subject,
        text: textMessage,
        html: htmlMessage
      })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('Resend API error:', data)
      return false
    }
    
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
