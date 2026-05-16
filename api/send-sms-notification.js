/**
 * Vercel Serverless Function: POST /api/send-sms-notification
 *
 * Sends SMS notifications to agents via carrier email-to-SMS gateways.
 * No Twilio or paid SMS service required — uses Resend to send emails
 * to carrier gateway addresses (e.g., 9103636147@vtext.com for Verizon).
 *
 * Body:
 * {
 *   phone:    "9103636147",          // 10-digit US number (digits only)
 *   carrier:  "verizon",             // carrier key (see CARRIERS below)
 *   message:  "New lead: John Doe",  // SMS text (keep under 160 chars)
 *   type:     "new_lead" | "assigned_lead" | "test"
 *   lead?: { name, phone, email, property, state }
 * }
 *
 * Returns: { success: true, gateway: "9103636147@vtext.com" }
 */

// US Carrier SMS gateway addresses
const CARRIERS = {
  verizon:    (n) => `${n}@vtext.com`,
  att:        (n) => `${n}@txt.att.net`,
  tmobile:    (n) => `${n}@tmomail.net`,
  sprint:     (n) => `${n}@messaging.sprintpcs.com`,
  boost:      (n) => `${n}@sms.myboostmobile.com`,
  cricket:    (n) => `${n}@sms.cricketwireless.net`,
  metro:      (n) => `${n}@mymetropcs.com`,
  uscellular: (n) => `${n}@email.uscc.net`,
  virgin:     (n) => `${n}@vmobl.com`,
  tracfone:   (n) => `${n}@mmst5.tracfone.com`,
  straighttalk: (n) => `${n}@vtext.com`,   // uses Verizon network
  consumer:   (n) => `${n}@mailmymobile.net`,
  other:      (n) => null,  // unknown carrier — skip SMS, email only
}

export const CARRIER_OPTIONS = [
  { value: 'verizon',    label: 'Verizon' },
  { value: 'att',        label: 'AT&T' },
  { value: 'tmobile',    label: 'T-Mobile' },
  { value: 'sprint',     label: 'Sprint / Boost Mobile' },
  { value: 'boost',      label: 'Boost Mobile' },
  { value: 'cricket',    label: 'Cricket Wireless' },
  { value: 'metro',      label: 'Metro by T-Mobile' },
  { value: 'uscellular', label: 'US Cellular' },
  { value: 'virgin',     label: 'Virgin Mobile' },
  { value: 'tracfone',   label: 'Tracfone' },
  { value: 'straighttalk', label: 'Straight Talk' },
  { value: 'consumer',   label: 'Consumer Cellular' },
  { value: 'other',      label: 'Other / Unknown' },
]

function buildSmsText(type, lead) {
  const site = 'usahudhomes.com'
  if (type === 'test') {
    return `USAHUDHomes: SMS notifications are active! You will receive texts here for new leads.`
  }
  if (!lead) return `USAHUDHomes: You have a new lead. Login at ${site}`

  const name     = lead.name  || 'Unknown'
  const phone    = lead.phone || 'N/A'
  const property = lead.property || ''
  const state    = lead.state || ''

  if (type === 'assigned_lead') {
    return [
      `USAHUDHomes: Lead assigned to you!`,
      `Name: ${name}`,
      `Phone: ${phone}`,
      property ? `Property: ${property}` : null,
      state    ? `State: ${state}` : null,
      `Login: ${site}/broker-dashboard`,
    ].filter(Boolean).join('\n')
  }

  // new_lead (admin notification)
  return [
    `USAHUDHomes: New lead received!`,
    `Name: ${name}`,
    `Phone: ${phone}`,
    property ? `Property: ${property}` : null,
    state    ? `State: ${state}` : null,
    `Login: ${site}/admin`,
  ].filter(Boolean).join('\n')
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' })
  }

  const body    = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const { phone, carrier, message, type = 'new_lead', lead } = body

  if (!phone || !carrier) {
    return res.status(400).json({ error: 'phone and carrier are required' })
  }

  // Normalize phone to 10 digits
  const digits = phone.replace(/\D/g, '').slice(-10)
  if (digits.length !== 10) {
    return res.status(400).json({ error: `Invalid phone number: ${phone}` })
  }

  const gatewayFn = CARRIERS[carrier]
  if (!gatewayFn) {
    return res.status(400).json({ error: `Unknown carrier: ${carrier}` })
  }

  const gateway = gatewayFn(digits)
  if (!gateway) {
    // Carrier is "other" — no gateway available
    return res.status(200).json({ success: false, skipped: true, reason: 'unknown_carrier' })
  }

  const smsText = message || buildSmsText(type, lead)

  // Send via Resend — plain text email to the SMS gateway address
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'notifications@usahudhomes.com',
      to:   [gateway],
      subject: '',          // subject appears as part of SMS on some carriers — keep blank
      text: smsText,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Resend SMS gateway error:', data)
    return res.status(500).json({ error: 'Failed to send SMS', details: data })
  }

  console.log(`SMS sent to ${gateway} (${carrier}) via Resend: ${data.id}`)
  return res.status(200).json({ success: true, gateway, resend_id: data.id })
}
