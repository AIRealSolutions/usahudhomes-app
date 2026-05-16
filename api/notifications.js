/**
 * Vercel Serverless Function: /api/notifications
 *
 * Consolidated notifications API — replaces:
 *   send-notification.js, send-sms-notification.js, send-agent-email.js
 *
 * Routes via ?action= query param:
 *   POST ?action=lead        — notify all admin agents of a new lead (email + SMS)
 *   POST ?action=sms         — send SMS to a specific agent via carrier gateway
 *   POST ?action=agent-email — send agent onboarding email (verification/approval/rejection)
 */

const SUPABASE_URL         = process.env.SUPABASE_URL         || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const RESEND_API_KEY       = process.env.RESEND_API_KEY
const FROM_EMAIL           = 'notifications@usahudhomes.com'
const NOREPLY_EMAIL        = 'noreply@usahudhomes.com'
const SITE_URL             = 'https://usahudhomes.com'

// ─── Carrier SMS gateways ─────────────────────────────────────────────────────
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
  other:        ()  => null,
}

export const CARRIER_OPTIONS = [
  { value: 'verizon',      label: 'Verizon' },
  { value: 'att',          label: 'AT&T' },
  { value: 'tmobile',      label: 'T-Mobile' },
  { value: 'sprint',       label: 'Sprint' },
  { value: 'boost',        label: 'Boost Mobile' },
  { value: 'cricket',      label: 'Cricket Wireless' },
  { value: 'metro',        label: 'Metro by T-Mobile' },
  { value: 'uscellular',   label: 'US Cellular' },
  { value: 'virgin',       label: 'Virgin Mobile' },
  { value: 'tracfone',     label: 'Tracfone' },
  { value: 'straighttalk', label: 'Straight Talk' },
  { value: 'consumer',     label: 'Consumer Cellular' },
  { value: 'other',        label: 'Other / Unknown' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function sendEmail({ to, subject, html, text, replyTo }) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')
  const body = {
    from: FROM_EMAIL,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  }
  if (replyTo) body.reply_to = replyTo
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(`Resend error: ${JSON.stringify(data)}`)
  return data
}

function buildSmsText(type, lead) {
  const site = 'usahudhomes.com'
  if (type === 'test') return `USAHUDHomes: SMS notifications are active! You will receive texts here for new leads.`
  if (!lead) return `USAHUDHomes: You have a new lead. Login at ${site}`
  const name  = lead.name  || 'Unknown'
  const phone = lead.phone || ''
  const state = lead.state || ''
  if (type === 'assigned_lead') {
    return `USAHUDHomes: Lead assigned!\n${name}${phone ? '\n' + phone : ''}${state ? '\nState: ' + state : ''}\nLogin: ${site}`
  }
  return `USAHUDHomes: New lead!\n${name}${phone ? '\n' + phone : ''}${state ? '\nState: ' + state : ''}\nLogin: ${site}/admin`
}

async function sendSmsToAgent(agent, type, lead) {
  if (!agent.sms_notifications_enabled || !agent.notification_phone || !agent.sms_carrier) return
  const gatewayFn = CARRIER_GATEWAYS[agent.sms_carrier]
  if (!gatewayFn) return
  const gateway = gatewayFn(agent.notification_phone.replace(/\D/g, ''))
  if (!gateway) return
  const smsText = buildSmsText(type, lead)
  await sendEmail({ to: gateway, subject: '', text: smsText })
  console.log(`SMS sent to ${agent.first_name} ${agent.last_name} at ${gateway}`)
}

// ─── Action: lead notification ────────────────────────────────────────────────
async function handleLeadNotification(req, res) {
  const { consultation, customer, property } = req.body || {}
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    // Fallback: just send to hardcoded admin
    const name  = customer?.name  || consultation?.name  || 'New Lead'
    const email = customer?.email || consultation?.email || ''
    const state = consultation?.state || property?.state || ''
    const html = `<h2>New Lead: ${name}</h2><p>Email: ${email}</p><p>State: ${state}</p><p><a href="${SITE_URL}/admin">View in Admin</a></p>`
    await sendEmail({ to: 'marcspencer28461@gmail.com', subject: `New Lead: ${name}`, html })
    return res.status(200).json({ success: true, notified: ['email-fallback'] })
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

  // Get all admin agents with SMS enabled
  const { data: admins } = await supabase
    .from('agents').select('*').eq('is_admin', true).eq('is_active', true)

  const name  = customer?.name  || consultation?.name  || 'New Lead'
  const email = customer?.email || consultation?.email || ''
  const phone = customer?.phone || consultation?.phone || ''
  const state = consultation?.state || property?.state || ''

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1e40af">🏠 New Lead — USAHUDhomes.com</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px;font-weight:bold">Name</td><td style="padding:8px">${name}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Email</td><td style="padding:8px">${email}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Phone</td><td style="padding:8px">${phone}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">State</td><td style="padding:8px">${state}</td></tr>
      </table>
      <p><a href="${SITE_URL}/admin" style="background:#1e40af;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">View in Admin</a></p>
    </div>`

  const notified = []
  for (const admin of (admins || [])) {
    if (admin.email) {
      try {
        await sendEmail({ to: admin.email, subject: `New Lead: ${name}`, html })
        notified.push(`email:${admin.email}`)
      } catch (e) { console.error('Email failed:', e.message) }
    }
    try {
      await sendSmsToAgent(admin, 'new_lead', { name, phone, email, state })
      if (admin.sms_notifications_enabled) notified.push(`sms:${admin.notification_phone}`)
    } catch (e) { console.error('SMS failed:', e.message) }
  }

  return res.status(200).json({ success: true, notified })
}

// ─── Action: direct SMS ───────────────────────────────────────────────────────
async function handleSms(req, res) {
  const { phone, carrier, message, type, lead } = req.body || {}
  if (!phone || !carrier) {
    return res.status(400).json({ success: false, error: 'phone and carrier are required' })
  }
  const gatewayFn = CARRIER_GATEWAYS[carrier]
  if (!gatewayFn) return res.status(400).json({ success: false, error: `Unknown carrier: ${carrier}` })
  const digits  = phone.replace(/\D/g, '')
  const gateway = gatewayFn(digits)
  if (!gateway) return res.status(400).json({ success: false, error: 'Cannot send SMS to unknown carrier' })
  const smsText = message || buildSmsText(type || 'test', lead)
  await sendEmail({ to: gateway, subject: '', text: smsText })
  return res.status(200).json({ success: true, gateway, message: smsText })
}

// ─── Action: agent email ──────────────────────────────────────────────────────
async function handleAgentEmail(req, res) {
  const { type, to, subject, html, text } = req.body || {}
  if (!type || !to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields: type, to, subject, html' })
  }
  const validTypes = ['verification', 'approval', 'rejection', 'resend']
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` })
  }
  const data = await sendEmail({ to, subject, html, text, replyTo: 'marcspencer28461@gmail.com' })
  return res.status(200).json({ success: true, messageId: data.id, type })
}

// ─── Main router ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const action = req.query?.action

  try {
    if (action === 'lead')        return await handleLeadNotification(req, res)
    if (action === 'sms')         return await handleSms(req, res)
    if (action === 'agent-email') return await handleAgentEmail(req, res)

    return res.status(400).json({
      success: false,
      error: 'Missing or unknown ?action= parameter',
      valid_actions: ['lead', 'sms', 'agent-email'],
    })
  } catch (err) {
    console.error(`[notifications/${action}] Error:`, err)
    return res.status(500).json({ success: false, error: err.message || 'Unknown error' })
  }
}
