/**
 * Offers a broker builds for a client (broker_offer_proposals).
 * Brokers go through /api/leads?action=offer-proposals, which checks they own the
 * lead. Buyers answer through ?action=offer-respond with the offer's share token,
 * so the link works whether or not they have an account.
 */

import { supabase } from '../config/supabase'

const SITE_URL = 'https://www.usahudhomes.com'

async function call(action, method, { query = '', body } = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch(`/api/leads?action=${action}${query}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.success) throw new Error(result.error || `Server error (${response.status})`)
  return result.data
}

// Broker
export const listProposals = (consultationId) =>
  call('offer-proposals', 'GET', { query: consultationId ? `&consultationId=${encodeURIComponent(consultationId)}` : '' })
/** status: 'draft' | 'sent'. Pass id to revise an existing offer. */
export const saveProposal = (consultationId, terms, status, id) =>
  call('offer-proposals', 'POST', { body: { ...terms, consultationId, status, id: id || undefined } })
/** status: 'sent' (share a draft) | 'submitted' (bid went to HUD) | 'withdrawn' */
export const setProposalStatus = (id, status) => call('offer-proposals', 'PATCH', { body: { id, status } })
export const deleteProposal = (id) => call('offer-proposals', 'DELETE', { query: `&id=${encodeURIComponent(id)}` })

// Buyer
export const getOfferByToken = (token) => call('offer-respond', 'GET', { query: `&token=${encodeURIComponent(token)}` })
/** action: 'favorite' | 'unfavorite' | 'accept' | 'changes' | 'decline' */
export const respondToOffer = (token, action, extra = {}) => call('offer-respond', 'POST', { body: { token, action, ...extra } })

export const offerLink = (token) => `${SITE_URL}/offer/${token}`

export const PROPOSAL_STATUS = {
  draft: { label: 'Draft', tone: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Waiting on buyer', tone: 'bg-sky-100 text-sky-800' },
  changes_requested: { label: 'Changes requested', tone: 'bg-amber-100 text-amber-800' },
  accepted: { label: 'Accepted · submit to HUD', tone: 'bg-emerald-100 text-emerald-800' },
  submitted: { label: 'Submitted to HUD', tone: 'bg-indigo-100 text-indigo-800' },
  declined: { label: 'Declined', tone: 'bg-rose-100 text-rose-800' },
  withdrawn: { label: 'Withdrawn', tone: 'bg-gray-200 text-gray-600' },
}

/** Email/text body for sending a client their offer link. */
export function offerMessage(offer, firstName, { sms = false } = {}) {
  const price = `$${Number(offer.offer_price).toLocaleString()}`
  const where = [offer.property?.city, offer.property?.state].filter(Boolean).join(', ') || `HUD case ${offer.case_number}`
  const url = offerLink(offer.share_token)
  if (sms) return `Hi ${firstName}, here's the ${price} offer I put together for the HUD home in ${where}. Review it, accept, or save it: ${url}`
  return `Hi ${firstName},\n\nI put together a ${price} offer for the HUD home in ${where} (case ${offer.case_number}). Open the link to see the terms, the estimated net to HUD and your payment estimate:\n\n${url}\n\nFrom there you can accept it so I can submit the bid, ask for changes, or save it to your favorites to think it over.`
}
