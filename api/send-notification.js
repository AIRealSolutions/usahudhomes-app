/**
 * Vercel Serverless Function: POST /api/send-notification
 *
 * Sends email + SMS notifications when a new consultation/lead arrives.
 * SMS is sent via carrier email-to-SMS gateway (free, uses Resend).
 * Each agent controls their SMS number, carrier, and toggle in Settings.
 */

const SUPABASE_URL         = process.env.SUPABASE_URL         || 'https://lpqjndfjbenolhneqzec.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const RESEND_API_KEY       = process.env.RESEND_API_KEY
const FROM_EMAIL           = 'notifications@usahudhomes.com'
const SITE_URL             = 'https://usahudhomes.com'

const CARRIER_GATEWAYS = {
  verizon:      (n) => `${n}@vtext.com`,
  att:          (n) => `${n}@txt.att.net`,
  tmobile:      (n) => `${n}@tmomail.net`,
  sprint:       (n) => `${n}@messaging.sprintpcs.com`,
  boost:        (n) => `${n}@sms.myboostmobile.com`,
  cricket:      (n) => `${n}@sms.cricketwireless.net`,
  metro:        (n) => `${n}@mymetropcs.com`,
  uscellular:   (n) => `${n}@email.uscc.net`,
  virgin:       (n) => `${n}@vmobl.com`,
  tracfone:     (n) => `${n}@mmst5.tracfone.com`,
  straighttalk: (n) => `${n}@vtext.com`,
  consumer:     (n) => `${n}@mailmymobile.net`,
}

async function getAdminAgentsWithSms() {
  if (!SUPABASE_SERVICE_KEY) return []
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/agents?is_admin=eq.true&is_active=eq.true&select=id,first_name,last_name,email,notification_phone,sms_carrier,sms_notifications_enabled`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    )
    return r.ok ? await r.json() : []
  } catch { return [] }
}

async function getAgentById(agentId) {
  if (!SUPABASE_SERVICE_KEY || !agentId) return null
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/agents?id=eq.${agentId}&select=id,first_name,last_name,email,notification_phone,sms_carrier,sms_notifications_enabled&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    )
    if (!r.ok) return null
    const rows = await r.json()
    return rows[0] || null
  } catch { return null }
}

async function sendEmail(to, subject, text, html) {
  if (!RESEND_API_KEY) return false
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, text, html }),
  })
  if (!r.ok) { const e = await r.json(); console.error('Resend email error:', e); return false }
  return true
}

async function sendSmsToAgent(agent, smsText) {
  if (!agent?.sms_notifications_enabled) return
  const phone = (agent.notification_phone || '').replace(/\D/g, '').slice(-10)
  if (phone.length !== 10) return
  const gatewayFn = CARRIER_GATEWAYS[agent.sms_carrier || 'verizon']
  if (!gatewayFn) return
  const gateway = gatewayFn(phone)
  if (!RESEND_API_KEY) return
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: [gateway], subject: '', text: smsText }),
    })
    if (r.ok) console.log(`SMS sent to ${agent.first_name} ${agent.last_name} at ${gateway}`)
    else { const e = await r.json(); console.error(`SMS failed for ${agent.email}:`, e) }
  } catch (e) { console.error(`SMS error for ${agent.email}:`, e.message) }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const consultation = typeof req.body === 'string' ? JSON.parse(req.body) : req.body

    if (!consultation?.customer_name || !consultation?.customer_email) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    if (!RESEND_API_KEY) {
      return res.status(500).json({ error: 'Email service not configured' })
    }

    const phoneDigits = (consultation.customer_phone || '').replace(/\D/g, '')
    const subject     = `New HUD Inquiry: ${consultation.customer_name}`

    const textMessage = [
      'NEW HUD INQUIRY',
      `Name: ${consultation.customer_name}`,
      `Phone: ${consultation.customer_phone || 'Not provided'}`,
      `Email: ${consultation.customer_email}`,
      consultation.property_address ? `Property: ${consultation.property_address}` : null,
      consultation.case_number      ? `Case: ${consultation.case_number}` : null,
      consultation.state            ? `State: ${consultation.state}` : null,
      consultation.message          ? `Message: ${consultation.message}` : null,
      `Call: tel:${phoneDigits}`,
      `View: ${SITE_URL}/admin`,
    ].filter(Boolean).join('\n')

    const htmlMessage = `
<div style="font-family:Arial,sans-serif;max-width:600px;">
  <h2 style="color:#2563eb;">New HUD Inquiry</h2>
  <div style="background:#f3f4f6;padding:15px;border-radius:8px;margin:15px 0;">
    <p><strong>Name:</strong> ${consultation.customer_name}</p>
    <p><strong>Phone:</strong> <a href="tel:${phoneDigits}">${consultation.customer_phone || 'Not provided'}</a></p>
    <p><strong>Email:</strong> <a href="mailto:${consultation.customer_email}">${consultation.customer_email}</a></p>
    ${consultation.property_address ? `<p><strong>Property:</strong> ${consultation.property_address}</p>` : ''}
    ${consultation.case_number      ? `<p><strong>Case:</strong> ${consultation.case_number}</p>` : ''}
    ${consultation.state            ? `<p><strong>State:</strong> ${consultation.state}</p>` : ''}
    ${consultation.message          ? `<p><strong>Message:</strong> ${consultation.message}</p>` : ''}
  </div>
  <div style="margin:20px 0;">
    <a href="tel:${phoneDigits}" style="display:inline-block;background:#2563eb;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;margin:5px;">📞 Call</a>
    <a href="sms:${phoneDigits}" style="display:inline-block;background:#10b981;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;margin:5px;">💬 Text</a>
    <a href="mailto:${consultation.customer_email}" style="display:inline-block;background:#f59e0b;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;margin:5px;">✉️ Email</a>
  </div>
  <p><a href="${SITE_URL}/admin" style="color:#2563eb;">View in Admin Dashboard →</a></p>
</div>`

    // 1. Get admin agents
    const adminAgents = await getAdminAgentsWithSms()
    const adminEmails = adminAgents.length > 0
      ? adminAgents.map(a => a.email).filter(Boolean)
      : ['marcspencer28461@gmail.com']

    // 2. Email all admins
    await sendEmail(adminEmails, subject, textMessage, htmlMessage)
    console.log('Email sent to admins:', adminEmails.join(', '))

    // 3. SMS all admins with SMS enabled
    const adminSmsText = [
      `USAHUDHomes: New lead!`,
      consultation.customer_name,
      consultation.customer_phone || consultation.customer_email,
      consultation.state ? `State: ${consultation.state}` : null,
      `Login: ${SITE_URL}/admin`,
    ].filter(Boolean).join('\n')

    await Promise.all(adminAgents.map(a => sendSmsToAgent(a, adminSmsText)))

    // 4. If agent assigned, notify them separately
    if (consultation.agent_id) {
      const assignedAgent = await getAgentById(consultation.agent_id)
      if (assignedAgent && !adminAgents.find(a => a.id === assignedAgent.id)) {
        const brokerSubject = `Lead Assigned to You: ${consultation.customer_name}`
        const brokerText = [
          'LEAD ASSIGNED TO YOU',
          `Name: ${consultation.customer_name}`,
          `Phone: ${consultation.customer_phone || 'Not provided'}`,
          `Email: ${consultation.customer_email}`,
          consultation.property_address ? `Property: ${consultation.property_address}` : null,
          consultation.state            ? `State: ${consultation.state}` : null,
          consultation.message          ? `Message: ${consultation.message}` : null,
          `View: ${SITE_URL}/broker-dashboard`,
        ].filter(Boolean).join('\n')

        const brokerHtml = `
<div style="font-family:Arial,sans-serif;max-width:600px;">
  <h2 style="color:#2563eb;">Lead Assigned to You</h2>
  <p>Hi ${assignedAgent.first_name}, a new lead has been assigned to you:</p>
  <div style="background:#f3f4f6;padding:15px;border-radius:8px;margin:15px 0;">
    <p><strong>Name:</strong> ${consultation.customer_name}</p>
    <p><strong>Phone:</strong> <a href="tel:${phoneDigits}">${consultation.customer_phone || 'Not provided'}</a></p>
    <p><strong>Email:</strong> <a href="mailto:${consultation.customer_email}">${consultation.customer_email}</a></p>
    ${consultation.property_address ? `<p><strong>Property:</strong> ${consultation.property_address}</p>` : ''}
    ${consultation.state ? `<p><strong>State:</strong> ${consultation.state}</p>` : ''}
    ${consultation.message ? `<p><strong>Message:</strong> ${consultation.message}</p>` : ''}
  </div>
  <p><a href="${SITE_URL}/broker-dashboard" style="color:#2563eb;">View in Your Dashboard →</a></p>
</div>`

        await sendEmail([assignedAgent.email], brokerSubject, brokerText, brokerHtml)

        const brokerSmsText = [
          `USAHUDHomes: Lead assigned!`,
          consultation.customer_name,
          consultation.customer_phone || consultation.customer_email,
          consultation.state ? `State: ${consultation.state}` : null,
          `Login: ${SITE_URL}/broker-dashboard`,
        ].filter(Boolean).join('\n')

        await sendSmsToAgent(assignedAgent, brokerSmsText)
      }
    }

    return res.status(200).json({ success: true })

  } catch (error) {
    console.error('Error in send-notification:', error)
    return res.status(500).json({ error: 'Internal server error', message: error.message })
  }
}
