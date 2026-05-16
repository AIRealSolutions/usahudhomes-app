/**
 * Vercel Serverless Function: HUD Import
 * POST /api/hud-import
 * Body: { state: "NC", properties: [...], dry_run: false }
 *
 * Upserts scraped HUD properties into the Supabase `properties` table.
 * Uses the service-role key (SUPABASE_SERVICE_KEY) for write access.
 * Falls back to anon key with a clear error if service key is missing.
 *
 * Column mapping (matches actual DB schema):
 *   list_price      → price
 *   square_footage  → sq_ft
 *   bid_open_date   → bids_open  (VARCHAR "MM/DD/YYYY")
 *   bid_open_date   → bid_deadline (TIMESTAMP, converted)
 *   listing_period  → listing_period + status (HUD status string)
 */

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL
  // Service key is required for writes (bypasses RLS)
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url) throw new Error('VITE_SUPABASE_URL environment variable is not set')
  if (!key) throw new Error(
    'SUPABASE_SERVICE_KEY is not set in Vercel environment variables. ' +
    'Go to Vercel → Project Settings → Environment Variables and add your Supabase service-role key.'
  )
  return createClient(url, key, {
    auth: { persistSession: false }
  })
}

/**
 * Convert a HUD property from the scraper format to the DB row format.
 * Uses the exact column names from the `properties` table.
 */
function mapToDbRow(p, now) {
  // Convert bid_open_date "MM/DD/YYYY" → ISO timestamp for bid_deadline
  let bidDeadline = null
  const rawBid = p.bid_open_date || p.bidOpenDate || null
  if (rawBid) {
    try {
      const parts = rawBid.split('/')
      if (parts.length === 3) {
        // MM/DD/YYYY → YYYY-MM-DD
        bidDeadline = `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}T00:00:00`
      }
    } catch (_) {}
  }

  // Use HUD's own status string (Exclusive, Price Reduced, New Listing, Extended, etc.)
  const hudStatus = p.property_status || p.listing_period || 'AVAILABLE'

  return {
    case_number:    p.case_number,
    address:        p.address,
    city:           p.city,
    state:          p.state,
    zip_code:       p.zip_code         || null,
    county:         p.county           || null,
    price:          p.list_price       ?? p.price ?? null,   // DB column is "price"
    beds:           p.beds             ?? null,
    baths:          p.baths            ?? null,
    sq_ft:          p.square_footage   ?? p.sq_ft ?? null,   // DB column is "sq_ft"
    year_built:     p.year_built       ?? null,
    property_type:  p.property_type    || 'Single Family',
    status:         hudStatus,
    bids_open:      rawBid             || null,              // VARCHAR "MM/DD/YYYY"
    bid_deadline:   bidDeadline,                             // TIMESTAMP
    listing_period: p.listing_period   || null,
    main_image:     p.main_image       || null,
    image_url:      p.main_image       || null,              // original Cloudinary URL
    is_active:      true,
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
    return res.status(400).json({ success: false, error: 'properties array is required and must not be empty' })
  }

  // Validate service key early so the error is clear
  let supabase
  try {
    supabase = getSupabase()
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      fix: 'Add SUPABASE_SERVICE_KEY to Vercel → Project Settings → Environment Variables'
    })
  }

  const stats = {
    total_scraped:         properties.length,
    new_properties:        0,
    updated_properties:    0,
    restored_properties:   0,
    marked_under_contract: 0,
    errors:                0,
    error_details:         [],
  }

  try {
    const now = new Date().toISOString()

    // ── Step 1: Fetch all existing properties for this state ──────────────────
    const { data: existingRows, error: fetchErr } = await supabase
      .from('properties')
      .select('id, case_number, status')
      .eq('state', stateCode)

    if (fetchErr) {
      return res.status(500).json({
        success: false,
        error: `Failed to fetch existing properties: ${fetchErr.message}`,
        hint: fetchErr.hint || null,
      })
    }

    const existingMap = {}
    for (const row of (existingRows || [])) {
      existingMap[row.case_number] = row
    }

    const importCaseNumbers = new Set(
      properties.map(p => p.case_number).filter(Boolean)
    )

    // ── Step 2: Upsert each scraped property ──────────────────────────────────
    for (const prop of properties) {
      if (!prop.case_number) {
        stats.errors++
        stats.error_details.push({ case_number: null, error: 'Missing case_number' })
        continue
      }

      try {
        const existing = existingMap[prop.case_number]
        const dbRow    = mapToDbRow(prop, now)

        if (!existing) {
          // New property — insert
          dbRow.listing_date = now
          dbRow.created_at   = now
          if (!dry_run) {
            const { error } = await supabase.from('properties').insert(dbRow)
            if (error) throw error
          }
          stats.new_properties++
        } else {
          // Existing — update
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
        stats.error_details.push({ case_number: prop.case_number, error: err.message })
      }
    }

    // ── Step 3: Mark properties NOT in import as UNDER CONTRACT ───────────────
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

    // ── Step 4: Persist run record (non-fatal if table doesn't exist yet) ─────
    if (!dry_run) {
      try {
        await supabase.from('hud_sync_runs').insert({
          job_id:                `vercel_${stateCode}_${Date.now()}`,
          state:                 stateCode,
          dry_run:               false,
          total_scraped:         stats.total_scraped,
          new_properties:        stats.new_properties,
          updated_properties:    stats.updated_properties,
          restored_properties:   stats.restored_properties,
          marked_under_contract: stats.marked_under_contract,
          errors:                stats.errors,
          ran_at:                now,
        })
      } catch (_) {
        console.warn('[hud-import] Could not write to hud_sync_runs — run the migration SQL first')
      }
    }

    // Remove verbose error_details if empty
    if (stats.error_details.length === 0) delete stats.error_details

    console.log(`[hud-import] ${stateCode} complete:`, stats)
    return res.status(200).json({ success: true, state: stateCode, dry_run, stats })

  } catch (err) {
    console.error('[hud-import] Fatal error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
}
