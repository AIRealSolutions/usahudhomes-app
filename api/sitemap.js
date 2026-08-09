import { createClient } from '@supabase/supabase-js'

const SITE_URL = 'https://www.usahudhomes.com'
const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
}

const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/search', priority: '0.9', changefreq: 'daily' },
  { path: '/how-it-works', priority: '0.8', changefreq: 'monthly' },
  { path: '/deals', priority: '0.7', changefreq: 'weekly' },
  { path: '/contact', priority: '0.5', changefreq: 'yearly' },
  { path: '/broker/register', priority: '0.5', changefreq: 'monthly' }
]

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date()
  return Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10)
}

async function fetchActiveProperties(supabase) {
  const pageSize = 1000
  const properties = []

  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from('properties')
      .select('case_number, city, state, updated_at')
      .eq('is_active', true)
      .neq('status', 'UNDER CONTRACT')
      .not('case_number', 'is', null)
      .order('case_number', { ascending: true })
      .range(start, start + pageSize - 1)

    if (error) throw error
    properties.push(...(data || []))
    if (!data || data.length < pageSize) break
  }

  return properties
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).send('Method Not Allowed')
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY
      || process.env.SUPABASE_ANON_KEY
      || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })
    const properties = await fetchActiveProperties(supabase)
    const today = formatDate()

    const staticUrls = STATIC_ROUTES.map(({ path, priority, changefreq }) => `
  <url>
    <loc>${escapeXml(`${SITE_URL}${path}`)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('')

    const propertyUrls = properties.map(property => `
  <url>
    <loc>${escapeXml(`${SITE_URL}/property/${encodeURIComponent(property.case_number)}`)}</loc>
    <lastmod>${formatDate(property.updated_at)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`).join('')

    const geoPages = new Map()
    for (const property of properties) {
      const stateName = STATE_NAMES[property.state]
      if (!stateName) continue

      const statePath = `/hud-homes/${slugify(stateName)}`
      const updated = formatDate(property.updated_at)
      if (!geoPages.has(statePath) || updated > geoPages.get(statePath)) {
        geoPages.set(statePath, updated)
      }

      if (property.city) {
        const cityPath = `${statePath}/${slugify(property.city)}`
        if (!geoPages.has(cityPath) || updated > geoPages.get(cityPath)) {
          geoPages.set(cityPath, updated)
        }
      }
    }

    const geoUrls = [...geoPages.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, lastmod]) => `
  <url>
    <loc>${escapeXml(`${SITE_URL}${path}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${path.split('/').length === 3 ? '0.9' : '0.7'}</priority>
  </url>`).join('')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${geoUrls}${propertyUrls}
</urlset>
`

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).send(req.method === 'HEAD' ? '' : xml)
  } catch (error) {
    console.error('[sitemap] Failed to generate sitemap:', error)
    return res.status(500).send('Unable to generate sitemap')
  }
}
