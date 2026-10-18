/**
 * Homes a broker picked for clients in Find Properties (client_property_picks).
 * All calls go through /api/leads?action=property-picks, which checks the broker
 * owns each lead and mirrors picks into the buyer's saved homes.
 */

import { supabase } from '../config/supabase'

const SITE_URL = 'https://www.usahudhomes.com'

async function call(method, { query = '', body } = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch(`/api/leads?action=property-picks${query}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.success) throw new Error(result.error || `Server error (${response.status})`)
  return result.data
}

export const listPicks = (consultationId) => call('GET', { query: `&consultationId=${encodeURIComponent(consultationId)}` })

/** properties: [{ id, case_number, price }]; resolves one result per lead */
export const addPicks = (consultationIds, properties, note) => call('POST', {
  body: {
    consultationIds,
    properties: properties.map(p => ({ id: p.id, case_number: p.case_number, price: p.price ?? null })),
    note: note || null,
  },
})

export const markPicks = (ids, status) => call('PATCH', { body: { ids, status } })

export const removePick = (id) => call('DELETE', { query: `&id=${encodeURIComponent(id)}` })

const money = (v) => (v || v === 0 ? `$${Number(v).toLocaleString()}` : '')

/**
 * Message text for a list of picks. Street addresses stay behind the login, so each
 * home is described by city, price and size with a link to its page.
 */
export function picksMessage(picks, { sms = false } = {}) {
  const lines = picks.map((pick, i) => {
    const p = pick.property || {}
    const where = [p.city, p.state].filter(Boolean).join(', ') || `Case #${pick.case_number}`
    const size = [p.beds && `${p.beds} bd`, p.baths && `${p.baths} ba`].filter(Boolean).join('/')
    const url = `${SITE_URL}/property/${encodeURIComponent(pick.case_number)}`
    return sms
      ? `${where} ${money(p.price)} ${url}`.replace(/\s+/g, ' ').trim()
      : `${i + 1}. ${where}: ${[money(p.price), size].filter(Boolean).join(', ')}\n   ${url}`
  })
  if (sms) return `Homes I picked for you:\n${lines.join('\n')}`
  return `Here are some HUD homes I picked out for you:\n\n${lines.join('\n\n')}\n\nSign in (or create a free account) on each page to see the full address and your estimated payment.`
}
