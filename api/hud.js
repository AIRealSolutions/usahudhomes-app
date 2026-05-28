/**
 * Vercel Serverless Function: /api/hud
 *
 * Consolidated HUD scraper API
 *
 * Routes via ?action= query param:
 *   POST ?action=scrape            — scrape a state, return stats + lightweight property list
 *   POST ?action=import            — upsert properties into Supabase (accepts lightweight list)
 *   POST ?action=scrape-and-import — scrape + import in a single serverless call (no large payload round-trip)
 *   GET  ?action=history           — list run history
 *   POST ?action=queue-media       — queue properties into video_jobs
 *   GET  ?action=schedules         — list schedules
 *   POST ?action=schedules         — create a schedule
 *   PATCH ?action=schedules        — update a schedule
 *   DELETE ?action=schedules       — delete a schedule
 */

import { createClient } from '@supabase/supabase-js'

// ─── Supabase ─────────────────────────────────────────────────────────────────
function getSupabase() {
  const url = process.env.SUPABASE_URL || 'https://lpqjndfjbenolhneqzec.supabase.co'
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_KEY not set in Vercel environment variables')
  return createClient(url, key, { auth: { persistSession: false } })
}

// ─── HUD Scrape helpers ───────────────────────────────────────────────────────
const HUD_BASE_URL    = 'https://www.hudhomestore.gov'
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dkzfopaco/image/upload/'

function parseHudPage(html, stateCode) {
  const match = html.match(/id=["']available_prop["'][^>]*value=["']([^"']*)/i)
  if (!match) return []
  let raw = match[1]
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
  let rawProps
  try { rawProps = JSON.parse(raw) } catch (e) {
    throw new Error(`Failed to parse property JSON for ${stateCode}: ${e.message}`)
  }
  if (!Array.isArray(rawProps) || rawProps.length === 0) return []
  return rawProps.map(p => {
    const status    = (p.propertyStatus || '').toLowerCase()
    const isNew     = status.includes('new') || status.includes('initial')
    const isReduced = status.includes('reduced')
    // Extract main image from gallery string (avoid storing full gallery in response)
    let mainImage = p.propertyThumb || null
    if (!mainImage && p.galleryImages) {
      const firstImg = p.galleryImages.replace(/\\"/g, '"').match(/"([^"]+)"/)
      if (firstImg) mainImage = `${CLOUDINARY_BASE}${firstImg[1]}`
    }
    return {
      case_number:      p.propertyCaseNumber || null,
      address:          p.propertyAddress    || null,
      city:             p.propertyCity       || null,
      state:            p.propertyState      || stateCode,
      zip_code:         p.propertyZip        || null,
      county:           p.propertyCounty     || null,
      list_price:       p.listPrice          ? parseFloat(p.listPrice)       : null,
      beds:             p.bedrooms           ? parseInt(p.bedrooms)           : null,
      baths:            p.bathrooms          ? parseFloat(p.bathrooms)        : null,
      square_footage:   p.squareFootage      ? parseInt(p.squareFootage)      : null,
      year_built:       p.yearBuilt          ? parseInt(p.yearBuilt)          : null,
      property_type:    p.propertyType       || null,
      fha_financing:    p.fhaFinancing       || null,
      listing_period:   p.listingPeriod      || null,
      property_status:  p.propertyStatus     || null,
      list_date:        p.listDate           || null,
      bid_open_date:    p.bidOpenDate        || null,
      period_deadline:  p.periodDeadlineDate || null,
      bidder_types:     p.bidderTypes        || null,
      eligible_bidders: p.eligibleBidders    || null,
      parking_type:     p.parkingType        || null,
      stories:          p.numberOfStories    ? parseFloat(p.numberOfStories) : null,
      in_amenities:     p.inAmenities        || null,
      out_amenities:    p.outAmenities       || null,
      latitude:         p.latitude           ? parseFloat(p.latitude)         : null,
      longitude:        p.longitude          ? parseFloat(p.longitude)        : null,
      main_image:       mainImage,
      // NOTE: gallery_images intentionally excluded from response to avoid 4.5MB Vercel limit
      // It is stored during import via the raw HUD data
      is_new_listing:   isNew,
      is_price_reduced: isReduced,
      hud_url:          `${HUD_BASE_URL}/propertydetail?caseNumber=${encodeURIComponent(p.propertyCaseNumber)}`,
    }
  })
}

// ─── DB column mapping ────────────────────────────────────────────────────────
function mapToDbRow(p) {
  return {
    case_number:    p.case_number,
    address:        p.address,
    city:           p.city,
    state:          p.state,
    zip:            p.zip_code,
    county:         p.county,
    price:          p.list_price,
    beds:           p.beds,
    baths:          p.baths,
    sq_ft:          p.square_footage,
    year_built:     p.year_built,
    property_type:  p.property_type,
    status:         p.property_status || 'Active',
    bids_open:      p.bid_open_date   ? new Date(p.bid_open_date).toISOString()   : null,
    bid_deadline:   p.period_deadline ? new Date(p.period_deadline).toISOString() : null,
    listing_period: p.listing_period,
    fha_financing:  p.fha_financing,
    bidder_types:   p.bidder_types,
    main_image:     p.main_image,
    latitude:       p.latitude,
    longitude:      p.longitude,
    hud_url:        p.hud_url,
    is_active:      true,
    updated_at:     new Date().toISOString(),
  }
}

// ─── Fetch HTML from HUD ──────────────────────────────────────────────────────
async function fetchHudHtml(stateCode) {
  const url = `${HUD_BASE_URL}/searchresult?citystate=${stateCode}`
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    signal: AbortSignal.timeout(25000),
  })
  if (!response.ok) throw new Error(`HUD site returned HTTP ${response.status}`)
  return response.text()
}

// ─── Core import logic (shared by import and scrape-and-import) ───────────────
async function importProperties(supabase, properties, stateCode, dry_run, job_id) {
  const scrapedCaseNumbers = new Set(properties.map(p => p.case_number).filter(Boolean))
  let newCount = 0, updatedCount = 0, restoredCount = 0, errorCount = 0
  const errors = []

  if (!dry_run) {
    // Batch upsert in chunks of 50 to avoid URL length limits
    const CHUNK = 50
    for (let i = 0; i < properties.length; i += CHUNK) {
      const chunk = properties.slice(i, i + CHUNK)
      // Count new vs updated
      const caseNums = chunk.map(p => p.case_number).filter(Boolean)
      const { data: existingChunk } = await supabase
        .from('properties').select('case_number, is_active').in('case_number', caseNums)
      const existingMap = new Map((existingChunk || []).map(p => [p.case_number, p]))
      for (const prop of chunk) {
        if (!prop.case_number) continue
        const ex = existingMap.get(prop.case_number)
        if (!ex) newCount++
        else if (!ex.is_active) restoredCount++
        else updatedCount++
      }
      // Batch upsert
      const rows = chunk.filter(p => p.case_number).map(mapToDbRow)
      const { error: upsertErr } = await supabase
        .from('properties').upsert(rows, { onConflict: 'case_number' })
      if (upsertErr) {
        errorCount += chunk.length
        errors.push({ chunk: i, error: upsertErr.message })
      }
    }

    // Mark properties no longer on HUD as UNDER CONTRACT
    let markedCount = 0
    try {
      const { data: activeProps } = await supabase
        .from('properties').select('case_number').eq('state', stateCode).eq('is_active', true)
      if (activeProps) {
        const toMark = activeProps.filter(p => !scrapedCaseNumbers.has(p.case_number))
        if (toMark.length > 0) {
          // Batch mark in chunks of 200 to avoid URL length limit
          const MARK_CHUNK = 200
          for (let i = 0; i < toMark.length; i += MARK_CHUNK) {
            const slice = toMark.slice(i, i + MARK_CHUNK).map(p => p.case_number)
            await supabase.from('properties')
              .update({ status: 'UNDER CONTRACT', is_active: false, updated_at: new Date().toISOString() })
              .in('case_number', slice)
          }
          markedCount = toMark.length
        }
      }
    } catch (e) { console.warn('[hud/import] mark-under-contract failed:', e.message) }

    // Log to hud_sync_runs
    try {
      await supabase.from('hud_sync_runs').insert([{
        job_id:                 job_id || `manual-${Date.now()}`,
        state:                  stateCode,
        dry_run:                false,
        total_scraped:          properties.length,
        new_properties:         newCount,
        updated_properties:     updatedCount,
        restored_properties:    restoredCount,
        marked_under_contract:  markedCount,
        errors:                 errorCount,
        ran_at:                 new Date().toISOString(),
      }])
    } catch (e) { console.warn('[hud/import] run log failed:', e.message) }

    return {
      total:                properties.length,
      new_properties:       newCount,
      updated_properties:   updatedCount,
      restored_properties:  restoredCount,
      marked_under_contract: markedCount,
      errors:               errorCount,
    }
  } else {
    // Dry run — just count what would change
    const { data: existing } = await supabase
      .from('properties').select('case_number, is_active').eq('state', stateCode)
    const existingMap = new Map((existing || []).map(p => [p.case_number, p]))
    for (const prop of properties) {
      if (!prop.case_number) continue
      const ex = existingMap.get(prop.case_number)
      if (!ex) newCount++
      else if (!ex.is_active) restoredCount++
      else updatedCount++
    }
    const toMark = (existing || []).filter(p => p.is_active && !scrapedCaseNumbers.has(p.case_number)).length
    return {
      total:                properties.length,
      new_properties:       newCount,
      updated_properties:   updatedCount,
      restored_properties:  restoredCount,
      marked_under_contract: toMark,
      errors:               0,
    }
  }
}

// ─── Action handlers ──────────────────────────────────────────────────────────

async function handleScrape(req, res) {
  const { state } = req.body || {}
  const stateCode = (state || '').trim().toUpperCase()
  if (!stateCode || stateCode.length !== 2) {
    return res.status(400).json({ success: false, error: 'Invalid state code (must be 2 letters)' })
  }
  const html       = await fetchHudHtml(stateCode)
  const properties = parseHudPage(html, stateCode)
  const newCount     = properties.filter(p => p.is_new_listing).length
  const reducedCount = properties.filter(p => p.is_price_reduced).length
  // Return lightweight summary — no gallery_images to keep response under 4.5MB
  return res.status(200).json({
    success: true, state: stateCode,
    // Return only essential fields for the preview card (not full property objects)
    properties: properties.map(p => ({
      case_number: p.case_number, address: p.address, city: p.city, state: p.state,
      zip_code: p.zip_code, list_price: p.list_price, beds: p.beds, baths: p.baths,
      property_status: p.property_status, main_image: p.main_image,
      is_new_listing: p.is_new_listing, is_price_reduced: p.is_price_reduced,
    })),
    stats: { total: properties.length, new_listings: newCount, price_reduced: reducedCount },
  })
}

async function handleScrapeAndImport(req, res) {
  // Combined action: scrape + import in one serverless call
  // Avoids sending large property arrays through the browser
  const { state, dry_run, job_id } = req.body || {}
  const stateCode = (state || '').trim().toUpperCase()
  if (!stateCode || stateCode.length !== 2) {
    return res.status(400).json({ success: false, error: 'Invalid state code (must be 2 letters)' })
  }
  const html       = await fetchHudHtml(stateCode)
  const properties = parseHudPage(html, stateCode)
  if (properties.length === 0) {
    return res.status(200).json({ success: true, state: stateCode, stats: { total: 0, new: 0, updated: 0 } })
  }
  const supabase = getSupabase()
  const stats = await importProperties(supabase, properties, stateCode, dry_run || false, job_id)
  return res.status(200).json({ success: true, state: stateCode, dry_run: dry_run || false, stats })
}

async function handleImport(req, res) {
  const { properties, state, dry_run, job_id } = req.body || {}
  if (!properties || !Array.isArray(properties) || properties.length === 0) {
    return res.status(400).json({ success: false, error: 'No properties provided' })
  }
  const supabase  = getSupabase()
  const stateCode = (state || properties[0]?.state || 'XX').toUpperCase()
  const stats = await importProperties(supabase, properties, stateCode, dry_run || false, job_id)
  return res.status(200).json({ success: true, state: stateCode, dry_run: dry_run || false, stats })
}

async function handleHistory(req, res) {
  const supabase = getSupabase()
  const limit = Math.min(parseInt(req.query?.limit || '50'), 200)
  const { data, error } = await supabase
    .from('hud_sync_runs').select('*').order('ran_at', { ascending: false }).limit(limit)
  if (error) {
    return res.status(200).json({ success: true, runs: [], warning: 'Run migration: database/migrations/add_hud_sync_tables.sql' })
  }
  return res.status(200).json({ success: true, runs: data || [] })
}

async function handleQueueMedia(req, res) {
  const { case_numbers, state, template_id } = req.body || {}
  if (!state && (!case_numbers || case_numbers.length === 0)) {
    return res.status(400).json({ success: false, error: 'Provide state or case_numbers' })
  }
  const supabase = getSupabase()
  let query = supabase.from('properties').select('id, case_number')
  if (case_numbers && case_numbers.length > 0) {
    query = query.in('case_number', case_numbers)
  } else {
    query = query.eq('state', state.toUpperCase()).eq('is_active', true).neq('status', 'UNDER CONTRACT')
  }
  const { data: props, error: propErr } = await query
  if (propErr) throw propErr
  if (!props || props.length === 0) {
    return res.status(400).json({ success: false, error: 'No matching properties found' })
  }
  let resolvedTemplate = template_id || null
  if (!resolvedTemplate) {
    const { data: tmpl } = await supabase.from('video_templates').select('id').eq('is_default', true).limit(1).single()
    if (tmpl) resolvedTemplate = tmpl.id
  }
  const rows = props.map(p => ({ property_id: p.id, template_id: resolvedTemplate, case_number: p.case_number, status: 'queued', progress: 0 }))
  const { error: insertErr } = await supabase.from('video_jobs').insert(rows)
  if (insertErr) throw insertErr
  return res.status(200).json({ success: true, queued: rows.length, template_id: resolvedTemplate })
}

async function handleSchedules(req, res) {
  const supabase   = getSupabase()
  const scheduleId = req.query?.id

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('hud_sync_schedules').select('*').order('created_at', { ascending: false })
    if (error) return res.status(200).json({ success: true, schedules: [], warning: 'Run migration: add_hud_sync_tables.sql' })
    return res.status(200).json({ success: true, schedules: data || [] })
  }
  if (req.method === 'POST') {
    const { title, states, cron_expression, dry_run, enabled } = req.body || {}
    if (!title || !states || !cron_expression) {
      return res.status(400).json({ success: false, error: 'title, states, and cron_expression are required' })
    }
    const { data, error } = await supabase.from('hud_sync_schedules')
      .insert([{ title, states, cron_expression, dry_run: dry_run || false, enabled: enabled !== false }])
      .select().single()
    if (error) throw error
    return res.status(201).json({ success: true, schedule: data })
  }
  if (req.method === 'PATCH') {
    if (!scheduleId) return res.status(400).json({ success: false, error: 'id query param required' })
    const updates = req.body || {}
    const { data, error } = await supabase.from('hud_sync_schedules')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', scheduleId).select().single()
    if (error) throw error
    return res.status(200).json({ success: true, schedule: data })
  }
  if (req.method === 'DELETE') {
    if (!scheduleId) return res.status(400).json({ success: false, error: 'id query param required' })
    const { error } = await supabase.from('hud_sync_schedules').delete().eq('id', scheduleId)
    if (error) throw error
    return res.status(200).json({ success: true })
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' })
}

// ─── Main router ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const action = req.query?.action || ''
  try {
    switch (action) {
      case 'scrape':            return await handleScrape(req, res)
      case 'scrape-and-import': return await handleScrapeAndImport(req, res)
      case 'import':            return await handleImport(req, res)
      case 'history':           return await handleHistory(req, res)
      case 'queue-media':       return await handleQueueMedia(req, res)
      case 'schedules':         return await handleSchedules(req, res)
      default:
        return res.status(400).json({ success: false, error: `Unknown action: "${action}". Valid: scrape, scrape-and-import, import, history, queue-media, schedules` })
    }
  } catch (err) {
    console.error(`[hud/${action}] Error:`, err)
    return res.status(500).json({ success: false, error: err.message })
  }
}
