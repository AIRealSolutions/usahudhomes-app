/**
 * Vercel Serverless Function: HUD History + Queue Media
 * GET  /api/hud-history                        — list run history
 * POST /api/hud-history?action=queue-media     — queue properties into video_jobs
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const supabase = getSupabase()

    // ── GET — run history ──────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const limit = Math.min(parseInt(req.query?.limit || '50'), 200)
      const { data, error } = await supabase
        .from('hud_sync_runs')
        .select('*')
        .order('ran_at', { ascending: false })
        .limit(limit)

      if (error) {
        // Table may not exist yet — return empty gracefully
        console.warn('[hud-history] hud_sync_runs query failed:', error.message)
        return res.status(200).json({
          success: true,
          runs: [],
          warning: 'Run this migration in Supabase SQL Editor: database/migrations/add_hud_sync_tables.sql'
        })
      }
      return res.status(200).json({ success: true, runs: data || [] })
    }

    // ── POST ?action=queue-media ───────────────────────────────────────────────
    if (req.method === 'POST' && req.query?.action === 'queue-media') {
      const { case_numbers, state, template_id } = req.body || {}

      if (!state && (!case_numbers || case_numbers.length === 0)) {
        return res.status(400).json({ success: false, error: 'Provide state or case_numbers' })
      }

      // Resolve properties
      let query = supabase.from('properties').select('id, case_number')
      if (case_numbers && case_numbers.length > 0) {
        query = query.in('case_number', case_numbers)
      } else {
        // Queue all active properties for the state (exclude UNDER CONTRACT)
        query = query
          .eq('state', state.toUpperCase())
          .eq('is_active', true)
          .neq('status', 'UNDER CONTRACT')
      }

      const { data: props, error: propErr } = await query
      if (propErr) throw propErr
      if (!props || props.length === 0) {
        return res.status(400).json({ success: false, error: 'No matching properties found in database' })
      }

      // Resolve default template if none specified
      let resolvedTemplate = template_id || null
      if (!resolvedTemplate) {
        const { data: tmpl } = await supabase
          .from('video_templates')
          .select('id')
          .eq('is_default', true)
          .limit(1)
          .single()
        if (tmpl) resolvedTemplate = tmpl.id
      }

      const rows = props.map(p => ({
        property_id:  p.id,
        template_id:  resolvedTemplate,
        case_number:  p.case_number,
        status:       'queued',
        progress:     0,
      }))

      const { error: insertErr } = await supabase.from('video_jobs').insert(rows)
      if (insertErr) throw insertErr

      return res.status(200).json({
        success:     true,
        queued:      rows.length,
        template_id: resolvedTemplate,
      })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })

  } catch (err) {
    console.error('[hud-history] Error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
}
