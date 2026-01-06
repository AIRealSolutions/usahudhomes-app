/**
 * Vercel Serverless Function: Send Agent Onboarding Emails
 * Handles verification, approval, and rejection emails for agent applications
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { type, to, subject, html, text } = req.body

    // Validate required fields
    if (!type || !to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Validate email type
    const validTypes = ['verification', 'approval', 'rejection', 'resend']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid email type' })
    }

    // Check for API key
    const RESEND_API_KEY = process.env.RESEND_API_KEY
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return res.status(500).json({ error: 'Email service not configured' })
    }

    const FROM_EMAIL = 'noreply@usahudhomes.com'
    const REPLY_TO_EMAIL = 'marcspencer28461@gmail.com'

    console.log(`Sending ${type} email to:`, to)

    // Send via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: to,
        reply_to: REPLY_TO_EMAIL,
        subject: subject,
        text: text || html.replace(/<[^>]*>/g, ''), // Fallback to stripped HTML if no text provided
        html: html
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', data)
      return res.status(500).json({ 
        error: 'Failed to send email', 
        details: data,
        success: false 
      })
    }

    console.log(`${type} email sent successfully:`, data.id)
    return res.status(200).json({ 
      success: true, 
      messageId: data.id,
      type: type 
    })

  } catch (error) {
    console.error('Error in send-agent-email function:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      success: false 
    })
  }
}
