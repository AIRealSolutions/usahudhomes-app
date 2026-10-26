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
 *   POST ?action=agent-application-submitted — public form: announce a new broker application to admins (once)
 *   POST ?action=lead-email — broker/admin emails a lead via Gmail (Bearer token required)
 *   POST ?action=lead-sms   — broker/admin texts a lead via Twilio (Bearer token required)
 *   POST ?action=consultation-request — signed-in buyer asks for an agent callback (saved as a lead)
 *   POST ?action=agent-invite — admin creates an agent login (invite email, or reset link if it exists)
 *   POST ?action=lead-submitted — public forms: announce a new lead to admins (looked up by id, once)
 *   GET/POST ?action=send-alerts — daily cron (CRON_SECRET) or an admin: email HUD home alert matches
 *   GET  ?action=unsubscribe&token= — one-click unsubscribe link in alert emails
 *   POST ?action=client-invite — admin/broker emails buyers an invitation to join (single, bulk or resend)
 *   POST ?action=invite-lookup — public: the /join/:token page reads its invitation
 *   POST ?action=invite-accept — public: creates the invited buyer's account and files them as a lead
 *   GET  ?action=invite-unsubscribe&token= — "don't send me invitations" link in invitation emails
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
 *   CRON_SECRET     — sent by the daily Vercel cron (vercel.json) to ?action=send-alerts
 *   BUSINESS_MAILING_ADDRESS — postal address printed in invitation emails (required for bulk email)
 *   RESEND_API_KEY / INVITE_FROM_EMAIL — optional; send invitations through Resend instead of Gmail
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
function getTransporter(options = {}) {
  if (!GMAIL_USER || !GMAIL_APP_PASS) {
    throw new Error('Gmail not configured — set GMAIL_USER and GMAIL_APP_PASS in Vercel environment variables')
  }
  return nodemailer.createTransport({
    ...options,
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

// Applicants are signed out, so only the application id is accepted; the application
// is read from the database, must be recent, and is announced once.
async function handleAgentApplicationSubmitted(req, res) {
  const id = String(req.body?.applicationId || '')
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ success: false, error: 'applicationId required' })

  const app = (await supabaseFetch(
    `agent_applications?id=eq.${id}&select=id,email,first_name,last_name,phone,company,license_number,license_state,states_covered,created_at&limit=1`
  ))?.[0]
  if (!app) return res.status(404).json({ success: false, error: 'Application not found' })
  const createdAt = new Date(app.created_at + (/[zZ+]/.test(String(app.created_at).slice(-6)) ? '' : 'Z')).getTime()
  if (Date.now() - createdAt > 15 * 60 * 1000) return res.status(200).json({ success: true, skipped: 'not recent' })
  const already = await supabaseFetch(`agent_verification_logs?application_id=eq.${id}&action_type=eq.admin_notified&select=id&limit=1`)
  if (already?.length) return res.status(200).json({ success: true, skipped: 'already notified' })
  await logAgentAction(id, 'admin_notified', 'Admins emailed about the new application')

  const rows = {
    Name: `${app.first_name || ''} ${app.last_name || ''}`.trim(),
    Email: app.email,
    Phone: app.phone,
    Company: app.company,
    License: [app.license_number, app.license_state].filter(Boolean).join(' — '),
    'States covered': (app.states_covered || []).join(', '),
  }
  const table = Object.entries(rows)
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:6px 12px;font-weight:bold">${escapeHtml(k)}</td><td style="padding:6px 12px">${escapeHtml(String(v))}</td></tr>`)
    .join('')
  try {
    await sendEmail({
      to: GMAIL_USER,
      subject: `New broker application: ${rows.Name}`,
      html: `<p>A new broker partner application was just submitted.</p><table>${table}</table>` +
            `<p>They've been sent an email verification link. <a href="${SITE_URL}/admin">Review it in the Admin Panel</a> under Agent Applications.</p>`,
    })
  } catch (err) {
    console.error('[agent-application-submitted] admin notice failed:', err.message)
  }
  return res.status(200).json({ success: true })
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

async function notifyAdminsOfLead({ consultation, customer, property, details }) {
  const name  = String(customer?.name  || consultation?.customer_name  || consultation?.name  || 'New Lead').slice(0, 120)
  const email = String(customer?.email || consultation?.customer_email || consultation?.email || '').slice(0, 200)
  const phone = String(customer?.phone || consultation?.customer_phone || consultation?.phone || '').slice(0, 40)
  const state = String(consultation?.state || property?.state || '').slice(0, 40)
  // Optional extra rows, e.g. { Source: 'HUD home alert', Property: '...', Message: '...' }
  const extraRows = Object.entries(details || {})
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
    .map(([k, v], i) => `<tr${i % 2 ? '' : ' style="background:#f9fafb"'}><td style="padding:10px 16px;font-weight:bold;color:#374151;vertical-align:top">${escapeHtml(k)}</td><td style="padding:10px 16px;color:#111827;white-space:pre-wrap">${escapeHtml(String(v).slice(0, 2000))}</td></tr>`)
    .join('')
  const subjectPrefix = details?.Source ? `New ${details.Source}` : 'New Lead'

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
        ${extraRows}
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
        await sendEmail({ to: admin.email, subject: `${subjectPrefix}: ${name}`, html })
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
      await sendEmail({ to: GMAIL_USER || 'marcspencer28461@gmail.com', subject: `${subjectPrefix}: ${name}`, html })
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
  await routeLeadToBroker(lead)

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

// ─── Lead routing ─────────────────────────────────────────────────────────────
// Every lead stays in the admin Leads list. When routing is switched on in
// lead_routing_settings and the lead's state is one of the chosen states, the lead
// is also assigned to the chosen broker, the same way an admin assigns one by hand.
const escapeLike = (v) => v.replace(/[\\%_]/g, m => '\\' + m)

async function routeLeadToBroker(lead) {
  try {
    const state = String(lead?.state || '').trim().toUpperCase()
    if (!/^[A-Z]{2}$/.test(state)) return null
    // Per-agent admin settings take priority over the older global routing rule.
    // Never auto-route to an inactive or unapproved agent.
    const eligible = await supabaseFetch(
      'agents?select=id,auto_referral_states&is_active=eq.true&status=eq.approved&auto_referral_enabled=eq.true&order=id.asc'
    )
    const matched = (eligible || []).find(agent => (agent.auto_referral_states || []).includes(state))
    const settings = (await supabaseFetch('lead_routing_settings?id=eq.1&select=enabled,states,agent_id&limit=1'))?.[0]
    const legacyAgentId = settings?.enabled && (settings.states || []).includes(state) ? settings.agent_id : null
    const agentId = matched?.id || legacyAgentId
    if (!agentId) return null
    // The legacy rule must also point to an approved, active broker.
    if (!matched) {
      const active = await supabaseFetch(`agents?id=eq.${agentId}&is_active=eq.true&status=eq.approved&select=id&limit=1`)
      if (!active?.length) return null
    }
    return await assignLeadToAgent(lead, agentId, { auto_routed: true, rule: `state ${state}` })
  } catch (e) {
    console.error('[lead-routing] failed:', e.message)
    return null
  }
}

// Files a lead under one broker: finds or creates the customer, opens a consultation
// for the broker, and records the assignment. Returns the consultation, or null if the
// lead was already assigned. `routing` is saved with the event; `status` is the
// consultation's starting status ('new' waits for the broker, 'accepted' is theirs already).
async function assignLeadToAgent(lead, agentId, routing = {}, { status = 'new' } = {}) {
  const state = String(lead?.state || '').trim().toUpperCase().slice(0, 2) || null
  const already = await supabaseFetch(`lead_events?lead_id=eq.${lead.id}&event_type=eq.assigned_to_agent&select=id&limit=1`)
  if (already?.length) return null

  // Find or create the customer (customers.email is unique)
  let customerId = lead.customer_id
  if (!customerId && lead.email) {
    const existing = (await supabaseFetch(
      `customers?select=id,is_deleted&email=ilike.${encodeURIComponent(escapeLike(lead.email.trim()))}&limit=1`
    ))?.[0]
    if (existing) {
      customerId = existing.id
      if (existing.is_deleted) await supabaseWrite('rpc/restore_customer', 'POST', { customer_id: customerId })
    }
  }
  if (!customerId) {
    customerId = (await supabaseFetch('customers', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        first_name: lead.first_name || '', last_name: lead.last_name || '', email: lead.email, phone: lead.phone || null,
        state, lead_source: lead.source || 'website', status: 'active', is_active: true,
      }),
    }))?.[0]?.id
  }
  if (!customerId) throw new Error('could not find or create the customer')

  const name = `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
  const now = new Date().toISOString()
  const consultation = (await supabaseFetch('consultations', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      customer_id: customerId,
      agent_id: agentId,
      assigned_broker_id: agentId,
      assigned_at: now,
      property_id: lead.property_id || null,
      case_number: lead.property_case_number || null,
      consultation_type: lead.lead_type || lead.source || 'property_inquiry',
      first_name: lead.first_name, last_name: lead.last_name, email: lead.email, phone: lead.phone,
      customer_name: name || null, customer_email: lead.email, customer_phone: lead.phone,
      state, message: lead.message,
      source: lead.source, source_details: { lead_id: lead.id, ...routing },
      budget_min: lead.budget_min ?? null, budget_max: lead.budget_max ?? null,
      timeline: lead.timeline || null, financing_type: lead.financing_type || null,
      down_payment: lead.down_payment || null, credit_score_range: lead.credit_score_range || null,
      pre_approved: lead.pre_approved ?? false, buyer_type: lead.buyer_type || null,
      experience_level: lead.experience_level || null,
      price_range_min: lead.price_range_min ?? null, price_range_max: lead.price_range_max ?? null,
      property_preferences: lead.property_preferences || null, hear_about_us: lead.hear_about_us || null,
      status, is_deleted: false,
    }),
  }))?.[0]
  if (!consultation) throw new Error('could not create the consultation')

  await supabaseWrite(`leads?id=eq.${lead.id}`, 'PATCH', { customer_id: customerId, status: 'under_review', updated_at: now })
  await supabaseWrite('lead_events', 'POST', {
    lead_id: lead.id,
    event_type: 'assigned_to_agent',
    event_data: { agent_id: agentId, consultation_id: consultation.id, ...routing },
  })
  return consultation
}

// ─── Action: lead submitted (public forms) ────────────────────────────────────
// Public forms call this after saving a lead. Only the lead id is accepted; the
// lead is read from the database, must be recent, and is announced once.
const SOURCE_LABELS = {
  hud_home_alerts: 'HUD home alert sign-up',
  property_inquiry: 'property inquiry',
  account_signup: 'buyer account',
  invite: 'invited client',
  broker_invite: 'broker-invited client',
  website: 'contact form',
}

async function handleLeadSubmitted(req, res) {
  const leadId = String(req.body?.leadId || '')
  if (!/^[0-9a-f-]{36}$/i.test(leadId)) return res.status(400).json({ success: false, error: 'leadId required' })

  const lead = (await supabaseFetch(`leads?id=eq.${leadId}&select=*&limit=1`))?.[0]
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' })
  if (Date.now() - new Date(lead.created_at + (/[zZ+]/.test(String(lead.created_at).slice(-6)) ? '' : 'Z')).getTime() > 15 * 60 * 1000) {
    return res.status(200).json({ success: true, skipped: 'not recent' })
  }
  const already = await supabaseFetch(`lead_events?lead_id=eq.${leadId}&event_type=eq.admin_notified&select=id&limit=1`)
  if (already?.length) return res.status(200).json({ success: true, skipped: 'already notified' })
  await supabaseWrite('lead_events', 'POST', { lead_id: leadId, event_type: 'admin_notified', event_data: {} })

  const sub = lead.source === 'hud_home_alerts'
    ? (await supabaseFetch(`property_alert_subscriptions?lead_id=eq.${leadId}&select=state,areas,budget_min,budget_max,bedrooms_min&limit=1`))?.[0]
    : null
  const money = (v) => (v ? `$${Number(v).toLocaleString()}` : null)
  const details = {
    Source: SOURCE_LABELS[lead.source] || (lead.source || 'website').replace(/_/g, ' '),
    Property: [lead.property_address, lead.property_case_number && `Case #${lead.property_case_number}`].filter(Boolean).join(' — ') || null,
    'Alert areas': sub ? `${(sub.areas || []).join(', ') || 'Anywhere'} (${sub.state})` : null,
    'Alert budget': sub && (sub.budget_min || sub.budget_max) ? `${money(sub.budget_min) || 'Any'} – ${money(sub.budget_max) || 'Any'}` : null,
    'Alert bedrooms': sub?.bedrooms_min ? `${sub.bedrooms_min}+` : null,
    Message: lead.message,
  }
  try {
    await notifyAdminsOfLead({
      consultation: { state: lead.state },
      customer: { name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(), email: lead.email, phone: lead.phone },
      details,
    })
  } catch (e) {
    console.error('[lead-submitted] notify failed:', e.message)
  }
  await routeLeadToBroker(lead)
  return res.status(200).json({ success: true })
}

// ─── Client invitations (admins and brokers) ──────────────────────────────────
// Staff email buyers a personal /join/:token link. The token proves the invitee
// received the email, so accepting creates an already-confirmed account and the
// new member is signed straight in. A broker's invite (agent_id set) files the
// member under that broker; an admin's invite files them as a lead for the admins
// and the usual lead routing.
const INVITE_MAX_PER_REQUEST = 20   // the browser sends bulk lists in chunks of this size
const INVITE_TTL_DAYS = 90
const INVITE_RESEND_HOURS = 24
const BUSINESS_ADDRESS = process.env.BUSINESS_MAILING_ADDRESS || ''
const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DEFAULT_INVITER = { name: 'Marc Spencer', company: 'Lightkeeper Realty', phone: '(910) 363-6147', email: '' }
// With RESEND_API_KEY set, invitations go through Resend from INVITE_FROM_EMAIL (a verified
// Resend domain). Without it they go through Gmail, capped well under Gmail's ~500/day limit.
const RESEND_API_KEY = process.env.RESEND_API_KEY
const INVITE_FROM_EMAIL = process.env.INVITE_FROM_EMAIL || 'invites@usahudhomes.com'
const GMAIL_DAILY_INVITE_CAP = 400

const clip = (v, n = 80) => (v ? String(v).trim().slice(0, n) : '')
const emailFilter = (email) => `email=ilike.${encodeURIComponent(escapeLike(email))}`

// The name, company and phone shown in the email and on the join page
async function inviterProfile(inv) {
  let agent = null
  let user = null
  const agentCols = 'first_name,last_name,company,phone,email,is_admin'
  if (inv.agent_id) {
    agent = (await supabaseFetch(`agents?id=eq.${inv.agent_id}&select=${agentCols}&limit=1`))?.[0]
  } else if (inv.invited_by_user_id) {
    user = (await supabaseFetch(`users?id=eq.${inv.invited_by_user_id}&select=name,email&limit=1`))?.[0]
    if (user?.email) agent = (await supabaseFetch(`agents?${emailFilter(user.email)}&select=${agentCols}&limit=1`))?.[0]
  }
  if (agent) {
    return {
      name: `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || DEFAULT_INVITER.name,
      company: agent.company || (agent.is_admin ? DEFAULT_INVITER.company : ''),
      phone: agent.phone || '',
      email: agent.email || '',
    }
  }
  if (user?.name) return { ...DEFAULT_INVITER, name: user.name, email: user.email || '' }
  return DEFAULT_INVITER
}

function buildInviteEmail(inv, inviter) {
  const first = inv.first_name || 'there'
  const joinUrl = `${SITE_URL}/join/${inv.token}`
  const unsubscribeUrl = `${SITE_URL}/api/notifications?action=invite-unsubscribe&token=${inv.token}`
  const pitch = inv.invited_by_role === 'broker'
    ? 'I use USAHUDhomes.com with my buyers. It is a tool built to give HUD home buyers an advantage when making offers, and I would like you to have it too.'
    : 'USAHUDhomes.com is a tool I am building to give HUD home buyers an advantage when making offers, and I would like you to be one of the first to use it.'
  const benefits = [
    'See what HUD actually accepted on homes like the one you want, before you bid',
    'A deal meter and step-by-step offer builder, so your offer is priced to win',
    'A calendar of HUD bid deadlines and expected price cuts',
    'Full property addresses, saved homes, and alerts for new listings in your area',
  ]
  const signature = [inviter.name, [inviter.company, inviter.phone].filter(Boolean).join(' · ')].filter(Boolean)
  const subject = `${inviter.name} invited you to USAHUDhomes.com`

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827">
      <h2 style="color:#1e40af;margin:0 0 12px">You're invited to USAHUDhomes.com</h2>
      <p>Hi ${escapeHtml(first)},</p>
      <p>${escapeHtml(pitch)}</p>
      ${inv.note ? `<blockquote style="margin:16px 0;padding:12px 16px;background:#f3f4f6;border-left:4px solid #1e40af;white-space:pre-wrap">${escapeHtml(inv.note)}</blockquote>` : ''}
      <p style="margin-bottom:6px"><strong>Your free account includes:</strong></p>
      <ul style="margin-top:0;padding-left:20px;line-height:1.6">${benefits.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
      <p style="margin:28px 0">
        <a href="${joinUrl}" style="background:#1e40af;color:#fff;padding:14px 26px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px">Create my free account</a>
      </p>
      <p style="color:#374151">It takes about a minute: pick a password and you're in. No credit card, no obligation.</p>
      <p style="margin-top:24px">${signature.map(escapeHtml).join('<br>')}</p>
      <p style="color:#6b7280;font-size:12px;margin-top:28px">You received this invitation because ${escapeHtml(inviter.name)} entered your email at USAHUDhomes.com.
        ${BUSINESS_ADDRESS ? `${escapeHtml(BUSINESS_ADDRESS)}.` : ''}
        <a href="${unsubscribeUrl}" style="color:#6b7280">Don't send me invitations</a></p>
    </div>`

  const text = [
    `Hi ${first},`, '', pitch, '',
    ...(inv.note ? [inv.note, ''] : []),
    'Your free account includes:', ...benefits.map(b => `- ${b}`), '',
    `Create your free account: ${joinUrl}`, '',
    ...signature, '',
    `You received this invitation because ${inviter.name} entered your email at USAHUDhomes.com.${BUSINESS_ADDRESS ? ` ${BUSINESS_ADDRESS}.` : ''}`,
    `Don't send me invitations: ${unsubscribeUrl}`,
  ].join('\n')

  return { subject, html, text, unsubscribeUrl }
}

function inviteMailer() {
  if (RESEND_API_KEY) {
    return {
      provider: 'resend',
      async send({ fromName, ...message }) {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `${fromName} <${INVITE_FROM_EMAIL}>`,
            to: [message.to],
            reply_to: message.replyTo,
            subject: message.subject,
            html: message.html,
            text: message.text,
            headers: message.headers,
          }),
        })
        if (!r.ok) {
          const e = await r.json().catch(() => ({}))
          throw new Error(`Resend ${r.status}: ${e.message || e.name || 'send failed'}`)
        }
      },
      close() {},
    }
  }
  const transporter = getTransporter({ pool: true })
  return {
    provider: 'gmail',
    send: ({ fromName, ...message }) => transporter.sendMail({ ...message, from: `"${fromName}" <${GMAIL_USER}>` }),
    close: () => transporter.close(),
  }
}

async function deliverInvite(inv, inviter, mailer) {
  const { subject, html, text, unsubscribeUrl } = buildInviteEmail(inv, inviter)
  const now = new Date().toISOString()
  const sendCount = inv.send_count || 0
  try {
    await mailer.send({
      fromName: `${inviter.name.replace(/["\\\r\n<>]/g, '')} via USAHUDhomes`,
      replyTo: inviter.email || GMAIL_USER,
      to: inv.email,
      subject,
      text,
      html,
      headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
    })
    await supabaseWrite(`client_invitations?id=eq.${inv.id}`, 'PATCH', {
      status: inv.status === 'opened' ? 'opened' : 'sent',
      send_count: sendCount + 1, sent_at: now, last_error: null, updated_at: now,
    })
    return { id: inv.id, email: inv.email, status: sendCount ? 'resent' : 'sent' }
  } catch (e) {
    console.error('[client-invite] send failed:', inv.email, e.message)
    await supabaseWrite(`client_invitations?id=eq.${inv.id}`, 'PATCH', { status: 'failed', last_error: e.message.slice(0, 500), updated_at: now })
    return { id: inv.id, email: inv.email, status: 'failed', error: e.message }
  }
}

// POST ?action=client-invite  { invites: [{ email, firstName, lastName, phone, state }], note, batchId }
//                          or { resendIds: [invitationId] }
async function handleClientInvite(req, res) {
  const caller = await requireStaff(req)
  if (!caller) return res.status(401).json({ success: false, error: 'Sign in as a broker or admin to send invitations.' })
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(500).json({ success: false, error: 'Server is not configured.' })

  const isAdmin = caller.role === 'admin'
  let agentId = null
  if (!isAdmin) {
    const agent = caller.email && (await supabaseFetch(`agents?${emailFilter(caller.email)}&select=id&limit=1`))?.[0]
    if (!agent) return res.status(403).json({ success: false, error: 'Your broker profile was not found, so invitations cannot be assigned to you.' })
    agentId = agent.id
  }

  const invites = Array.isArray(req.body?.invites) ? req.body.invites : []
  const resendIds = (Array.isArray(req.body?.resendIds) ? req.body.resendIds : []).filter(id => UUID_RE.test(String(id)))
  if (!invites.length && !resendIds.length) return res.status(400).json({ success: false, error: 'Add at least one email address.' })
  if (invites.length + resendIds.length > INVITE_MAX_PER_REQUEST) {
    return res.status(400).json({ success: false, error: `Send at most ${INVITE_MAX_PER_REQUEST} invitations per request.` })
  }
  const note = clip(req.body?.note, 600) || null
  const batchId = UUID_RE.test(String(req.body?.batchId || '')) ? req.body.batchId : randomUUID()

  const inviters = new Map()
  const inviterOf = async (inv) => {
    const key = inv.agent_id || inv.invited_by_user_id || 'default'
    if (!inviters.has(key)) inviters.set(key, await inviterProfile(inv))
    return inviters.get(key)
  }

  const mailer = inviteMailer()
  // Gmail blocks accounts that go past ~500 messages a day, so stop short of it
  let gmailRoom = Infinity
  if (mailer.provider === 'gmail') {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const recent = (await supabaseFetch(`client_invitations?select=id&sent_at=gte.${since}&limit=1000`)) || []
    gmailRoom = Math.max(0, GMAIL_DAILY_INVITE_CAP - recent.length)
  }
  const deliver = async (inv, inviter) => {
    if (gmailRoom <= 0) {
      await supabaseWrite(`client_invitations?id=eq.${inv.id}`, 'PATCH', {
        status: inv.status === 'opened' ? 'opened' : 'failed',
        last_error: 'Daily email limit reached; resend tomorrow.', updated_at: new Date().toISOString(),
      })
      return { id: inv.id, email: inv.email, status: 'daily_limit' }
    }
    const result = await deliverInvite(inv, inviter, mailer)
    if (result.status !== 'failed') gmailRoom--
    return result
  }
  const results = []
  try {
    for (const id of resendIds) {
      const inv = (await supabaseFetch(`client_invitations?id=eq.${id}&select=*&limit=1`))?.[0]
      if (!inv || (!isAdmin && inv.agent_id !== agentId)) { results.push({ id, status: 'not_found' }); continue }
      if (inv.status === 'registered') { results.push({ id, email: inv.email, status: 'already_member' }); continue }
      if (inv.status === 'unsubscribed') { results.push({ id, email: inv.email, status: 'unsubscribed' }); continue }
      results.push(await deliver(inv, await inviterOf(inv)))
    }

    const seen = new Set()
    for (const row of invites) {
      const email = String(row?.email || '').trim().toLowerCase()
      if (!EMAIL_RE.test(email) || email.length > 200) { results.push({ email, status: 'invalid' }); continue }
      if (seen.has(email)) { results.push({ email, status: 'duplicate' }); continue }
      seen.add(email)

      const member = await supabaseFetch(`users?${emailFilter(email)}&select=id&limit=1`)
      if (member?.length) { results.push({ email, status: 'already_member' }); continue }
      const prior = (await supabaseFetch(`client_invitations?${emailFilter(email)}&select=*&order=created_at.desc`)) || []
      if (prior.some(p => p.status === 'unsubscribed')) { results.push({ email, status: 'unsubscribed' }); continue }
      if (prior.some(p => p.status === 'registered')) { results.push({ email, status: 'already_member' }); continue }

      // Re-inviting someone this sender (or the admin pool) already invited reuses that invitation
      let inv = prior.find(p => (p.agent_id || null) === agentId)
      if (inv?.sent_at && Date.now() - new Date(inv.sent_at).getTime() < INVITE_RESEND_HOURS * 3600 * 1000) {
        results.push({ id: inv.id, email, status: 'recently_invited' }); continue
      }
      if (!inv) {
        const state = clip(row.state, 2).toUpperCase()
        inv = (await supabaseFetch('client_invitations', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            email,
            first_name: clip(row.firstName) || null,
            last_name: clip(row.lastName) || null,
            phone: clip(row.phone, 40) || null,
            state: /^[A-Z]{2}$/.test(state) ? state : null,
            note,
            invited_by_user_id: caller.id,
            invited_by_role: isAdmin ? 'admin' : 'broker',
            agent_id: agentId,
            batch_id: batchId,
          }),
        }))?.[0]
        if (!inv) { results.push({ email, status: 'failed', error: 'Could not save the invitation.' }); continue }
      } else if (note) {
        inv.note = note
        await supabaseWrite(`client_invitations?id=eq.${inv.id}`, 'PATCH', { note })
      }
      results.push(await deliver(inv, await inviterOf(inv)))
    }
  } finally {
    mailer.close()
  }

  const sent = results.filter(r => r.status === 'sent' || r.status === 'resent').length
  return res.status(200).json({ success: true, batchId, sent, results })
}

async function loadInvite(token) {
  if (!UUID_RE.test(String(token || ''))) return null
  return (await supabaseFetch(`client_invitations?token=eq.${token}&select=*&limit=1`))?.[0] || null
}

const inviteExpired = (inv) =>
  inv.status !== 'registered' && inv.sent_at && Date.now() - new Date(inv.sent_at).getTime() > INVITE_TTL_DAYS * 86400 * 1000

// POST ?action=invite-lookup { token } — the /join/:token page
async function handleInviteLookup(req, res) {
  const inv = await loadInvite(req.body?.token)
  if (!inv) return res.status(404).json({ success: false, error: 'This invitation link is not valid.' })
  if (inv.status === 'sent') {
    const now = new Date().toISOString()
    await supabaseWrite(`client_invitations?id=eq.${inv.id}&status=eq.sent`, 'PATCH', { status: 'opened', opened_at: now, updated_at: now })
  }
  const inviter = await inviterProfile(inv)
  return res.status(200).json({
    success: true,
    invite: {
      email: inv.email,
      firstName: inv.first_name || '',
      lastName: inv.last_name || '',
      phone: inv.phone || '',
      state: inv.state || '',
      byBroker: !!inv.agent_id,
      registered: inv.status === 'registered',
      expired: !!inviteExpired(inv),
      inviter: { name: inviter.name, company: inviter.company, phone: inviter.phone },
    },
  })
}

// POST ?action=invite-accept { token, password, firstName, lastName, phone, state }
async function handleInviteAccept(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(500).json({ success: false, error: 'Server is not configured.' })
  const inv = await loadInvite(req.body?.token)
  if (!inv) return res.status(404).json({ success: false, error: 'This invitation link is not valid.' })
  if (inv.status === 'registered') return res.status(200).json({ success: false, existingAccount: true, email: inv.email })
  if (inviteExpired(inv)) return res.status(410).json({ success: false, error: 'This invitation has expired. Ask for a new one, or create an account on the sign-up page.' })

  const password = String(req.body?.password || '')
  if (password.length < 8 || password.length > 72) return res.status(400).json({ success: false, error: 'Use a password of at least 8 characters.' })
  const firstName = clip(req.body?.firstName) || inv.first_name || ''
  const lastName = clip(req.body?.lastName) || inv.last_name || ''
  const phone = clip(req.body?.phone, 40) || inv.phone || ''
  const stateIn = clip(req.body?.state, 2).toUpperCase()
  const state = /^[A-Z]{2}$/.test(stateIn) ? stateIn : (inv.state || '')

  // The invite email proves the address, so the account starts confirmed
  const created = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: inv.email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName, last_name: lastName, full_name: `${firstName} ${lastName}`.trim(),
        phone: phone || undefined, state: state || undefined, role: 'end_user', invitation_id: inv.id,
      },
    }),
  })
  if (!created.ok) {
    const err = await created.json().catch(() => ({}))
    const msg = err.msg || err.message || err.error_description || ''
    if (created.status === 422 || /already/i.test(msg)) return res.status(200).json({ success: false, existingAccount: true, email: inv.email })
    console.error('[invite-accept] create user failed:', created.status, msg)
    return res.status(502).json({ success: false, error: msg || 'Could not create your account.' })
  }
  const authUser = await created.json()
  const now = new Date().toISOString()
  await supabaseWrite(`client_invitations?id=eq.${inv.id}`, 'PATCH', {
    status: 'registered', registered_at: now, registered_user_id: authUser.id, updated_at: now,
  })

  // Everything below files the new member for follow-up; it must never undo the sign-up
  try {
    const agent = inv.agent_id
      ? (await supabaseFetch(`agents?id=eq.${inv.agent_id}&is_active=eq.true&status=eq.approved&select=id,first_name,last_name,email,notification_phone,sms_carrier,sms_notifications_enabled&limit=1`))?.[0]
      : null
    const lead = (await supabaseFetch('leads', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        first_name: firstName, last_name: lastName, email: inv.email, phone: phone || null, state: state || null,
        source: agent ? 'broker_invite' : 'invite', lead_type: 'registered_buyer', status: 'new_lead',
        source_details: { invitation_id: inv.id, invited_by_role: inv.invited_by_role },
      }),
    }))?.[0]
    if (!lead) throw new Error('could not create the lead')
    await supabaseWrite(`client_invitations?id=eq.${inv.id}`, 'PATCH', { lead_id: lead.id })
    const name = `${firstName} ${lastName}`.trim() || inv.email

    if (agent) {
      // The broker brought this client in, so the client is theirs from the start
      const consultation = await assignLeadToAgent(lead, agent.id, { invitation_id: inv.id, broker_invite: true }, { status: 'accepted' })
      if (consultation) await supabaseWrite(`client_invitations?id=eq.${inv.id}`, 'PATCH', { consultation_id: consultation.id })
      if (agent.email) {
        await sendEmail({
          to: agent.email,
          subject: `${name} accepted your invitation`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <h2 style="color:#1e40af">${escapeHtml(name)} joined USAHUDhomes.com</h2>
            <p>Your invitation was accepted. ${escapeHtml(name)} (${escapeHtml(inv.email)}${phone ? `, ${escapeHtml(phone)}` : ''}) is now in your Active Leads.</p>
            <p><a href="${SITE_URL}/broker-dashboard" style="background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Open my dashboard</a></p>
          </div>`,
        }).catch(e => console.error('[invite-accept] broker email failed:', e.message))
      }
      await sendSmsToAgent(agent, `USAHUDHomes: ${name} accepted your invite and joined.\nLogin: usahudhomes.com/broker-dashboard`)
    } else {
      // Admin invites go to the admins first, then the usual routing rules
      await supabaseWrite('lead_events', 'POST', { lead_id: lead.id, event_type: 'admin_notified', event_data: { invitation_id: inv.id } })
      await notifyAdminsOfLead({
        consultation: { state },
        customer: { name, email: inv.email, phone },
        details: { Source: 'invited client', Note: inv.agent_id ? 'Invited by a broker who is no longer active' : null },
      }).catch(e => console.error('[invite-accept] admin notice failed:', e.message))
      const routed = await routeLeadToBroker(lead)
      if (routed) await supabaseWrite(`client_invitations?id=eq.${inv.id}`, 'PATCH', { consultation_id: routed.id })
    }
  } catch (e) {
    console.error('[invite-accept] filing the new member failed:', e.message)
  }

  return res.status(200).json({ success: true, email: inv.email })
}

// GET ?action=invite-unsubscribe&token= — link in every invitation email
async function handleInviteUnsubscribe(req, res) {
  const inv = await loadInvite(req.query?.token)
  const ok = !!inv && inv.status !== 'registered'
  if (ok) {
    const now = new Date().toISOString()
    await supabaseWrite(`client_invitations?${emailFilter(inv.email)}&status=neq.registered`, 'PATCH', { status: 'unsubscribed', updated_at: now })
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  return res.status(ok ? 200 : 400).send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>USAHUDhomes.com invitations</title></head>
    <body style="font-family:Arial,sans-serif;max-width:520px;margin:60px auto;padding:0 16px;color:#111827;text-align:center">
      <h1 style="color:#1e40af">${ok ? 'No more invitations' : 'Link not recognized'}</h1>
      <p>${ok ? 'We won\'t send you invitations to USAHUDhomes.com again.' : 'This link is invalid, or you already have an account.'}</p>
      <p><a href="${SITE_URL}">USAHUDhomes.com</a></p>
    </body></html>`)
}

// ─── Action: send HUD home alerts (daily cron, or an admin) ───────────────────
const CRON_SECRET = process.env.CRON_SECRET
const ALERT_MAX_PER_EMAIL = 10

const norm = (v) => String(v || '').toLowerCase().replace(/\bcounty\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

function matchesAreas(property, areas) {
  const wanted = (areas || []).map(norm).filter(Boolean)
  if (!wanted.length) return true // whole state
  const city = norm(property.city)
  const county = norm(property.county)
  return wanted.some(a => a === city || (county && a === county))
}

function buildAlertEmail(sub, properties) {
  const first = sub.first_name || 'there'
  const where = (sub.areas || []).length ? `${sub.areas.join(', ')}, ${sub.state}` : sub.state
  const unsubscribeUrl = `${SITE_URL}/api/notifications?action=unsubscribe&token=${sub.unsubscribe_token}`
  const searchUrl = `${SITE_URL}/search?` + new URLSearchParams(Object.fromEntries(Object.entries({
    state: sub.state, minPrice: sub.budget_min || '', maxPrice: sub.budget_max || '', bedrooms: sub.bedrooms_min || '',
  }).filter(([, v]) => v !== '' && v !== null)))
  const subject = `${properties.length} HUD home${properties.length === 1 ? '' : 's'} matching your alert in ${where}`
  const fmt = (v) => (v ? `$${Number(v).toLocaleString()}` : 'Price TBD')
  const line = (p) => [p.beds && `${p.beds} bed`, p.baths && `${p.baths} bath`, p.sq_ft && `${Number(p.sq_ft).toLocaleString()} sq ft`].filter(Boolean).join(' • ')
  const url = (p) => `${SITE_URL}/property/${encodeURIComponent(p.case_number)}`

  const cards = properties.map(p => `
    <tr><td style="padding:14px 0;border-bottom:1px solid #e5e7eb">
      <a href="${url(p)}" style="color:#1e40af;font-size:16px;font-weight:bold;text-decoration:none">${escapeHtml(p.address || 'HUD home')}</a>
      <div style="color:#374151;margin-top:2px">${escapeHtml([p.city, p.state].filter(Boolean).join(', '))}${p.county ? ` · ${escapeHtml(p.county)} County` : ''}</div>
      <div style="margin-top:4px"><strong style="color:#111827">${fmt(p.price)}</strong> <span style="color:#6b7280">${escapeHtml(line(p))}</span></div>
      ${p.status ? `<div style="color:#059669;font-size:13px;margin-top:2px">${escapeHtml(p.status)}</div>` : ''}
    </td></tr>`).join('')

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827">
      <h2 style="color:#1e40af;margin:0 0 8px">New HUD homes for you</h2>
      <p>Hi ${escapeHtml(first)}, here ${properties.length === 1 ? 'is a home' : `are ${properties.length} homes`} matching your alert for <strong>${escapeHtml(where)}</strong>.</p>
      <table style="width:100%;border-collapse:collapse">${cards}</table>
      <p style="margin:24px 0">
        <a href="${searchUrl}" style="background:#1e40af;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold">See all matching homes</a>
      </p>
      <p>Questions or ready to bid? Call Marc Spencer, Lightkeeper Realty, at <a href="tel:9103636147">(910) 363-6147</a> or just reply to this email.</p>
      <p style="color:#6b7280;font-size:12px;margin-top:28px">You are receiving this because you created a HUD home alert at USAHUDhomes.com.
        <a href="${unsubscribeUrl}" style="color:#6b7280">Unsubscribe</a></p>
    </div>`

  const text = [
    `Hi ${first},`, '', `New HUD homes matching your alert for ${where}:`, '',
    ...properties.map(p => `${p.address || 'HUD home'}, ${[p.city, p.state].filter(Boolean).join(', ')}\n${fmt(p.price)}  ${line(p)}\n${url(p)}\n`),
    `See all matching homes: ${searchUrl}`, '',
    'Questions or ready to bid? Call Marc Spencer, Lightkeeper Realty, at (910) 363-6147 or reply to this email.', '',
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join('\n')

  return { subject, html, text, unsubscribeUrl }
}

async function sendAlertFor(sub, transporter) {
  let q = `properties?select=id,case_number,address,city,county,state,price,beds,baths,sq_ft,status,created_at`
    + `&is_active=eq.true&state=eq.${encodeURIComponent(sub.state)}&order=created_at.desc&limit=500`
  if (sub.budget_min) q += `&price=gte.${Number(sub.budget_min)}`
  if (sub.budget_max) q += `&price=lte.${Number(sub.budget_max)}`
  if (sub.bedrooms_min) q += `&beds=gte.${Number(sub.bedrooms_min)}`
  const candidates = (await supabaseFetch(q)) || []
  const sent = new Set(((await supabaseFetch(`property_alert_sends?subscription_id=eq.${sub.id}&select=property_id`)) || []).map(r => r.property_id))
  const fresh = candidates.filter(p => !sent.has(p.id) && matchesAreas(p, sub.areas)).slice(0, ALERT_MAX_PER_EMAIL)
  if (!fresh.length) return 0

  const { subject, html, text, unsubscribeUrl } = buildAlertEmail(sub, fresh)
  await transporter.sendMail({
    from: `USAHUDHomes Alerts <${GMAIL_USER}>`,
    replyTo: GMAIL_USER,
    to: sub.email,
    subject,
    text,
    html,
    headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
  })
  await supabaseWrite('property_alert_sends', 'POST', fresh.map(p => ({ subscription_id: sub.id, property_id: p.id })))
  await supabaseWrite(`property_alert_subscriptions?id=eq.${sub.id}`, 'PATCH', { last_sent_at: new Date().toISOString() })
  return fresh.length
}

async function handleSendAlerts(req, res) {
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const fromCron = !!CRON_SECRET && bearer === CRON_SECRET
  if (!fromCron) {
    const caller = await getCaller(req)
    if (caller?.role !== 'admin') return res.status(401).json({ success: false, error: 'Not authorized' })
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(500).json({ success: false, error: 'Server is not configured.' })

  const onlyId = /^[0-9a-f-]{36}$/i.test(String(req.body?.subscriptionId || '')) ? req.body.subscriptionId : null
  let q = 'property_alert_subscriptions?select=*&is_active=eq.true'
  if (onlyId) q += `&id=eq.${onlyId}`
  const subs = (await supabaseFetch(q)) || []

  // The cron sends at most one email per subscriber per day; an admin "Send now" ignores that
  const dayAgo = Date.now() - 20 * 60 * 60 * 1000
  const due = onlyId ? subs : subs.filter(s => !s.last_sent_at || new Date(s.last_sent_at).getTime() < dayAgo)

  const transporter = getTransporter()
  const results = { subscriptions: due.length, emailed: 0, homes: 0, errors: [] }
  for (const sub of due) {
    try {
      const n = await sendAlertFor(sub, transporter)
      if (n) { results.emailed++; results.homes += n }
    } catch (e) {
      console.error('[send-alerts]', sub.id, e.message)
      results.errors.push({ id: sub.id, error: e.message })
    }
  }
  return res.status(200).json({ success: true, ...results })
}

// ─── Action: unsubscribe (link in every alert email) ──────────────────────────
async function handleUnsubscribe(req, res) {
  const token = String(req.query?.token || '')
  let ok = false
  if (/^[0-9a-f-]{36}$/i.test(token)) {
    const rows = await supabaseFetch(`property_alert_subscriptions?unsubscribe_token=eq.${token}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ is_active: false, unsubscribed_at: new Date().toISOString() }),
    })
    ok = !!rows?.length
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  return res.status(ok ? 200 : 400).send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>USAHUDhomes.com alerts</title></head>
    <body style="font-family:Arial,sans-serif;max-width:520px;margin:60px auto;padding:0 16px;color:#111827;text-align:center">
      <h1 style="color:#1e40af">${ok ? 'You are unsubscribed' : 'Link not recognized'}</h1>
      <p>${ok ? 'You will no longer receive HUD home alert emails.' : 'This unsubscribe link is invalid or was already used.'}</p>
      <p><a href="${SITE_URL}/alerts">Create a new alert</a> · <a href="${SITE_URL}">USAHUDhomes.com</a></p>
    </body></html>`)
}

// The daily alert run sends one email per subscriber, so allow more than the 10s default
export const config = { maxDuration: 60 }

// ─── Main router ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const action = req.query?.action

  // GET actions: the daily Vercel cron and the unsubscribe link in alert emails
  if (req.method === 'GET') {
    try {
      if (action === 'send-alerts') return await handleSendAlerts(req, res)
      if (action === 'unsubscribe') return await handleUnsubscribe(req, res)
      if (action === 'invite-unsubscribe') return await handleInviteUnsubscribe(req, res)
    } catch (err) {
      console.error(`[notifications/${action}] Error:`, err.message)
      return res.status(500).json({ success: false, error: err.message })
    }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    if (action === 'lead')        return await handleLeadNotification(req, res)
    if (action === 'sms')         return await handleSms(req, res)
    if (action === 'agent-email') return await handleAgentEmail(req, res)
    if (action === 'agent-verify') return await handleAgentVerify(req, res)
    if (action === 'agent-resend-verification') return await handleAgentResendVerification(req, res)
    if (action === 'agent-application-submitted') return await handleAgentApplicationSubmitted(req, res)
    if (action === 'lead-email')  return await handleLeadEmail(req, res)
    if (action === 'lead-sms')    return await handleLeadSms(req, res)
    if (action === 'consultation-request') return await handleConsultationRequest(req, res)
    if (action === 'agent-invite') return await handleAgentInvite(req, res)
    if (action === 'lead-submitted') return await handleLeadSubmitted(req, res)
    if (action === 'send-alerts') return await handleSendAlerts(req, res)
    if (action === 'client-invite') return await handleClientInvite(req, res)
    if (action === 'invite-lookup') return await handleInviteLookup(req, res)
    if (action === 'invite-accept') return await handleInviteAccept(req, res)

    return res.status(400).json({
      success: false,
      error: 'Missing or unknown ?action= parameter',
      valid_actions: ['lead', 'sms', 'agent-email', 'agent-verify', 'agent-resend-verification', 'agent-application-submitted', 'lead-email', 'lead-sms', 'consultation-request', 'agent-invite', 'lead-submitted', 'send-alerts', 'unsubscribe', 'client-invite', 'invite-lookup', 'invite-accept', 'invite-unsubscribe'],
    })
  } catch (err) {
    console.error(`[notifications/${action}] Error:`, err.message)
    return res.status(500).json({ success: false, error: err.message || 'Unknown error' })
  }
}
