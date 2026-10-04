/**
 * Buyer profile (columns on public.users).
 * One definition of every field the site's forms ask for: the profile page edits them,
 * forms pre-fill from them, and details a signed-in buyer types into a form are kept.
 */

import { supabase } from '../config/supabase'

export const US_STATES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  PR: 'Puerto Rico', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}
export const stateName = code => US_STATES[String(code || '').toUpperCase()] || ''
export const stateCode = (value) => {
  const v = String(value || '').trim()
  if (!v) return ''
  if (US_STATES[v.toUpperCase()]) return v.toUpperCase()
  return Object.keys(US_STATES).find(k => US_STATES[k].toLowerCase() === v.toLowerCase()) || ''
}

const opts = pairs => pairs.map(([value, label]) => ({ value, label }))

export const OPTIONS = {
  preferred_contact: opts([['call', 'Phone call'], ['text', 'Text message'], ['email', 'Email']]),
  buyer_type: opts([['first_time', 'First-time home buyer'], ['primary_residence', 'Current homeowner (primary residence)'],
    ['investor', 'Investor / rental properties'], ['fix_flip', 'Fix & flip']]),
  experience_level: opts([['new', 'Brand new to HUD homes'], ['some', 'Some experience'], ['seasoned', 'Seasoned investor']]),
  timeline: opts([['30_days', 'Within 30 days'], ['60_days', '30–60 days'], ['90_days', '60–90 days'],
    ['no_rush', 'No rush, just looking'], ['ongoing', 'Ongoing investor']]),
  financing_type: opts([['fha', 'FHA loan'], ['conventional', 'Conventional loan'], ['va', 'VA loan'],
    ['cash', 'Cash purchase'], ['not_sure', 'Not sure yet']]),
  pre_approved: opts([['true', 'Yes'], ['false', 'Not yet']]),
  down_payment: opts([['100_fha', '$100 down (FHA)'], ['3_5', '3–5%'], ['10', '10%'], ['15', '15%'], ['20', '20%+']]),
  credit_score_range: opts([['excellent', 'Excellent (750+)'], ['good', 'Good (700–749)'], ['fair', 'Fair (650–699)'],
    ['building', 'Building credit'], ['not_sure', 'Not sure']]),
  bedrooms: opts([['1', '1+'], ['2', '2+'], ['3', '3+'], ['4', '4+'], ['5', '5+']]),
  property_condition: opts([['move_in', 'Move-in ready'], ['minor', 'Needs minor work'], ['major', 'Needs major work'], ['any', 'Any condition']]),
  hear_about_us: opts([['google', 'Google search'], ['facebook', 'Facebook'], ['referral', 'Friend / referral'], ['radio', 'Radio'], ['other', 'Other']]),
  state: Object.entries(US_STATES).map(([value, label]) => ({ value, label })),
}

// Alert and contact forms word timelines differently from the profile
export const TIMELINE_FROM_PROFILE = { '30_days': 'immediate', '60_days': '1-3 months', '90_days': '1-3 months', no_rush: 'just browsing', ongoing: 'immediate' }
export const TIMELINE_TO_PROFILE = { immediate: '30_days', '1-3 months': '60_days', 'just browsing': 'no_rush' }

/** Profile page layout: every editable field, grouped */
export const PROFILE_SECTIONS = [
  { title: 'Contact information', fields: [
    { key: 'first_name', label: 'First name' },
    { key: 'last_name', label: 'Last name' },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'preferred_contact', label: 'Best way to reach you', type: 'select' },
    { key: 'address', label: 'Street address', wide: true },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State', type: 'select' },
    { key: 'zip_code', label: 'ZIP code' },
  ] },
  { title: 'Buying plans', fields: [
    { key: 'buyer_type', label: 'I am a…', type: 'select' },
    { key: 'experience_level', label: 'Experience with HUD homes', type: 'select' },
    { key: 'timeline', label: 'When do you want to buy?', type: 'select' },
    { key: 'hear_about_us', label: 'How did you hear about us?', type: 'select' },
  ] },
  { title: 'Financing', fields: [
    { key: 'financing_type', label: 'How will you pay?', type: 'select' },
    { key: 'pre_approved', label: 'Pre-approved by a lender?', type: 'select' },
    { key: 'down_payment', label: 'Down payment', type: 'select' },
    { key: 'credit_score_range', label: 'Credit score', type: 'select' },
  ] },
  { title: 'Home preferences', fields: [
    { key: 'price_range_min', label: 'Min price', type: 'number' },
    { key: 'price_range_max', label: 'Max price', type: 'number' },
    { key: 'bedrooms', label: 'Min bedrooms', type: 'select' },
    { key: 'property_condition', label: 'Condition', type: 'select' },
    { key: 'location_preferences', label: 'Areas you are interested in', type: 'textarea', wide: true },
  ] },
]

export const PROFILE_KEYS = PROFILE_SECTIONS.flatMap(s => s.fields.map(f => f.key))
const NUMBER_KEYS = new Set(['price_range_min', 'price_range_max', 'bedrooms'])

/** Profile row -> strings for form inputs */
export function profileToForm(profile) {
  const p = profile || {}
  const out = {}
  for (const k of PROFILE_KEYS) out[k] = p[k] == null ? '' : String(p[k])
  if (!out.first_name && p.name) {
    const [first, ...rest] = String(p.name).trim().split(/\s+/)
    out.first_name = first || ''
    out.last_name = out.last_name || rest.join(' ')
  }
  return out
}

/** Form strings -> column values (blank becomes null) */
export function formToProfile(values) {
  const out = {}
  for (const k of PROFILE_KEYS) {
    if (!(k in values)) continue
    const v = values[k] == null ? '' : String(values[k]).trim()
    if (!v) out[k] = null
    else if (k === 'pre_approved') out[k] = v === 'true'
    else if (NUMBER_KEYS.has(k)) out[k] = Number.isFinite(Number(v)) ? Number(v) : null
    else if (k === 'state') out[k] = stateCode(v) || null
    else out[k] = v
  }
  if ('first_name' in out || 'last_name' in out) {
    out.name = [out.first_name, out.last_name].filter(Boolean).join(' ') || null
  }
  return out
}

/** Save the whole profile (from the profile page) */
export async function saveProfile(userId, values) {
  const { data, error } = await supabase.from('users')
    .update({ ...formToProfile(values), updated_at: new Date().toISOString() })
    .eq('id', userId).select().single()
  if (error) throw error
  return data
}

/**
 * Remember what a signed-in buyer typed into a form: fills only profile fields that
 * are still empty, so it never overwrites what they set on their profile page.
 * Returns the updated profile, or null when nothing changed.
 */
export async function rememberProfileDetails(userId, profile, values) {
  if (!userId) return null
  const incoming = formToProfile(values)
  const updates = {}
  for (const [k, v] of Object.entries(incoming)) {
    if (k === 'name') continue
    if (v != null && (profile?.[k] == null || profile[k] === '')) updates[k] = v
  }
  if (!Object.keys(updates).length) return null
  if ((updates.first_name || updates.last_name) && !profile?.name) {
    updates.name = [updates.first_name || profile?.first_name, updates.last_name || profile?.last_name].filter(Boolean).join(' ')
  }
  const { data, error } = await supabase.from('users').update(updates).eq('id', userId).select().single()
  if (error) { console.warn('Could not save profile details:', error.message); return null }
  return data
}

/** Fill only the empty fields of a form from the profile */
export function fillBlanks(form, fromProfile) {
  const next = { ...form }
  let changed = false
  for (const [k, v] of Object.entries(fromProfile)) {
    if (k in next && (next[k] === '' || next[k] == null) && v !== '' && v != null) {
      next[k] = v
      changed = true
    }
  }
  return changed ? next : form
}
