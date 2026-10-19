/**
 * Vercel Serverless Function: /api/leads
 *
 * Consolidated leads/consultation management API — replaces:
 *   consultation-delete.js, referral.js
 *
 * Routes via ?action= query param:
 *   POST ?action=delete          — soft-delete one or more consultations
 *   POST ?action=assign          — assign a consultation to a broker
 *   POST ?action=accept          — broker accepts a referral
 *   POST ?action=decline         — broker declines a referral
 *   POST ?action=outcome         — update consultation outcome
 *   GET  ?action=referrals            — get all referrals for an agent
 *   GET  ?action=client-activity      — a lead's saved homes, property requests and inquiries
 *   GET/POST/PATCH/DELETE ?action=property-picks — homes a broker picked for clients (Find Properties)
 *   POST ?action=process-expired      — expire overdue referrals
 *   POST ?action=purge-under-contract — hard-delete stale UNDER CONTRACT properties
 */

import { createClient } from '@supabase/supabase-js'

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
  if (!(await requireRole(req, res, supabase, ['admin']))) return
  const { ids, id } = req.body || {}
  const toDelete = ids || (id ? [id] : [])
  if (!toDelete.length) {
    return res.status(400).json({ success: false, error: 'Provide id or ids array' })
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
