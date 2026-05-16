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
 *   GET  ?action=referrals       — get all referrals for an agent
 *   POST ?action=process-expired — expire overdue referrals
 */

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured')
  return createClient(url, key, { auth: { persistSession: false } })
}

// ─── Action: delete ───────────────────────────────────────────────────────────
async function handleDelete(req, res) {
  const { ids, id } = req.body || {}
  const toDelete = ids || (id ? [id] : [])
  if (!toDelete.length) {
    return res.status(400).json({ success: false, error: 'Provide id or ids array' })
  }
  const supabase = getSupabase()
  const { error } = await supabase
    .from('consultations')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .in('id', toDelete)
  if (error) throw error
  return res.status(200).json({ success: true, deleted: toDelete.length })
}

// ─── Action: assign ───────────────────────────────────────────────────────────
async function handleAssign(req, res) {
  const { consultationId, agentId } = req.body || {}
  if (!consultationId || !agentId) {
    return res.status(400).json({ success: false, error: 'consultationId and agentId required' })
  }
  const supabase = getSupabase()
  const now        = new Date().toISOString()
  const expiresAt  = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('consultations')
    .update({ assigned_broker_id: agentId, assigned_at: now, referral_expires_at: expiresAt, status: 'referred' })
    .eq('id', consultationId)
    .select('*, agents(*)')
    .single()
  if (error) throw error
  await supabase.from('activities').insert([{
    consultation_id: consultationId, agent_id: agentId,
    activity_type: 'referral_assigned', description: 'Referral assigned',
  }]).catch(() => {})
  return res.status(200).json({ success: true, data })
}

// ─── Action: accept ───────────────────────────────────────────────────────────
async function handleAccept(req, res) {
  const { consultationId, agentId, notes } = req.body || {}
  if (!consultationId || !agentId) {
    return res.status(400).json({ success: false, error: 'consultationId and agentId required' })
  }
  const supabase = getSupabase()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('consultations')
    .update({ accepted_at: now, status: 'accepted', ...(notes ? { notes } : {}) })
    .eq('id', consultationId)
    .eq('assigned_broker_id', agentId)
    .select().single()
  if (error) throw error
  await supabase.from('activities').insert([{
    consultation_id: consultationId, agent_id: agentId,
    activity_type: 'referral_accepted', description: 'Referral accepted',
  }]).catch(() => {})
  return res.status(200).json({ success: true, data })
}

// ─── Action: decline ──────────────────────────────────────────────────────────
async function handleDecline(req, res) {
  const { consultationId, agentId, reason, notes } = req.body || {}
  if (!consultationId || !agentId) {
    return res.status(400).json({ success: false, error: 'consultationId and agentId required' })
  }
  const supabase = getSupabase()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('consultations')
    .update({ declined_at: now, decline_reason: reason, decline_notes: notes, status: 'declined' })
    .eq('id', consultationId)
    .eq('assigned_broker_id', agentId)
    .select().single()
  if (error) throw error
  await supabase.from('activities').insert([{
    consultation_id: consultationId, agent_id: agentId,
    activity_type: 'referral_declined', description: 'Referral declined',
    metadata: { reason, notes },
  }]).catch(() => {})
  return res.status(200).json({ success: true, data })
}

// ─── Action: outcome ──────────────────────────────────────────────────────────
async function handleOutcome(req, res) {
  const { consultationId, outcome, notes } = req.body || {}
  if (!consultationId || !outcome) {
    return res.status(400).json({ success: false, error: 'consultationId and outcome required' })
  }
  const supabase = getSupabase()
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
  const agentId = req.query?.agentId
  if (!agentId) return res.status(400).json({ success: false, error: 'agentId query param required' })
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('consultations')
    .select('*, customers(*), properties(*)')
    .eq('assigned_broker_id', agentId)
    .order('assigned_at', { ascending: false })
  if (error) throw error
  return res.status(200).json({ success: true, data: data || [] })
}

// ─── Action: process-expired ──────────────────────────────────────────────────
async function handleProcessExpired(req, res) {
  const supabase = getSupabase()
  const now = new Date().toISOString()
  const { data: expired, error } = await supabase
    .from('consultations').select('*').eq('status', 'referred').lt('referral_expires_at', now).is('accepted_at', null)
  if (error) throw error
  if (!expired || expired.length === 0) {
    return res.status(200).json({ success: true, data: { expired: 0 } })
  }
  for (const c of expired) {
    await supabase.from('consultations').update({ expired_at: now, status: 'expired' }).eq('id', c.id).catch(() => {})
    await supabase.from('activities').insert([{
      consultation_id: c.id, agent_id: c.assigned_broker_id,
      activity_type: 'referral_expired', description: 'Referral expired',
    }]).catch(() => {})
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
    if (action === 'process-expired')  return await handleProcessExpired(req, res)

    return res.status(400).json({
      success: false,
      error: 'Missing or unknown ?action= parameter',
      valid_actions: ['delete', 'assign', 'accept', 'decline', 'outcome', 'referrals', 'process-expired'],
    })
  } catch (err) {
    console.error(`[leads/${action}] Error:`, err)
    return res.status(500).json({ success: false, error: err.message || 'Unknown error' })
  }
}
