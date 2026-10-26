/**
 * Client invitations: admins and brokers email buyers a link to join USAHUDhomes.com.
 * Sending and accepting go through /api/notifications (service key); staff read their
 * own invitation history straight from client_invitations under RLS.
 */

import { supabase } from '../config/supabase'
import { US_STATES } from './buyerProfile'

const CHUNK_SIZE = 20 // matches INVITE_MAX_PER_REQUEST in api/notifications.js
const EMAIL_RE = /[^\s@,;<>"()]+@[^\s@,;<>"()]+\.[^\s@,;<>"()]+/

async function call(action, body, { auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  }
  const response = await fetch(`/api/notifications?action=${action}`, { method: 'POST', headers, body: JSON.stringify(body) })
  const result = await response.json().catch(() => ({}))
  if (!response.ok && !result.error) result.error = `Request failed (${response.status})`
  return result
}

/**
 * Sends invitations in chunks so a long list fits the server's time limit.
 * onProgress({ done, total, results }) runs after each chunk.
 */
export async function sendInvites(invites, { note, onProgress } = {}) {
  const batchId = crypto.randomUUID()
  const results = []
  for (let i = 0; i < invites.length; i += CHUNK_SIZE) {
    const chunk = invites.slice(i, i + CHUNK_SIZE)
    const r = await call('client-invite', { invites: chunk, note, batchId }, { auth: true })
    if (!r.success) {
      chunk.forEach(row => results.push({ email: row.email, status: 'failed', error: r.error }))
    } else {
      results.push(...r.results)
    }
    onProgress?.({ done: Math.min(i + CHUNK_SIZE, invites.length), total: invites.length, results: [...results] })
  }
  return results
}

export async function resendInvites(ids) {
  const r = await call('client-invite', { resendIds: ids }, { auth: true })
  return r.success ? r.results : ids.map(id => ({ id, status: 'failed', error: r.error }))
}

export async function listInvites({ limit = 500 } = {}) {
  const { data, error } = await supabase
    .from('client_invitations')
    .select('id,email,first_name,last_name,phone,state,status,invited_by_role,agent_id,send_count,last_error,sent_at,opened_at,registered_at,created_at,agent:agents(first_name,last_name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  return error ? { success: false, error: error.message, data: [] } : { success: true, data: data || [] }
}

export const lookupInvite = (token) => call('invite-lookup', { token })
export const acceptInvite = (fields) => call('invite-accept', fields)

export const RESULT_LABELS = {
  sent: 'Sent',
  resent: 'Sent again',
  invalid: 'Not a valid email',
  duplicate: 'Duplicate in this list',
  already_member: 'Already a member',
  unsubscribed: 'Asked not to be invited',
  recently_invited: 'Already invited in the last day',
  not_found: 'Not found',
  daily_limit: 'Daily email limit reached, resend tomorrow',
  failed: 'Failed',
}

// ── List parsing ────────────────────────────────────────────────────────────

function splitCsvLine(line) {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') quoted = false
      else cur += c
    } else if (c === '"') quoted = true
    else if (c === ',' || c === '\t' || c === ';') { out.push(cur.trim()); cur = '' }
    else cur += c
  }
  out.push(cur.trim())
  return out
}

const HEADER_KEYS = {
  email: /^e-?mail/i,
  firstName: /^first/i,
  lastName: /^last|^surname/i,
  name: /^(full )?name$/i,
  phone: /phone|mobile|cell/i,
  state: /^state$|^st$/i,
}

const splitName = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') }
}

const asState = (v) => {
  const s = String(v || '').trim().toUpperCase()
  if (US_STATES[s]) return s
  const byName = Object.entries(US_STATES).find(([, name]) => name.toUpperCase() === s)
  return byName ? byName[0] : ''
}

/**
 * Turns pasted text or a CSV export into invite rows.
 * Accepts a CSV with a header row (email, first name, last name / name, phone, state),
 * or one person per line in any order: "Jane Doe, jane@x.com, 910-555-1234, NC" or "Jane Doe <jane@x.com>".
 * Lines without an email address are skipped.
 */
export function parseInviteList(text) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (!lines.length) return []

  const header = splitCsvLine(lines[0])
  const hasHeader = header.some(h => HEADER_KEYS.email.test(h)) && !EMAIL_RE.test(lines[0])
  if (hasHeader) {
    const col = Object.fromEntries(Object.entries(HEADER_KEYS).map(([k, re]) => [k, header.findIndex(h => re.test(h))]))
    return lines.slice(1).map(line => {
      const cells = splitCsvLine(line)
      const get = (k) => (col[k] >= 0 ? cells[col[k]] || '' : '')
      const fromFull = splitName(get('name'))
      return {
        email: (get('email').match(EMAIL_RE)?.[0] || '').toLowerCase(),
        firstName: get('firstName') || fromFull.firstName,
        lastName: get('lastName') || fromFull.lastName,
        phone: get('phone'),
        state: asState(get('state')),
      }
    }).filter(r => r.email)
  }

  return lines.map(line => {
    const email = line.match(EMAIL_RE)?.[0]
    if (!email) return null
    let rest = line.replace(email, ' ').replace(/[<>"()]/g, ' ')
    const phone = rest.match(/\+?1?[\s.-]*\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/)?.[0] || ''
    if (phone) rest = rest.replace(phone, ' ')
    let state = ''
    const words = rest.split(/[\s,;\t]+/).filter(Boolean)
    const nameWords = words.filter(w => {
      if (!state && /^[A-Z]{2}$/.test(w) && US_STATES[w]) { state = w; return false }
      return true
    })
    return { email: email.toLowerCase(), ...splitName(nameWords.join(' ')), phone: phone.trim(), state }
  }).filter(Boolean)
}
