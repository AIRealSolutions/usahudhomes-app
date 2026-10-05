import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { US_STATES, stateSlug as slugify } from '../src/utils/states.js'
import {
  buildDirectorySeo,
  buildGeoSeo,
  fetchStateCounts,
  fetchStateListings,
  findStateBySlug,
  jsonLdString
} from '../src/utils/geoSeo.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CRAWLERS = [
  'Googlebot', 'bingbot', 'DuckDuckBot', 'Applebot', 'Baiduspider', 'YandexBot',
  'facebookexternalhit', 'Facebot', 'Twitterbot', 'LinkedInBot', 'WhatsApp',
  'Slackbot', 'TelegramBot', 'Discordbot', 'Pinterest', 'redditbot', 'Embedly',
  'SkypeUriPreview', 'iMessage'
]

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function isCrawler(userAgent = '') {
  const ua = userAgent.toLowerCase()
  return CRAWLERS.some(crawler => ua.includes(crawler.toLowerCase()))
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

function headTags({ title, description, canonicalUrl, image, jsonLd, extra = '' }) {
  return `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
    <link rel="canonical" href="${canonicalUrl}">${extra}
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="USAHUDhomes.com">
    <meta property="og:locale" content="en_US">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(image)}">
    <script type="application/ld+json">${jsonLdString(jsonLd)}</script>`
}

function sendPage(res, head, body, maxAge) {
  let html = stripGenericMetadata(loadIndex())
  html = html.replace('<head>', `<head>\n${head}`)
  html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=86400`)
  return res.status(200).send(html)
}

function stateLinks(counts = {}, excludeCode) {
  return US_STATES
    .filter(state => state.code !== excludeCode)
    .map(state => `
      <li><a href="/hud-homes/${slugify(state.name)}">HUD homes for sale in ${escapeHtml(state.name)}</a>${counts[state.code] ? ` (${counts[state.code]})` : ''}</li>`)
    .join('')
}

function faqHtml(faqs) {
  return faqs.map(faq => `
          <h3>${escapeHtml(faq.question)}</h3>
          <p>${escapeHtml(faq.answer)}</p>`).join('')
}

function createSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase configuration missing')
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
}

async function renderDirectory(res, supabase) {
  const counts = await fetchStateCounts(supabase)
  const seo = buildDirectorySeo({ counts })

  const body = `
      <main>
        <nav><a href="/">Home</a> / HUD Homes by State</nav>
        <h1>HUD Homes for Sale by State</h1>
        <p>${escapeHtml(seo.description)}</p>
        <ul>${stateLinks(counts)}</ul>
        <p>USAHUDhomes.com is an independent real estate resource and is not a government agency or affiliated with HUD.</p>
      </main>`

  return sendPage(res, headTags(seo), body, 3600)
}

async function renderGeoPage(res, supabase, state, citySlug) {
  const stateListings = await fetchStateListings(supabase, state.code)
  const seo = buildGeoSeo({ state, stateListings, citySlug })
  if (!seo.found) return res.status(404).send('City not found')

  const cityName = seo.city?.name || ''
  const extra = `
    <meta name="geo.region" content="US-${state.code}">
    <meta name="geo.placename" content="${escapeHtml(cityName || state.name)}">`

  const propertyCards = seo.listings.map(property => `
        <article>
          <h3><a href="/property/${encodeURIComponent(property.case_number)}">${escapeHtml(property.address)}</a></h3>
          <p>${escapeHtml(property.city)}, ${escapeHtml(property.state)} ${escapeHtml(property.zip_code || '')}</p>
          <p>${property.price ? '$' + Number(property.price).toLocaleString('en-US') : 'Price available'} · ${escapeHtml(property.beds ?? 'N/A')} beds · ${escapeHtml(property.baths ?? 'N/A')} baths${property.sq_ft ? ' · ' + Number(property.sq_ft).toLocaleString('en-US') + ' sq. ft.' : ''}</p>
        </article>`).join('')

  const cityLinks = !citySlug ? seo.cities.map(c => `
          <li><a href="/hud-homes/${seo.stateSlug}/${c.slug}">HUD homes for sale in ${escapeHtml(c.name)}, ${escapeHtml(state.code)}</a> (${c.count})</li>`).join('') : ''

  const crumbs = seo.breadcrumbs
    .map((crumb, index) => index === seo.breadcrumbs.length - 1
      ? escapeHtml(crumb.name)
      : `<a href="${crumb.url.replace('https://www.usahudhomes.com', '') || '/'}">${escapeHtml(crumb.name)}</a>`)
    .join(' / ')

  const body = `
      <main>
        <nav>${crumbs}</nav>
        <h1>${escapeHtml(seo.h1)}</h1>
        <p>${escapeHtml(seo.intro)}</p>
        <h2>${seo.count} active HUD ${seo.count === 1 ? 'home' : 'homes'} in ${escapeHtml(cityName ? `${cityName}, ${state.name}` : state.name)}</h2>
        <section>${propertyCards || '<p>No active listings found today. <a href="/alerts">Get free HUD home alerts</a>.</p>'}</section>
        ${cityLinks ? `<section><h2>Explore HUD homes by city in ${escapeHtml(state.name)}</h2><ul>${cityLinks}</ul></section>` : ''}
        ${!citySlug ? `<section><h2>HUD homes in other states</h2><ul>${stateLinks({}, state.code)}</ul></section>` : ''}
        <section>
          <h2>How buying a HUD home works</h2>
          <p>HUD homes are generally sold as-is through an electronic bidding process. A HUD-registered real estate broker submits the bid for the buyer. Owner-occupants may receive priority during designated listing periods.</p>
          <h2>Prepare before bidding</h2>
          <p>Arrange financing or proof of funds, review the property financing designation, understand earnest-money requirements, and plan for inspections and utility activation after an accepted bid.</p>
        </section>
        <section>
          <h2>Questions about HUD homes in ${escapeHtml(cityName ? `${cityName}, ${state.name}` : state.name)}</h2>${faqHtml(seo.faqs)}
        </section>
        <p>USAHUDhomes.com is an independent real estate resource and is not a government agency or affiliated with HUD.</p>
      </main>`

  return sendPage(res, headTags({ ...seo, extra }), body, 900)
}

export default async function handler(req, res) {
  const { stateSlug, citySlug } = req.query

  if (!isCrawler(req.headers['user-agent'] || '')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(200).send(loadIndex())
  }

  const state = stateSlug ? findStateBySlug(stateSlug) : null
  if (stateSlug && !state) return res.status(404).send('State not found')

  try {
    const supabase = createSupabase()
    return state
      ? await renderGeoPage(res, supabase, state, citySlug)
      : await renderDirectory(res, supabase)
  } catch (error) {
    console.error('[geo-meta] Failed:', error)
    return res.status(500).send('Unable to load HUD homes')
  }
}
