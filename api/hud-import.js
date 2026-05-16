/**
 * Vercel Serverless Function: HUD Import
 * POST /api/hud-import
 * Body: { state: "NC", properties: [...], dry_run: false }
 *
 * Upserts scraped HUD properties into the Supabase `properties` table.
 * Marks any same-state properties NOT in the import as UNDER CONTRACT.
 * Optionally dry_run=true to simulate without making DB changes.
 */

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured (VITE_SUPABASE_URL / SUPABASE_SERVICE_KEY)')
  return createClient(url, key)
}

/**
 * Map a scraped HUD property object to the `properties` table schema.
 */
function mapToDbRow(p, now) {
  return {
    case_number:    p.case_number,
    address:        p.address,
    city:           p.city,
    state:          p.state,
    zip_code:       p.zip_code,
    county:         p.county,
    list_price:     p.list_price,
    beds:           p.beds,
    baths:          p.baths,
    square_footage: p.square_footage,
    year_built:     p.year_built,
    property_type:  p.property_type,
    fha_financing:  p.fha_financing,
    listing_period: p.listing_period,
    status:         'AVAILABLE',
    bid_open_date:  p.bid_open_date  || null,
    list_date:      p.list_date      || null,
    main_image:     p.main_image     || null,
    image_url:      p.main_image     || null,
    hud_url:        p.hud_url        || null,
    latitude:       p.latitude       || null,
    longitude:      p.longitude      || null,
    is_new_listing:   p.is_new_listing   || false,
    is_price_reduced: p.is_price_reduced || false,
    special_100_down: p.special_100_down || false,
    updated_at:     now,
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { state, properties, dry_run = false } = req.body || {}
  const stateCode = (state || '').trim().toUpperCase()

  if (!stateCode || stateCode.length !== 2) {
    return res.status(400).json({ success: false, error: 'Invalid state code' })
  }
  if (!Array.isArray(properties) || properties.length === 0) {
    return res.status(400).json({ success: false, error: 'properties array is required' })
  }

  const stats = {
    total_scraped:          properties.length,
    new_properties:         0,
    updated_properties:     0,
    restored_properties:    0,
    marked_under_contract:  0,
    errors:                 0,
  }

  try {
    const supabase = getSupabase()
    const now = new Date().toISOString()

    // ── Step 1: Fetch all existing properties for this state ──────────────────
    const { data: existingRows, error: fetchErr } = await supabase
      .from('properties')
      .select('id, case_number, status')
      .eq('state', stateCode)

    if (fetchErr) throw new Error(`Failed to fetch existing properties: ${fetchErr.message}`)

    const existingMap = {}
    for (const row of (existingRows || [])) {
      existingMap[row.case_number] = row
    }

    const importCaseNumbers = new Set(properties.map(p => p.case_number).filter(Boolean))

    // ── Step 2: Upsert each scraped property ──────────────────────────────────
    for (const prop of properties) {
      if (!prop.case_number) { stats.errors++; continue }

      try {
        const existing = existingMap[prop.case_number]
        const dbRow = mapToDbRow(prop, now)

        if (!existing) {
          // New property
          dbRow.listing_date = now
          dbRow.created_at   = now
          if (!dry_run) {
            const { error } = await supabase.from('properties').insert(dbRow)
            if (error) throw error
          }
          stats.new_properties++
        } else {
          // Existing property — update
          const wasUnderContract = existing.status === 'UNDER CONTRACT'
          if (!dry_run) {
            const { error } = await supabase
              .from('properties')
              .update(dbRow)
              .eq('case_number', prop.case_number)
            if (error) throw error
          }
          if (wasUnderContract) {
            stats.restored_properties++
          } else {
            stats.updated_properties++
          }
        }
      } catch (err) {
        console.error(`[hud-import] Error on ${prop.case_number}:`, err.message)
        stats.errors++
      }
    }

    // ── Step 3: Mark missing same-state properties as UNDER CONTRACT ──────────
    for (const [caseNum, existing] of Object.entries(existingMap)) {
      if (!importCaseNumbers.has(caseNum) && existing.status !== 'UNDER CONTRACT') {
        if (!dry_run) {
          await supabase
            .from('properties')
            .update({ status: 'UNDER CONTRACT', updated_at: now })
            .eq('case_number', caseNum)
        }
        stats.marked_under_contract++
      }
    }

    // ── Step 4: Persist run record ────────────────────────────────────────────
    if (!dry_run) {
      try {
        await supabase.from('hud_sync_runs').insert({
          job_id:                 `vercel_${stateCode}_${Date.now()}`,
          state:                  stateCode,
          dry_run:                false,
          total_scraped:          stats.total_scraped,
          new_properties:         stats.new_properties,
          updated_properties:     stats.updated_properties,
          restored_properties:    stats.restored_properties,
          marked_under_contract:  stats.marked_under_contract,
          errors:                 stats.errors,
          ran_at:                 now,
        })
      } catch (_) {
        // Non-fatal — hud_sync_runs table may not exist yet
        console.warn('[hud-import] Could not write to hud_sync_runs (run migration first)')
      }
    }

    console.log(`[hud-import] ${stateCode} done:`, stats)
    return res.status(200).json({ success: true, state: stateCode, dry_run, stats })

  } catch (err) {
    console.error('[hud-import] Fatal error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
}
