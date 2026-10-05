// Shared SEO content for the /hud-homes state and city landing pages.
// Used by the React page (src/pages/HudHomesLanding.jsx) and by the crawler
// renderer (api/geo-meta.js) so both produce the same titles, copy and schema.

import { US_STATES, stateSlug } from './states.js'

export const SITE_URL = 'https://www.usahudhomes.com'
export const SITE_NAME = 'USAHUDhomes.com'
export const DEFAULT_IMAGE = `${SITE_URL}/main-marketing-optimized.png`
export const ORGANIZATION_ID = `${SITE_URL}/#organization`
export const HOME_STATE = 'NC'
export const PHONE = '910-363-6147'

const LISTING_FIELDS = 'id, case_number, address, city, state, zip_code, price, beds, baths, sq_ft, main_image, status, updated_at'

export function findStateBySlug(slug) {
  return US_STATES.find(state => stateSlug(state.name) === slug)
}

function activeListings(supabase, fields) {
  return supabase
    .from('properties')
    .select(fields)
    .eq('is_active', true)
    .neq('status', 'UNDER CONTRACT')
}

// Every active listing in a state, newest first
export async function fetchStateListings(supabase, stateCode) {
  const pageSize = 1000
  const rows = []
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await activeListings(supabase, LISTING_FIELDS)
      .eq('state', stateCode)
      .order('updated_at', { ascending: false })
      .range(start, start + pageSize - 1)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < pageSize) break
  }
  return rows
}

// { NC: 142, SC: 37, ... } for every state with active listings
export async function fetchStateCounts(supabase) {
  const pageSize = 1000
  const counts = {}
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await activeListings(supabase, 'state')
      .range(start, start + pageSize - 1)
    if (error) throw error
    for (const row of data || []) {
      if (row.state) counts[row.state] = (counts[row.state] || 0) + 1
    }
    if (!data || data.length < pageSize) break
  }
  return counts
}

// Cities in a state with their listing counts, alphabetical
export function cityCounts(listings) {
  const counts = new Map()
  for (const { city } of listings) {
    if (city) counts.set(city, (counts.get(city) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, slug: stateSlug(name), count }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

const money = value => `$${Math.round(value).toLocaleString('en-US')}`

function priceStats(listings) {
  const prices = listings.map(p => Number(p.price)).filter(p => p > 0).sort((a, b) => a - b)
  if (!prices.length) return null
  const mid = Math.floor(prices.length / 2)
  const median = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2
  return { min: prices[0], max: prices[prices.length - 1], median }
}

function listPhrase(items) {
  if (items.length <= 1) return items.join('')
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

const homes = n => `${n.toLocaleString('en-US')} HUD ${n === 1 ? 'home' : 'homes'}`

function easternDate(options, now) {
  return now.toLocaleDateString('en-US', { timeZone: 'America/New_York', ...options })
}

/**
 * Build everything a geo landing page needs for search engines.
 *
 * @param {object} args
 * @param {{code: string, name: string}} args.state
 * @param {Array} args.stateListings every active listing in the state
 * @param {string} [args.citySlug] when set, the page is for that city
 * @param {Date} [args.now]
 */
export function buildGeoSeo({ state, stateListings, citySlug = '', now = new Date() }) {
  const slug = stateSlug(state.name)
  const cities = cityCounts(stateListings)
  const city = citySlug ? cities.find(c => c.slug === citySlug) : null
  const listings = city ? stateListings.filter(p => p.city === city.name) : stateListings
  const count = listings.length
  const stats = priceStats(listings)
  const topCities = [...cities].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 3)
  const leadingCities = topCities.filter(c => c.count > 1)
  const isHomeState = state.code === HOME_STATE

  const place = city ? `${city.name}, ${state.code}` : state.name
  const placeLong = city ? `${city.name}, ${state.name}` : state.name
  const monthYear = easternDate({ month: 'short', year: 'numeric' }, now)
  const today = easternDate({ month: 'long', day: 'numeric', year: 'numeric' }, now)
  const priceRange = stats && stats.min !== stats.max
    ? ` from ${money(stats.min)} to ${money(stats.max)}`
    : stats ? ` at ${money(stats.min)}` : ''

  const canonicalPath = city ? `/hud-homes/${slug}/${city.slug}` : `/hud-homes/${slug}`
  const canonicalUrl = `${SITE_URL}${canonicalPath}`

  const title = count
    ? `${count.toLocaleString('en-US')} HUD Homes for Sale in ${place} – ${monthYear} | USAHUDhomes`
    : `HUD Homes for Sale in ${place} – ${monthYear} | USAHUDhomes`

  let description
  if (!count) {
    description = `See new HUD homes for sale in ${placeLong} as soon as they're listed. Set up free alerts and get help bidding from a HUD-registered broker.`
  } else if (city) {
    description = `${homes(count)} for sale in ${placeLong}${priceRange}. Photos and prices updated daily, with bidding help from a HUD-registered broker.`
  } else {
    const cityText = topCities.length ? `, including ${listPhrase(topCities.slice(0, 2).map(c => c.name))}` : ''
    description = `${homes(count)} for sale in ${state.name}${priceRange}${cityText}. Updated daily, with bidding help from a HUD-registered broker.`
  }

  const h1 = `HUD Homes for Sale in ${placeLong}`

  let intro
  if (!count) {
    intro = `As of ${today}, there are no HUD homes listed for sale in ${placeLong}. HUD adds foreclosed homes every week, so new listings can appear at any time. Sign up for free alerts to hear about them first.`
  } else {
    const where = city
      ? `in ${placeLong}`
      : `in ${state.name} across ${cities.length} ${cities.length === 1 ? 'city' : 'cities'}${leadingCities.length > 1 ? `, led by ${listPhrase(leadingCities.map(c => `${c.name} (${c.count})`))}` : ''}`
    const prices = stats
      ? ` List prices range${priceRange}, with a median of ${money(stats.median)}.`
      : ''
    intro = `As of ${today}, there ${count === 1 ? 'is' : 'are'} ${homes(count)} for sale ${where}.${prices} HUD homes are foreclosed properties owned by the U.S. Department of Housing and Urban Development and sold through online bidding, and buyers who plan to live in the home usually get the first chance to bid.`
  }

  const brokerAnswer = isHomeState
    ? `HUD only accepts bids submitted online by a HUD-registered real estate broker. Lightkeeper Realty helps buyers across North Carolina prepare and submit HUD bids. Call ${PHONE} or request help online.`
    : `HUD only accepts bids submitted online by a HUD-registered real estate broker. USAHUDhomes.com connects you with a HUD-registered broker who works in ${state.name}. Call ${PHONE} or request help online.`

  const faqs = [
    {
      question: `How many HUD homes are for sale in ${placeLong}?`,
      answer: count
        ? `As of ${today}, there ${count === 1 ? 'is' : 'are'} ${homes(count)} for sale in ${placeLong}.${!city && leadingCities.length ? ` The most listings are in ${listPhrase(leadingCities.map(c => c.name))}.` : ''} Inventory changes daily as HUD adds homes and accepts bids.`
        : `There are no HUD homes listed in ${placeLong} as of ${today}. New HUD homes are listed regularly, so check back or sign up for alerts.`
    },
    stats && {
      question: `How much do HUD homes cost in ${placeLong}?`,
      answer: `HUD homes in ${placeLong} are currently listed${priceRange}, with a median list price of ${money(stats.median)}. HUD may accept bids below the list price, depending on how long the home has been on the market.`
    },
    {
      question: `Who can buy a HUD home in ${state.name}?`,
      answer: 'Anyone who can pay cash or qualify for a mortgage can bid. Owner-occupants, who will live in the home, get priority during the exclusive listing period. If the home does not sell during that period, investors can also bid.'
    },
    {
      question: `How do I bid on a HUD home in ${placeLong}?`,
      answer: brokerAnswer
    },
    {
      question: 'Can I use FHA financing on a HUD home?',
      answer: 'Many HUD homes qualify for FHA financing. Each listing shows its financing type: IN (insurable), IE (insurable with a repair escrow) or UI (uninsurable, usually cash or renovation loans). Eligible owner-occupants may also qualify for the $100-down program.'
    }
  ].filter(Boolean)

  const breadcrumbs = [
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'HUD Homes by State', url: `${SITE_URL}/hud-homes` },
    { name: state.name, url: `${SITE_URL}/hud-homes/${slug}` },
    ...(city ? [{ name: city.name, url: canonicalUrl }] : [])
  ]

  const image = listings.find(p => p.main_image?.startsWith('http'))?.main_image || DEFAULT_IMAGE
  const shownListings = listings.slice(0, 60)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: title,
        description,
        inLanguage: 'en-US',
        dateModified: now.toISOString(),
        isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: { '@id': ORGANIZATION_ID },
        breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
        primaryImageOfPage: { '@type': 'ImageObject', url: image },
        about: city
          ? { '@type': 'City', name: city.name, containedInPlace: { '@type': 'State', name: state.name } }
          : { '@type': 'State', name: state.name, containedInPlace: { '@type': 'Country', name: 'United States' } },
        mainEntity: {
          '@type': 'ItemList',
          name: `HUD homes for sale in ${placeLong}`,
          numberOfItems: count,
          itemListElement: shownListings.map((p, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${SITE_URL}/property/${encodeURIComponent(p.case_number)}`,
            name: `${p.beds ? `${p.beds}-bedroom ` : ''}HUD home in ${p.city}, ${p.state}${p.price ? ` – ${money(p.price)}` : ''}`
          }))
        }
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: crumb.url
        }))
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: faqs.map(faq => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer }
        }))
      }
    ]
  }

  return {
    found: !citySlug || Boolean(city),
    stateSlug: slug,
    city,
    cities,
    listings: shownListings,
    count,
    title,
    description,
    h1,
    intro,
    faqs,
    breadcrumbs,
    image,
    canonicalPath,
    canonicalUrl,
    jsonLd
  }
}

export function buildDirectorySeo({ counts = {}, now = new Date() }) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)
  const monthYear = easternDate({ month: 'short', year: 'numeric' }, now)
  const canonicalUrl = `${SITE_URL}/hud-homes`
  const title = total
    ? `${total.toLocaleString('en-US')} HUD Homes for Sale by State – ${monthYear} | USAHUDhomes`
    : `HUD Homes for Sale by State – ${monthYear} | USAHUDhomes`
  const leaders = US_STATES
    .filter(s => counts[s.code])
    .sort((a, b) => counts[b.code] - counts[a.code])
    .slice(0, 3)
    .map(s => s.name)
  const description = total
    ? `Browse ${homes(total)} for sale in all 50 states and DC${leaders.length ? `, with the most in ${listPhrase(leaders)}` : ''}. Updated daily, with help from HUD-registered brokers.`
    : 'Browse HUD homes for sale in all 50 states and Washington, DC. Updated daily, with help from HUD-registered brokers.'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: title,
        description,
        inLanguage: 'en-US',
        dateModified: now.toISOString(),
        isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: { '@id': ORGANIZATION_ID },
        mainEntity: {
          '@type': 'ItemList',
          name: 'HUD homes for sale by state',
          numberOfItems: US_STATES.length,
          itemListElement: US_STATES.map((s, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${SITE_URL}/hud-homes/${stateSlug(s.name)}`,
            name: `HUD homes for sale in ${s.name}`
          }))
        }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'HUD Homes by State', item: canonicalUrl }
        ]
      }
    ]
  }

  return { total, title, description, canonicalUrl, image: DEFAULT_IMAGE, jsonLd }
}

// JSON for a <script type="application/ld+json"> tag, safe to inline in HTML
export function jsonLdString(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
