// Supabase Edge Function to send email notification for new consultations
// This function sends an email to 9103636147@verizon.net when a new consultation is created

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const NOTIFICATION_EMAIL = '9103636147@verizon.net'

interface ConsultationData {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  property_address: string
  case_number: string
  state: string
  message?: string
  created_at: string
}

serve(async (req) => {
  try {
    const consultation: ConsultationData = await req.json()

    // Format phone number for links (remove non-digits)
    const phoneDigits = consultation.customer_phone.replace(/\D/g, '')
    
    // Create clickable links
    const callLink = `tel:${phoneDigits}`
    const smsLink = `sms:${phoneDigits}`
    const emailLink = `mailto:${consultation.customer_email}`
    
    // Format the email body for text message (keep it concise)
    const emailSubject = `New HUD Inquiry: ${consultation.customer_name}`
    
    const emailBody = `
NEW CONSULTATION REQUEST

Name: ${consultation.customer_name}
Phone: ${consultation.customer_phone}
Email: ${consultation.customer_email}

Property: ${consultation.property_address}
Case: ${consultation.case_number}
State: ${consultation.state}

${consultation.message ? `Message: ${consultation.message}` : ''}

QUICK ACTIONS:
Call: ${callLink}
Text: ${smsLink}
Email: ${emailLink}

View Details: https://usahudhomes.com/broker-dashboard
`.trim()

    // Send email using Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'USAHUDhomes <notifications@usahudhomes.com>',
        to: [NOTIFICATION_EMAIL],
        subject: emailSubject,
        text: emailBody,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(data)}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent', data }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending notification:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
