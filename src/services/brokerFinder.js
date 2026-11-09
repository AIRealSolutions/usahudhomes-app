/**
 * Broker Finder — client for /api/broker-finder and the economic region tables.
 */
import { supabase } from '../config/supabase'

async function call(action, body, { auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Sign in required')
    headers.Authorization = `Bearer ${session.access_token}`
  }
  const r = await fetch(`/api/broker-finder?action=${action}`, { method: 'POST', headers, body: JSON.stringify(body || {}) })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`)
  return data
}

export const suggestBrokers = (propertyId, opts = {}) => call('suggest', { propertyId, ...opts })
export const sendReferralRequests = payload => call('send', payload)
export const resendReferralRequest = requestId => call('resend', { requestId })
export const scanStateBrokers = state => call('scan', { state })
export const geocodeBrokers = limit => call('geocode', { limit })
export const lookupReferral = token => call('lookup', { token }, { auth: false })
export const respondToReferral = payload => call('respond', payload, { auth: false })

/** Regions for one state (or all), ordered for display */
export async function getEconomicRegions(state) {
  let q = supabase.from('economic_regions').select('*').order('state').order('sort_order').order('name')
  if (state) q = q.eq('state', state)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export const regionKey = (state, slug) => `${state}:${slug}`

export const BROKER_STATUS = {
  new: { label: 'New', color: '#6b7280' },
  contacted: { label: 'Contacted', color: '#2563eb' },
  interested: { label: 'Interested', color: '#d97706' },
  registered: { label: 'Registered partner', color: '#15803d' },
  declined: { label: 'Declined', color: '#9ca3af' },
  do_not_contact: { label: 'Do not contact', color: '#dc2626' },
}

export const REQUEST_STATUS = {
  pending: 'Not sent', sent: 'Sent', opened: 'Opened', accepted: 'Accepted', declined: 'Declined', failed: 'Failed',
}
