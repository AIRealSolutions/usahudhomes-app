import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SITE_URL = 'https://www.usahudhomes.com'

const STATES = {
  al: ['AL', 'Alabama'], ak: ['AK', 'Alaska'], az: ['AZ', 'Arizona'],
  ar: ['AR', 'Arkansas'], ca: ['CA', 'California'], co: ['CO', 'Colorado'],
  ct: ['CT', 'Connecticut'], de: ['DE', 'Delaware'], fl: ['FL', 'Florida'],
  ga: ['GA', 'Georgia'], hi: ['HI', 'Hawaii'], id: ['ID', 'Idaho'],
  il: ['IL', 'Illinois'], in: ['IN', 'Indiana'], ia: ['IA', 'Iowa'],
  ks: ['KS', 'Kansas'], ky: ['KY', 'Kentucky'], la: ['LA', 'Louisiana'],
  me: ['ME', 'Maine'], md: ['MD', 'Maryland'], ma: ['MA', 'Massachusetts'],
  mi: ['MI', 'Michigan'], mn: ['MN', 'Minnesota'], ms: ['MS', 'Mississippi'],
  mo: ['MO', 'Missouri'], mt: ['MT', 'Montana'], ne: ['NE', 'Nebraska'],
  nv: ['NV', 'Nevada'], nh: ['NH', 'New Hampshire'], nj: ['NJ', 'New Jersey'],
  nm: ['NM', 'New Mexico'], ny: ['NY', 'New York'], nc: ['NC', 'North Carolina'],
  nd: ['ND', 'North Dakota'], oh: ['OH', 'Ohio'], ok: ['OK', 'Oklahoma'],
  or: ['OR', 'Oregon'], pa: ['PA', 'Pennsylvania'], ri: ['RI', 'Rhode Island'],
  sc: ['SC', 'South Carolina'], sd: ['SD', 'South Dakota'], tn: ['TN', 'Tennessee'],
  tx: ['TX', 'Texas'], ut: ['UT', 'Utah'], vt: ['VT', 'Vermont'],
  va: ['VA', 'Virginia'], wa: ['WA', 'Washington'], wv: ['WV', 'West Virginia'],
  wi: ['WI', 'Wisconsin'], wy: ['WY', 'Wyoming']
}

const STATE_SLUGS = Object.fromEntries(
  Object.values(STATES).map(([code, name]) => [slugify(name), [code, name]])
)

const CRAWLERS = [
  'Googlebot', 'bingbot', 'DuckDuckBot', 'Applebot', 'Baiduspider', 'YandexBot',
  'facebookexternalhit', 'Facebot', 'Twitterbot', 'LinkedInBot', 'WhatsApp',
  'Slackbot', 'TelegramBot', 'Discordbot'
]

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function isCrawler(userAgent = '') {
  return CRAWLERS.some(crawler => userAgent.includes(crawler))
}

function loadIndex() {
  return fs.readFileSync(path.join(__dirname, '..', 'dist', 'index.html'), 'utf-8')
}

function stripGenericMetadata(html) {
  return html
    .replace(/<title>[^<]*<\/title>/gi, '')
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<meta\s+name="robots"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+(?:property|name)="twitter:[^"]*"[^>]*>/gi, '')
}

async function resolveCity(supabase, stateCode, citySlug) {
  if (!citySlug) return { cityName: '', cities: [] }

  const { data, error } = await supabase
    .from('properties')
    .select('city')
    .eq('state', stateCode)
    .eq('is_active', true)
    .neq('status', 'UNDER CONTRACT')
    .not('city', 'is', null)
    .limit(1000)

  if (error) throw error
  const cities = [...new Set((data || []).map(row => row.city).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
  return {
    cityName: cities.find(city => slugify(city) === citySlug) || '',
    cities
  }
}

export default async function handler(req, res) {
  const { stateSlug, citySlug } = req.query
  const stateInfo = STATE_SLUGS[stateSlug]
  if (!stateInfo) return res.status(404).send('State not found')

  if (!isCrawler(req.headers['user-agent'] || '')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(200).send(loadIndex())
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY
      || process.env.SUPABASE_ANON_KEY
      || process.env.VITE_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase configuration missing')

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })
    const [stateCode, stateName] = stateInfo
    const cityResolution = await resolveCity(supabase, stateCode, citySlug)
    if (citySlug && !cityResolution.cityName) {
      return res.status(404).send('City not found')
    }

    let query = supabase
      .from('properties')
      .select('case_number, address, city, state, zip_code, price, beds, baths, sq_ft, main_image, updated_at')
      .eq('state', stateCode)
      .eq('is_active', true)
      .neq('status', 'UNDER CONTRACT')
      .order('updated_at', { ascending: false })
      .limit(60)

    if (cityResolution.cityName) query = query.eq('city', cityResolution.cityName)
    const { data: properties, error } = await query
    if (error) throw error

    let cities = cityResolution.cities
    if (!citySlug) {
      const cityResult = await resolveCity(supabase, stateCode, '__all__')
      cities = cityResult.cities
    }

    const location = cityResolution.cityName || stateName
    const canonicalPath = citySlug
      ? `/hud-homes/${stateSlug}/${citySlug}`
      : `/hud-homes/${stateSlug}`
    const canonicalUrl = `${SITE_URL}${canonicalPath}`
    const title = `HUD Homes for Sale in ${location} | USAHUDhomes.com`
    const description = `Search ${properties?.length || 0} active HUD homes for sale in ${location}. Review prices and property details, and request help from a HUD-registered real estate broker.`

    const itemList = (properties || []).map((property, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_URL}/property/${property.case_number}`,
      name: `${property.address}, ${property.city}, ${property.state}`
    }))

    const structuredData = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: canonicalUrl,
      description,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: itemList.length,
        itemListElement: itemList
      }
    }).replace(/</g, '\\u003c')

    const metadata = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
    <link rel="canonical" href="${canonicalUrl}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:site_name" content="USAHUDhomes.com">
    <script type="application/ld+json">${structuredData}</script>`

    const propertyCards = (properties || []).map(property => `
      <article>
        <h2><a href="/property/${encodeURIComponent(property.case_number)}">${escapeHtml(property.address)}</a></h2>
        <p>${escapeHtml(property.city)}, ${escapeHtml(property.state)} ${escapeHtml(property.zip_code || '')}</p>
        <p>${property.price ? '$' + Number(property.price).toLocaleString() : 'Price available'} · ${escapeHtml(property.beds ?? 'N/A')} beds · ${escapeHtml(property.baths ?? 'N/A')} baths${property.sq_ft ? ' · ' + Number(property.sq_ft).toLocaleString() + ' sq. ft.' : ''}</p>
      </article>`).join('')

    const cityLinks = !citySlug ? cities.map(city => `
      <li><a href="/hud-homes/${stateSlug}/${slugify(city)}">HUD homes in ${escapeHtml(city)}, ${escapeHtml(stateName)}</a></li>`).join('') : ''

    const staticContent = `
      <main>
        <nav><a href="/">Home</a> / ${citySlug ? `<a href="/hud-homes/${stateSlug}">${escapeHtml(stateName)}</a> / ${escapeHtml(location)}` : escapeHtml(stateName)}</nav>
        <h1>HUD Homes for Sale in ${escapeHtml(location)}</h1>
        <p>Browse current HUD-owned properties and get help understanding financing, inspections, bidding deadlines, and closing.</p>
        <p>${properties?.length || 0} active HUD ${properties?.length === 1 ? 'home' : 'homes'} found.</p>
        <section>${propertyCards || '<p>No active listings found today. Inventory changes regularly.</p>'}</section>
        ${cityLinks ? `<section><h2>Explore HUD homes by city in ${escapeHtml(stateName)}</h2><ul>${cityLinks}</ul></section>` : ''}
        <section>
          <h2>How buying a HUD home works</h2>
          <p>HUD homes are generally sold as-is through an electronic bidding process. A HUD-registered real estate broker submits the bid for the buyer. Owner-occupants may receive priority during designated listing periods.</p>
          <h2>Prepare before bidding</h2>
          <p>Arrange financing or proof of funds, review the property financing designation, understand earnest-money requirements, and plan for inspections and utility activation after an accepted bid.</p>
        </section>
        <p>USAHUDhomes.com is an independent real estate resource and is not a government agency or affiliated with HUD.</p>
      </main>`

    let html = stripGenericMetadata(loadIndex())
    html = html.replace('<head>', `<head>\n${metadata}`)
    html = html.replace('<div id="root"></div>', `<div id="root">${staticContent}</div>`)

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=900, stale-while-revalidate=86400')
    return res.status(200).send(html)
  } catch (error) {
    console.error('[geo-meta] Failed:', error)
    return res.status(500).send('Unable to load HUD homes')
  }
}
