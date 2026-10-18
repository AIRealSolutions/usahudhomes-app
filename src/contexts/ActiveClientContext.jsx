/**
 * "Working for a client" mode for brokers. Opening a lead's Manage Lead page makes
 * that lead the active client; while it's active, saving a home (heart) adds it to the
 * client's picks and sharing offers "Email/Text to <client>". Kept in localStorage so
 * it follows the broker across tabs, and it lapses after a few hours.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { listPicks, addPicks, removePick } from '../services/propertyPicks'

const STORAGE_KEY = 'activeClient'
const MAX_AGE_MS = 8 * 60 * 60 * 1000

const ActiveClientContext = createContext(null)

function readStored() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (stored?.lead?.id && Date.now() - stored.setAt < MAX_AGE_MS) return stored.lead
  } catch {
    // storage blocked or corrupt; start without a client
  }
  return null
}

function writeStored(lead) {
  try {
    if (lead) localStorage.setItem(STORAGE_KEY, JSON.stringify({ lead, setAt: Date.now() }))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage blocked; the mode still works for this page
  }
}

// Only what saving and sharing need, so nothing sensitive sits in storage
const slim = (lead) => lead && ({
  id: lead.id,
  customer_id: lead.customer_id || null,
  first_name: lead.first_name || '',
  last_name: lead.last_name || '',
  email: lead.email || lead.customer_email || '',
  phone: lead.phone || lead.customer_phone || '',
})

export function ActiveClientProvider({ children }) {
  const { canAccessBroker } = useAuth()
  const [lead, setLead] = useState(readStored)
  const [picks, setPicks] = useState(() => new Map()) // case_number -> pick id

  // Other tabs starting or ending client mode
  useEffect(() => {
    const onStorage = (e) => { if (e.key === STORAGE_KEY) setLead(readStored()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const active = canAccessBroker && lead ? lead : null

  const refreshPicks = useCallback(async () => {
    if (!active) return setPicks(new Map())
    try {
      const list = await listPicks(active.id)
      setPicks(new Map(list.map(p => [p.case_number, p.id])))
    } catch (e) {
      console.error('Could not load the client\'s picks:', e)
    }
  }, [active?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refreshPicks() }, [refreshPicks])

  const start = useCallback((next) => {
    const s = slim(next)
    writeStored(s)
    setLead(s)
  }, [])

  const stop = useCallback(() => {
    writeStored(null)
    setLead(null)
  }, [])

  /** Adds the home to the client's picks, or removes it if already there. Resolves the new state. */
  const togglePick = useCallback(async (property) => {
    if (!active || !property?.case_number) return false
    const existing = picks.get(property.case_number)
    if (existing) {
      await removePick(existing)
      setPicks(prev => { const next = new Map(prev); next.delete(property.case_number); return next })
      return false
    }
    await addPicks([active.id], [property])
    await refreshPicks()
    return true
  }, [active, picks, refreshPicks])

  /** Makes sure the home is in the client's picks (used when sharing it with them). */
  const ensurePick = useCallback(async (property) => {
    if (!active || !property?.case_number) return null
    if (!picks.has(property.case_number)) {
      await addPicks([active.id], [property])
    }
    const list = await listPicks(active.id)
    setPicks(new Map(list.map(p => [p.case_number, p.id])))
    return list.find(p => p.case_number === property.case_number)?.id || null
  }, [active, picks])

  const value = useMemo(() => ({
    client: active,
    clientName: active ? (`${active.first_name} ${active.last_name}`.trim() || active.email || 'this client') : '',
    clientFirstName: active ? (active.first_name || active.email || 'client') : '',
    isPicked: (caseNumber) => picks.has(caseNumber),
    start, stop, togglePick, ensurePick, refreshPicks,
  }), [active, picks, start, stop, togglePick, ensurePick, refreshPicks])

  return <ActiveClientContext.Provider value={value}>{children}</ActiveClientContext.Provider>
}

export function useActiveClient() {
  return useContext(ActiveClientContext) || {
    client: null, clientName: '', clientFirstName: '', isPicked: () => false,
    start: () => {}, stop: () => {}, togglePick: async () => false, ensurePick: async () => null, refreshPicks: async () => {},
  }
}
