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
  if (!(await canActForAgent(supabase, caller, agentId))) {
    return res.status(403).json({ success: false, error: 'You can only accept your own referrals.' })
  }
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('consultations')
    .update({ accepted_at: now, status: 'accepted', updated_at: now, ...(notes ? { notes } : {}) })
    .eq('id', consultationId)
    .eq('assigned_broker_id', agentId)
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
  if (!(await canActForAgent(supabase, caller, agentId))) {
    return res.status(403).json({ success: false, error: 'You can only decline your own referrals.' })
  }
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('consultations')
    .update({ declined_at: now, decline_reason: reason, decline_notes: notes, status: 'declined', updated_at: now })
    .eq('id', consultationId)
    .eq('assigned_broker_id', agentId)
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
  if (!(await canActForAgent(supabase, caller, agentId))) {
    return res.status(403).json({ success: false, error: 'You can only view your own referrals.' })
  }
  const { data, error } = await supabase
    .from('consultations')
    .select('*, customers(*), properties(*)')
    .eq('assigned_broker_id', agentId)
    .eq('is_deleted', false)
    .order('assigned_at', { ascending: false })
  if (error) throw error
  return res.status(200).json({ success: true, data: data || [] })
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
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
    if (action === 'process-expired')       return await handleProcessExpired(req, res)
    if (action === 'purge-under-contract')  return await handlePurgeUnderContract(req, res)

    return res.status(400).json({
      success: false,
      error: 'Missing or unknown ?action= parameter',
      valid_actions: ['delete', 'assign', 'accept', 'decline', 'outcome', 'referrals', 'process-expired', 'purge-under-contract'],
    })
  } catch (err) {
    console.error(`[leads/${action}] Error:`, err)
    return res.status(500).json({ success: false, error: err.message || 'Unknown error' })
  }
}
