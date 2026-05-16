/**
 * Vercel Serverless Function: HUD Scrape
 * POST /api/hud-scrape
 * Body: { state: "NC" }
 *
 * Fetches hudhomestore.gov for the given state and returns all property data
 * extracted from the embedded JSON in the page HTML.
 * No Selenium or external server needed — pure HTTP fetch.
 */

const HUD_BASE_URL = 'https://www.hudhomestore.gov'
const CLOUDINARY_BASE = 'https://res.cloudinary.com/yardi/image/upload/q_auto,f_auto,c_limit/d_hhs:themes:common:images:NoImage.jpg/hhs/'

/**
 * Parse the available_prop JSON embedded in the HUD homestore HTML page.
 */
function parseHudPage(html, stateCode) {
  // The page embeds all properties as an HTML-encoded JSON value in a hidden input:
  // <input id="available_prop" value="[{&quot;propertyCaseNumber&quot;:...}]" />
  const match = html.match(/id=["']available_prop["'][^>]*value=["']([^"']*)/i)
  if (!match) {
    throw new Error(`No available_prop data found for ${stateCode}. The HUD site may be down or its layout has changed.`)
  }

  // Decode HTML entities
  const raw = match[1]
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

  let rawProps
  try {
    rawProps = JSON.parse(raw)
  } catch (e) {
    throw new Error(`Failed to parse property JSON for ${stateCode}: ${e.message}`)
  }

  if (!Array.isArray(rawProps) || rawProps.length === 0) {
    return []
  }

  return rawProps.map(p => {
    const status = (p.propertyStatus || '').toLowerCase()
    const isNew     = status.includes('new') || status.includes('initial')
    const isReduced = status.includes('reduced')

    // Build main image URL from propertyThumb or first gallery image
    let mainImage = p.propertyThumb || null
    if (!mainImage && p.galleryImages) {
      // galleryImages is a string like: "\"img1.jpg\",\"img2.jpg\""
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
      list_price:       p.listPrice          ? parseFloat(p.listPrice) : null,
      beds:             p.bedrooms           ? parseInt(p.bedrooms)    : null,
      baths:            p.bathrooms          ? parseFloat(p.bathrooms) : null,
      square_footage:   p.squareFootage      ? parseInt(p.squareFootage) : null,
      year_built:       p.yearBuilt          ? parseInt(p.yearBuilt)  : null,
      property_type:    p.propertyType       || null,
      fha_financing:    p.fhaFinancing       || null,
      listing_period:   p.listingPeriod      || null,
      property_status:  p.propertyStatus     || null,
      list_date:        p.listDate           || null,
      bid_open_date:    p.bidOpenDate        || null,
      period_deadline:  p.periodDeadlineDate || null,
      bidder_types:     p.bidderTypes        || null,
      eligible_bidders: p.eligibleBidders    || null,
      special_100_down: p.SpecialProgram100Down === 'Yes',
      parking_type:     p.parkingType        || null,
      stories:          p.numberOfStories    ? parseFloat(p.numberOfStories) : null,
      in_amenities:     p.inAmenities        || null,
      out_amenities:    p.outAmenities       || null,
      latitude:         p.latitude           ? parseFloat(p.latitude)  : null,
      longitude:        p.longitude          ? parseFloat(p.longitude) : null,
      main_image:       mainImage,
      gallery_images:   p.galleryImages      || null,
      is_new_listing:   isNew,
      is_price_reduced: isReduced,
      hud_url:          `${HUD_BASE_URL}/propertydetail?caseNumber=${encodeURIComponent(p.propertyCaseNumber)}`,
    }
  })
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { state } = req.body || {}
  const stateCode = (state || '').trim().toUpperCase()

  if (!stateCode || stateCode.length !== 2) {
    return res.status(400).json({ success: false, error: 'Invalid state code (must be 2 letters)' })
  }

  try {
    const url = `${HUD_BASE_URL}/searchresult?citystate=${stateCode}`
    console.log(`[hud-scrape] Fetching ${url}`)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      // Vercel functions have a 10s default timeout; we set a longer signal
      signal: AbortSignal.timeout(25000),
    })

    if (!response.ok) {
      throw new Error(`HUD site returned HTTP ${response.status}`)
    }

    const html = await response.text()
    const properties = parseHudPage(html, stateCode)

    const newCount     = properties.filter(p => p.is_new_listing).length
    const reducedCount = properties.filter(p => p.is_price_reduced).length

    console.log(`[hud-scrape] ${stateCode}: ${properties.length} properties (${newCount} new, ${reducedCount} reduced)`)

    return res.status(200).json({
      success:    true,
      state:      stateCode,
      properties,
      stats: {
        total:         properties.length,
        new_listings:  newCount,
        price_reduced: reducedCount,
      },
    })

  } catch (err) {
    console.error(`[hud-scrape] Error for ${stateCode}:`, err)
    return res.status(500).json({
      success: false,
      state:   stateCode,
      error:   err.message || 'Unknown error',
    })
  }
}
