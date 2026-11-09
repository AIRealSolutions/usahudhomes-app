/**
 * Vercel Serverless Function: /api/broker-finder
 *
 * Finds HUD-registered selling brokers near a property (hudhomestore.gov/brokersearch),
 * keeps them in the hud_brokers directory (geocoded for the map), and emails them
 * referral requests when a buyer wants to bid and no partner agent covers the area.
 *
 * Routes via ?action= (POST):
 *   suggest   (admin)  { propertyId, maxMiles?, want? } — nearest HUD brokers to a property
 *   send      (admin)  { propertyId, leadId?, note?, recipients: [{ brokerId, email, distanceMiles }] }
 *   resend    (admin)  { requestId }
 *   link      (admin)  { propertyId, brokerId, leadId?, note?, feePercent?, prospectAware?, distanceMiles? }
 *                      — creates the request without emailing and returns its link plus a short
 *                        message to text or share (HUD lists phones, not emails)
 *   scan      (admin)  { state } — fill the directory for a state's property cities (call until done)
 *   geocode   (admin)  { limit? } — place directory brokers that have no map pin yet
 *   lookup    (public) { token } — the broker's referral page reads its request
 *   respond   (public) { token, response: 'accept'|'decline'|'optout', note?, wantsMoreLeads?, regions?,
 *                        agentLicense?, firmLicense? } — on accept, emails the filled referral agreement
 *   agreement (public, GET ?token=) — the filled referral agreement PDF, once the broker accepted
 *   agreement-preview (admin) { requestId? } — the filled PDF for a request, or with sample data
 *
 * Referral agreement: NC REALTORS® Form 730, uploaded by an admin to the private
 * 'private-forms' bucket (see api/_referral-agreement.js). Optional env for the
 * referring firm: REFERRAL_FIRM_NAME, REFERRAL_FIRM_LICENSE, REFERRAL_AGENT_NAME,
 * REFERRAL_AGENT_LICENSE, REFERRAL_FIRM_ADDRESS, REFERRAL_FIRM_PHONE, REFERRAL_FIRM_EMAIL.
 *
 * HUD only publishes company, contact, office address and phone — no email — so the
 * admin adds an email before a request can be sent. Office addresses are geocoded with
 * the U.S. Census geocoder (free, no key), which also gives the county used to file the
 * broker into an economic region.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, GMAIL_USER, GMAIL_APP_PASS
 *      optional RESEND_API_KEY + REFERRAL_FROM_EMAIL (or INVITE_FROM_EMAIL), BUSINESS_MAILING_ADDRESS
 */

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import nodemailer from 'nodemailer'
import zipcodes from 'zipcodes'
import {
  fillReferralAgreement, referringFirm, FORM_BUCKET, FORM_PATH,
  DEFAULT_FEE_PERCENT, DEFAULT_TERM_MONTHS, DEFAULT_PAYMENT_DAYS,
} from './_referral-agreement.js'

export const config = { maxDuration: 60 }

const SITE_URL = 'https://usahudhomes.com'
const HUD_BASE_URL = 'https://www.hudhomestore.gov'
const HUD_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const CENSUS = 'https://geocoding.geo.census.gov/geocoder/geographies'
const SEARCH_FRESH_DAYS = 14          // reuse a HUD search for this long
const MAX_HUD_CALLS = 14              // per suggest request
const MAX_SEND = 25                   // referral emails per request
const DEFAULT_SENDER = { name: 'Marc Spencer', company: 'Lightkeeper Realty', phone: '(910) 363-6147', email: '' }
const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOKEN_RE = /^[0-9a-f]{40}$/

const db = () => createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim()
const clip = (v, n) => clean(v).slice(0, n)
const zip5 = v => (clean(v).match(/^\d{5}/) || [''])[0]
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const money = n => (Number(n) ? '$' + Math.round(Number(n)).toLocaleString('en-US') : '')

// ─── Geography ───────────────────────────────────────────────────────────────
function miles(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null
  const R = 3958.8, rad = x => x * Math.PI / 180
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10
}
const zipPoint = zip => { const z = zip && zipcodes.lookup(zip5(zip)); return z ? { lat: z.latitude, lng: z.longitude } : null }
const pointOf = row => (row?.latitude != null && row?.longitude != null ? { lat: Number(row.latitude), lng: Number(row.longitude) } : null)

// Towns near a point, nearest first, in one state (HUD lists brokers by office city)
function nearbyCities(origin, originZip, state, maxMiles) {
  const seen = new Map()
  for (const code of zipcodes.radius(originZip, maxMiles) || []) {
    const z = zipcodes.lookup(code)
    if (!z || z.state !== state || !z.city) continue
    const key = z.city.toLowerCase()
    const d = miles(origin, { lat: z.latitude, lng: z.longitude })
    if (d == null) continue
    if (!seen.has(key) || seen.get(key).distance > d) seen.set(key, { city: z.city, distance: d })
  }
  return [...seen.values()].sort((a, b) => a.distance - b.distance)
}

async function censusJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'USAHUDhomes broker finder' } })
  if (!r.ok) throw new Error(`Census geocoder HTTP ${r.status}`)
  return r.json()
}

// Office address → map pin + county; falls back to the ZIP's center
async function geocodeBroker(b) {
  const common = 'benchmark=Public_AR_Current&vintage=Current_Current&layers=Counties&format=json'
  if (b.address && (b.city || b.zip)) {
    try {
      const line = [b.address, b.city, b.state, zip5(b.zip)].filter(Boolean).join(', ')
      const j = await censusJson(`${CENSUS}/onelineaddress?address=${encodeURIComponent(line)}&${common}`)
      const m = j?.result?.addressMatches?.[0]
      if (m) {
        return {
          latitude: m.coordinates.y, longitude: m.coordinates.x, geocode_quality: 'address',
          county: m.geographies?.Counties?.[0]?.BASENAME || null,
        }
      }
    } catch { /* fall back to the ZIP */ }
  }
  const p = zipPoint(b.zip)
  if (!p) return null
  let county = null
  try {
    const j = await censusJson(`${CENSUS}/coordinates?x=${p.lng}&y=${p.lat}&${common}`)
    county = j?.result?.geographies?.Counties?.[0]?.BASENAME || null
  } catch { /* pin without county */ }
  return { latitude: p.lat, longitude: p.lng, geocode_quality: 'zip', county }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k) }
  }))
  return out
}

// ─── HUD broker search ───────────────────────────────────────────────────────
// Same pattern as the bid-results sync: the page's anti-forgery token + cookies,
// then POST BrokerSearch?handler=GetBrokerSearch&citystate=<ZIP or "City, ST">.
async function openHudSession() {
  const res = await fetch(`${HUD_BASE_URL}/brokersearch`, { headers: { 'User-Agent': HUD_UA }, signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`HUD broker search page returned HTTP ${res.status}`)
  const html = await res.text()
  const token = html.match(/name="request-verification-token"\s+value="([^"]+)"/i)?.[1]
  if (!token) throw new Error('HUD broker search page changed: no verification token found')
  const cookies = (res.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ')
  return { token, cookies }
}

async function hudBrokerSearch(session, citystate) {
  const res = await fetch(`${HUD_BASE_URL}/BrokerSearch?handler=GetBrokerSearch&citystate=${encodeURIComponent(citystate)}`, {
    method: 'POST',
    headers: {
      'User-Agent': HUD_UA,
      RequestVerificationToken: session.token,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Cookie: session.cookies,
    },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HUD broker search HTTP ${res.status}`)
  const text = await res.text()
  if (!text.trim()) return []
  let rows
  try { rows = JSON.parse(text) } catch { throw new Error('HUD broker search returned an unexpected page (session expired?)') }
  return Array.isArray(rows) ? rows.filter(r => r && !r.Error && r.CompanyName) : []
}

const brokerKey = b => [b.company_name, b.contact_name, zip5(b.zip)].map(x => clean(x).toLowerCase().replace(/[.,]/g, '')).join('|')

function mapHudBroker(r) {
  const b = {
    company_name: clip(r.CompanyName, 200),
    contact_name: clip(r.ContactName, 120) || null,
    address: clip(r.OfficeAddress, 200) || null,
    city: clip(r.OfficeCity, 80) || null,
    state: clip(r.OfficeState, 2).toUpperCase() || null,
    zip: clip(r.OfficeZipcode, 10) || null,
    phone: clip(r.OfficePhoneNumber, 30) || null,
  }
  return { ...b, broker_key: brokerKey(b) }
}

// Save HUD rows into the directory (new rows are geocoded later); returns saved rows
async function upsertBrokers(client, rows) {
  if (!rows.length) return []
  const unique = [...new Map(rows.map(r => [r.broker_key, r])).values()]
  const now = new Date().toISOString()
  const { data: existing, error } = await client.from('hud_brokers').select('id,broker_key').in('broker_key', unique.map(r => r.broker_key))
  if (error) throw error
  const have = new Map((existing || []).map(r => [r.broker_key, r.id]))
  const fresh = unique.filter(r => !have.has(r.broker_key)).map(r => ({ ...r, last_seen_at: now }))
  if (fresh.length) {
    const { error: e } = await client.from('hud_brokers').insert(fresh)
    if (e && e.code !== '23505') throw e
  }
  for (const r of unique.filter(r => have.has(r.broker_key))) {
    // HUD's copy is the source of truth for office details; email/status/notes stay ours
    await client.from('hud_brokers').update({ ...r, last_seen_at: now }).eq('id', have.get(r.broker_key))
  }
  const { data, error: e2 } = await client.from('hud_brokers').select('*').in('broker_key', unique.map(r => r.broker_key))
  if (e2) throw e2
  return data || []
}

// One directory query, served from HUD or (if searched recently) from hud_brokers
async function runSearch(client, ctx, q) {
  const { data: cached } = await client.from('hud_broker_searches').select('searched_at').eq('query', q.key).maybeSingle()
  const fresh = cached && Date.now() - new Date(cached.searched_at).getTime() < SEARCH_FRESH_DAYS * 86400000
  if (!fresh) {
    if (ctx.hudCalls >= ctx.maxCalls) return { skipped: true }
    ctx.hudCalls++
    ctx.session = ctx.session || await openHudSession()
    const rows = (await hudBrokerSearch(ctx.session, q.citystate)).map(mapHudBroker).filter(r => r.state === q.state)
    await upsertBrokers(client, rows)
    await client.from('hud_broker_searches').upsert({ query: q.key, result_count: rows.length, searched_at: new Date().toISOString() })
  }
  let sel = client.from('hud_brokers').select('*').eq('state', q.state)
  sel = q.zip ? sel.like('zip', `${q.zip}%`) : sel.ilike('city', q.city.replace(/[%_]/g, ''))
  const { data, error } = await sel.limit(200)
  if (error) throw error
  return { rows: data || [], fromCache: !!fresh }
}

async function geocodeMissing(client, brokers, limit = 25) {
  const todo = brokers.filter(b => b.latitude == null).slice(0, limit)
  await mapLimit(todo, 5, async b => {
    const g = await geocodeBroker(b).catch(() => null)
    if (!g) return
    const { data } = await client.from('hud_brokers').update(g).eq('id', b.id).select('*').single()
    if (data) Object.assign(b, data)
  })
  return todo.length
}

// ─── Auth ────────────────────────────────────────────────────────────────────
async function requireAdmin(req, client) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data: { user } = {} } = await client.auth.getUser(token)
  if (!user) return null
  const { data } = await client.from('users').select('role,name,email').eq('id', user.id).maybeSingle()
  return data?.role === 'admin' ? { ...user, profile: data } : null
}

async function senderProfile(client, user) {
  if (!user?.email) return DEFAULT_SENDER
  const { data: agent } = await client.from('agents').select('first_name,last_name,company,phone,email')
    .ilike('email', user.email.replace(/[%_]/g, '\\$&')).maybeSingle()
  if (agent) {
    return {
      name: clean(`${agent.first_name || ''} ${agent.last_name || ''}`) || DEFAULT_SENDER.name,
      company: agent.company || DEFAULT_SENDER.company,
      phone: agent.phone || DEFAULT_SENDER.phone,
      email: agent.email || user.email,
    }
  }
  return { ...DEFAULT_SENDER, name: user.profile?.name || DEFAULT_SENDER.name, email: user.email }
}

// ─── Email ───────────────────────────────────────────────────────────────────
function mailer() {
  if (process.env.RESEND_API_KEY) {
    const from = process.env.REFERRAL_FROM_EMAIL || process.env.INVITE_FROM_EMAIL || 'referrals@usahudhomes.com'
    return {
      async send({ fromName, to, replyTo, subject, html, text, headers, attachments }) {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `${fromName} <${from}>`, to: [to], reply_to: replyTo, subject, html, text, headers,
            ...(attachments?.length ? { attachments: attachments.map(a => ({ filename: a.filename, content: Buffer.from(a.content).toString('base64') })) } : {}),
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
  const { GMAIL_USER, GMAIL_APP_PASS } = process.env
  if (!GMAIL_USER || !GMAIL_APP_PASS) throw new Error('Email is not configured (GMAIL_USER / GMAIL_APP_PASS or RESEND_API_KEY)')
  const t = nodemailer.createTransport({ pool: true, service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS.replace(/\s/g, '') } })
  return {
    send: ({ fromName, ...m }) => t.sendMail({ ...m, from: `"${fromName}" <${GMAIL_USER}>` }),
    close: () => t.close(),
  }
}

function buildReferralEmail(reqRow, broker, sender, regionNames) {
  const first = clean(broker.contact_name).split(' ')[0] || 'there'
  const link = `${SITE_URL}/broker-referral/${reqRow.token}`
  const propertyUrl = reqRow.case_number ? `${SITE_URL}/property/${encodeURIComponent(reqRow.case_number)}` : ''
  const where = [reqRow.property_address, [reqRow.property_city, reqRow.property_state].filter(Boolean).join(', ')].filter(Boolean).join(', ')
  const facts = [
    reqRow.case_number && `HUD case #${reqRow.case_number}`,
    money(reqRow.property_price) && `List price ${money(reqRow.property_price)}`,
    reqRow.distance_miles != null && `About ${reqRow.distance_miles} miles from your office`,
  ].filter(Boolean)
  const signature = [sender.name, [sender.company, sender.phone].filter(Boolean).join(' · '), 'USAHUDhomes.com'].filter(Boolean)
  const business = process.env.BUSINESS_MAILING_ADDRESS || ''
  const subject = `HUD buyer referral: ${where || 'a HUD home near you'}`
  const fee = Number(reqRow.fee_percent ?? DEFAULT_FEE_PERCENT)
  const ask = `I found your office on HUD's registered broker list. I have a buyer who wants to bid on a HUD home near you, and I don't have an agent in that area. Would you be able to represent the buyer and submit the bid? The referral fee is ${fee}% of the buyer-side compensation; I'll send the referral agreement (NC REALTORS® Form 730) once you accept.`
  const regionsLine = regionNames.length
    ? `We also send HUD buyer leads by region${regionNames.length <= 3 ? ` (${regionNames.join(', ')})` : ` across ${regionNames.length} regions of ${reqRow.property_state}`}. You can choose the regions you cover from the same page.`
    : `You can also sign up from the same page to receive more HUD buyer leads in ${reqRow.property_state || 'your state'}.`

  const btn = (href, label, bg) => `<a href="${href}" style="display:inline-block;background:${bg};color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;margin:4px 8px 4px 0">${label}</a>`
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827">
      <p>Hi ${escapeHtml(first)},</p>
      <p>${escapeHtml(ask)}</p>
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin:16px 0;background:#f9fafb">
        <strong>${escapeHtml(where)}</strong>
        ${facts.length ? `<div style="color:#374151;margin-top:6px">${facts.map(escapeHtml).join('<br>')}</div>` : ''}
        ${propertyUrl ? `<div style="margin-top:8px"><a href="${propertyUrl}">View the listing</a></div>` : ''}
      </div>
      ${reqRow.note ? `<blockquote style="margin:16px 0;padding:12px 16px;background:#f3f4f6;border-left:4px solid #1e40af;white-space:pre-wrap">${escapeHtml(reqRow.note)}</blockquote>` : ''}
      <p style="margin:22px 0">${btn(`${link}?r=accept`, 'Yes, I can help this buyer', '#15803d')}${btn(`${link}?r=decline`, 'Not this one', '#6b7280')}</p>
      <p>${escapeHtml(regionsLine)}</p>
      <p style="margin-top:24px">${signature.map(escapeHtml).join('<br>')}</p>
      <p style="color:#6b7280;font-size:12px;margin-top:28px">You received this because your office is listed in HUD's selling broker directory near this property.
        ${business ? `${escapeHtml(business)}.` : ''} <a href="${link}?r=optout" style="color:#6b7280">Don't send me referrals</a></p>
    </div>`
  const text = [
    `Hi ${first},`, '',
    ask, '',
    where, ...facts, ...(propertyUrl ? [propertyUrl] : []), '',
    ...(reqRow.note ? [reqRow.note, ''] : []),
    `Yes, I can help: ${link}?r=accept`, `Not this one: ${link}?r=decline`, '',
    regionsLine, '',
    ...signature, '',
    `Don't send me referrals: ${link}?r=optout`,
  ].join('\n')
  return { subject, html, text, unsubscribe: `${link}?r=optout` }
}

async function regionNamesFor(client, state) {
  if (!state) return []
  const { data } = await client.from('economic_regions').select('slug,name').eq('state', state).order('sort_order')
  return data || []
}

async function deliver(client, m, reqRow, broker, sender, regions) {
  const now = new Date().toISOString()
  const { subject, html, text, unsubscribe } = buildReferralEmail(reqRow, broker, sender, regions.map(r => r.name))
  try {
    await m.send({
      fromName: `${sender.name.replace(/["\\\r\n<>]/g, '')} via USAHUDhomes`,
      replyTo: sender.email || process.env.GMAIL_USER,
      to: reqRow.email, subject, html, text,
      headers: { 'List-Unsubscribe': `<${unsubscribe}>` },
    })
    await client.from('broker_referral_requests').update({
      status: ['opened', 'accepted', 'declined'].includes(reqRow.status) ? reqRow.status : 'sent',
      sent_at: now, send_count: (reqRow.send_count || 0) + 1, last_error: null, updated_at: now,
    }).eq('id', reqRow.id)
    await client.from('hud_brokers').update({
      last_contacted_at: now, ...(broker.status === 'new' ? { status: 'contacted' } : {}),
    }).eq('id', broker.id)
    return { id: reqRow.id, brokerId: broker.id, email: reqRow.email, status: 'sent' }
  } catch (e) {
    await client.from('broker_referral_requests').update({ status: 'failed', last_error: e.message.slice(0, 500), updated_at: now }).eq('id', reqRow.id)
    return { id: reqRow.id, brokerId: broker.id, email: reqRow.email, status: 'failed', error: e.message }
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────
async function loadProperty(client, id) {
  if (!UUID_RE.test(String(id || ''))) return null
  const { data } = await client.from('properties')
    .select('id,case_number,address,city,state,zip_code,county,price,latitude,longitude,economic_region,status')
    .eq('id', id).maybeSingle()
  return data
}

async function handleSuggest(req, res, client) {
  const property = await loadProperty(client, req.body?.propertyId)
  if (!property) return res.status(404).json({ error: 'Property not found' })
  const state = clean(property.state).toUpperCase()
  const zip = zip5(property.zip_code)
  const origin = pointOf(property) || zipPoint(zip)
  if (!origin || !zip) return res.status(400).json({ error: 'This property has no ZIP code or coordinates to search from.' })
  const maxMiles = Math.min(Math.max(Number(req.body?.maxMiles) || 50, 10), 150)
  const want = Math.min(Math.max(Number(req.body?.want) || 10, 3), 40)

  const queries = [{ key: `ZIP:${zip}`, citystate: zip, zip, state, label: `ZIP ${zip}`, distance: 0 }]
  const cities = nearbyCities(origin, zip, state, maxMiles)
  const propCity = clean(property.city)
  if (propCity && !cities.some(c => c.city.toLowerCase() === propCity.toLowerCase())) cities.unshift({ city: propCity, distance: 0 })
  for (const c of cities) {
    queries.push({ key: `CITY:${state}:${c.city.toLowerCase()}`, citystate: `${c.city}, ${state}`, city: c.city, state, label: `${c.city}, ${state}`, distance: c.distance })
  }

  const ctx = { hudCalls: 0, maxCalls: MAX_HUD_CALLS, session: null }
  const found = new Map(), searched = [], errors = []
  const started = Date.now()
  let unsearched = 0
  for (const q of queries) {
    if (Date.now() - started > 35000) { unsearched++; continue }
    // Enough brokers closer than the next town? Then stop searching outward.
    const closer = [...found.values()].filter(b => (miles(origin, pointOf(b) || zipPoint(b.zip)) ?? 999) <= q.distance + 3)
    if (closer.length >= want) break
    try {
      const r = await runSearch(client, ctx, q)
      if (r.skipped) { unsearched++; continue }
      searched.push({ label: q.label, count: r.rows.length, cached: r.fromCache })
      for (const b of r.rows) found.set(b.id, b)
    } catch (e) {
      errors.push(`${q.label}: ${e.message}`)
      if (/verification token|HTTP 4|HTTP 5/.test(e.message) && !searched.length) break
    }
  }

  const brokers = [...found.values()]
  await geocodeMissing(client, brokers, 30)
  const ranked = brokers
    .map(b => ({ ...b, distance_miles: miles(origin, pointOf(b) || zipPoint(b.zip)) }))
    .sort((a, b) => (a.distance_miles ?? 9999) - (b.distance_miles ?? 9999))
    .slice(0, Math.max(want, 25))

  const { data: requests } = await client.from('broker_referral_requests')
    .select('id,broker_id,status,email,sent_at,responded_at,wants_more_leads,response_note,created_at')
    .eq('property_id', property.id).order('created_at', { ascending: false })
  const byBroker = new Map()
  for (const r of requests || []) if (!byBroker.has(r.broker_id)) byBroker.set(r.broker_id, r)

  // Partner agents already signed up for this state/region
  const { data: agents } = await client.from('agents')
    .select('id,first_name,last_name,company,email,phone,states_covered,economic_regions,is_active')
    .eq('is_active', true).limit(500)
  const partners = (agents || []).filter(a => (a.states_covered || []).includes(state)).map(a => {
    const regions = Array.isArray(a.economic_regions) ? a.economic_regions.filter(r => String(r).startsWith(`${state}:`)) : []
    return {
      id: a.id, name: clean(`${a.first_name || ''} ${a.last_name || ''}`), company: a.company, email: a.email, phone: a.phone,
      covers: !regions.length ? 'state' : property.economic_region && regions.includes(`${state}:${property.economic_region}`) ? 'region' : 'other-region',
    }
  }).filter(p => p.covers !== 'other-region')

  return res.status(200).json({
    property: { ...property, origin },
    brokers: ranked.map(b => ({ ...b, request: byBroker.get(b.id) || null })),
    partners,
    searched, errors,
    hudCalls: ctx.hudCalls,
    moreToSearch: unsearched > 0,
    maxMiles,
  })
}

// Options shared by emailed and shared-link requests
function requestOptions(body) {
  const feeIn = Number(body?.feePercent)
  return {
    note: clip(body?.note, 2000) || null,
    feePercent: Number.isFinite(feeIn) && feeIn > 0 && feeIn <= 100 ? Math.round(feeIn * 100) / 100 : DEFAULT_FEE_PERCENT,
    prospectAware: typeof body?.prospectAware === 'boolean' ? body.prospectAware : null,
    leadId: UUID_RE.test(String(body?.leadId || '')) ? body.leadId : null,
  }
}

// One request per broker per property: reuse the existing one instead of duplicating.
// email '' = not known yet (a shared link); the broker gives it when they accept.
async function upsertRequest(client, { property, broker, admin, email, distanceMiles, opts }) {
  const { note, feePercent, prospectAware, leadId } = opts
  const { data: prior } = await client.from('broker_referral_requests').select('*')
    .eq('broker_id', broker.id).eq('property_id', property.id).order('created_at', { ascending: false }).limit(1)
  const row = prior?.[0]
  if (row) {
    const { data, error } = await client.from('broker_referral_requests')
      .update({
        email: email || row.email || '', note: note ?? row.note, lead_id: leadId ?? row.lead_id, fee_percent: feePercent,
        prospect_aware: prospectAware ?? row.prospect_aware, updated_at: new Date().toISOString(),
      })
      .eq('id', row.id).select('*').single()
    if (error) throw error
    return data
  }
  const { data, error } = await client.from('broker_referral_requests').insert({
    token: randomBytes(20).toString('hex'),
    broker_id: broker.id, property_id: property.id, lead_id: leadId,
    case_number: property.case_number, property_address: property.address,
    property_city: property.city, property_state: property.state, property_price: property.price,
    distance_miles: Number.isFinite(Number(distanceMiles)) && distanceMiles !== null ? Number(distanceMiles) : null,
    note, email: email || '', created_by: admin.id,
    fee_percent: feePercent, payment_days: DEFAULT_PAYMENT_DAYS, prospect_aware: prospectAware,
  }).select('*').single()
  if (error) throw error
  return data
}

// The short message that goes with a shared link (text message, chat, email)
function shareMessage(row, broker, sender) {
  const first = clean(broker.contact_name).split(' ')[0]
  const home = [row.property_address, row.property_city].filter(Boolean).join(', ')
  const dist = row.distance_miles != null ? ` (about ${Math.round(Number(row.distance_miles))} mi from your office)` : ''
  const fee = Number(row.fee_percent ?? DEFAULT_FEE_PERCENT)
  return `Hi${first ? ` ${first}` : ''}, this is ${sender.name} with ${sender.company} / USAHUDhomes.com. ` +
    `I have a buyer who wants to bid on the HUD home at ${home}${dist}, and I don't have an agent there. ` +
    `${fee}% referral. Can you help? Details and reply: ${SITE_URL}/broker-referral/${row.token}`
}

async function handleLink(req, res, client, admin) {
  const property = await loadProperty(client, req.body?.propertyId)
  if (!property) return res.status(404).json({ error: 'Property not found' })
  const brokerId = String(req.body?.brokerId || '')
  if (!UUID_RE.test(brokerId)) return res.status(400).json({ error: 'Choose a broker' })
  const { data: broker } = await client.from('hud_brokers').select('*').eq('id', brokerId).maybeSingle()
  if (!broker) return res.status(404).json({ error: 'Broker not found' })
  if (broker.status === 'do_not_contact') return res.status(400).json({ error: 'This broker asked not to be contacted.' })
  const row = await upsertRequest(client, { property, broker, admin, email: clean(broker.email).toLowerCase(), distanceMiles: req.body?.distanceMiles, opts: requestOptions(req.body) })
  const now = new Date().toISOString()
  await client.from('hud_brokers').update({ last_contacted_at: now, ...(broker.status === 'new' ? { status: 'contacted' } : {}) }).eq('id', broker.id)
  const sender = await senderProfile(client, admin)
  const message = shareMessage(row, broker, sender)
  return res.status(200).json({
    requestId: row.id, url: `${SITE_URL}/broker-referral/${row.token}`, message,
    subject: `HUD buyer referral: ${[row.property_address, row.property_city, row.property_state].filter(Boolean).join(', ')}`,
    phone: broker.phone, email: broker.email || '', status: row.status,
  })
}

async function handleSend(req, res, client, admin) {
  const property = await loadProperty(client, req.body?.propertyId)
  if (!property) return res.status(404).json({ error: 'Property not found' })
  const recipients = (Array.isArray(req.body?.recipients) ? req.body.recipients : []).slice(0, MAX_SEND)
  if (!recipients.length) return res.status(400).json({ error: 'Choose at least one broker.' })
  const opts = requestOptions(req.body)
  const ids = recipients.map(r => r.brokerId).filter(id => UUID_RE.test(String(id)))
  const { data: brokers, error } = await client.from('hud_brokers').select('*').in('id', ids)
  if (error) throw error
  const byId = new Map((brokers || []).map(b => [b.id, b]))
  const sender = await senderProfile(client, admin)
  const regions = await regionNamesFor(client, property.state)
  const m = mailer()
  const results = []
  try {
    for (const r of recipients) {
      const broker = byId.get(r.brokerId)
      if (!broker) { results.push({ brokerId: r.brokerId, status: 'skipped', error: 'Broker not found' }); continue }
      if (broker.status === 'do_not_contact') { results.push({ brokerId: broker.id, status: 'skipped', error: 'Broker asked not to be contacted' }); continue }
      const email = clean(r.email || broker.email).toLowerCase()
      if (!EMAIL_RE.test(email)) { results.push({ brokerId: broker.id, status: 'skipped', error: 'Add a valid email first' }); continue }
      if (email !== clean(broker.email).toLowerCase()) {
        await client.from('hud_brokers').update({ email }).eq('id', broker.id)
        broker.email = email
      }
      let row
      try {
        row = await upsertRequest(client, { property, broker, admin, email, distanceMiles: r.distanceMiles, opts })
      } catch (e) { results.push({ brokerId: broker.id, status: 'failed', error: e.message }); continue }
      results.push(await deliver(client, m, row, broker, sender, regions))
    }
  } finally { m.close() }
  return res.status(200).json({ results, sent: results.filter(r => r.status === 'sent').length })
}

async function handleResend(req, res, client, admin) {
  const id = String(req.body?.requestId || '')
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Invalid request id' })
  const { data: row } = await client.from('broker_referral_requests').select('*').eq('id', id).maybeSingle()
  if (!row) return res.status(404).json({ error: 'Request not found' })
  const { data: broker } = await client.from('hud_brokers').select('*').eq('id', row.broker_id).single()
  if (broker?.status === 'do_not_contact') return res.status(400).json({ error: 'Broker asked not to be contacted' })
  if (!EMAIL_RE.test(row.email || '')) return res.status(400).json({ error: 'No email for this broker yet — use Share link, or add an email and send.' })
  if (row.sent_at && Date.now() - new Date(row.sent_at).getTime() < 12 * 3600000) return res.status(400).json({ error: 'Sent within the last 12 hours.' })
  const m = mailer()
  try {
    const result = await deliver(client, m, row, broker, await senderProfile(client, admin), await regionNamesFor(client, row.property_state))
    return res.status(200).json(result)
  } finally { m.close() }
}

// Fill the directory for every property city in a state (call repeatedly until done)
async function handleScan(req, res, client) {
  const state = clean(req.body?.state).toUpperCase()
  if (!/^[A-Z]{2}$/.test(state)) return res.status(400).json({ error: 'Choose a state' })
  const { data: props, error } = await client.from('properties').select('city').eq('state', state).not('city', 'is', null).limit(5000)
  if (error) throw error
  const cities = [...new Map((props || []).map(p => [clean(p.city).toLowerCase(), clean(p.city)])).values()].filter(Boolean)
  const keys = cities.map(c => `CITY:${state}:${c.toLowerCase()}`)
  const { data: done } = await client.from('hud_broker_searches').select('query,searched_at').in('query', keys)
  const freshKeys = new Set((done || []).filter(d => Date.now() - new Date(d.searched_at).getTime() < SEARCH_FRESH_DAYS * 86400000).map(d => d.query))
  const todo = cities.filter(c => !freshKeys.has(`CITY:${state}:${c.toLowerCase()}`))
  const ctx = { hudCalls: 0, maxCalls: 12, session: null }
  const started = Date.now()
  let searchedNow = 0, foundNow = 0
  const errors = []
  for (const city of todo) {
    if (ctx.hudCalls >= ctx.maxCalls || Date.now() - started > 30000) break
    try {
      const r = await runSearch(client, ctx, { key: `CITY:${state}:${city.toLowerCase()}`, citystate: `${city}, ${state}`, city, state })
      searchedNow++; foundNow += r.rows?.length || 0
    } catch (e) { errors.push(`${city}: ${e.message}`); if (!searchedNow) break }
  }
  const { data: missing } = await client.from('hud_brokers').select('*').eq('state', state).is('latitude', null).limit(20)
  const geocoded = await geocodeMissing(client, missing || [], 20)
  return res.status(200).json({ state, cities: cities.length, searchedNow, foundNow, geocoded, remaining: Math.max(todo.length - searchedNow, 0), errors })
}

async function handleGeocode(req, res, client) {
  const limit = Math.min(Math.max(Number(req.body?.limit) || 25, 1), 40)
  const { data, error } = await client.from('hud_brokers').select('*').is('latitude', null).limit(limit)
  if (error) throw error
  const n = await geocodeMissing(client, data || [], limit)
  const { count } = await client.from('hud_brokers').select('id', { count: 'exact', head: true }).is('latitude', null)
  return res.status(200).json({ geocoded: n, remaining: count || 0 })
}

async function loadByToken(client, token) {
  if (!TOKEN_RE.test(String(token || ''))) return null
  const { data } = await client.from('broker_referral_requests').select('*, broker:hud_brokers(*)').eq('token', token).maybeSingle()
  return data
}

// ─── Referral agreement (Form 730) ──────────────────────────────────────────
async function loadFormTemplate(client) {
  const { data, error } = await client.storage.from(FORM_BUCKET).download(FORM_PATH)
  if (error || !data) return null
  return new Uint8Array(await data.arrayBuffer())
}

const wrap = (text, width = 115, maxLines = 2) => {
  const words = clean(text).split(' '), lines = ['']
  for (const w of words) {
    if ((lines[lines.length - 1] + ' ' + w).trim().length > width) lines.push('')
    lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + w).trim()
  }
  return lines.filter(Boolean).slice(0, maxLines)
}

function addMonths(date, months) {
  const d = new Date(date)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

async function agreementPdf(client, row, template) {
  const tpl = template || await loadFormTemplate(client)
  if (!tpl) return null
  const b = row.broker || {}
  let prospect = {}
  if (row.lead_id) {
    const { data: l } = await client.from('leads').select('first_name,last_name,email,phone').eq('id', row.lead_id).maybeSingle()
    if (l) prospect = { name: clean(`${l.first_name || ''} ${l.last_name || ''}`), phone: l.phone, email: l.email }
  }
  const home = [row.property_address, row.property_city, row.property_state].filter(Boolean).join(', ')
  const notes = [
    `HUD home: ${home}${row.case_number ? ` · HUD case #${row.case_number}` : ''}${money(row.property_price) ? ` · List price ${money(row.property_price)}` : ''}`,
    ...(row.note ? wrap(`Notes: ${row.note}`) : []),
    'Referred through USAHUDhomes.com Broker Finder.',
  ]
  return fillReferralAgreement(tpl, {
    referring: referringFirm(),
    receiving: {
      firmName: b.company_name, agentName: b.contact_name,
      address: [b.address, [b.city, [b.state, b.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')].filter(Boolean).join(', '),
      phone: b.phone, email: row.email,
      firmLicense: row.receiving_firm_license, agentLicense: row.receiving_agent_license,
    },
    prospect, prospectAware: row.prospect_aware, notes,
    feePercent: row.fee_percent ?? DEFAULT_FEE_PERCENT,
    endDate: row.agreement_end_date || addMonths(new Date(), DEFAULT_TERM_MONTHS),
    paymentDays: row.payment_days ?? DEFAULT_PAYMENT_DAYS,
  })
}

const agreementFilename = row => `Referral-Agreement-${(row.case_number || row.property_city || 'HUD').replace(/[^A-Za-z0-9-]+/g, '-')}.pdf`

// GET ?action=agreement&token= — the broker's copy, once they accepted
async function handleAgreementDownload(req, res, client) {
  const row = await loadByToken(client, req.query?.token)
  if (!row || row.status !== 'accepted') return res.status(404).json({ error: 'No referral agreement for this link.' })
  const pdf = await agreementPdf(client, row)
  if (!pdf) return res.status(404).json({ error: 'The referral agreement is not available yet. We will email it to you.' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${agreementFilename(row)}"`)
  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).send(Buffer.from(pdf))
}

// Admin: the filled agreement for a request, or with sample data to check the uploaded form
async function handleAgreementPreview(req, res, client) {
  const tpl = await loadFormTemplate(client)
  if (!tpl) return res.status(404).json({ error: 'Upload the referral agreement form (NC Form 730) first.' })
  let row
  if (UUID_RE.test(String(req.body?.requestId || ''))) {
    const { data } = await client.from('broker_referral_requests').select('*, broker:hud_brokers(*)').eq('id', req.body.requestId).maybeSingle()
    row = data
  }
  row = row || {
    case_number: '387-000000', property_address: '123 Sample St', property_city: 'Tabor City', property_state: 'NC', property_price: 85000,
    note: 'Sample preview: buyer is an owner-occupant, pre-approved FHA.', email: 'broker@example.com', fee_percent: DEFAULT_FEE_PERCENT,
    payment_days: DEFAULT_PAYMENT_DAYS, prospect_aware: true, receiving_firm_license: 'C00000', receiving_agent_license: '000000',
    broker: { company_name: 'SAMPLE REALTY LLC', contact_name: 'Pat Sample', address: '1 Main St', city: 'Tabor City', state: 'NC', zip: '28463', phone: '(910) 555-0100' },
  }
  const pdf = await agreementPdf(client, row, tpl)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).send(Buffer.from(pdf))
}

async function handleLookup(req, res, client) {
  const row = await loadByToken(client, req.body?.token)
  if (!row) return res.status(404).json({ error: 'This referral link is not valid.' })
  if (!row.opened_at) {
    await client.from('broker_referral_requests').update({
      opened_at: new Date().toISOString(), ...(['pending', 'sent'].includes(row.status) ? { status: 'opened' } : {}),
    }).eq('id', row.id)
  }
  const regions = await regionNamesFor(client, row.property_state)
  const b = row.broker || {}
  return res.status(200).json({
    request: {
      status: row.status, caseNumber: row.case_number, address: row.property_address, city: row.property_city,
      state: row.property_state, price: row.property_price, distanceMiles: row.distance_miles, note: row.note,
      respondedAt: row.responded_at, wantsMoreLeads: row.wants_more_leads, regionsRequested: row.regions_requested,
      feePercent: Number(row.fee_percent ?? DEFAULT_FEE_PERCENT),
      agentLicense: row.receiving_agent_license, firmLicense: row.receiving_firm_license,
      agreementUrl: row.status === 'accepted' ? `/api/broker-finder?action=agreement&token=${row.token}` : null,
    },
    broker: { company: b.company_name, contactName: b.contact_name, phone: b.phone, email: row.email || b.email || '', city: b.city, state: b.state, optedOut: b.status === 'do_not_contact' },
    regions,
  })
}

async function handleRespond(req, res, client) {
  const row = await loadByToken(client, req.body?.token)
  if (!row) return res.status(404).json({ error: 'This referral link is not valid.' })
  const response = String(req.body?.response || '')
  if (!['accept', 'decline', 'optout'].includes(response)) return res.status(400).json({ error: 'Choose a response.' })
  const now = new Date().toISOString()
  const valid = new Set((await regionNamesFor(client, row.property_state)).map(r => r.slug))
  const regions = (Array.isArray(req.body?.regions) ? req.body.regions : []).map(String).filter(s => valid.has(s)).slice(0, 30)
  const wantsMoreLeads = response !== 'optout' && !!req.body?.wantsMoreLeads
  const note = clip(req.body?.note, 1000) || null
  const status = response === 'accept' ? 'accepted' : 'declined'
  const accepted = status === 'accepted'
  // Shared links have no email yet: the broker gives it when accepting or asking for leads
  const givenEmail = clean(req.body?.email).toLowerCase()
  if (givenEmail && !EMAIL_RE.test(givenEmail)) return res.status(400).json({ error: 'Check your email address.' })
  if (accepted && !EMAIL_RE.test(givenEmail || row.email || '')) return res.status(400).json({ error: 'Add your email so we can send you the referral agreement.' })
  if (givenEmail && givenEmail !== row.email) {
    await client.from('broker_referral_requests').update({ email: givenEmail }).eq('id', row.id)
    await client.from('hud_brokers').update({ email: givenEmail }).eq('id', row.broker_id).is('email', null)
    row.email = givenEmail
  }
  const update = { status, responded_at: now, response_note: note, wants_more_leads: wantsMoreLeads, regions_requested: regions, updated_at: now }
  if (accepted) {
    update.receiving_agent_license = clip(req.body?.agentLicense, 30) || row.receiving_agent_license || null
    update.receiving_firm_license = clip(req.body?.firmLicense, 30) || row.receiving_firm_license || null
    update.agreement_end_date = row.agreement_end_date || addMonths(now, DEFAULT_TERM_MONTHS)
  }
  await client.from('broker_referral_requests').update(update).eq('id', row.id)
  Object.assign(row, update)

  // Accepted: fill the referral agreement and email it to the broker to sign
  let agreement = null, agreementNote = ''
  if (accepted) {
    try {
      agreement = await agreementPdf(client, row)
      if (!agreement) agreementNote = 'Referral agreement not sent: upload NC Form 730 in Admin > Broker Finder.'
    } catch (e) { agreementNote = `Referral agreement could not be filled: ${e.message}` }
  }
  if (agreement) {
    const firm = referringFirm()
    const fee = Number(row.fee_percent ?? DEFAULT_FEE_PERCENT)
    const link = `${SITE_URL}/broker-referral/${row.token}`
    const body = [
      `Hi ${clean(row.broker?.contact_name).split(' ')[0] || 'there'},`, '',
      `Thank you for taking this buyer. Attached is the referral agreement (NC REALTORS® Form 730) for ${[row.property_address, row.property_city, row.property_state].filter(Boolean).join(', ')}: ${fee}% of the buyer-side compensation, through ${row.agreement_end_date}.`, '',
      'Please sign it and reply to this email with the signed copy. I will countersign and send you the buyer\'s details if they are not already on the agreement.', '',
      `You can download it again any time: ${link}`, '',
      firm.agentName, [firm.firmName, firm.phone].filter(Boolean).join(' · '),
    ]
    try {
      const m = mailer()
      try {
        await m.send({
          fromName: `${firm.agentName} via USAHUDhomes`, to: row.email, replyTo: firm.email || process.env.GMAIL_USER,
          subject: `Referral agreement: ${row.property_address || row.case_number || 'HUD buyer referral'}`,
          text: body.join('\n'), html: body.map(l => (l ? `<p>${escapeHtml(l)}</p>` : '')).join(''),
          attachments: [{ filename: agreementFilename(row), content: Buffer.from(agreement), contentType: 'application/pdf' }],
        })
        await client.from('broker_referral_requests').update({ agreement_sent_at: new Date().toISOString() }).eq('id', row.id)
      } finally { m.close() }
    } catch (e) { agreementNote = `Referral agreement email failed: ${e.message}` }
  }
  const brokerStatus = response === 'optout' ? 'do_not_contact'
    : row.broker?.status === 'registered' ? 'registered'
      : response === 'accept' || wantsMoreLeads ? 'interested' : 'declined'
  await client.from('hud_brokers').update({ status: brokerStatus }).eq('id', row.broker_id)

  // Tell the admin who sent it
  try {
    let to = process.env.GMAIL_USER
    if (row.created_by) {
      const { data: u } = await client.from('users').select('email').eq('id', row.created_by).maybeSingle()
      if (u?.email) to = u.email
    }
    if (to) {
      const b = row.broker || {}
      const verb = response === 'accept' ? 'ACCEPTED' : response === 'optout' ? 'opted out of' : 'declined'
      const lines = [
        `${b.contact_name || ''} (${b.company_name || ''}) ${verb} the referral for ${row.property_address || ''}, ${row.property_city || ''} ${row.property_state || ''}.`,
        `Phone: ${b.phone || '-'} · Email: ${row.email || '-'}`,
        note ? `Note: ${note}` : '',
        wantsMoreLeads ? `Wants more leads in ${row.property_state}: ${regions.length ? regions.join(', ') : 'whole state'}` : '',
        agreement ? `The referral agreement (${Number(row.fee_percent ?? DEFAULT_FEE_PERCENT)}%) was emailed to the broker to sign; a copy is attached.` : '',
        agreementNote,
        `${SITE_URL}/admin`,
      ].filter(Boolean)
      const m = mailer()
      try {
        await m.send({
          fromName: 'USAHUDhomes Broker Finder', to, replyTo: row.email || undefined,
          subject: `Broker ${verb}: ${row.property_address || row.case_number || 'HUD referral'}`,
          text: lines.join('\n'), html: lines.map(l => `<p>${escapeHtml(l)}</p>`).join(''),
          ...(agreement ? { attachments: [{ filename: agreementFilename(row), content: Buffer.from(agreement), contentType: 'application/pdf' }] } : {}),
        })
      } finally { m.close() }
    }
  } catch (e) { console.error('[broker-finder] admin notice failed:', e.message) }

  const registerUrl = wantsMoreLeads ? `/broker/register?ref=${row.token}` : null
  return res.status(200).json({
    ok: true, status, registerUrl,
    agreementUrl: accepted ? `/api/broker-finder?action=agreement&token=${row.token}` : null,
    agreementEmailed: !!agreement && !agreementNote,
  })
}

// ─── Router ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (!process.env.SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'Server database credentials missing' })
  const action = req.query?.action
  const client = db()
  if (req.method === 'GET' && action === 'agreement') {
    try { return await handleAgreementDownload(req, res, client) } catch (e) { return res.status(500).json({ error: e.message }) }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    if (action === 'lookup') return await handleLookup(req, res, client)
    if (action === 'respond') return await handleRespond(req, res, client)
    const admin = await requireAdmin(req, client)
    if (!admin) return res.status(403).json({ error: 'Admin sign-in required' })
    if (action === 'suggest') return await handleSuggest(req, res, client)
    if (action === 'send') return await handleSend(req, res, client, admin)
    if (action === 'resend') return await handleResend(req, res, client, admin)
    if (action === 'link') return await handleLink(req, res, client, admin)
    if (action === 'scan') return await handleScan(req, res, client)
    if (action === 'geocode') return await handleGeocode(req, res, client)
    if (action === 'agreement-preview') return await handleAgreementPreview(req, res, client)
    return res.status(400).json({ error: 'Unknown action', valid_actions: ['suggest', 'send', 'resend', 'link', 'scan', 'geocode', 'lookup', 'respond', 'agreement', 'agreement-preview'] })
  } catch (e) {
    console.error(`[broker-finder/${action}]`, e)
    return res.status(500).json({ error: e.message || 'Unexpected error' })
  }
}

// Exposed for local checks of the HUD / geocoding steps (not routed)
export const _internals = { shareMessage, nearbyCities, openHudSession, hudBrokerSearch, mapHudBroker, geocodeBroker, miles, zipPoint, buildReferralEmail, agreementPdf }
