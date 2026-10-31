/**
 * Vercel Serverless Function: /api/leads
 *
 * Consolidated leads/consultation management API — replaces:
 *   consultation-delete.js, referral.js
 *
 * Routes via ?action= query param:
 *   POST ?action=delete          — soft-delete one or more consultations (admin, or the broker they belong to)
 *   POST ?action=assign          — assign a consultation to a broker
 *   POST ?action=accept          — broker accepts a referral
 *   POST ?action=decline         — broker declines a referral
 *   POST ?action=outcome         — update consultation outcome
 *   GET  ?action=referrals            — get all referrals for an agent
 *   GET  ?action=client-activity      — a lead's saved homes, property requests and inquiries
 *   GET/POST/PATCH/DELETE ?action=property-picks — homes a broker picked for clients (Find Properties)
 *   GET/POST/PATCH/DELETE ?action=offer-proposals — offers a broker builds for a client
 *   GET/POST ?action=offer-respond    — the buyer's answer to a broker's offer (share token, no login needed)
 *   POST ?action=process-expired      — expire overdue referrals
 *   POST ?action=purge-under-contract — hard-delete stale UNDER CONTRACT properties
 */

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

function getSupabase() {
  // NOTE: VITE_ prefixed env vars are build-time only — use SUPABASE_URL in serverless functions
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://lpqjndfjbenolhneqzec.supabase.co'
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_KEY not set in Vercel environment variables')
  return createClient(url, key, { auth: { persistSession: false } })
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
// Every action below runs with the service key, so the caller's Supabase session
// token (Authorization: Bearer <access_token>) is verified and their role checked.
async function getCaller(req, supabase) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data: { user } = {}, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data: row } = await supabase
    .from('users').select('id, email, role').eq('id', user.id).maybeSingle()
  return { id: user.id, email: user.email, role: row?.role || 'end_user' }
}

async function requireRole(req, res, supabase, roles) {
  const caller = await getCaller(req, supabase)
  if (!caller) {
    res.status(401).json({ success: false, error: 'Please sign in again.' })
    return null
  }
  if (!roles.includes(caller.role)) {
    res.status(403).json({ success: false, error: 'You do not have permission to do that.' })
    return null
  }
  return caller
}

// Brokers may only act on referrals assigned to their own agent record.
async function canActForAgent(supabase, caller, agentId) {
  if (caller.role === 'admin') return true
  if (agentId === caller.id) return true
  const { data } = await supabase
    .from('agents').select('id').eq('id', agentId).ilike('email', caller.email || '').maybeSingle()
  return !!data
}

// Leads record their broker in agent_id (set by admin assignment); older rows
// may only have assigned_broker_id. Match either. agentId goes into a PostgREST
// filter string, so it must be a UUID.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const assignedTo = (agentId) => `agent_id.eq.${agentId},assigned_broker_id.eq.${agentId}`

// activities has no consultation_id column; the consultation goes in metadata.
async function logActivity(supabase, consultation, agentId, activityType, description, metadata = {}) {
  if (!consultation?.customer_id) return
  const { error } = await supabase.from('activities').insert([{
    customer_id: consultation.customer_id,
    agent_id: agentId || null,
    activity_type: activityType,
    description,
    metadata: { consultation_id: consultation.id, ...metadata },
  }])
  if (error) console.warn(`[leads] activity log (${activityType}) failed:`, error.message)
}

// ─── Action: delete ───────────────────────────────────────────────────────────
async function handleDelete(req, res) {
  const supabase = getSupabase()
  const caller = await requireRole(req, res, supabase, ['admin', 'broker'])
  if (!caller) return
  const { ids, id } = req.body || {}
  const toDelete = ids || (id ? [id] : [])
  if (!toDelete.length) {
    return res.status(400).json({ success: false, error: 'Provide id or ids array' })
  }
  // Brokers may only remove leads assigned to them
  if (caller.role !== 'admin') {
    for (const leadId of toDelete) {
      if (!(await leadForCaller(supabase, caller, leadId))) {
        return res.status(403).json({ success: false, error: 'You can only remove your own leads.' })
      }
    }
  }
  const { error } = await supabase
    .from('consultations')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .in('id', toDelete)
  if (error) throw error
  return res.status(200).json({ success: true, deleted: toDelete.length })
}

// ─── Action: assign ───────────────────────────────────────────────────────────
async function handleAssign(req, res) {
  const supabase = getSupabase()
  if (!(await requireRole(req, res, supabase, ['admin']))) return
  const { consultationId, agentId } = req.body || {}
  if (!consultationId || !agentId) {
    return res.status(400).json({ success: false, error: 'consultationId and agentId required' })
  }
  const now        = new Date().toISOString()
  const expiresAt  = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('consultations')
    .update({ assigned_broker_id: agentId, assigned_at: now, referred_at: now, referral_expires_at: expiresAt, status: 'referred', updated_at: now })
    .eq('id', consultationId)
    .select('*')
    .single()
  if (error) throw error
  const { data: agent } = await supabase.from('agents').select('*').eq('id', agentId).maybeSingle()
  await logActivity(supabase, data, agentId, 'referral_assigned', 'Referral assigned')
  return res.status(200).json({ success: true, data: { ...data, agents: agent } })
}

// ─── Action: accept ───────────────────────────────────────────────────────────
async function handleAccept(req, res) {
  const supabase = getSupabase()
  const caller = await requireRole(req, res, supabase, ['admin', 'broker'])
  if (!caller) return
  const { consultationId, agentId, notes } = req.body || {}
  if (!consultationId || !agentId) {
    return res.status(400).json({ success: false, error: 'consultationId and agentId required' })
  }
  if (!UUID_RE.test(agentId)) return res.status(400).json({ success: false, error: 'Invalid agentId' })
  if (!(await canActForAgent(supabase, caller, agentId))) {
    return res.status(403).json({ success: false, error: 'You can only accept your own referrals.' })
  }
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('consultations')
    .update({ accepted_at: now, status: 'accepted', updated_at: now, ...(notes ? { notes } : {}) })
    .eq('id', consultationId)
    .or(assignedTo(agentId))
    .select().single()
  if (error) throw error
  await logActivity(supabase, data, agentId, 'referral_accepted', 'Referral accepted')
  return res.status(200).json({ success: true, data })
}

// ─── Action: decline ──────────────────────────────────────────────────────────
async function handleDecline(req, res) {
  const supabase = getSupabase()
  const caller = await requireRole(req, res, supabase, ['admin', 'broker'])
  if (!caller) return
  const { consultationId, agentId, reason, notes } = req.body || {}
  if (!consultationId || !agentId) {
    return res.status(400).json({ success: false, error: 'consultationId and agentId required' })
  }
  if (!UUID_RE.test(agentId)) return res.status(400).json({ success: false, error: 'Invalid agentId' })
  if (!(await canActForAgent(supabase, caller, agentId))) {
    return res.status(403).json({ success: false, error: 'You can only decline your own referrals.' })
  }
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('consultations')
    .update({ declined_at: now, decline_reason: reason, decline_notes: notes, status: 'declined', updated_at: now })
    .eq('id', consultationId)
    .or(assignedTo(agentId))
    .select().single()
  if (error) throw error
  await logActivity(supabase, data, agentId, 'referral_declined', 'Referral declined', { reason, notes })
  return res.status(200).json({ success: true, data })
}

// ─── Action: outcome ──────────────────────────────────────────────────────────
async function handleOutcome(req, res) {
  const supabase = getSupabase()
  if (!(await requireRole(req, res, supabase, ['admin', 'broker']))) return
  const { consultationId, outcome, notes } = req.body || {}
  if (!consultationId || !outcome) {
    return res.status(400).json({ success: false, error: 'consultationId and outcome required' })
  }
  const { data, error } = await supabase
    .from('consultations')
    .update({ outcome, outcome_notes: notes, updated_at: new Date().toISOString() })
    .eq('id', consultationId)
    .select().single()
  if (error) throw error
  return res.status(200).json({ success: true, data })
}

// ─── Action: referrals (GET) ──────────────────────────────────────────────────
async function handleGetReferrals(req, res) {
  const supabase = getSupabase()
  const caller = await requireRole(req, res, supabase, ['admin', 'broker'])
  if (!caller) return
  const agentId = req.query?.agentId
  if (!agentId) return res.status(400).json({ success: false, error: 'agentId query param required' })
  if (!UUID_RE.test(agentId)) return res.status(400).json({ success: false, error: 'Invalid agentId' })
  if (!(await canActForAgent(supabase, caller, agentId))) {
    return res.status(403).json({ success: false, error: 'You can only view your own referrals.' })
  }
  const { data, error } = await supabase
    .from('consultations')
    .select('*, customers(*), properties(*)')
    .or(assignedTo(agentId))
    .eq('is_deleted', false)
    .order('assigned_at', { ascending: false })
  if (error) throw error
  return res.status(200).json({ success: true, data: data || [] })
}

// ─── Action: client-activity (GET) ────────────────────────────────────────────
// Everything a buyer has done on the site, for the broker working the lead: their
// account, saved homes, "this property" requests, and other inquiries. Buyers'
// rows are private under RLS, so this runs with the service key after checking
// the caller is an admin or the broker the lead is assigned to.
const PROPERTY_FIELDS = 'id, case_number, address, city, state, zip_code, price, beds, baths, status, main_image'
// Case-insensitive exact match: escape LIKE wildcards (an "_" in an email would match any character)
const likeExact = (v) => v.replace(/[\\%_]/g, m => '\\' + m)

// The lead (consultation) if the caller is an admin or the broker it belongs to, else null
async function leadForCaller(supabase, caller, consultationId) {
  const { data: lead, error } = await supabase
    .from('consultations')
    .select('id, agent_id, assigned_broker_id, customer_id, customer_email, email, customers(email)')
    .eq('id', consultationId)
    .maybeSingle()
  if (error) throw error
  if (!lead) return null
  const ownerId = lead.agent_id || lead.assigned_broker_id
  if (caller.role !== 'admin' && !(ownerId && await canActForAgent(supabase, caller, ownerId))) return null
  return { ...lead, ownerId, buyerEmail: (lead.customers?.email || lead.customer_email || lead.email || '').trim().toLowerCase() }
}

// The buyer's website account for a lead's email, if they have one
async function buyerAccount(supabase, email) {
  if (!email) return null
  const { data } = await supabase.from('users').select('id').ilike('email', likeExact(email)).maybeSingle()
  return data || null
}

async function handleClientActivity(req, res) {
  const supabase = getSupabase()
  const caller = await requireRole(req, res, supabase, ['admin', 'broker'])
  if (!caller) return
  const consultationId = req.query?.consultationId
  if (!consultationId) return res.status(400).json({ success: false, error: 'consultationId query param required' })

  const lead = await leadForCaller(supabase, caller, consultationId)
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' })

  const rawEmail = lead.buyerEmail
  if (!rawEmail) return res.status(200).json({ success: true, data: { account: null, saved: [], requests: [], inquiries: [], picks: await picksForLead(supabase, lead.id) } })
  const email = likeExact(rawEmail)

  const { data: account } = await supabase
    .from('users')
    .select('id, created_at, last_signed_in, phone, state, city, timeline, financing_type, pre_approved, price_range_min, price_range_max, bedrooms, location_preferences')
    .ilike('email', email)
    .maybeSingle()

  const otherConsultations = (column) => supabase.from('consultations')
    .select('id, consultation_type, case_number, message, source, created_at')
    .ilike(column, email).eq('is_deleted', false).neq('id', consultationId)
    .order('created_at', { ascending: false }).limit(50)

  const [savedRes, requestsRes, leadsRes, byCustomerEmail, byEmail] = await Promise.all([
    account
      ? supabase.from('saved_properties').select('id, property_id, case_number, price_at_save, notes, created_at').eq('user_id', account.id).order('created_at', { ascending: false })
      : { data: [] },
    account
      ? supabase.from('property_requests').select('id, case_number, address, city, state, list_price, status, requested_at').eq('user_id', account.id).order('requested_at', { ascending: false })
      : { data: [] },
    supabase.from('leads').select('id, source, property_case_number, property_address, property_price, message, created_at').ilike('email', email).order('created_at', { ascending: false }).limit(50),
    otherConsultations('customer_email'),
    otherConsultations('email'),
  ])
  const consultations = [...(byCustomerEmail.data || []), ...(byEmail.data || [])]
    .filter((c, i, all) => all.findIndex(x => x.id === c.id) === i)

  // Current listing details for the saved homes
  const saved = savedRes.data || []
  const ids = saved.map(s => s.property_id).filter(Boolean)
  const cases = saved.filter(s => !s.property_id && s.case_number).map(s => s.case_number)
  const [byId, byCase] = await Promise.all([
    ids.length ? supabase.from('properties').select(PROPERTY_FIELDS).in('id', ids) : { data: [] },
    cases.length ? supabase.from('properties').select(PROPERTY_FIELDS).in('case_number', cases) : { data: [] },
  ])
  const props = [...(byId.data || []), ...(byCase.data || [])]
  const savedHomes = saved.map(s => ({
    ...s,
    property: props.find(p => p.id === s.property_id) || props.find(p => p.case_number === s.case_number) || null,
  }))

  const inquiries = [
    ...(leadsRes.data || []).map(l => ({
      id: `lead-${l.id}`, kind: l.source || 'website', case_number: l.property_case_number,
      address: l.property_address, price: l.property_price, message: l.message, at: l.created_at,
    })),
    ...consultations.map(c => ({
      id: `consultation-${c.id}`, kind: c.consultation_type || c.source || 'consultation', case_number: c.case_number,
      address: null, price: null, message: c.message, at: c.created_at,
    })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at))

  return res.status(200).json({
    success: true,
    data: { account: account || null, saved: savedHomes, requests: requestsRes.data || [], inquiries, picks: await picksForLead(supabase, lead.id) },
  })
}

// ─── Action: property-picks ───────────────────────────────────────────────────
// GET    ?consultationId=      → the lead's picks with current listing details
// POST   { consultationIds, properties: [{ id, case_number, price }], note }
//        → add the homes to each lead's picks, and to the buyer's saved homes when
//          they have a website account
// PATCH  { ids, status }       → e.g. mark picks 'sent' after an email/text
// DELETE ?id=                  → remove a pick (the buyer's saved home is kept)
const PICK_STATUSES = ['picked', 'sent', 'interested', 'not_interested']

async function picksForLead(supabase, consultationId) {
  const { data, error } = await supabase
    .from('client_property_picks')
    .select('id, case_number, property_id, note, status, sent_at, created_at')
    .eq('consultation_id', consultationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const ids = (data || []).map(p => p.property_id).filter(Boolean)
  const { data: props } = ids.length ? await supabase.from('properties').select(PROPERTY_FIELDS).in('id', ids) : { data: [] }
  return (data || []).map(p => ({ ...p, property: (props || []).find(x => x.id === p.property_id) || null }))
}

async function handlePropertyPicks(req, res) {
  const supabase = getSupabase()
  const caller = await requireRole(req, res, supabase, ['admin', 'broker'])
  if (!caller) return

  if (req.method === 'GET') {
    const lead = await leadForCaller(supabase, caller, req.query?.consultationId)
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' })
    return res.status(200).json({ success: true, data: await picksForLead(supabase, lead.id) })
  }

  if (req.method === 'POST') {
    const { consultationIds = [], properties = [], note } = req.body || {}
    const homes = properties.filter(p => p?.case_number).slice(0, 50)
    if (!Array.isArray(consultationIds) || !consultationIds.length || !homes.length) {
      return res.status(400).json({ success: false, error: 'Choose at least one client and one home.' })
    }
    const results = []
    for (const consultationId of consultationIds.slice(0, 50)) {
      const lead = await leadForCaller(supabase, caller, consultationId)
      if (!lead) { results.push({ consultationId, error: 'not your lead' }); continue }
      const account = await buyerAccount(supabase, lead.buyerEmail)
      const rows = homes.map(h => ({
        consultation_id: lead.id,
        customer_id: lead.customer_id || null,
        user_id: account?.id || null,
        agent_id: lead.ownerId || null,
        property_id: h.id || null,
        case_number: String(h.case_number),
        note: note ? String(note).slice(0, 500) : null,
      }))
      const { data: added, error } = await supabase
        .from('client_property_picks')
        .upsert(rows, { onConflict: 'consultation_id,case_number', ignoreDuplicates: true })
        .select('id')
      if (error) throw error

      let savedToAccount = 0
      if (account) {
        const saved = homes.filter(h => h.id).map(h => ({
          user_id: account.id, property_id: h.id, case_number: String(h.case_number),
          price_at_save: h.price ?? null, recommended_by_agent_id: lead.ownerId || null,
        }))
        if (saved.length) {
          const { data: savedRows, error: savedErr } = await supabase
            .from('saved_properties')
            .upsert(saved, { onConflict: 'user_id,property_id', ignoreDuplicates: true })
            .select('id')
          if (savedErr) console.warn('[property-picks] saved homes not updated:', savedErr.message)
          savedToAccount = savedRows?.length || 0
        }
      }
      results.push({ consultationId, added: added?.length || 0, alreadyPicked: rows.length - (added?.length || 0), hasAccount: !!account, savedToAccount })
    }
    return res.status(200).json({ success: true, data: results })
  }

  if (req.method === 'PATCH') {
    const { ids = [], status } = req.body || {}
    if (!PICK_STATUSES.includes(status) || !Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ success: false, error: 'ids and a valid status are required' })
    }
    const { data: picks, error } = await supabase.from('client_property_picks').select('id, consultation_id').in('id', ids.slice(0, 100))
    if (error) throw error
    const allowed = []
    for (const p of picks || []) if (await leadForCaller(supabase, caller, p.consultation_id)) allowed.push(p.id)
    if (allowed.length) {
      const { error: updErr } = await supabase
        .from('client_property_picks')
        .update({ status, ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}) })
        .in('id', allowed)
      if (updErr) throw updErr
    }
    return res.status(200).json({ success: true, data: { updated: allowed.length } })
  }

  if (req.method === 'DELETE') {
    const { data: pick } = await supabase.from('client_property_picks').select('id, consultation_id').eq('id', req.query?.id || '').maybeSingle()
    if (!pick || !(await leadForCaller(supabase, caller, pick.consultation_id))) {
      return res.status(404).json({ success: false, error: 'Pick not found' })
    }
    const { error } = await supabase.from('client_property_picks').delete().eq('id', pick.id)
    if (error) throw error
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}

// ─── Action: offer-proposals ─────────────────────────────────────────────────
// Offers a broker builds for a client (broker_offer_proposals). The buyer answers
// them through ?action=offer-respond using the offer's share token.
// GET    ?consultationId=   → that lead's offers;  no param → all of the caller's offers
// POST   { consultationId, id?, status: 'draft'|'sent', ...terms }
//        → create, or revise (a revision goes back to the buyer for a new answer)
// PATCH  { id, status: 'sent'|'submitted'|'withdrawn' }
// DELETE ?id=               → drafts and withdrawn offers only
const PROPOSAL_FIELDS = 'id, consultation_id, user_id, agent_id, property_id, case_number, share_token, status, asking_price, offer_price, occupancy, financing, closing_cost_percent, earnest_money, listing_commission_percent, buyer_commission_percent, broker_message, est_net_to_hud, net_to_list, days_on_market, deal_meter_score, deal_meter_sample, deal_meter_basis, financing_estimate, accept_wait_low_days, accept_wait_days, is_favorite, buyer_note, viewed_at, responded_at, accepted_signature, accepted_terms, sent_at, submitted_at, created_at, updated_at'
const BROKER_EDITABLE = ['draft', 'sent', 'changes_requested', 'declined']
// Never shared, or pulled back from the buyer, so nothing depends on them any more
const DELETABLE = ['draft', 'withdrawn']
const BUYER_ACTIONABLE = ['sent', 'changes_requested']
const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/
const numOrNull = (v) => (v === '' || v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v))
const intOrNull = (v) => (numOrNull(v) === null ? null : Math.round(Number(v)))

/** Validates the builder's terms the same way the buyer offer builder does. Returns { values } or { error }. */
function proposalTerms(body) {
  const caseNumber = String(body.case_number || '').trim()
  const offer = Number(body.offer_price)
  const closing = Number(body.closing_cost_percent || 0)
  const listingPct = Number(body.listing_commission_percent ?? 3)
  const buyerPct = Number(body.buyer_commission_percent ?? 3)
  const earnest = Number(body.earnest_money || 0)
  if (!/^\d{3}-\d{6}$/.test(caseNumber)) return { error: 'Enter a valid HUD case number (000-000000).' }
  if (!['owner', 'investor'].includes(body.occupancy)) return { error: 'Choose owner occupant or investor.' }
  if (!['fha', 'conventional', 'cash', '203k'].includes(body.financing)) return { error: 'Choose a financing type.' }
  if (!(offer > 0)) return { error: 'Enter an offer greater than zero.' }
  if (!(closing >= 0 && closing <= 3)) return { error: 'Closing assistance must be between 0 and 3%.' }
  if (body.occupancy === 'investor' && closing !== 0) return { error: 'Investor offers cannot request HUD-paid closing cost assistance.' }
  if (body.occupancy === 'investor' && ['fha', '203k'].includes(body.financing)) return { error: 'Investor offers cannot use owner-occupant FHA financing.' }
  if ([listingPct, buyerPct].some(v => !(v >= 0 && v <= 100))) return { error: 'Commission rates must be between 0 and 100%.' }
  if (!(earnest >= 0)) return { error: 'Earnest money cannot be negative.' }
  const score = intOrNull(body.deal_meter_score)
  return {
    values: {
      case_number: caseNumber,
      asking_price: numOrNull(body.asking_price),
      offer_price: offer,
      occupancy: body.occupancy,
      financing: body.financing,
      closing_cost_percent: closing,
      earnest_money: earnest,
      listing_commission_percent: listingPct,
      buyer_commission_percent: buyerPct,
      broker_message: body.broker_message ? String(body.broker_message).slice(0, 4000) : null,
      est_net_to_hud: numOrNull(body.est_net_to_hud),
      net_to_list: numOrNull(body.net_to_list),
      days_on_market: intOrNull(body.days_on_market),
      deal_meter_score: score !== null && score >= 0 && score <= 100 ? score : null,
      deal_meter_sample: intOrNull(body.deal_meter_sample),
      deal_meter_basis: body.deal_meter_basis ? String(body.deal_meter_basis).slice(0, 200) : null,
      financing_estimate: body.financing_estimate && typeof body.financing_estimate === 'object' ? body.financing_estimate : null,
      accept_wait_low_days: intOrNull(body.accept_wait_low_days),
      accept_wait_days: intOrNull(body.accept_wait_days),
    },
  }
}

/** The terms a buyer agrees to; frozen into accepted_terms when they accept. */
const termsOf = (p) => ({
  case_number: p.case_number,
  offer_price: Number(p.offer_price),
  occupancy: p.occupancy,
  financing: p.financing,
  closing_cost_percent: Number(p.closing_cost_percent),
  earnest_money: Number(p.earnest_money),
  listing_commission_percent: Number(p.listing_commission_percent),
  buyer_commission_percent: Number(p.buyer_commission_percent),
})

async function logProposalEvent(supabase, proposalId, actor, event, note = null) {
  const { error } = await supabase.from('broker_offer_proposal_events').insert([{ proposal_id: proposalId, actor, event, note }])
  if (error) console.warn(`[offer-proposals] event ${event} not logged:`, error.message)
}

// Adds the buyer's name/contact (from the lead) and the home's listing details
async function withProposalExtras(supabase, rows) {
  const leadIds = [...new Set(rows.map(r => r.consultation_id))]
  const cases = [...new Set(rows.map(r => r.case_number))]
  const [leads, props] = await Promise.all([
    leadIds.length ? supabase.from('consultations').select('id, first_name, last_name, customer_name, email, customer_email, phone, customer_phone').in('id', leadIds) : { data: [] },
    cases.length ? supabase.from('properties').select(PROPERTY_FIELDS).in('case_number', cases) : { data: [] },
  ])
  return rows.map(r => {
    const l = (leads.data || []).find(x => x.id === r.consultation_id) || {}
    return {
      ...r,
      buyer: {
        name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || l.customer_name || l.email || l.customer_email || 'Client',
        email: l.email || l.customer_email || null,
        phone: l.phone || l.customer_phone || null,
      },
      property: (props.data || []).find(p => p.case_number === r.case_number) || null,
    }
  })
}

async function proposalForCaller(supabase, caller, id) {
  if (!UUID_RE.test(String(id || ''))) return null
  const { data } = await supabase.from('broker_offer_proposals').select(PROPOSAL_FIELDS).eq('id', id).maybeSingle()
  if (!data || !(await leadForCaller(supabase, caller, data.consultation_id))) return null
  return data
}

async function handleOfferProposals(req, res) {
  const supabase = getSupabase()
  const caller = await requireRole(req, res, supabase, ['admin', 'broker'])
  if (!caller) return

  if (req.method === 'GET') {
    let q = supabase.from('broker_offer_proposals').select(PROPOSAL_FIELDS).order('updated_at', { ascending: false }).limit(300)
    if (req.query?.consultationId) {
      const lead = await leadForCaller(supabase, caller, req.query.consultationId)
      if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' })
      q = q.eq('consultation_id', lead.id)
    } else if (caller.role !== 'admin') {
      const { data: agents } = await supabase.from('agents').select('id').ilike('email', likeExact(caller.email || ''))
      q = q.in('agent_id', [caller.id, ...(agents || []).map(a => a.id)])
    }
    const { data, error } = await q
    if (error) throw error
    return res.status(200).json({ success: true, data: await withProposalExtras(supabase, data || []) })
  }

  if (req.method === 'POST') {
    const body = req.body || {}
    const lead = await leadForCaller(supabase, caller, body.consultationId)
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' })
    const parsed = proposalTerms(body)
    if (parsed.error) return res.status(400).json({ success: false, error: parsed.error })
    if (!['draft', 'sent'].includes(body.status)) return res.status(400).json({ success: false, error: 'Save as a draft or send it.' })

    const [{ data: property }, account] = await Promise.all([
      supabase.from('properties').select('id').eq('case_number', parsed.values.case_number).maybeSingle(),
      buyerAccount(supabase, lead.buyerEmail),
    ])
    const now = new Date().toISOString()
    const base = { ...parsed.values, property_id: property?.id || null, user_id: account?.id || null, updated_at: now }

    if (body.id) {
      const current = await proposalForCaller(supabase, caller, body.id)
      if (!current || current.consultation_id !== lead.id) return res.status(404).json({ success: false, error: 'Offer not found' })
      if (!BROKER_EDITABLE.includes(current.status)) {
        return res.status(409).json({ success: false, error: 'This offer was already accepted, so it can no longer be changed. Withdraw it and build a new one.' })
      }
      // Once the buyer has it, any change goes back to them for a fresh answer
      const status = current.status === 'draft' ? body.status : 'sent'
      const { data, error } = await supabase.from('broker_offer_proposals')
        .update({ ...base, status, buyer_note: null, responded_at: null, ...(status === 'sent' && !current.sent_at ? { sent_at: now } : {}) })
        .eq('id', current.id).eq('status', current.status).select(PROPOSAL_FIELDS)
      if (error) throw error
      if (!data?.length) return res.status(409).json({ success: false, error: 'The buyer just responded. Reload and try again.' })
      await logProposalEvent(supabase, current.id, 'broker', current.status === 'draft' ? (status === 'sent' ? 'sent' : 'edited') : 'revised')
      return res.status(200).json({ success: true, data: (await withProposalExtras(supabase, data))[0] })
    }

    const { data, error } = await supabase.from('broker_offer_proposals').insert([{
      ...base,
      consultation_id: lead.id,
      customer_id: lead.customer_id || null,
      agent_id: lead.ownerId || null,
      share_token: randomBytes(24).toString('base64url'),
      status: body.status,
      sent_at: body.status === 'sent' ? now : null,
    }]).select(PROPOSAL_FIELDS)
    if (error) throw error
    await logProposalEvent(supabase, data[0].id, 'broker', body.status === 'sent' ? 'sent' : 'created')
    return res.status(200).json({ success: true, data: (await withProposalExtras(supabase, data))[0] })
  }

  if (req.method === 'PATCH') {
    const { id, status } = req.body || {}
    const from = { sent: ['draft'], submitted: ['accepted'], withdrawn: ['sent', 'changes_requested', 'accepted', 'declined'] }[status]
    if (!from) return res.status(400).json({ success: false, error: 'Unknown status change' })
    const current = await proposalForCaller(supabase, caller, id)
    if (!current) return res.status(404).json({ success: false, error: 'Offer not found' })
    const now = new Date().toISOString()
    const { data, error } = await supabase.from('broker_offer_proposals')
      .update({ status, updated_at: now, ...(status === 'submitted' ? { submitted_at: now } : {}), ...(status === 'sent' ? { sent_at: now } : {}) })
      .eq('id', current.id).in('status', from).select(PROPOSAL_FIELDS)
    if (error) throw error
    if (!data?.length) return res.status(409).json({ success: false, error: 'This offer changed. Reload and try again.' })
    await logProposalEvent(supabase, current.id, 'broker', status)
    return res.status(200).json({ success: true, data: (await withProposalExtras(supabase, data))[0] })
  }

  if (req.method === 'DELETE') {
    const current = await proposalForCaller(supabase, caller, req.query?.id)
    if (!current) return res.status(404).json({ success: false, error: 'Offer not found' })
    if (!DELETABLE.includes(current.status)) return res.status(409).json({ success: false, error: 'Only drafts and withdrawn offers can be deleted. Withdraw it first.' })
    // Uploaded files outlive the offer_documents rows the delete cascades to
    const { data: docs } = await supabase.from('offer_documents').select('storage_path').eq('proposal_id', current.id)
    const { data, error } = await supabase.from('broker_offer_proposals').delete().eq('id', current.id).in('status', DELETABLE).select('id')
    if (error) throw error
    if (!data?.length) return res.status(409).json({ success: false, error: 'This offer changed. Reload and try again.' })
    if (docs?.length) {
      const { error: storageError } = await supabase.storage.from('offer-documents').remove(docs.map(d => d.storage_path))
      if (storageError) console.warn('[leads] offer document cleanup failed:', storageError.message)
    }
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}

// ─── Action: offer-respond ───────────────────────────────────────────────────
// The buyer's side of a broker's offer, authorized by its share token so it works
// from an emailed link without an account. Signed-in buyers use the same token.
// GET  ?token=   → the offer, its home and the broker (street address only when signed in)
// POST { token, action: 'favorite'|'unfavorite'|'accept'|'changes'|'decline', terms?, signature?, authorize?, note? }
async function proposalByToken(supabase, token) {
  if (!TOKEN_RE.test(String(token || ''))) return null
  const { data } = await supabase.from('broker_offer_proposals').select(PROPOSAL_FIELDS)
    .eq('share_token', token).neq('status', 'draft').maybeSingle()
  return data || null
}

// Best-effort email to the broker when the buyer answers; skipped if Gmail isn't configured
async function emailAgent(supabase, agentId, subject, text) {
  if (!agentId || !process.env.GMAIL_USER || !process.env.GMAIL_APP_PASS) return
  try {
    const { data: agent } = await supabase.from('agents').select('email').eq('id', agentId).maybeSingle()
    if (!agent?.email) return
    const { default: nodemailer } = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASS.replace(/\s/g, '') },
    })
    await transporter.sendMail({ from: `USAHUDHomes <${process.env.GMAIL_USER}>`, to: agent.email, subject, text })
  } catch (e) {
    console.warn('[offer-respond] broker email failed:', e.message)
  }
}

async function handleOfferRespond(req, res) {
  const supabase = getSupabase()

  if (req.method === 'GET') {
    const offer = await proposalByToken(supabase, req.query?.token)
    if (!offer) return res.status(404).json({ success: false, error: 'This offer link is not valid.' })
    if (!offer.viewed_at) {
      const { data } = await supabase.from('broker_offer_proposals').update({ viewed_at: new Date().toISOString() }).eq('id', offer.id).is('viewed_at', null).select('id')
      if (data?.length) await logProposalEvent(supabase, offer.id, 'buyer', 'viewed')
    }
    const [caller, { data: property }, { data: agent }, { data: lead }] = await Promise.all([
      getCaller(req, supabase),
      supabase.from('properties').select('id, case_number, address, city, state, zip_code, price, beds, baths, sq_ft, status, main_image, bid_deadline').eq('case_number', offer.case_number).maybeSingle(),
      offer.agent_id ? supabase.from('agents').select('first_name, last_name, email, phone, company').eq('id', offer.agent_id).maybeSingle() : { data: null },
      supabase.from('consultations').select('first_name, last_name, customer_name').eq('id', offer.consultation_id).maybeSingle(),
    ])
    // Internal ids stay on the server; street addresses stay behind the login, as on property pages
    const { consultation_id, user_id, agent_id, property_id, viewed_at, ...safe } = offer // eslint-disable-line no-unused-vars
    return res.status(200).json({
      success: true,
      data: {
        ...safe,
        terms: termsOf(offer),
        property: property && !caller ? { ...property, address: null } : property,
        agent,
        buyerName: `${lead?.first_name || ''} ${lead?.last_name || ''}`.trim() || lead?.customer_name || '',
        signedIn: !!caller,
      },
    })
  }

  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
  const body = req.body || {}
  const offer = await proposalByToken(supabase, body.token)
  if (!offer) return res.status(404).json({ success: false, error: 'This offer link is not valid.' })
  const now = new Date().toISOString()

  if (body.action === 'favorite' || body.action === 'unfavorite') {
    if (offer.status === 'withdrawn') return res.status(409).json({ success: false, error: 'This offer was withdrawn.' })
    const favorite = body.action === 'favorite'
    // Mirror into the buyer's Saved Homes when they have an account (it may be newer than the offer)
    let userId = offer.user_id
    if (!userId) {
      const lead = await leadForCaller(supabase, { role: 'admin' }, offer.consultation_id)
      userId = (await buyerAccount(supabase, lead?.buyerEmail))?.id || null
    }
    const { error } = await supabase.from('broker_offer_proposals').update({ is_favorite: favorite, user_id: userId, updated_at: now }).eq('id', offer.id)
    if (error) throw error
    if (userId && offer.property_id) {
      const saved = favorite
        ? await supabase.from('saved_properties').upsert([{ user_id: userId, property_id: offer.property_id, case_number: offer.case_number, price_at_save: offer.asking_price, recommended_by_agent_id: offer.agent_id }], { onConflict: 'user_id,property_id', ignoreDuplicates: true })
        : await supabase.from('saved_properties').delete().eq('user_id', userId).eq('property_id', offer.property_id)
      if (saved.error) console.warn('[offer-respond] saved homes not updated:', saved.error.message)
    }
    await logProposalEvent(supabase, offer.id, 'buyer', favorite ? 'favorited' : 'unfavorited')
    return res.status(200).json({ success: true, data: { is_favorite: favorite, savedToAccount: !!(userId && offer.property_id) } })
  }

  if (!BUYER_ACTIONABLE.includes(offer.status)) {
    return res.status(409).json({ success: false, error: 'This offer can no longer be changed. Contact your broker.' })
  }

  if (body.action === 'accept') {
    const signature = String(body.signature || '').trim().slice(0, 200)
    if (body.authorize !== true) return res.status(400).json({ success: false, error: 'Check the box to authorize your broker to submit this offer.' })
    if (signature.length < 2) return res.status(400).json({ success: false, error: 'Type your full name to sign.' })
    // Only accept the exact terms the buyer was looking at
    const terms = termsOf(offer)
    const seen = body.terms || {}
    if (!Object.keys(terms).every(k => seen[k] === terms[k])) {
      return res.status(409).json({ success: false, error: 'Your broker just updated this offer. Reload to review the new terms.' })
    }
    const { data, error } = await supabase.from('broker_offer_proposals')
      .update({ status: 'accepted', accepted_signature: signature, accepted_terms: terms, responded_at: now, updated_at: now })
      .eq('id', offer.id).eq('updated_at', offer.updated_at).in('status', BUYER_ACTIONABLE).select('id')
    if (error) throw error
    if (!data?.length) return res.status(409).json({ success: false, error: 'This offer changed while you were reviewing it. Reload and try again.' })
    await logProposalEvent(supabase, offer.id, 'buyer', 'accepted', `Signed: ${signature}`)
    await emailAgent(supabase, offer.agent_id, `Offer accepted: HUD ${offer.case_number}`,
      `${signature} accepted your $${terms.offer_price.toLocaleString()} offer on HUD case ${offer.case_number} and authorized you to submit it.\n\nOpen your broker dashboard: https://www.usahudhomes.com/broker-dashboard`)
    return res.status(200).json({ success: true, data: { status: 'accepted' } })
  }

  if (body.action === 'changes' || body.action === 'decline') {
    const note = String(body.note || '').trim().slice(0, 2000)
    if (body.action === 'changes' && !note) return res.status(400).json({ success: false, error: 'Tell your broker what you would like changed.' })
    const status = body.action === 'changes' ? 'changes_requested' : 'declined'
    const { data, error } = await supabase.from('broker_offer_proposals')
      .update({ status, buyer_note: note || null, responded_at: now, updated_at: now })
      .eq('id', offer.id).eq('updated_at', offer.updated_at).in('status', BUYER_ACTIONABLE).select('id')
    if (error) throw error
    if (!data?.length) return res.status(409).json({ success: false, error: 'This offer changed while you were reviewing it. Reload and try again.' })
    await logProposalEvent(supabase, offer.id, 'buyer', status, note || null)
    await emailAgent(supabase, offer.agent_id,
      status === 'changes_requested' ? `Changes requested: HUD ${offer.case_number}` : `Offer declined: HUD ${offer.case_number}`,
      `Your client ${status === 'changes_requested' ? 'asked for changes to' : 'declined'} your offer on HUD case ${offer.case_number}.${note ? `\n\n"${note}"` : ''}\n\nOpen your broker dashboard: https://www.usahudhomes.com/broker-dashboard`)
    return res.status(200).json({ success: true, data: { status } })
  }

  return res.status(400).json({ success: false, error: 'Unknown response' })
}

// ─── Action: purge-under-contract ───────────────────────────────────────────
/**
 * Removes (hard-deletes) properties that have been UNDER CONTRACT for more
 * than `days` days (default 60). Supports dry_run=true for a safe preview.
 *
 * dry_run=true  → returns count + first 50 properties for display
 * dry_run=false → fetches IDs, then deletes in chunks of 25 to avoid
 *                 PostgreSQL "stack depth limit exceeded" on large deletes
 */
async function requireAdminForPurge(req, res, supabase) {
  const token = (req.headers?.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) {
    res.status(401).json({ success: false, error: 'Not signed in' })
    return false
  }
  const { data: { user } = {}, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    res.status(401).json({ success: false, error: 'Invalid or expired session' })
    return false
  }
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access required' })
    return false
  }
  return true
}

async function handlePurgeUnderContract(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }
  const { dry_run = false } = req.body || {}
  const days = Number(req.body?.days ?? 60)
  if (!Number.isFinite(days) || days < 1) {
    return res.status(400).json({ success: false, error: 'days must be a number >= 1' })
  }
  const supabase = getSupabase()
  if (!(await requireAdminForPurge(req, res, supabase))) return

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  // ── Step 1: get the total count (lightweight — no row data) ──────────────
  const { count: totalCount, error: countErr } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'UNDER CONTRACT')
    .lt('updated_at', cutoff)

  if (countErr) throw countErr

  const count = totalCount || 0

  if (dry_run) {
    const { data: sample, error: sampleErr } = await supabase
      .from('properties')
      .select('id, case_number, address, city, state, price, updated_at')
      .eq('status', 'UNDER CONTRACT')
      .lt('updated_at', cutoff)
      .order('updated_at', { ascending: true })
      .limit(50)

    if (sampleErr) throw sampleErr

    return res.status(200).json({
      success: true,
      dry_run: true,
      count,
      cutoff_date: cutoff,
      days_threshold: days,
      properties: sample || [],
      preview_limited: count > 50,
    })
  }

  if (count === 0) {
    return res.status(200).json({
      success: true,
      deleted: 0,
      days_threshold: days,
      cutoff_date: cutoff,
      message: `No properties have been UNDER CONTRACT for more than ${days} days.`,
    })
  }

  // ── Step 2: fetch just the IDs matching the filter ────────────────────────
  // Fetching only `id` (not full rows) keeps this response tiny even for
  // hundreds of properties.
  const { data: rows, error: idErr } = await supabase
    .from('properties')
    .select('id')
    .eq('status', 'UNDER CONTRACT')
    .lt('updated_at', cutoff)

  if (idErr) throw idErr

  // ── Step 3: delete in chunks of 10 ───────────────────────────────────────
  // A single DELETE of 170 rows can trigger PostgreSQL's "stack depth limit
  // exceeded" if the table has complex triggers or cascades.  Chunking into
  // batches of 10 keeps each statement small enough to avoid that limit while
  // staying well within PostgREST's URL length budget (~1 KB per batch).
  const CHUNK = 10
  let deleted = 0
  for (let i = 0; i < (rows || []).length; i += CHUNK) {
    const ids = rows.slice(i, i + CHUNK).map(r => r.id)
    const { error: delErr } = await supabase
      .from('properties')
      .delete()
      .in('id', ids)
    if (delErr) throw delErr
    deleted += ids.length
  }

  return res.status(200).json({
    success: true,
    deleted,
    days_threshold: days,
    cutoff_date: cutoff,
    message: `Removed ${deleted} properties that were UNDER CONTRACT for more than ${days} days.`,
  })
}

// ─── Action: process-expired ──────────────────────────────────────────────────
async function handleProcessExpired(req, res) {
  const supabase = getSupabase()
  if (!(await requireRole(req, res, supabase, ['admin']))) return
  const now = new Date().toISOString()
  const { data: expired, error } = await supabase
    .from('consultations').select('*').eq('status', 'referred').lt('referral_expires_at', now).is('accepted_at', null)
  if (error) throw error
  if (!expired || expired.length === 0) {
    return res.status(200).json({ success: true, data: { expired: 0 } })
  }
  for (const c of expired) {
    const { error: updErr } = await supabase
      .from('consultations').update({ expired_at: now, status: 'expired', updated_at: now }).eq('id', c.id)
    if (updErr) {
      console.warn('[leads/process-expired] update failed:', c.id, updErr.message)
      continue
    }
    await logActivity(supabase, c, c.assigned_broker_id, 'referral_expired', 'Referral expired')
  }
  return res.status(200).json({ success: true, data: { expired: expired.length } })
}

// ─── Main router ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const action = req.query?.action

  try {
    if (action === 'delete')           return await handleDelete(req, res)
    if (action === 'assign')           return await handleAssign(req, res)
    if (action === 'accept')           return await handleAccept(req, res)
    if (action === 'decline')          return await handleDecline(req, res)
    if (action === 'outcome')          return await handleOutcome(req, res)
    if (action === 'referrals')        return await handleGetReferrals(req, res)
    if (action === 'client-activity')  return await handleClientActivity(req, res)
    if (action === 'property-picks')   return await handlePropertyPicks(req, res)
    if (action === 'offer-proposals')  return await handleOfferProposals(req, res)
    if (action === 'offer-respond')    return await handleOfferRespond(req, res)
    if (action === 'process-expired')       return await handleProcessExpired(req, res)
    if (action === 'purge-under-contract')  return await handlePurgeUnderContract(req, res)

    return res.status(400).json({
      success: false,
      error: 'Missing or unknown ?action= parameter',
      valid_actions: ['delete', 'assign', 'accept', 'decline', 'outcome', 'referrals', 'client-activity', 'property-picks', 'process-expired', 'purge-under-contract'],
    })
  } catch (err) {
    console.error(`[leads/${action}] Error:`, err)
    return res.status(500).json({ success: false, error: err.message || 'Unknown error' })
  }
}
