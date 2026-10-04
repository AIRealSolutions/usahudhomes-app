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

/** Full contract history for one property */
export async function fetchPropertyHistory(caseNumber) {
  const [offers, events] = await Promise.all([
    supabase.from('accepted_offers').select('*').eq('case_number', caseNumber).order('accepted_at', { ascending: false }),
    supabase.from('property_status_events').select('event, list_price, occurred_at').eq('case_number', caseNumber).order('occurred_at', { ascending: false }),
  ])
  if (offers.error) throw offers.error
  return { offers: offers.data || [], events: events.error ? [] : events.data || [] }
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
