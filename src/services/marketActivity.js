/**
 * Market activity for dashboards: the news feed (new listings, price drops,
 * back on market, accepted offers), bid openings for the calendar, and the
 * under-contract statistics on the admin Control Panel.
 *
 * property_activity and properties are public; accepted_offers is signed-in only,
 * so offer items quietly drop out for anonymous viewers.
 */

import { supabase } from '../config/supabase'

const PAGE = 1000 // PostgREST's default row cap

/** Every row of a query, paging past the 1,000-row cap. build() returns a fresh query. */
async function fetchAllRows(build) {
  let rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1)
    if (error) throw error
    rows = rows.concat(data || [])
    if (!data || data.length < PAGE) return rows
  }
}

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString()

/** HUD's "bids open" is MM/DD/YYYY; returns a local Date or null */
export function parseBidsOpen(value) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value || '').trim())
  return m ? new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])) : null
}

/** yyyy-mm-dd in local time, for grouping by calendar day */
export const dayKey = (d) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

export const money = (n) => (n == null ? '—' : `$${Math.round(Number(n)).toLocaleString()}`)

export const FEED_TYPES = {
  new_listing:    { label: 'New listing' },
  price_drop:     { label: 'Price reduced' },
  back_on_market: { label: 'Back on market' },
  offer_accepted: { label: 'Offer accepted' },
}

const place = (p, fallback = {}) =>
  [p?.address || fallback.address, p?.city || fallback.city].filter(Boolean).join(', ')

/**
 * Newest-first feed items.
 * @param {Object} opts
 * @param {string[]} [opts.states]      limit to these 2-letter states
 * @param {string[]} [opts.caseNumbers] limit to these properties (e.g. saved homes)
 * @param {number}   [opts.days=7]      look-back window
 * @param {number}   [opts.limit=60]    max items
 */
export async function fetchActivityFeed({ states, caseNumbers, days = 7, limit = 60 } = {}) {
  const since = daysAgo(days)
  const scope = (q, stateCol = 'state') => {
    if (states?.length) q = q.in(stateCol, states)
    if (caseNumbers) q = q.in('case_number', caseNumbers.length ? caseNumbers : ['__none__'])
    return q
  }

  const [activity, offers] = await Promise.all([
    scope(supabase.from('property_activity')
      .select('id, case_number, state, event, list_price, previous_price, occurred_at, properties(address, city, main_image)')
      .in('event', ['listed', 'price_change', 'back_on_market'])
      .gte('occurred_at', since))
      .order('occurred_at', { ascending: false })
      .limit(limit),
    scope(supabase.from('accepted_offers')
      .select('id, case_number, state, address, city, net_to_hud, list_price_used, purchaser_type, accepted_at')
      .gte('accepted_at', since))
      .order('accepted_at', { ascending: false })
      .limit(limit),
  ])
  if (activity.error) throw activity.error

  const items = []
  for (const a of activity.data || []) {
    const where = place(a.properties)
    if (a.event === 'listed') {
      items.push({ id: a.id, type: 'new_listing', date: a.occurred_at, caseNumber: a.case_number, state: a.state,
        title: where || `Case ${a.case_number}`, detail: `Listed at ${money(a.list_price)}`, image: a.properties?.main_image })
    } else if (a.event === 'price_change') {
      const drop = a.previous_price && a.list_price < a.previous_price
      if (!drop) continue
      const pct = Math.round((1 - a.list_price / a.previous_price) * 100)
      items.push({ id: a.id, type: 'price_drop', date: a.occurred_at, caseNumber: a.case_number, state: a.state,
        title: where || `Case ${a.case_number}`, detail: `${money(a.previous_price)} → ${money(a.list_price)} (−${pct}%)`, image: a.properties?.main_image })
    } else {
      items.push({ id: a.id, type: 'back_on_market', date: a.occurred_at, caseNumber: a.case_number, state: a.state,
        title: where || `Case ${a.case_number}`, detail: `Available again at ${money(a.list_price)}`, image: a.properties?.main_image })
    }
  }
  for (const o of offers.error ? [] : offers.data || []) {
    const pct = o.list_price_used ? Math.round((o.net_to_hud / o.list_price_used) * 100) : null
    items.push({ id: `offer-${o.id}`, type: 'offer_accepted', date: o.accepted_at, caseNumber: o.case_number, state: o.state,
      title: place(null, o) || `Case ${o.case_number}`,
      detail: `${o.purchaser_type || 'Buyer'} offer accepted · ${money(o.net_to_hud)} net to HUD${pct ? ` (${pct}% of list)` : ''}` })
  }
  return items.sort((x, y) => new Date(y.date) - new Date(x.date)).slice(0, limit)
}

/** Counts per feed type over the look-back window, for the feed's summary strip */
export async function fetchActivityCounts({ states, days = 7 } = {}) {
  const since = daysAgo(days)
  const count = (table, dateCol, extra) => {
    let q = supabase.from(table).select('id', { count: 'exact', head: true }).gte(dateCol, since)
    if (states?.length) q = q.in('state', states)
    return extra(q)
  }
  const [listed, drops, back, offers] = await Promise.all([
    count('property_activity', 'occurred_at', q => q.eq('event', 'listed')),
    count('property_activity', 'occurred_at', q => q.eq('event', 'price_change')),
    count('property_activity', 'occurred_at', q => q.eq('event', 'back_on_market')),
    count('accepted_offers', 'accepted_at', q => q),
  ])
  return {
    new_listing: listed.count ?? 0,
    price_drop: drops.count ?? 0,
    back_on_market: back.count ?? 0,
    offer_accepted: offers.error ? null : offers.count ?? 0,
  }
}

/**
 * Upcoming bid openings. Exclusive and Lottery listings open bids on a set
 * date; Extended listings take bids every business day, so they aren't listed.
 * @returns {Promise<Array>} [{ date: Date, case_number, address, city, state, price, listing_period, ... }]
 */
export async function fetchBidOpenings({ states, caseNumbers, from = new Date() } = {}) {
  const rows = await fetchAllRows(() => {
    let q = supabase.from('properties')
      .select('id, case_number, address, city, state, price, beds, baths, main_image, listing_period, bids_open, status')
      .neq('status', 'UNDER CONTRACT')
      .eq('is_active', true)
      .in('listing_period', ['Exclusive', 'Lottery'])
    if (states?.length) q = q.in('state', states)
    if (caseNumbers) q = q.in('case_number', caseNumbers.length ? caseNumbers : ['__none__'])
    return q.order('case_number')
  })
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  return rows
    .map(r => ({ ...r, date: parseBidsOpen(r.bids_open) }))
    .filter(r => r.date && r.date >= today)
    .sort((a, b) => a.date - b.date)
}

/** Raw rows for the Control Panel's under-contract charts and meters */
export async function fetchUnderContractData({ weeks = 12 } = {}) {
  const [offers, properties] = await Promise.all([
    fetchAllRows(() => supabase.from('accepted_offers')
      .select('accepted_at, state, net_to_hud, list_price_used, days_on_market, price_reduced, purchaser_type, outcome')
      .gte('accepted_at', daysAgo(weeks * 7))
      .order('accepted_at')),
    fetchAllRows(() => supabase.from('properties')
      .select('status, state, under_contract_at')
      .order('id')),
  ])
  return { offers, properties }
}
