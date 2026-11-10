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
 *   do-not-contact (admin) { brokerId, reason? } — put a broker on the do-not-contact list
 *   allow-contact  (admin) { suppressionId } — take them off it (mistakes only)
 *
 * Do-not-contact list (broker_suppressions): keyed on phone and email, not on HUD's
 * listing, so an opted-out broker stays blocked even if HUD lists them differently later.
 * Opting out through a referral link adds them automatically.
 *   license-search (admin) { kind: 'broker'|'agent', id } — state license matches (auto for NY, TX, IL)
 *                          plus where to look it up by hand (ARELLO or the state board)
 *   license-save   (admin) { kind, id, record|null } — save the license record (null clears it)
 *   license-auto   (admin) { limit? } — check unverified NY/TX/IL brokers and agents; saves exact,
 *                          single matches only
 *   release   (admin)  { requestId } — the accepted broker fell through: reopen the home to the others
 *
 * First to accept gets the buyer: once one broker accepts a home, every other broker's
 * link for that home shows it as already accepted and can no longer be accepted
 * (brokers reached by text usually have no email, so nobody else is emailed).
 *   link      (admin)  { propertyId, brokerId, leadId?, note?, feePercent?, prospectAware?, distanceMiles? }
 *                      — creates the request without emailing and returns its link plus a short
 *                        message to text or share (HUD lists phones, not emails)
 *   scan      (admin)  { state } — fill the directory for a state's property cities (call until done)
 *   geocode   (admin)  { limit? } — place directory brokers that have no map pin yet
 *   lookup    (public) { token } — the broker's referral page reads its request
 *   respond   (public) { token, response: 'accept'|'decline'|'optout', note?, wantsMoreLeads?, regions?,
 *                        agentLicense?, firmLicense?, email? } — on accept, emails the filled referral agreement
 *                        and onboards the broker (accepting counts as approval): an approved, active
 *                        partner agent, the broker role, a set-your-password invite, and the linked
 *                        lead assigned to them
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
import { assignLeadToAgent } from './notifications.js'
import { searchLicenses, AUTO_LICENSE_STATES } from './_license-lookup.js'
import { LICENSE_SOURCES } from '../src/data/licenseLookupSources.js'

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
    accepted: await acceptedFor(client, property.id),
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
        email: email || row.email || '', note: note ?? row.note,
        broker_company: broker.company_name, broker_contact: broker.contact_name, broker_phone: broker.phone, lead_id: leadId ?? row.lead_id, fee_percent: feePercent,
        prospect_aware: prospectAware ?? row.prospect_aware, updated_at: new Date().toISOString(),
      })
      .eq('id', row.id).select('*').single()
    if (error) throw error
    return data
  }
  const { data, error } = await client.from('broker_referral_requests').insert({
    token: randomBytes(20).toString('hex'),
    broker_id: broker.id, property_id: property.id, lead_id: leadId,
    broker_company: broker.company_name, broker_contact: broker.contact_name, broker_phone: broker.phone,
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

// ─── License Check: cross-reference with state license records ──────────────
const LICENSE_COLS = 'license_number,license_type,license_status,license_active,license_expires,license_firm,license_source,license_verified_at,license_checked_at'

async function loadLicensee(client, kind, id) {
  if (!UUID_RE.test(String(id || ''))) return null
  if (kind === 'agent') {
    const { data } = await client.from('agents').select(`id,first_name,last_name,company,email,phone,license_state,states_covered,${LICENSE_COLS}`).eq('id', id).maybeSingle()
    return data && {
      table: 'agents', row: data, name: clean(`${data.first_name || ''} ${data.last_name || ''}`), company: data.company,
      state: clean(data.license_state || (data.states_covered || [])[0]).toUpperCase(),
    }
  }
  const { data } = await client.from('hud_brokers').select(`id,company_name,contact_name,city,state,phone,email,license_name,${LICENSE_COLS}`).eq('id', id).maybeSingle()
  return data && { table: 'hud_brokers', row: data, name: clean(data.contact_name), company: data.company_name, state: clean(data.state).toUpperCase() }
}

const licenseFields = (rec, table) => {
  if (!rec) {
    return {
      license_type: null, license_status: null, license_active: null, license_expires: null, license_firm: null,
      license_source: null, license_verified_at: null, ...(table === 'hud_brokers' ? { license_number: null, license_name: null } : {}),
    }
  }
  const expires = /^\d{4}-\d{2}-\d{2}$/.test(String(rec.expires || '')) ? rec.expires : null
  return {
    license_number: clip(rec.license_number, 60) || null, license_type: clip(rec.license_type, 80) || null,
    license_status: clip(rec.status, 60) || null, license_active: typeof rec.active === 'boolean' ? rec.active : null,
    license_expires: expires, license_firm: clip(rec.firm, 200) || null, license_source: clip(rec.source, 120) || 'manual',
    license_verified_at: new Date().toISOString(), license_checked_at: new Date().toISOString(),
    ...(table === 'hud_brokers' ? { license_name: clip(rec.name, 160) || null } : {}),
  }
}

async function handleLicenseSearch(req, res, client) {
  const who = await loadLicensee(client, req.body?.kind, req.body?.id)
  if (!who) return res.status(404).json({ error: 'Not found' })
  const source = LICENSE_SOURCES[who.state] || null
  let found = { supported: false, results: [] }, searchError = null
  if (AUTO_LICENSE_STATES.includes(who.state)) {
    try { found = await searchLicenses(who.state, { contactName: who.name, company: who.company }) } catch (e) { searchError = e.message }
    await client.from(who.table).update({ license_checked_at: new Date().toISOString() }).eq('id', who.row.id)
  }
  return res.status(200).json({
    state: who.state, name: who.name, company: who.company, source, automatic: found.supported,
    results: found.results.slice(0, 15), searchError, current: who.row,
  })
}

async function handleLicenseSave(req, res, client) {
  const who = await loadLicensee(client, req.body?.kind, req.body?.id)
  if (!who) return res.status(404).json({ error: 'Not found' })
  const fields = licenseFields(req.body?.record || null, who.table)
  const { data, error } = await client.from(who.table).update(fields).eq('id', who.row.id).select(LICENSE_COLS).single()
  if (error) throw error
  return res.status(200).json({ ok: true, license: data })
}

// Automatic pass for the open-data states: only an exact, single name match is saved
async function handleLicenseAuto(req, res, client) {
  const limit = Math.min(Math.max(Number(req.body?.limit) || 20, 1), 40)
  const stale = new Date(Date.now() - 30 * 86400000).toISOString()
  const pick = async (table, cols, stateCol) => {
    const { data } = await client.from(table).select(cols).in(stateCol, AUTO_LICENSE_STATES).is('license_verified_at', null)
      .or(`license_checked_at.is.null,license_checked_at.lt.${stale}`).limit(limit)
    return data || []
  }
  const brokers = (await pick('hud_brokers', 'id', 'state')).map(r => ({ kind: 'broker', id: r.id }))
  const agents = (await pick('agents', 'id', 'license_state')).map(r => ({ kind: 'agent', id: r.id }))
  const started = Date.now()
  let checked = 0, verified = 0, ambiguous = 0, none = 0
  const errors = []
  for (const item of [...agents, ...brokers].slice(0, limit)) {
    if (Date.now() - started > 45000) break
    const who = await loadLicensee(client, item.kind, item.id)
    if (!who) continue
    checked++
    try {
      const { results } = await searchLicenses(who.state, { contactName: who.name, company: who.company })
      const exact = results.filter(r => r.exact)
      if (exact.length === 1) {
        await client.from(who.table).update(licenseFields({ ...exact[0], source: `auto: ${exact[0].source}` }, who.table)).eq('id', who.row.id)
        verified++
      } else {
        await client.from(who.table).update({ license_checked_at: new Date().toISOString() }).eq('id', who.row.id)
        if (exact.length > 1 || results.length) ambiguous++; else none++
      }
    } catch (e) { errors.push(`${who.name || who.company}: ${e.message}`) }
  }
  const remaining = (await pick('hud_brokers', 'id', 'state')).length + (await pick('agents', 'id', 'license_state')).length
  return res.status(200).json({ checked, verified, ambiguous, none, remaining, errors: errors.slice(0, 5) })
}

// ─── Do-not-contact list ────────────────────────────────────────────────────
const phoneDigits = p => String(p || '').replace(/\D/g, '').slice(-10) || null

async function suppressionFor(client, { phone, email }) {
  const digits = phoneDigits(phone), mail = clean(email).toLowerCase() || null
  if (!digits && !mail) return null
  const ors = [digits && `phone_digits.eq.${digits}`, mail && EMAIL_RE.test(mail) && `email.eq.${mail}`].filter(Boolean).join(',')
  if (!ors) return null
  const { data } = await client.from('broker_suppressions').select('id,created_at,source').or(ors).limit(1)
  return data?.[0] || null
}

// Adds the broker (by phone and email) to the list; the database marks matching brokers and their company
async function addSuppression(client, { broker, email, requestId, source, reason, createdBy }) {
  const row = {
    phone_digits: phoneDigits(broker?.phone),
    email: EMAIL_RE.test(clean(email || broker?.email).toLowerCase()) ? clean(email || broker?.email).toLowerCase() : null,
    company_name: broker?.company_name || null, contact_name: broker?.contact_name || null, state: broker?.state || null,
    broker_id: broker?.id || null, request_id: requestId || null, source, reason: clip(reason, 500) || null, created_by: createdBy || null,
  }
  if (!row.phone_digits && !row.email) {
    if (broker?.id) await client.from('hud_brokers').update({ status: 'do_not_contact' }).eq('id', broker.id)
    return
  }
  const { error } = await client.from('broker_suppressions').insert(row)
  if (error && error.code !== '23505') throw error
  // Already listed by phone or email: still mark this directory row
  if (broker?.id) await client.from('hud_brokers').update({ status: 'do_not_contact' }).eq('id', broker.id)
}

async function handleDoNotContact(req, res, client, admin) {
  const brokerId = String(req.body?.brokerId || '')
  if (!UUID_RE.test(brokerId)) return res.status(400).json({ error: 'Choose a broker' })
  const { data: broker } = await client.from('hud_brokers').select('*').eq('id', brokerId).maybeSingle()
  if (!broker) return res.status(404).json({ error: 'Broker not found' })
  await addSuppression(client, { broker, source: 'admin', reason: req.body?.reason, createdBy: admin.id })
  return res.status(200).json({ ok: true })
}

async function handleAllowContact(req, res, client) {
  const id = String(req.body?.suppressionId || '')
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Invalid id' })
  const { error } = await client.from('broker_suppressions').delete().eq('id', id)
  if (error) throw error
  return res.status(200).json({ ok: true })
}

async function handleLink(req, res, client, admin) {
  const property = await loadProperty(client, req.body?.propertyId)
  if (!property) return res.status(404).json({ error: 'Property not found' })
  const brokerId = String(req.body?.brokerId || '')
  if (!UUID_RE.test(brokerId)) return res.status(400).json({ error: 'Choose a broker' })
  const { data: broker } = await client.from('hud_brokers').select('*').eq('id', brokerId).maybeSingle()
  if (!broker) return res.status(404).json({ error: 'Broker not found' })
  if (broker.status === 'do_not_contact' || await suppressionFor(client, broker)) return res.status(400).json({ error: 'This broker is on the do-not-contact list.' })
  const taken = await acceptedFor(client, property.id)
  if (taken && taken.broker_id !== broker.id) return res.status(400).json({ error: `${taken.broker?.company_name || 'Another broker'} already accepted this buyer. Release it in Broker Finder first if they fell through.` })
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
  const taken = await acceptedFor(client, property.id)
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
      if (broker.status === 'do_not_contact' || await suppressionFor(client, { phone: broker.phone, email: r.email || broker.email })) { results.push({ brokerId: broker.id, status: 'skipped', error: 'On the do-not-contact list' }); continue }
      if (taken && taken.broker_id !== broker.id) { results.push({ brokerId: broker.id, status: 'skipped', error: `${taken.broker?.company_name || 'Another broker'} already accepted this buyer` }); continue }
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
  if (broker?.status === 'do_not_contact' || await suppressionFor(client, { phone: broker?.phone, email: row.email })) return res.status(400).json({ error: 'This broker is on the do-not-contact list.' })
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

// ─── Onboarding: accepting a referral counts as approval ───────────────────
async function inviteLogin({ email, firstName, lastName, phone }) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  const r = await fetch(`${url}/auth/v1/invite?redirect_to=${encodeURIComponent(`${SITE_URL}/reset-password`)}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, data: { first_name: firstName, last_name: lastName, full_name: `${firstName} ${lastName}`.trim(), phone } }),
  })
  if (r.ok) return 'invited'
  const e = await r.json().catch(() => ({}))
  const msg = e.msg || e.message || e.error_description || ''
  if (r.status === 422 || /already/i.test(msg)) return 'existing' // they already have a login
  throw new Error(msg || `invite failed (${r.status})`)
}

/**
 * Makes the accepting broker a partner: agent (approved, active), users.role 'broker',
 * login invite, directory link, and the referral's lead assigned to them.
 * Returns { agentId, created, login, leadAssigned, notes[] }.
 */
async function onboardAcceptedBroker(client, row, regions) {
  const notes = []
  const b = row.broker || {}
  const email = clean(row.email).toLowerCase()
  const state = clean(row.property_state).toUpperCase() || clean(b.state).toUpperCase() || null
  const [firstName = 'Broker', ...rest] = clean(b.contact_name || row.broker_contact || '').split(' ').filter(Boolean)
  const lastName = rest.join(' ')
  const now = new Date().toISOString()

  // Agent: reuse an existing one (never overwrite a partner's profile), otherwise create it approved
  const { data: existing } = await client.from('agents').select('id,is_active,status').ilike('email', email.replace(/[%_\\]/g, '\\$&')).limit(1)
  let agentId = existing?.[0]?.id, created = false
  if (agentId && !existing[0].is_active) {
    if (existing[0].status === 'pending') {
      await client.from('agents').update({ status: 'approved', is_active: true, onboarding_completed: true, onboarding_completed_at: now }).eq('id', agentId)
      notes.push('Existing pending partner account approved.')
    } else {
      notes.push(`Existing partner account is inactive (${existing[0].status}); it was not reactivated and the buyer was not assigned.`)
      return { agentId, created, login: null, leadAssigned: false, notes }
    }
  }
  if (!agentId) {
    const { data: agent, error } = await client.from('agents').insert({
      first_name: firstName, last_name: lastName, email, phone: b.phone || row.broker_phone || '',
      company: b.company_name || row.broker_company || null,
      license_number: row.receiving_agent_license || null, license_state: state,
      states_covered: state ? [state] : [], economic_regions: state ? regions.map(slug => `${state}:${slug}`) : [],
      specialties: ['HUD Homes'], referral_fee_percentage: Number(row.fee_percent ?? DEFAULT_FEE_PERCENT),
      bio: 'Joined by accepting a HUD buyer referral through USAHUDhomes.com Broker Finder.',
      status: 'approved', is_active: true, onboarding_completed: true, onboarding_completed_at: now,
      referral_agreement_signed: false,
    }).select('id').single()
    if (error) throw error
    agentId = agent.id
    created = true
  }

  // Broker role (never downgrade an admin); the auth trigger links the login to this row by email
  const { data: user } = await client.from('users').select('id,role').ilike('email', email.replace(/[%_\\]/g, '\\$&')).limit(1)
  if (!user?.length) {
    const { error } = await client.from('users').insert({ email, name: `${firstName} ${lastName}`.trim(), first_name: firstName, last_name: lastName || null, phone: b.phone || null, role: 'broker' })
    if (error) notes.push(`Broker role not set: ${error.message}`)
  } else if (!['admin', 'broker'].includes(user[0].role)) {
    await client.from('users').update({ role: 'broker' }).eq('id', user[0].id)
  }

  let login = null
  try { login = await inviteLogin({ email, firstName, lastName, phone: b.phone }) } catch (e) { notes.push(`Login invite failed: ${e.message}`) }

  await client.from('hud_brokers').update({ agent_id: agentId, status: 'registered' }).eq('id', row.broker_id)

  // The buyer this referral was for, filed under the new partner as already accepted
  let leadAssigned = false
  if (row.lead_id) {
    try {
      const { data: lead } = await client.from('leads').select('*').eq('id', row.lead_id).maybeSingle()
      if (lead) leadAssigned = !!(await assignLeadToAgent(lead, agentId, { source: 'broker_finder', referral_request_id: row.id }, { status: 'accepted' }))
      if (lead && !leadAssigned) notes.push('The lead was already assigned to an agent, so it was not reassigned.')
    } catch (e) { notes.push(`Lead not assigned: ${e.message}`) }
  } else {
    notes.push('No lead was linked to this referral, so no buyer was assigned in the system.')
  }
  return { agentId, created, login, leadAssigned, notes }
}

// The accepted request for a home, other than exceptId (first to accept gets the buyer)
async function acceptedFor(client, propertyId, exceptId = null) {
  if (!propertyId) return null
  let q = client.from('broker_referral_requests').select('id,broker_id,responded_at,broker:hud_brokers(company_name,contact_name)')
    .eq('property_id', propertyId).eq('status', 'accepted').order('responded_at', { ascending: true }).limit(1)
  if (exceptId) q = q.neq('id', exceptId)
  const { data } = await q
  return data?.[0] || null
}

const TAKEN_MESSAGE = 'Thank you — this buyer has already been placed with another agent.'

// Admin: the accepted broker fell through, so the home is open to the others again
async function handleRelease(req, res, client) {
  const id = String(req.body?.requestId || '')
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Invalid request id' })
  const { data: row } = await client.from('broker_referral_requests').select('id,status,response_note').eq('id', id).maybeSingle()
  if (!row) return res.status(404).json({ error: 'Request not found' })
  if (row.status !== 'accepted') return res.status(400).json({ error: 'Only an accepted referral can be released.' })
  const { error } = await client.from('broker_referral_requests').update({
    status: 'declined', updated_at: new Date().toISOString(),
    response_note: `Released by admin ${new Date().toISOString().slice(0, 10)}${row.response_note ? ` — ${row.response_note}` : ''}`,
  }).eq('id', id)
  if (error) throw error
  return res.status(200).json({ ok: true })
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
  const taken = row.status !== 'accepted' && !!(await acceptedFor(client, row.property_id, row.id))
  return res.status(200).json({
    request: {
      status: row.status, taken, caseNumber: row.case_number, address: row.property_address, city: row.property_city,
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
  if (accepted && row.status !== 'accepted' && await acceptedFor(client, row.property_id, row.id)) {
    return res.status(409).json({ error: TAKEN_MESSAGE, taken: true })
  }
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
  const previous = { status: row.status, responded_at: row.responded_at }
  await client.from('broker_referral_requests').update(update).eq('id', row.id)
  Object.assign(row, update)

  // Two brokers accepting at nearly the same moment: the earlier acceptance wins
  let othersOpen = 0
  if (accepted) {
    const first = await acceptedFor(client, row.property_id)
    if (first && first.id !== row.id) {
      await client.from('broker_referral_requests').update({ ...previous, updated_at: new Date().toISOString() }).eq('id', row.id)
      return res.status(409).json({ error: TAKEN_MESSAGE, taken: true })
    }
    if (row.property_id) {
      const { count } = await client.from('broker_referral_requests').select('id', { count: 'exact', head: true })
        .eq('property_id', row.property_id).neq('id', row.id).in('status', ['pending', 'sent', 'opened', 'failed'])
      othersOpen = count || 0
    }
  }

  // Accepted: onboard the broker as a partner (accepting counts as approval)
  let onboard = null
  if (accepted) {
    try { onboard = await onboardAcceptedBroker(client, row, regions) } catch (e) {
      console.error('[broker-finder] onboarding failed:', e)
      onboard = { notes: [`Partner account could not be created: ${e.message}`] }
    }
  }

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
      ...(onboard?.agentId ? [
        onboard.login === 'invited'
          ? 'You are now a USAHUDhomes.com partner agent. Watch for a separate email to set your password, then sign in at https://usahudhomes.com/login to see this buyer and future HUD buyer leads.'
          : 'This referral is in your USAHUDhomes.com partner account: sign in at https://usahudhomes.com/login to see this buyer.',
        '',
      ] : []),
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
  // Opted out: record them on the do-not-contact list (by phone and email) so future HUD listings stay blocked
  if (response === 'optout') {
    try {
      await addSuppression(client, {
        broker: row.broker ? { ...row.broker, id: row.broker_id } : { id: row.broker_id, phone: row.broker_phone, company_name: row.broker_company, contact_name: row.broker_contact },
        email: givenEmail || row.email, requestId: row.id, source: 'referral_link', reason: note || 'Opted out from their referral link',
      })
    } catch (e) { console.error('[broker-finder] do-not-contact list:', e.message) }
  }

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
        ...(onboard ? [
          onboard.agentId
            ? `${onboard.created ? 'Partner account created and approved' : 'Existing partner account used'}${onboard.login === 'invited' ? '; set-password invite emailed' : onboard.login === 'existing' ? '; they already had a login' : ''}${onboard.leadAssigned ? '; the buyer was assigned to them' : ''}.`
            : '',
          ...(onboard.notes || []),
        ].filter(Boolean) : []),
        othersOpen ? `${othersOpen} other broker${othersOpen === 1 ? '' : 's'} had this home; their link${othersOpen === 1 ? ' now shows' : 's now show'} it as already accepted. Release it in Broker Finder if this broker falls through.` : '',
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

  // Accepted brokers are already partners; others sign up through the registration form
  const registerUrl = wantsMoreLeads && !onboard?.agentId ? `/broker/register?ref=${row.token}` : null
  return res.status(200).json({
    ok: true, status, registerUrl,
    agreementUrl: accepted ? `/api/broker-finder?action=agreement&token=${row.token}` : null,
    agreementEmailed: !!agreement && !agreementNote,
    partner: onboard?.agentId ? { created: !!onboard.created, invited: onboard.login === 'invited', leadAssigned: !!onboard.leadAssigned } : null,
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
    if (action === 'release') return await handleRelease(req, res, client)
    if (action === 'license-search') return await handleLicenseSearch(req, res, client)
    if (action === 'license-save') return await handleLicenseSave(req, res, client)
    if (action === 'license-auto') return await handleLicenseAuto(req, res, client)
    if (action === 'do-not-contact') return await handleDoNotContact(req, res, client, admin)
    if (action === 'allow-contact') return await handleAllowContact(req, res, client)
    if (action === 'scan') return await handleScan(req, res, client)
    if (action === 'geocode') return await handleGeocode(req, res, client)
    if (action === 'agreement-preview') return await handleAgreementPreview(req, res, client)
    return res.status(400).json({ error: 'Unknown action', valid_actions: ['suggest', 'send', 'resend', 'link', 'release', 'license-search', 'license-save', 'license-auto', 'do-not-contact', 'allow-contact', 'scan', 'geocode', 'lookup', 'respond', 'agreement', 'agreement-preview'] })
  } catch (e) {
    console.error(`[broker-finder/${action}]`, e)
    return res.status(500).json({ error: e.message || 'Unexpected error' })
  }
}

// Exposed for local checks of the HUD / geocoding steps (not routed)
export const _internals = { shareMessage, nearbyCities, openHudSession, hudBrokerSearch, mapHudBroker, geocodeBroker, miles, zipPoint, buildReferralEmail, agreementPdf }
