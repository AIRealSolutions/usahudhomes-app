/**
 * Vercel Serverless Function: /api/hud
 *
 * Consolidated HUD scraper API — replaces:
 *   hud-scrape.js, hud-import.js, hud-schedules.js, hud-history.js
 *
 * Routes via ?action= query param:
 *   POST ?action=scrape        — scrape a state from hudhomestore.gov
 *   POST ?action=import        — upsert scraped properties into Supabase
 *   GET  ?action=history       — list run history
 *   POST ?action=queue-media   — queue properties into video_jobs
 *   GET  ?action=schedules     — list schedules
 *   POST ?action=schedules     — create a schedule
 *   PATCH ?action=schedules    — update a schedule
 *   DELETE ?action=schedules   — delete a schedule
 */

import { createClient } from '@supabase/supabase-js'

// ─── Supabase ─────────────────────────────────────────────────────────────────
function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured')
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
    let mainImage   = p.propertyThumb || null
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
      gallery_images:   p.galleryImages      || null,
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
    gallery_images: p.gallery_images,
    latitude:       p.latitude,
    longitude:      p.longitude,
    hud_url:        p.hud_url,
    is_active:      true,
    updated_at:     new Date().toISOString(),
  }
}

// ─── Action handlers ──────────────────────────────────────────────────────────

async function handleScrape(req, res) {
  const { state } = req.body || {}
  const stateCode = (state || '').trim().toUpperCase()
  if (!stateCode || stateCode.length !== 2) {
    return res.status(400).json({ success: false, error: 'Invalid state code (must be 2 letters)' })
  }
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
  const html       = await response.text()
  const properties = parseHudPage(html, stateCode)
  const newCount     = properties.filter(p => p.is_new_listing).length
  const reducedCount = properties.filter(p => p.is_price_reduced).length
  return res.status(200).json({
    success: true, state: stateCode, properties,
    stats: { total: properties.length, new_listings: newCount, price_reduced: reducedCount },
  })
}

async function handleImport(req, res) {
  const { properties, state, dry_run, job_id } = req.body || {}
  if (!properties || !Array.isArray(properties) || properties.length === 0) {
    return res.status(400).json({ success: false, error: 'No properties provided' })
  }
  const supabase = getSupabase()
  const stateCode = (state || properties[0]?.state || 'XX').toUpperCase()
  const scrapedCaseNumbers = new Set(properties.map(p => p.case_number).filter(Boolean))

  let newCount = 0, updatedCount = 0, restoredCount = 0, errorCount = 0
  const errors = []

  if (!dry_run) {
    // Upsert each property
    for (const prop of properties) {
      if (!prop.case_number) continue
      try {
        const row = mapToDbRow(prop)
        // Check if it already exists
        const { data: existing } = await supabase
          .from('properties').select('id, is_active').eq('case_number', prop.case_number).single()
        if (existing) {
          if (!existing.is_active) restoredCount++
          else updatedCount++
        } else {
          newCount++
        }
        const { error: upsertErr } = await supabase
          .from('properties').upsert(row, { onConflict: 'case_number' })
        if (upsertErr) { errorCount++; errors.push({ case_number: prop.case_number, error: upsertErr.message }) }
      } catch (e) {
        errorCount++
        errors.push({ case_number: prop.case_number, error: e.message })
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
          await supabase.from('properties')
            .update({ status: 'UNDER CONTRACT', is_active: false, updated_at: new Date().toISOString() })
            .in('case_number', toMark.map(p => p.case_number))
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

    return res.status(200).json({
      success: true, state: stateCode,
      stats: { total: properties.length, new: newCount, updated: updatedCount, restored: restoredCount, marked_under_contract: markedCount, errors: errorCount },
      errors: errors.slice(0, 10),
    })
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
    return res.status(200).json({
      success: true, state: stateCode, dry_run: true,
      stats: { total: properties.length, new: newCount, updated: updatedCount, restored: restoredCount, would_mark_under_contract: toMark, errors: 0 },
    })
  }
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
  const supabase  = getSupabase()
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const action = req.query?.action

  try {
    if (action === 'scrape')       return await handleScrape(req, res)
    if (action === 'import')       return await handleImport(req, res)
    if (action === 'history')      return await handleHistory(req, res)
    if (action === 'queue-media')  return await handleQueueMedia(req, res)
    if (action === 'schedules')    return await handleSchedules(req, res)

    return res.status(400).json({
      success: false,
      error: 'Missing or unknown ?action= parameter',
      valid_actions: ['scrape', 'import', 'history', 'queue-media', 'schedules'],
    })
  } catch (err) {
    console.error(`[hud/${action}] Error:`, err)
    return res.status(500).json({ success: false, error: err.message || 'Unknown error' })
  }
}
