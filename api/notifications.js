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
 *   POST ?action=agent-verify — confirm an agent applicant's email token
 *   POST ?action=agent-resend-verification — issue and email a new verification link
 *   POST ?action=lead-email — broker/admin emails a lead via Gmail (Bearer token required)
 *   POST ?action=lead-sms   — broker/admin texts a lead via Twilio (Bearer token required)
 *   POST ?action=consultation-request — signed-in buyer asks for an agent callback (saved as a lead)
 *   POST ?action=agent-invite — admin creates an agent login (invite email, or reset link if it exists)
 *
 * agent-email and sms also require a broker/admin Bearer token.
 *
 * Optional, for lead-sms: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER
 * (or TWILIO_MESSAGING_SERVICE_SID). Without them lead-sms answers { configured: false }.
 *
 * Required Vercel Environment Variables:
 *   GMAIL_USER      — your Gmail address (marcspencer28461@gmail.com)
 *   GMAIL_APP_PASS  — 16-char Gmail App Password (no spaces)
 *   SUPABASE_URL    — Supabase project URL
 *   SUPABASE_SERVICE_KEY — Supabase service-role key
 */

import nodemailer from 'nodemailer'
import { randomUUID } from 'crypto'

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

// ─── Agent email verification ─────────────────────────────────────────────────
// Applicants are signed out and RLS hides agent_applications from them, so the
// token check and token rotation happen here with the service key.
const VERIFY_TTL_HOURS = 24

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

async function supabaseWrite(path, method, body) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return false
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  })
  if (!r.ok) console.error(`[supabaseWrite] ${method} ${path} -> ${r.status}`, await r.text())
  return r.ok
}

function logAgentAction(applicationId, actionType, notes) {
  return supabaseWrite('agent_verification_logs', 'POST', { application_id: applicationId, action_type: actionType, notes })
}

async function handleAgentVerify(req, res) {
  const token = String(req.body?.token || '')
  if (!/^[A-Za-z0-9-]{8,128}$/.test(token)) {
    return res.status(400).json({ success: false, error: 'Invalid or expired verification link.' })
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ success: false, error: 'Server is not configured.' })
  }

  const rows = await supabaseFetch(
    'agent_applications?select=id,email,first_name,last_name,license_state,created_at,updated_at' +
    `&email_verification_token=eq.${encodeURIComponent(token)}&email_verified=eq.false&limit=1`
  )
  const app = rows?.[0]
  if (!app) return res.status(400).json({ success: false, error: 'Invalid or expired verification link.' })

  const issuedAt = new Date(app.updated_at || app.created_at)
  if ((Date.now() - issuedAt.getTime()) / 36e5 > VERIFY_TTL_HOURS) {
    return res.status(400).json({ success: false, expired: true, error: 'Verification link has expired. Please request a new one.' })
  }

  const ok = await supabaseWrite(`agent_applications?id=eq.${app.id}`, 'PATCH', {
    email_verified: true,
    email_verified_at: new Date().toISOString(),
    email_verification_token: null,
    status: 'under_review',
    updated_at: new Date().toISOString(),
  })
  if (!ok) return res.status(500).json({ success: false, error: 'Could not verify. Please try again.' })

  await logAgentAction(app.id, 'email_verified', 'Email address verified successfully')

  try {
    await sendEmail({
      to: GMAIL_USER,
      subject: `New broker application ready for review: ${app.first_name} ${app.last_name}`,
      html: `<p><strong>${escapeHtml(app.first_name)} ${escapeHtml(app.last_name)}</strong> (${escapeHtml(app.email)}, ${escapeHtml(app.license_state)}) verified their email.</p>` +
            `<p><a href="${SITE_URL}/admin">Review it in the Admin Panel</a> under Agent Applications.</p>`,
    })
  } catch (err) {
    console.error('[agent-verify] admin notice failed:', err.message)
  }

  return res.status(200).json({ success: true, data: { id: app.id, email: app.email, firstName: app.first_name } })
}

async function handleAgentResendVerification(req, res) {
  const email = String(req.body?.email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Please enter a valid email address.' })
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ success: false, error: 'Server is not configured.' })
  }

  const rows = await supabaseFetch(
    `agent_applications?select=id,email,first_name&email=eq.${encodeURIComponent(email)}` +
    '&email_verified=eq.false&status=eq.pending&order=created_at.desc&limit=1'
  )
  const app = rows?.[0]
  if (!app) return res.status(404).json({ success: false, error: 'No pending application found for this email.' })

  const token = randomUUID().replace(/-/g, '')
  const ok = await supabaseWrite(`agent_applications?id=eq.${app.id}`, 'PATCH', {
    email_verification_token: token,
    updated_at: new Date().toISOString(),
  })
  if (!ok) return res.status(500).json({ success: false, error: 'Could not send a new link. Please try again.' })

  const url = `${SITE_URL}/agent/verify-email?token=${token}`
  await sendEmail({
    to: app.email,
    subject: 'Verify Your Email - USA HUD Homes Agent Application',
    html: `<p>Hi ${escapeHtml(app.first_name)},</p>` +
          '<p>Please verify your email to continue your USA HUD Homes agent application:</p>' +
          `<p><a href="${url}">Verify Email Address</a></p>` +
          `<p>This link expires in ${VERIFY_TTL_HOURS} hours.</p>`,
  })
  await logAgentAction(app.id, 'verification_email_sent', `Verification email re-sent to ${app.email}`)

  return res.status(200).json({ success: true })
}

// ─── Lead messaging (brokers/admins only) ─────────────────────────────────────
const TWILIO_SID      = process.env.TWILIO_ACCOUNT_SID
const TWILIO_TOKEN    = process.env.TWILIO_AUTH_TOKEN
const TWILIO_FROM     = process.env.TWILIO_FROM_NUMBER
const TWILIO_MSG_SVC  = process.env.TWILIO_MESSAGING_SERVICE_SID

// Resolves the caller's profile from their Supabase access token, or null if not signed in.
async function getCaller(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${token}` },
  })
  if (!r.ok) return null
  const authUser = await r.json()
  const rows = await supabaseFetch(`users?select=id,email,name,phone,role&id=eq.${authUser.id}&limit=1`)
  return rows?.[0] || { id: authUser.id, email: authUser.email, role: 'end_user' }
}

// Only brokers and admins may message leads or send arbitrary email/SMS.
async function requireStaff(req) {
  const caller = await getCaller(req)
  return caller && ['admin', 'broker'].includes(caller.role) ? caller : null
}

function toE164(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

async function handleLeadEmail(req, res) {
  const staff = await requireStaff(req)
  if (!staff) return res.status(401).json({ success: false, error: 'Please sign in as a broker or admin to send email.' })

  const { to, subject, body } = req.body || {}
  const recipient = String(to || '').trim()
  if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(recipient)) {
    return res.status(400).json({ success: false, error: 'The lead does not have a valid email address.' })
  }
  if (!String(subject || '').trim() || !String(body || '').trim()) {
    return res.status(400).json({ success: false, error: 'Subject and message are required.' })
  }

  const senderName = staff.name || staff.email
  const transporter = getTransporter()
  await transporter.sendMail({
    from: `${senderName.replace(/["<>]/g, '')} via USAHUDHomes <${GMAIL_USER}>`,
    replyTo: staff.email,
    to: recipient,
    subject: String(subject).slice(0, 300),
    text: String(body),
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">${escapeHtml(body).replace(/\n/g, '<br>')}</div>`,
  })
  return res.status(200).json({ success: true, via: 'gmail' })
}

async function handleLeadSms(req, res) {
  const staff = await requireStaff(req)
  if (!staff) return res.status(401).json({ success: false, error: 'Please sign in as a broker or admin to send texts.' })

  if (!TWILIO_SID || !TWILIO_TOKEN || !(TWILIO_FROM || TWILIO_MSG_SVC)) {
    return res.status(200).json({ success: false, configured: false, error: 'Texting from the site is not set up yet.' })
  }
  const { to, body } = req.body || {}
  const phone = toE164(to)
  if (!phone) return res.status(400).json({ success: false, error: 'The lead does not have a valid US phone number.' })
  if (!String(body || '').trim()) return res.status(400).json({ success: false, error: 'Message is required.' })

  const form = new URLSearchParams({ To: phone, Body: String(body).slice(0, 1600) })
  if (TWILIO_MSG_SVC) form.set('MessagingServiceSid', TWILIO_MSG_SVC)
  else form.set('From', TWILIO_FROM)
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  })
  const result = await r.json().catch(() => ({}))
  if (!r.ok) {
    console.error('[lead-sms] Twilio error:', r.status, result.code, result.message)
    return res.status(502).json({ success: false, configured: true, error: result.message || 'Twilio rejected the message.' })
  }
  return res.status(200).json({ success: true, configured: true, via: 'twilio', sid: result.sid })
}

// ─── Action: lead notification ────────────────────────────────────────────────
async function handleLeadNotification(req, res) {
  const notified = await notifyAdminsOfLead(req.body || {})
  return res.status(200).json({ success: true, notified })
}

async function notifyAdminsOfLead({ consultation, customer, property }) {
  const name  = String(customer?.name  || consultation?.customer_name  || consultation?.name  || 'New Lead').slice(0, 120)
  const email = String(customer?.email || consultation?.customer_email || consultation?.email || '').slice(0, 200)
  const phone = String(customer?.phone || consultation?.customer_phone || consultation?.phone || '').slice(0, 40)
  const state = String(consultation?.state || property?.state || '').slice(0, 40)

  // Get all admin agents
  const admins = await supabaseFetch(
    'agents?is_admin=eq.true&is_active=eq.true&select=id,first_name,last_name,email,notification_phone,sms_carrier,sms_notifications_enabled'
  ) || []

  // Build email HTML
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#1e40af;margin-bottom:16px">🏠 New Lead — USAHUDhomes.com</h2>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <tr style="background:#f9fafb"><td style="padding:10px 16px;font-weight:bold;color:#374151;width:120px">Name</td><td style="padding:10px 16px;color:#111827">${escapeHtml(name)}</td></tr>
        <tr><td style="padding:10px 16px;font-weight:bold;color:#374151">Email</td><td style="padding:10px 16px;color:#111827">${escapeHtml(email)}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:10px 16px;font-weight:bold;color:#374151">Phone</td><td style="padding:10px 16px;color:#111827">${escapeHtml(phone) || '—'}</td></tr>
        <tr><td style="padding:10px 16px;font-weight:bold;color:#374151">State</td><td style="padding:10px 16px;color:#111827">${escapeHtml(state) || '—'}</td></tr>
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

  return notified
}

// ─── Action: consultation request (signed-in buyer) ───────────────────────────
// Buyers can't read or write customers under RLS, so the server finds or creates
// the customer record and files the request as a new lead on their behalf.
const CONSULTATION_TYPES = ['agent_callback_request', 'property_inquiry']

async function handleConsultationRequest(req, res) {
  const caller = await getCaller(req)
  if (!caller) return res.status(401).json({ success: false, error: 'Please sign in to request an agent.' })

  const b = req.body || {}
  const str = (v, max = 200) => (v === undefined || v === null || v === '' ? null : String(v).trim().slice(0, max))
  const num = (v) => (v === undefined || v === null || v === '' || isNaN(Number(v)) ? null : Number(v))
  const firstName = str(b.firstName, 80)
  const lastName  = str(b.lastName, 80)
  const email     = str(b.email, 200)?.toLowerCase()
  const phone     = str(b.phone, 40)
  const state     = str(b.state, 40)
  if (!firstName || !lastName || !phone || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Name, a valid email and phone are required.' })
  }
  if (!state) return res.status(400).json({ success: false, error: 'State is required.' })

  const existing = await supabaseFetch(
    `customers?select=id&email=eq.${encodeURIComponent(email)}&is_active=eq.true&is_deleted=eq.false&order=created_at.desc&limit=1`
  )
  let customerId = existing?.[0]?.id
  if (!customerId) {
    const created = await supabaseFetch('customers', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        first_name: firstName, last_name: lastName, email, phone, state,
        status: 'new', lead_source: 'website', notes: str(b.message, 2000) || 'Lead from agent request form',
      }),
    })
    customerId = created?.[0]?.id
    if (!customerId) return res.status(500).json({ success: false, error: 'Could not save your request. Please try again.' })
  }

  const propertyId = /^[0-9a-f-]{36}$/i.test(String(b.propertyId || '')) ? b.propertyId : null
  const prop = propertyId
    ? (await supabaseFetch(`properties?select=address,city,state,price&id=eq.${propertyId}&limit=1`))?.[0]
    : null

  // Requests land in leads like every other intake; an admin assigns them from the Leads Hub.
  const rows = await supabaseFetch('leads', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      customer_id: customerId,
      property_id: propertyId,
      property_case_number: str(b.caseNumber, 40),
      property_address: prop ? [prop.address, prop.city, prop.state].filter(Boolean).join(', ') : null,
      property_price: prop?.price ?? null,
      lead_type: CONSULTATION_TYPES.includes(b.consultationType) ? b.consultationType : 'agent_callback_request',
      status: 'new_lead',
      source: 'agent_request',
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      state,
      message: str(b.message, 4000),
      financing_type: str(b.financingType, 60),
      down_payment: str(b.downPayment, 60),
      credit_score_range: str(b.creditScoreRange, 60),
      pre_approved: b.preApproved === true,
      timeline: str(b.timeline, 60),
      buyer_type: str(b.buyerType, 60),
      experience_level: str(b.experienceLevel, 60),
      price_range_min: num(b.priceRangeMin),
      price_range_max: num(b.priceRangeMax),
      property_preferences: b.propertyPreferences && typeof b.propertyPreferences === 'object' ? b.propertyPreferences : null,
      hear_about_us: str(b.hearAboutUs, 120),
    }),
  })
  const lead = rows?.[0]
  if (!lead) return res.status(500).json({ success: false, error: 'Could not save your request. Please try again.' })

  await supabaseWrite('lead_events', 'POST', {
    lead_id: lead.id,
    event_type: 'lead_received',
    event_data: {
      source: 'agent_request',
      form_type: lead.lead_type,
      property_case_number: lead.property_case_number,
      requested_by: caller.id,
    },
  })

  try {
    await notifyAdminsOfLead({ customer: { name: `${firstName} ${lastName}`, email, phone }, property: { state } })
  } catch (e) {
    console.error('[lead-request] admin notification failed:', e.message)
  }

  return res.status(200).json({ success: true, data: { id: lead.id } })
}

// ─── Action: direct SMS ───────────────────────────────────────────────────────
async function handleSms(req, res) {
  if (!(await requireStaff(req))) return res.status(401).json({ success: false, error: 'Sign in as a broker or admin.' })
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
  // Sends caller-supplied HTML, so it must never be open to the public.
  if (!(await requireStaff(req))) return res.status(401).json({ success: false, error: 'Sign in as a broker or admin.' })
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

// ─── Action: agent invite (admins only) ───────────────────────────────────────
// Creating auth users needs the service key, so the browser can't call auth.admin.
// New email -> Supabase invite ("set your password" link). Existing account -> password
// reset link, so "resend" always gives the agent a way in.
async function handleAgentInvite(req, res) {
  const caller = await getCaller(req)
  if (caller?.role !== 'admin') return res.status(401).json({ success: false, error: 'Sign in as an admin to invite agents.' })
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(500).json({ success: false, error: 'Server is not configured.' })

  const email = String(req.body?.email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'A valid email is required.' })
  }
  const str = (v) => (v ? String(v).trim().slice(0, 80) : '')
  const firstName = str(req.body?.firstName)
  const lastName  = str(req.body?.lastName)
  const redirectTo = /^https?:\/\/[^\s]+$/.test(String(req.body?.redirectTo || ''))
    ? String(req.body.redirectTo)
    : `${SITE_URL}/reset-password`
  const authHeaders = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  }
  const qs = `?redirect_to=${encodeURIComponent(redirectTo)}`

  const invite = await fetch(`${SUPABASE_URL}/auth/v1/invite${qs}`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      email,
      data: { first_name: firstName, last_name: lastName, full_name: `${firstName} ${lastName}`.trim() },
    }),
  })
  if (invite.ok) return res.status(200).json({ success: true, mode: 'invite', message: `Invitation email sent to ${email}` })

  const inviteErr = await invite.json().catch(() => ({}))
  const msg = inviteErr.msg || inviteErr.message || inviteErr.error_description || ''
  const alreadyExists = invite.status === 422 || /already/i.test(msg)
  if (!alreadyExists) {
    console.error('[agent-invite] invite failed:', invite.status, msg)
    return res.status(502).json({ success: false, error: msg || 'Could not send the invitation.' })
  }

  const recover = await fetch(`${SUPABASE_URL}/auth/v1/recover${qs}`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ email }),
  })
  if (!recover.ok) {
    const e = await recover.json().catch(() => ({}))
    console.error('[agent-invite] recover failed:', recover.status, e)
    return res.status(502).json({ success: false, error: e.msg || e.message || 'Could not send a password setup link.' })
  }
  return res.status(200).json({
    success: true,
    mode: 'recovery',
    message: `${email} already has an account; a password reset link was sent instead.`,
  })
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
    if (action === 'agent-verify') return await handleAgentVerify(req, res)
    if (action === 'agent-resend-verification') return await handleAgentResendVerification(req, res)
    if (action === 'lead-email')  return await handleLeadEmail(req, res)
    if (action === 'lead-sms')    return await handleLeadSms(req, res)
    if (action === 'consultation-request') return await handleConsultationRequest(req, res)
    if (action === 'agent-invite') return await handleAgentInvite(req, res)

    return res.status(400).json({
      success: false,
      error: 'Missing or unknown ?action= parameter',
      valid_actions: ['lead', 'sms', 'agent-email', 'agent-verify', 'agent-resend-verification', 'lead-email', 'lead-sms', 'consultation-request', 'agent-invite'],
    })
  } catch (err) {
    console.error(`[notifications/${action}] Error:`, err.message)
    return res.status(500).json({ success: false, error: err.message || 'Unknown error' })
  }
}
