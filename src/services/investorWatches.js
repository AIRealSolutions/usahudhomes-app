/**
 * Investor watch list (public.investor_watches): clients waiting for a property
 * to open to investor bids. Brokers/admins add them; RLS also lets the client
 * (matched by email) read their own, so both calendars show them.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { parseBidsOpen } from './marketActivity'

const PROPERTY_FIELDS = 'id, case_number, address, city, state, price, listing_period, bidder_types, bids_open, status, is_active'

export const watchClientName = (c) =>
  (c?.customer_name || [c?.customer?.first_name || c?.first_name, c?.customer?.last_name || c?.last_name].filter(Boolean).join(' ')).trim()
  || c?.customer?.email || c?.email || c?.customer_email || 'Client'

/**
 * Where a watched home stands:
 *  open     — investors can bid now
 *  waiting  — still owner-occupant only; `expected` is HUD's bid-opening date,
 *             after which it goes to investors if no owner-occupant bid is accepted
 *  contract — went under contract (or is no longer listed)
 */
export function watchStatus(property) {
  if (!property || !property.is_active || String(property.status || '').toUpperCase() === 'UNDER CONTRACT') return { kind: 'contract' }
  if (/investor/i.test(property.bidder_types || '')) return { kind: 'open' }
  return { kind: 'waiting', expected: parseBidsOpen(property.bids_open) }
}

export async function listWatches() {
  const { data, error } = await supabase
    .from('investor_watches')
    .select('id, case_number, property_id, consultation_id, client_name, client_email, agent_id, note, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  const rows = data || []
  const cases = [...new Set(rows.map(r => r.case_number))]
  if (!cases.length) return []
  const { data: props, error: pErr } = await supabase.from('properties').select(PROPERTY_FIELDS).in('case_number', cases)
  if (pErr) throw pErr
  const byCase = new Map((props || []).map(p => [p.case_number, p]))
  return rows.map(r => {
    const property = byCase.get(r.case_number) || null
    return { ...r, property, status: watchStatus(property) }
  })
}

export async function addWatch({ client, caseNumber, note }) {
  const cn = caseNumber.trim()
  const { data: property, error: pErr } = await supabase.from('properties').select(PROPERTY_FIELDS).eq('case_number', cn).maybeSingle()
  if (pErr) throw pErr
  if (!property) throw new Error(`No property with case number ${cn} was found.`)
  const { data, error } = await supabase.from('investor_watches').insert({
    case_number: cn,
    property_id: property.id,
    consultation_id: client.id,
    client_name: watchClientName(client),
    client_email: (client.customer?.email || client.email || client.customer_email || '').trim() || null,
    agent_id: client.agent_id || null,
    note: note?.trim() || null,
  }).select('id, case_number, property_id, consultation_id, client_name, client_email, agent_id, note, created_at').single()
  if (error) {
    if (error.code === '23505') throw new Error('That client is already watching this property.')
    throw error
  }
  return { ...data, property, status: watchStatus(property) }
}

export async function removeWatch(id) {
  const { error } = await supabase.from('investor_watches').delete().eq('id', id)
  if (error) throw error
}

/** Watch list state plus add/remove, shared by the panel and the calendar on a page */
export function useInvestorWatches() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await listWatches())
    } catch (e) {
      console.error('Investor watches load:', e)
      setError('The investor watch list could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  return {
    items,
    loading,
    error,
    reload,
    add: async (fields) => {
      setError(null)
      try {
        const row = await addWatch(fields)
        setItems(list => [row, ...list])
        return true
      } catch (e) {
        console.error('Investor watch add:', e)
        setError(e.message || 'The watch could not be saved.')
        return false
      }
    },
    remove: async (id) => {
      const before = items
      setItems(list => list.filter(w => w.id !== id))
      try {
        await removeWatch(id)
      } catch (e) {
        console.error('Investor watch remove:', e)
        setItems(before)
        setError('That watch could not be removed. Please try again.')
      }
    },
  }
}

const where = (w) => [w.property?.address, w.property?.city].filter(Boolean).join(', ') || `Case ${w.case_number}`

/**
 * Watches as calendar tasks (BidCalendar extraEvents). Open homes show today;
 * waiting homes show on their bid-opening date. forClient drops the client's name.
 */
export function watchesAsEvents(items, { forClient = false } = {}) {
  const today = new Date()
  const out = []
  for (const w of items) {
    const who = forClient ? '' : `${w.client_name} · `
    if (w.status.kind === 'open') {
      out.push({ date: today, label: `Open to investors: ${who}${where(w)}`, detail: 'Investors can bid now', href: `/property/${w.case_number}` })
    } else if (w.status.kind === 'waiting' && w.status.expected) {
      // Past its opening and still owner-occupant only: keep it on today so it isn't forgotten
      const passed = w.status.expected < new Date(today.getFullYear(), today.getMonth(), today.getDate())
      out.push({ date: passed ? today : w.status.expected, label: `Investor watch: ${who}${where(w)}`,
        detail: passed ? 'Bids have opened; waiting for HUD to open it to investors'
          : 'Bids open today; investors can bid if no owner-occupant offer is accepted',
        href: `/property/${w.case_number}` })
    }
  }
  return out
}
