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

// ─── Referral agreement form (NC Form 730) ──────────────────────────────────
// The blank form lives in a private bucket (admins only); the server fills it in.
export const AGREEMENT_FORM = { bucket: 'private-forms', path: 'referral-agreement-730.pdf' }
export const DEFAULT_FEE_PERCENT = 25

export async function agreementFormStatus() {
  const { data, error } = await supabase.storage.from(AGREEMENT_FORM.bucket).list('', { search: AGREEMENT_FORM.path })
  if (error) throw error
  return (data || []).find(f => f.name === AGREEMENT_FORM.path) || null
}

export async function uploadAgreementForm(file) {
  if (!file || file.type !== 'application/pdf') throw new Error('Choose the PDF of the referral agreement.')
  if (file.size > 5_000_000) throw new Error('The PDF must be under 5 MB.')
  const { error } = await supabase.storage.from(AGREEMENT_FORM.bucket)
    .upload(AGREEMENT_FORM.path, file, { upsert: true, contentType: 'application/pdf', cacheControl: '0' })
  if (error) throw error
}

/** Opens the filled agreement for a request (or a sample) in a new tab */
export async function previewAgreement(requestId) {
  const win = window.open('', '_blank')
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Sign in required')
    const r = await fetch('/api/broker-finder?action=agreement-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ requestId: requestId || null }),
    })
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Preview failed (${r.status})`)
    const url = URL.createObjectURL(await r.blob())
    if (win) win.location.href = url; else window.location.href = url
  } catch (e) {
    win?.close()
    throw e
  }
}
