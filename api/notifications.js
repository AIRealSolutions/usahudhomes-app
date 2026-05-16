/**
 * Vercel Serverless Function: /api/notifications
 *
 * Sends email + SMS notifications using Gmail SMTP (Nodemailer).
 * SMS is delivered via carrier email-to-SMS gateways — free, no Twilio needed.
 *
 * Routes via ?action= query param:
 *   POST ?action=lead        — notify all admin agents of a new lead (email + SMS)
 *   POST ?action=sms         — send a direct SMS to a specific phone/carrier
 *   POST ?action=agent-email — send agent onboarding email (verification/approval/rejection)
 *
 * Required Vercel Environment Variables:
 *   GMAIL_USER      — your Gmail address (marcspencer28461@gmail.com)
 *   GMAIL_APP_PASS  — 16-char Gmail App Password (no spaces)
 *   SUPABASE_URL    — Supabase project URL
 *   SUPABASE_SERVICE_KEY — Supabase service-role key
 */

import nodemailer from 'nodemailer'

const SUPABASE_URL         = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const GMAIL_USER           = process.env.GMAIL_USER
const GMAIL_APP_PASS       = process.env.GMAIL_APP_PASS
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

// ─── Gmail transporter ────────────────────────────────────────────────────────
function getTransporter() {
  if (!GMAIL_USER || !GMAIL_APP_PASS) {
    throw new Error('Gmail not configured — set GMAIL_USER and GMAIL_APP_PASS in Vercel environment variables')
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASS.replace(/\s/g, ''), // strip any spaces from app password
    },
  })
}

// ─── Send email helper ────────────────────────────────────────────────────────
async function sendEmail({ to, subject, html, text }) {
  const transporter = getTransporter()
  const recipients = Array.isArray(to) ? to.join(',') : to
  await transporter.sendMail({
    from: `USAHUDHomes <${GMAIL_USER}>`,
    to: recipients,
    subject: subject || '',
    text: text || (html ? html.replace(/<[^>]*>/g, '') : ''),
    html: html || undefined,
  })
}

// ─── SMS helper ───────────────────────────────────────────────────────────────
async function sendSmsToAgent(agent, smsText) {
  if (!agent?.sms_notifications_enabled) return
  const phone = (agent.notification_phone || '').replace(/\D/g, '').slice(-10)
  if (phone.length !== 10) {
    console.warn(`SMS skipped for ${agent.email}: invalid phone length (${phone.length})`)
    return
  }
  const gatewayFn = CARRIER_GATEWAYS[agent.sms_carrier || 'verizon']
  if (!gatewayFn) return
  const gateway = gatewayFn(phone)
  if (!gateway) return
  try {
    await sendEmail({ to: gateway, subject: '', text: smsText })
    console.log(`SMS sent to ${agent.first_name} ${agent.last_name} at ${gateway}`)
  } catch (e) {
    console.error(`SMS failed for ${agent.email} (${gateway}):`, e.message)
  }
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

// ─── Supabase fetch helper ────────────────────────────────────────────────────
async function supabaseFetch(path, opts = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null
  const url = `${SUPABASE_URL}/rest/v1/${path}`
  const r = await fetch(url, {
    ...opts,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })
  if (!r.ok) return null
  return r.json()
}

// ─── Action: lead notification ────────────────────────────────────────────────
async function handleLeadNotification(req, res) {
  const { consultation, customer, property } = req.body || {}

  const name  = customer?.name  || consultation?.customer_name  || consultation?.name  || 'New Lead'
  const email = customer?.email || consultation?.customer_email || consultation?.email || ''
  const phone = customer?.phone || consultation?.customer_phone || consultation?.phone || ''
  const state = consultation?.state || property?.state || ''

  // Get all admin agents
  const admins = await supabaseFetch(
    'agents?is_admin=eq.true&is_active=eq.true&select=id,first_name,last_name,email,notification_phone,sms_carrier,sms_notifications_enabled'
  ) || []

  // Build email HTML
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#1e40af;margin-bottom:16px">🏠 New Lead — USAHUDhomes.com</h2>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <tr style="background:#f9fafb"><td style="padding:10px 16px;font-weight:bold;color:#374151;width:120px">Name</td><td style="padding:10px 16px;color:#111827">${name}</td></tr>
        <tr><td style="padding:10px 16px;font-weight:bold;color:#374151">Email</td><td style="padding:10px 16px;color:#111827">${email}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:10px 16px;font-weight:bold;color:#374151">Phone</td><td style="padding:10px 16px;color:#111827">${phone || '—'}</td></tr>
        <tr><td style="padding:10px 16px;font-weight:bold;color:#374151">State</td><td style="padding:10px 16px;color:#111827">${state || '—'}</td></tr>
      </table>
      <p style="margin-top:20px">
        <a href="${SITE_URL}/admin" style="background:#1e40af;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">View in Admin Dashboard</a>
      </p>
    </div>`

  const notified = []

  // Notify all admins
  for (const admin of admins) {
    if (admin.email) {
      try {
        await sendEmail({ to: admin.email, subject: `New Lead: ${name}`, html })
        notified.push(`email:${admin.email}`)
      } catch (e) { console.error('Email failed:', e.message) }
    }
    try {
      await sendSmsToAgent(admin, buildSmsText('new_lead', { name, phone, email, state }))
      if (admin.sms_notifications_enabled && admin.notification_phone) {
        notified.push(`sms:${admin.notification_phone}`)
      }
    } catch (e) { console.error('SMS failed:', e.message) }
  }

  // If no admins found, fallback to hardcoded email
  if (admins.length === 0) {
    try {
      await sendEmail({ to: GMAIL_USER || 'marcspencer28461@gmail.com', subject: `New Lead: ${name}`, html })
      notified.push('email:fallback')
    } catch (e) { console.error('Fallback email failed:', e.message) }
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
  if (!gatewayFn) {
    return res.status(400).json({ success: false, error: `Unknown carrier: ${carrier}` })
  }

  const digits  = phone.replace(/\D/g, '').slice(-10)
  if (digits.length !== 10) {
    return res.status(400).json({ success: false, error: `Invalid phone number: must be 10 digits, got ${digits.length}` })
  }

  const gateway = gatewayFn(digits)
  if (!gateway) {
    return res.status(400).json({ success: false, error: 'Cannot determine SMS gateway for this carrier' })
  }

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

  await sendEmail({ to, subject, html, text })
  return res.status(200).json({ success: true, type })
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
    console.error(`[notifications/${action}] Error:`, err.message)
    return res.status(500).json({ success: false, error: err.message || 'Unknown error' })
  }
}
