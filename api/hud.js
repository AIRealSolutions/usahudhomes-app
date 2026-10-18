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
 *   GET/POST ?action=accepted-offers-sync — daily cron (CRON_SECRET) or an admin: record HUD accepted
 *                                    offers (bidresults) for every state into accepted_offers. The daily
 *                                    cron then also imports available listings (with photos) for every
 *                                    state, stalest first, within the time limit
 *   GET  ?action=gallery&caseNumber=  — public: every photo of one home, fetched from HUD the first
 *                                    time it's asked for and saved on the property (refresh=1 re-fetches)
 *   GET  ?action=gallery-image&url=   — public: one HUD photo passed through (for zip downloads when the
 *                                    browser can't fetch the image host directly)
 *   POST ?action=gallery-backfill     — admin: save every listed home's photo set for one state
 *                                    (photo links only; nothing else about the homes changes)
 *
 * Imports also save each home's photo links in properties.images, so listings show every photo.
 */

import { createClient } from '@supabase/supabase-js'

// ─── Supabase ─────────────────────────────────────────────────────────────────
function getSupabase() {
  const url = process.env.SUPABASE_URL || 'https://lpqjndfjbenolhneqzec.supabase.co'
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_KEY not set in Vercel environment variables')
  return createClient(url, key, { auth: { persistSession: false } })
}

// ─── Auth: caller must be a logged-in admin (Bearer <supabase access token>) ──
async function requireAdmin(req, res) {
  const token = (req.headers?.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) {
    res.status(401).json({ success: false, error: 'Not signed in' })
    return false
  }
  const supabase = getSupabase()
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

function toIsoOrNull(value) {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

// ─── HUD Scrape helpers ───────────────────────────────────────────────────────
const HUD_BASE_URL    = 'https://www.hudhomestore.gov'
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dkzfopaco/image/upload/'

// The raw listing objects embedded in HUD's state search page
function parseRawListings(html, stateCode = '') {
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
  return Array.isArray(rawProps) ? rawProps : []
}

function parseHudPage(html, stateCode) {
  const rawProps = parseRawListings(html, stateCode)
  if (rawProps.length === 0) return []
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
      gallery_images:   cleanGallery(mainImage, photosFromGalleryField(p.galleryImages, photoBase(mainImage))),
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
    zip_code:       p.zip_code,        // FIX: was 'zip' — column is 'zip_code'
    county:         p.county,
    price:          p.list_price,
    beds:           p.beds,
    baths:          p.baths,
    sq_ft:          p.square_footage,
    year_built:     p.year_built,
    property_type:  p.property_type,
    status:         p.property_status || 'Active',
    bids_open:      p.bid_open_date   || null,  // stored as varchar in DB, no Date conversion needed
    bid_deadline:   toIsoOrNull(p.period_deadline),
    listing_period: p.listing_period,
    main_image:     p.main_image,
    image_url:      p.main_image,      // also populate image_url column
    is_active:      true,
    under_contract_at: null,           // listed again, so not under contract
    updated_at:     new Date().toISOString(),
    // Extended HUD fields (added via migration add_hud_extended_fields.sql)
    latitude:       p.latitude       || null,
    longitude:      p.longitude      || null,
    hud_url:        p.hud_url        || null,
    fha_financing:  p.fha_financing  || null,
    bidder_types:   p.bidder_types   || null,
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
      // Batch upsert (skip rows missing NOT NULL columns: address, city, price)
      const valid = chunk.filter(p => p.case_number && p.address && p.city && p.list_price != null)
      errorCount += chunk.filter(p => p.case_number).length - valid.length
      const rows = valid.map(mapToDbRow)
      if (rows.length === 0) continue
      const { error: upsertErr } = await supabase
        .from('properties').upsert(rows, { onConflict: 'case_number' })
      if (upsertErr) {
        errorCount += rows.length
        errors.push({ chunk: i, error: upsertErr.message })
        continue
      }
      // Photo sets are saved separately so homes without one keep what they have
      await savePhotoSets(supabase, valid)
    }

    // Mark properties no longer on HUD as UNDER CONTRACT
    let markedCount = 0
    try {
      const { data: activeProps } = await supabase
        .from('properties').select('case_number').eq('state', stateCode).eq('is_active', true)
      if (activeProps) {
        const toMark = activeProps.filter(p => !scrapedCaseNumbers.has(p.case_number))
        if (toMark.length > 0) {
          const now = new Date().toISOString()
          // Batch mark in chunks of 200 to avoid URL length limit
          const MARK_CHUNK = 200
          for (let i = 0; i < toMark.length; i += MARK_CHUNK) {
            const slice = toMark.slice(i, i + MARK_CHUNK).map(p => p.case_number)
            await supabase.from('properties')
              .update({ status: 'UNDER CONTRACT', is_active: false, under_contract_at: now, updated_at: now })
              .in('case_number', slice)
          }
          markedCount = toMark.length
        }
      }
    } catch (e) { console.warn('[hud/import] mark-under-contract failed:', e.message) }

    // Price, status and contract history is logged by database triggers on properties
    // (database/migrations/add_property_activity_and_saved_homes.sql)

    // Log to hud_sync_runs
    try {
      const { error: logErr } = await supabase.from('hud_sync_runs').insert([{
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
      if (logErr) console.warn('[hud/import] run log failed:', logErr.message)
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

// ─── Photo gallery (on demand) ────────────────────────────────────────────────
// HUD only gives us one photo per home in the daily scrape; the rest are fetched when
// someone opens the gallery, then kept in properties.images so later opens are instant.
const PHOTO_HOST = 'https://res.cloudinary.com/'
const DEFAULT_PHOTO_BASE = 'https://res.cloudinary.com/yardi/image/upload/q_auto,f_auto,c_limit/d_hhs:themes:common:images:NoImage.jpg/hhs/'
// HUD's links carry a "NoImage.jpg" fallback setting mid-path, so the file type is
// checked on the last path segment only
const isPhotoUrl = (url) => /\.(jpe?g|png|webp)$/i.test(fileName(url))
const isPlaceholder = (name) => /noimage|logo|icon|sprite|placeholder/i.test(name)
const fileName = (url) => decodeURIComponent(String(url).split('?')[0].split('/').pop() || '')

// Photo links are built like the scrape's thumbnails: the same delivery base, then the file name
function photoBase(mainImage) {
  const m = String(mainImage || '')
  return m.startsWith(PHOTO_HOST) && m.includes('/hhs/') ? m.slice(0, m.lastIndexOf('/hhs/') + 5) : DEFAULT_PHOTO_BASE
}

// HUD sends the photo list as text like "Media_(27)_592188_266117815.png","Media_(28)_…png"
// (sometimes escaped or wrapped in brackets); pull out every photo file name or link in it
function photosFromGalleryField(gallery, base) {
  if (!gallery) return []
  const text = String(gallery).replace(/\\"/g, '"')
  const names = text.match(/https?:\/\/[^"',\s\]]+|[^"',\s[\]\\]+\.(?:jpe?g|png|webp)/gi) || []
  return names.map(e => (/^https?:\/\//i.test(e) ? e : `${base}${e.replace(/^\/?(hhs\/)?/i, '')}`))
}

// HUD's listing search, by case number first (one result), then by state
async function hudListingFor(caseNumber, state) {
  const sources = [caseNumber, state].filter(Boolean)
  for (const citystate of sources) {
    try {
      const listings = parseRawListings(await fetchHudHtml(citystate))
      const raw = listings.find(p => p.propertyCaseNumber === caseNumber)
      if (raw) return raw
    } catch (e) {
      console.warn(`[hud/gallery] listing search "${citystate}" failed:`, e.message)
    }
  }
  return null
}

// Main photo first, one entry per file, no placeholders
function cleanGallery(mainImage, urls) {
  const seen = new Set()
  return [mainImage, ...urls].filter(Boolean).filter(url => {
    const name = fileName(url).toLowerCase()
    if (!name || !isPhotoUrl(url) || isPlaceholder(name) || seen.has(name)) return false
    seen.add(name)
    return true
  }).slice(0, 80)
}

// Saves photo links for homes that have more than the main photo
async function savePhotoSets(supabase, properties) {
  let saved = 0
  const withPhotos = properties.filter(p => p.case_number && p.gallery_images?.length > 1)
  for (let i = 0; i < withPhotos.length; i += 10) {
    const results = await Promise.all(withPhotos.slice(i, i + 10).map(p =>
      supabase.from('properties').update({ images: p.gallery_images }).eq('case_number', p.case_number)
    ))
    results.forEach(r => (r.error ? console.warn('[hud] photo set not saved:', r.error.message) : saved++))
  }
  return saved
}

async function handleGalleryBackfill(req, res) {
  const stateCode = String(req.body?.state || '').trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(stateCode)) return res.status(400).json({ success: false, error: 'state required' })
  const supabase = getSupabase()
  const listings = parseHudPage(await fetchHudHtml(stateCode), stateCode)
  // Only homes already in the database; nothing else about them changes
  const caseNumbers = listings.map(p => p.case_number).filter(Boolean)
  const { data: existing } = caseNumbers.length
    ? await supabase.from('properties').select('case_number').in('case_number', caseNumbers)
    : { data: [] }
  const known = new Set((existing || []).map(p => p.case_number))
  const saved = await savePhotoSets(supabase, listings.filter(p => known.has(p.case_number)))
  const photos = listings.reduce((n, p) => n + (p.gallery_images?.length || 0), 0)
  return res.status(200).json({ success: true, state: stateCode, listings: listings.length, saved, photos })
}

async function hudGalleryFor(property) {
  const base = photoBase(property.main_image)
  const raw = await hudListingFor(property.case_number, property.state)
  const found = raw ? [...photosFromGalleryField(raw.galleryImages, base), ...(raw.propertyThumb ? [raw.propertyThumb] : [])] : []

  return cleanGallery(property.main_image, found)
}

async function handleGallery(req, res) {
  const caseNumber = String(req.query?.caseNumber || '').trim()
  if (!/^[0-9A-Za-z-]{5,20}$/.test(caseNumber)) return res.status(400).json({ success: false, error: 'caseNumber required' })
  const supabase = getSupabase()
  const { data: property, error } = await supabase
    .from('properties')
    .select('id, case_number, state, main_image, images')
    .eq('case_number', caseNumber)
    .maybeSingle()
  if (error) throw error
  if (!property) return res.status(404).json({ success: false, error: 'Property not found' })

  const cached = Array.isArray(property.images) ? property.images.filter(u => typeof u === 'string' && u.startsWith('http')) : []
  if (cached.length > 1 && req.query?.refresh !== '1') {
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).json({ success: true, caseNumber, images: cached, source: 'saved' })
  }

  const images = await hudGalleryFor(property)
  if (images.length > 1) {
    const { error: saveErr } = await supabase.from('properties').update({ images }).eq('id', property.id)
    if (saveErr) console.warn('[hud/gallery] could not save photos:', saveErr.message)
  }
  // Don't let a short answer (HUD busy or the home not found) stick in the CDN
  res.setHeader('Cache-Control', images.length > 1 ? 'public, s-maxage=3600, stale-while-revalidate=86400' : 'no-store')
  return res.status(200).json({ success: true, caseNumber, images, source: 'hud' })
}

async function handleGalleryImage(req, res) {
  const url = String(req.query?.url || '')
  if (!url.startsWith(PHOTO_HOST) || !/\.(jpe?g|png|webp)(\?|$)/i.test(url)) {
    return res.status(400).json({ success: false, error: 'Only HUD listing photos can be fetched' })
  }
  const r = await fetch(url, { headers: { 'User-Agent': HUD_UA }, signal: AbortSignal.timeout(20000) })
  if (!r.ok) return res.status(502).json({ success: false, error: `Photo host returned ${r.status}` })
  const type = r.headers.get('content-type') || 'image/jpeg'
  if (!type.startsWith('image/')) return res.status(502).json({ success: false, error: 'Not an image' })
  res.setHeader('Content-Type', type)
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400')
  return res.status(200).send(Buffer.from(await r.arrayBuffer()))
}

// ─── Accepted offers (hudhomestore.gov/bidresults) ────────────────────────────
// HUD publishes recently accepted bids per state as JSON behind its Bid Results page.
// Each acceptance is kept as its own row, so a home that goes under contract, falls
// through and sells again shows every round with its terms.
const HUD_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
  'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','PR','RI','SC','SD',
  'TN','TX','UT','VT','VA','VI','WA','WV','WI','WY','GU']
const HUD_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// The bid results endpoint needs the page's anti-forgery token and session cookies
async function openBidResultsSession() {
  const res = await fetch(`${HUD_BASE_URL}/bidresults`, { headers: { 'User-Agent': HUD_UA }, signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`HUD bid results page returned HTTP ${res.status}`)
  const html = await res.text()
  const token = html.match(/name="request-verification-token"\s+value="([^"]+)"/i)?.[1]
  if (!token) throw new Error('HUD bid results page changed: no verification token found')
  const cookies = (res.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ')
  return { token, cookies }
}

async function fetchBidResults(session, stateCode) {
  const res = await fetch(`${HUD_BASE_URL}/BidResults?handler=GetBidResults&citystate=${stateCode}`, {
    method: 'POST',
    headers: {
      'User-Agent': HUD_UA,
      'RequestVerificationToken': session.token,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': session.cookies,
    },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  if (!text.trim()) return []
  const rows = JSON.parse(text)
  return Array.isArray(rows) ? rows.filter(r => r && !r.Error && r.CaseNumber && r.AcceptedDate) : []
}

const money = v => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : null }
const hudTime = v => (v && !String(v).startsWith('0001') ? String(v).slice(0, 19) : null)

function mapAcceptedOffer(r) {
  return {
    case_number:     String(r.CaseNumber).trim(),
    address:         r.Address || null,
    city:            r.City || null,
    county:          r.County || null,
    state:           r.State || null,
    zip_code:        r.Zipcode || null,
    net_to_hud:      money(r.NetBidAmount),
    purchaser_type:  r.OwnerTypeDesc || r.OwnerType || null,
    broker_name:     r.BidderName || null,
    bid_received_at: hudTime(r.BidReceivedDate),
    bid_opened_on:   hudTime(r.BidOpenDate)?.slice(0, 10) || null,
    accepted_at:     hudTime(r.AcceptedDate),
    raw:             r,
  }
}

async function syncAcceptedOffers(supabase, states) {
  const session = await openBidResultsSession()
  const offers = []
  const errors = []
  // A few states at a time keeps it quick without hammering HUD
  for (let i = 0; i < states.length; i += 6) {
    const batch = states.slice(i, i + 6)
    const results = await Promise.allSettled(batch.map(st => fetchBidResults(session, st)))
    results.forEach((r, j) => {
      if (r.status === 'fulfilled') offers.push(...r.value.map(mapAcceptedOffer).filter(o => o.accepted_at))
      else errors.push({ state: batch[j], error: r.reason?.message || String(r.reason) })
    })
  }

  // Only insert acceptances we have not seen; existing rows keep their outcome and first-seen price
  const caseNumbers = [...new Set(offers.map(o => o.case_number))]
  const seen = new Set()
  const props = new Map()
  for (let i = 0; i < caseNumbers.length; i += 200) {
    const slice = caseNumbers.slice(i, i + 200)
    const [{ data: existing }, { data: propRows }] = await Promise.all([
      supabase.from('accepted_offers').select('case_number, accepted_at').in('case_number', slice),
      supabase.from('properties').select('id, case_number, price').in('case_number', slice),
    ])
    for (const e of existing || []) seen.add(`${e.case_number}|${String(e.accepted_at).slice(0, 19)}`)
    for (const p of propRows || []) props.set(p.case_number, p)
  }
  const fresh = offers
    .filter(o => !seen.has(`${o.case_number}|${o.accepted_at}`))
    .map(o => ({ ...o, property_id: props.get(o.case_number)?.id || null, list_price_at_acceptance: props.get(o.case_number)?.price ?? null }))

  let inserted = 0
  for (let i = 0; i < fresh.length; i += 200) {
    const { data, error } = await supabase.from('accepted_offers')
      .upsert(fresh.slice(i, i + 200), { onConflict: 'case_number,accepted_at', ignoreDuplicates: true })
      .select('id')
    if (error) errors.push({ insert: i, error: error.message })
    else inserted += data?.length || 0
  }
  return { states: states.length, fetched: offers.length, new_offers: inserted, errors }
}

async function handleAcceptedOffersSync(req, res, trigger) {
  const startedAt = Date.now()
  const supabase = getSupabase()
  const requested = [].concat(req.body?.states || req.query?.state || []).map(s => String(s).trim().toUpperCase())
  const states = requested.length ? requested.filter(s => HUD_STATES.includes(s)) : HUD_STATES
  const withListings = trigger === 'cron' || req.query?.listings === '1'

  // Accepted offers and listings run independently: one failing doesn't stop the other
  let stats = null, offersError = null
  try {
    stats = await syncAcceptedOffers(supabase, states)
    const { error: logErr } = await supabase.from('accepted_offer_runs').insert([{ trigger, ...stats }])
    if (logErr) console.warn('[hud/accepted-offers] run log failed:', logErr.message)
  } catch (e) {
    offersError = e.message
    console.error('[hud/accepted-offers] sync failed:', e)
    if (!withListings) throw e
  }

  // The daily cron also refreshes available listings (one cron slot does both)
  const listings = withListings ? await syncListings(supabase, startedAt + LISTING_TIME_BUDGET_MS) : undefined
  return res.status(offersError ? 207 : 200).json({
    success: !offersError,
    ...(stats || {}),
    ...(offersError ? { accepted_offers_error: offersError } : {}),
    ...(listings ? { listings } : {}),
  })
}

// ─── Daily listing import (runs inside the accepted-offers cron) ──────────────
// Stays inside the function's time limit: states run a few at a time, stalest first,
// and any left over go first the next day.
export const config = { maxDuration: 60 }
const LISTING_TIME_BUDGET_MS = 50000
const LISTING_CONCURRENCY = 6

async function syncListings(supabase, deadline) {
  const jobId = `cron-${new Date().toISOString().slice(0, 10)}`
  // Stalest states first, so a run that runs out of time picks up there tomorrow
  const { data: runs } = await supabase.from('hud_sync_runs').select('state, created_at').eq('dry_run', false).order('created_at', { ascending: false }).limit(1000)
  const lastRun = new Map()
  for (const r of runs || []) if (!lastRun.has(r.state)) lastRun.set(r.state, new Date(r.created_at).getTime())
  const queue = [...HUD_STATES].sort((a, b) => (lastRun.get(a) || 0) - (lastRun.get(b) || 0))

  const done = [], skipped = [], failed = []
  let next = 0
  const worker = async () => {
    while (next < queue.length) {
      if (Date.now() > deadline) return
      const state = queue[next++]
      try {
        const listings = parseHudPage(await fetchHudHtml(state), state)
        // A missing or partial HUD page must not mark a state's homes as gone
        const { count: active } = await supabase.from('properties').select('id', { count: 'exact', head: true }).eq('state', state).eq('is_active', true)
        if (listings.length === 0 || (active >= 10 && listings.length < active * 0.5)) {
          skipped.push({ state, listed: listings.length, active: active || 0 })
          continue
        }
        const stats = await importProperties(supabase, listings, state, false, jobId)
        done.push({ state, total: listings.length, new: stats.new_properties, marked: stats.marked_under_contract })
      } catch (e) {
        failed.push({ state, error: e.message })
      }
    }
  }
  await Promise.all(Array.from({ length: LISTING_CONCURRENCY }, worker))

  const leftOver = queue.slice(next)
  // Keep the admin "All States Daily Sync" schedule's last-run time current
  if (done.length) {
    const { error } = await supabase.from('hud_sync_schedules').update({ last_run_at: new Date().toISOString() }).eq('enabled', true)
    if (error) console.warn('[hud/listings] schedule update failed:', error.message)
  }
  if (skipped.length || failed.length || leftOver.length) {
    console.warn('[hud/listings]', JSON.stringify({ skipped, failed, leftOver }))
  }
  return { imported: done.length, skipped, failed, left_for_tomorrow: leftOver }
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
    const { label, title, states, cron_expression, dry_run, enabled } = req.body || {}
    const scheduleLabel = label || title  // accept either field name
    if (!scheduleLabel || !Array.isArray(states) || states.length === 0 || !cron_expression) {
      return res.status(400).json({ success: false, error: 'label, states, and cron_expression are required' })
    }
    const { data, error } = await supabase.from('hud_sync_schedules')
      .insert([{ label: scheduleLabel, states, cron_expression, dry_run: dry_run || false, enabled: enabled !== false }])
      .select().single()
    if (error) throw error
    return res.status(201).json({ success: true, schedule: data })
  }
  if (req.method === 'PATCH') {
    if (!scheduleId) return res.status(400).json({ success: false, error: 'id query param required' })
    // Only allow known columns to be patched
    const body = req.body || {}
    const updates = {}
    for (const k of ['label', 'states', 'cron_expression', 'dry_run', 'enabled']) {
      if (body[k] !== undefined) updates[k] = body[k]
    }
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
    // The daily cron may run the accepted-offer sync; everything else is admin-only
    const bearer = (req.headers?.authorization || '').replace(/^Bearer\s+/i, '')
    if (action === 'accepted-offers-sync' && process.env.CRON_SECRET && bearer === process.env.CRON_SECRET) {
      return await handleAcceptedOffersSync(req, res, 'cron')
    }
    // Photo gallery is public (HUD listing photos); every other action is admin-only
    if (action === 'gallery' && req.method === 'GET') return await handleGallery(req, res)
    if (action === 'gallery-image' && req.method === 'GET') return await handleGalleryImage(req, res)
    if (!(await requireAdmin(req, res))) return
    switch (action) {
      case 'accepted-offers-sync': return await handleAcceptedOffersSync(req, res, 'admin')
      case 'scrape':            return await handleScrape(req, res)
      case 'scrape-and-import': return await handleScrapeAndImport(req, res)
      case 'import':            return await handleImport(req, res)
      case 'history':           return await handleHistory(req, res)
      case 'queue-media':       return await handleQueueMedia(req, res)
      case 'schedules':         return await handleSchedules(req, res)
      case 'gallery-backfill':  return await handleGalleryBackfill(req, res)
      default:
        return res.status(400).json({ success: false, error: `Unknown action: "${action}". Valid: scrape, scrape-and-import, import, history, queue-media, schedules, accepted-offers-sync` })
    }
  } catch (err) {
    console.error(`[hud/${action}] Error:`, err)
    return res.status(500).json({ success: false, error: err.message })
  }
}
