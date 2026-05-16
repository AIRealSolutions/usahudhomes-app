/**
 * Vercel Serverless Function: HUD Schedules
 * GET    /api/hud-schedules         — list all schedules
 * POST   /api/hud-schedules         — create a schedule
 * PATCH  /api/hud-schedules?id=...  — update a schedule
 * DELETE /api/hud-schedules?id=...  — delete a schedule
 *
 * Requires SUPABASE_SERVICE_KEY for write operations.
 */

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured')
  return createClient(url, key, { auth: { persistSession: false } })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const supabase  = getSupabase()
    const scheduleId = req.query?.id

    // ── GET — list all schedules ───────────────────────────────────────────────
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('hud_sync_schedules')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        // Table may not exist yet
        return res.status(200).json({
          success: true,
          schedules: [],
          warning: 'Run migration: database/migrations/add_hud_sync_tables.sql'
        })
      }
      return res.status(200).json({ success: true, schedules: data || [] })
    }

    // ── POST — create a schedule ───────────────────────────────────────────────
    if (req.method === 'POST') {
      const { states, cron_expression, label, dry_run = false, enabled = true } = req.body || {}
      if (!states || states.length === 0) {
        return res.status(400).json({ success: false, error: 'states array is required' })
      }
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('hud_sync_schedules')
        .insert({
          states,
          cron_expression: cron_expression || '0 6 * * *',
          label:           label || `HUD Sync ${states.join(', ')}`,
          dry_run,
          enabled,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()
      if (error) throw error
      return res.status(200).json({ success: true, schedule: data })
    }

    // ── PATCH — update a schedule ──────────────────────────────────────────────
    if (req.method === 'PATCH') {
      if (!scheduleId) return res.status(400).json({ success: false, error: 'id query param required' })
      const allowed = ['states', 'cron_expression', 'label', 'dry_run', 'enabled']
      const updates = { updated_at: new Date().toISOString() }
      for (const key of allowed) {
        if (req.body && key in req.body) updates[key] = req.body[key]
      }
      const { data, error } = await supabase
        .from('hud_sync_schedules')
        .update(updates)
        .eq('id', scheduleId)
        .select()
        .single()
      if (error) throw error
      return res.status(200).json({ success: true, schedule: data })
    }

    // ── DELETE — delete a schedule ─────────────────────────────────────────────
    if (req.method === 'DELETE') {
      if (!scheduleId) return res.status(400).json({ success: false, error: 'id query param required' })
      const { error } = await supabase
        .from('hud_sync_schedules')
        .delete()
        .eq('id', scheduleId)
      if (error) throw error
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })

  } catch (err) {
    console.error('[hud-schedules] Error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
}
