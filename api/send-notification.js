/**
 * Vercel Serverless Function: Send Consultation Notification
 * This runs on the server and has access to environment variables
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const consultation = req.body

    // Validate required fields
    if (!consultation || !consultation.customer_name || !consultation.customer_email) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Check for API key
    const RESEND_API_KEY = process.env.RESEND_API_KEY
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return res.status(500).json({ error: 'Email service not configured' })
    }

    const NOTIFICATION_EMAIL = '9103636147@vtext.com' // Verizon SMS gateway
    const FROM_EMAIL = 'notifications@usahudhomes.com'

    // Format phone number for links
    const phoneDigits = (consultation.customer_phone || '').replace(/\D/g, '')

    // Create the notification message (plain text for SMS)
    const subject = `New HUD Inquiry: ${consultation.customer_name}`

    const textMessage = `
NEW HUD INQUIRY

Name: ${consultation.customer_name}
Phone: ${consultation.customer_phone || 'Not provided'}
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
    <p><strong>Phone:</strong> <a href="tel:${phoneDigits}">${consultation.customer_phone || 'Not provided'}</a></p>
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

    console.log('Sending notification to:', NOTIFICATION_EMAIL)

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
      return res.status(500).json({ error: 'Failed to send notification', details: data })
    }

    console.log('Notification sent successfully:', data.id)
    return res.status(200).json({ success: true, id: data.id })

  } catch (error) {
    console.error('Error in send-notification function:', error)
    return res.status(500).json({ error: 'Internal server error', message: error.message })
  }
}
