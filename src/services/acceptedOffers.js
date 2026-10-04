/**
 * Accepted offer history (accepted_offers / property_status_events).
 * Filled daily from HUD's published bid results; readable by signed-in users only.
 */

import { supabase } from '../config/supabase'

export const isUnderContract = (property) =>
  String(property?.status || '').toUpperCase() === 'UNDER CONTRACT'

/** Offers for many case numbers, newest first per case: Map<case_number, offer[]> */
export async function fetchOffersByCase(caseNumbers) {
  const ids = [...new Set((caseNumbers || []).filter(Boolean))]
  const byCase = new Map()
  if (!ids.length) return byCase
  const { data, error } = await supabase
    .from('accepted_offers')
    .select('case_number, net_to_hud, purchaser_type, accepted_at, list_price_at_acceptance, outcome')
    .in('case_number', ids)
    .order('accepted_at', { ascending: false })
  if (error) throw error
  for (const o of data || []) {
    if (!byCase.has(o.case_number)) byCase.set(o.case_number, [])
    byCase.get(o.case_number).push(o)
  }
  return byCase
}

/**
 * Price and activity history for one property. Activity (listing, price and status
 * changes) is public; accepted offers come back only for signed-in users.
 */
export async function fetchPropertyHistory(caseNumber, { withOffers = false } = {}) {
  const [activity, offers] = await Promise.all([
    supabase.from('property_activity')
      .select('id, event, list_price, previous_price, status, occurred_at')
      .eq('case_number', caseNumber).order('occurred_at', { ascending: false }),
    withOffers
      ? supabase.from('accepted_offers').select('*').eq('case_number', caseNumber).order('accepted_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])
  if (activity.error) throw activity.error
  return { activity: activity.data || [], offers: offers.error ? [] : offers.data || [] }
}

/** Newest-first timeline mixing activity events and accepted offers */
export function buildTimeline({ activity = [], offers = [] }) {
  const items = [
    ...activity.map(a => ({ kind: a.event, at: a.occurred_at, ...a })),
    ...offers.map(o => ({ kind: 'offer_accepted', at: o.accepted_at, offer: o, id: `offer-${o.id}` })),
  ]
  // An offer is accepted before HUD pulls the listing, so on ties show the offer below "under contract"
  const rank = { back_on_market: 0, under_contract: 1, offer_accepted: 2 }
  return items.sort((x, y) => (new Date(y.at) - new Date(x.at)) || ((rank[x.kind] ?? 3) - (rank[y.kind] ?? 3)))
}

/** Change from the first list price, e.g. { amount: -12000, percent: -8 } */
export function priceChange(property) {
  const orig = Number(property?.original_list_price)
  const now = Number(property?.price)
  if (!orig || !now || orig === now) return null
  return { amount: now - orig, percent: Math.round(((now - orig) / orig) * 100) }
}

export const formatMoney = (n) => (n == null ? '—' : `$${Math.round(Number(n)).toLocaleString()}`)

export const formatDate = (d) =>
  d ? new Date(String(d).length <= 10 ? `${d}T12:00:00` : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

/** Net to HUD as a share of the list price, e.g. "92% of list" */
export function percentOfList(offer, fallbackListPrice) {
  const list = Number(offer?.list_price_at_acceptance || fallbackListPrice)
  const net = Number(offer?.net_to_hud)
  if (!list || !net) return null
  return Math.round((net / list) * 100)
}

export const OUTCOME_LABELS = { pending: 'Under contract', fell_through: 'Fell through', closed: 'Closed' }
