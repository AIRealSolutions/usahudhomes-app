/**
 * Accepted Offers — every bid HUD has accepted (from hudhomestore.gov/bidresults),
 * one row per acceptance, so homes that went under contract more than once show each round.
 * A daily cron fills it; "Run now" pulls the latest for every state.
 */

import React, { useEffect, useState } from 'react'
import { RefreshCw, Gavel, Download } from 'lucide-react'
import { supabase } from '../../config/supabase'
import { formatMoney, formatDate, percentOfList, OUTCOME_LABELS } from '../../services/acceptedOffers'

const PAGE = 100

export default function AcceptedOffersAdmin() {
  const [offers, setOffers] = useState([])
  const [repeatCases, setRepeatCases] = useState(new Set())
  const [runs, setRuns] = useState([])
  const [state, setState] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      let q = supabase.from('accepted_offers')
        .select('id, case_number, address, city, state, net_to_hud, list_price_at_acceptance, purchaser_type, broker_name, accepted_at, outcome')
        .order('accepted_at', { ascending: false })
        .limit(PAGE)
      if (state) q = q.eq('state', state)
      const term = search.trim()
      if (term) q = q.or(`case_number.ilike.%${term}%,address.ilike.%${term}%,city.ilike.%${term}%,broker_name.ilike.%${term}%`)
      const [{ data, error: err }, { data: runRows }] = await Promise.all([
        q,
        supabase.from('accepted_offer_runs').select('*').order('ran_at', { ascending: false }).limit(5),
      ])
      if (err) throw err
      setOffers(data || [])
      setRuns(runRows || [])

      // Flag homes with more than one accepted offer on record
      const cases = [...new Set((data || []).map(o => o.case_number))]
      if (cases.length) {
        const { data: all } = await supabase.from('accepted_offers').select('case_number').in('case_number', cases)
        const counts = {}
        for (const r of all || []) counts[r.case_number] = (counts[r.case_number] || 0) + 1
        setRepeatCases(new Set(Object.keys(counts).filter(c => counts[c] > 1)))
      } else setRepeatCases(new Set())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  const runNow = async () => {
    setRunning(true)
    setMessage(null)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/hud?action=accepted-offers-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify(state ? { states: [state] } : {}),
      })
      const json = await res.json().catch(() => ({ success: false, error: `Server error (HTTP ${res.status})` }))
      if (!json.success) throw new Error(json.error || 'Sync failed')
      setMessage(`Checked ${json.states} states: ${json.fetched} accepted offers published, ${json.new_offers} new.` +
        (json.errors?.length ? ` ${json.errors.length} states had errors.` : ''))
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  const exportCsv = () => {
    const cols = ['case_number', 'address', 'city', 'state', 'accepted_at', 'net_to_hud', 'list_price_at_acceptance', 'purchaser_type', 'broker_name', 'outcome']
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = [cols.join(','), ...offers.map(o => cols.map(c => esc(o[c])).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `accepted-offers${state ? `-${state}` : ''}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const states = [...new Set(['NC', ...offers.map(o => o.state).filter(Boolean)])].sort()
  const lastRun = runs[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Gavel className="h-6 w-6 text-amber-600" /> Accepted Offers</h2>
          <p className="text-sm text-gray-600 mt-1">
            Every bid HUD accepts, with the net to HUD, buyer type and winning broker. Updated daily at 11 AM Eastern.
            {lastRun && <> Last run {new Date(lastRun.ran_at).toLocaleString()}: {lastRun.new_offers} new of {lastRun.fetched}.</>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} disabled={!offers.length} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
            <Download className="h-4 w-4" /> CSV
          </button>
          <button onClick={runNow} disabled={running} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} /> {running ? 'Checking HUD…' : `Run now${state ? ` (${state})` : ''}`}
          </button>
        </div>
      </div>

      {message && <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">{message}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

      <form onSubmit={e => { e.preventDefault(); load() }} className="flex flex-wrap gap-3">
        <select value={state} onChange={e => setState(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All states</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Case #, address, city or broker"
          className="px-3 py-2 border rounded-lg text-sm flex-1 min-w-[200px]" />
        <button type="submit" className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-semibold hover:bg-gray-200">Search</button>
      </form>

      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Accepted</th>
              <th className="px-4 py-3 font-medium">Property</th>
              <th className="px-4 py-3 font-medium">Net to HUD</th>
              <th className="px-4 py-3 font-medium">% of list</th>
              <th className="px-4 py-3 font-medium">Buyer</th>
              <th className="px-4 py-3 font-medium">Broker</th>
              <th className="px-4 py-3 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>
            ) : offers.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No accepted offers yet. Click “Run now” to pull them from HUD.</td></tr>
            ) : offers.map(o => {
              const pct = percentOfList(o)
              return (
                <tr key={o.id} className="border-t">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(o.accepted_at)}</td>
                  <td className="px-4 py-3">
                    <a href={`/property/${o.case_number}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{o.address || o.case_number}</a>
                    <div className="text-xs text-gray-500">
                      {[o.city, o.state].filter(Boolean).join(', ')} · {o.case_number}
                      {repeatCases.has(o.case_number) && <span className="ml-1 text-amber-700 font-semibold">· multiple contracts</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{formatMoney(o.net_to_hud)}</td>
                  <td className="px-4 py-3">{pct ? `${pct}%` : '—'}</td>
                  <td className="px-4 py-3">{o.purchaser_type || '—'}</td>
                  <td className="px-4 py-3">{o.broker_name || '—'}</td>
                  <td className="px-4 py-3">{OUTCOME_LABELS[o.outcome] || o.outcome}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {offers.length === PAGE && <p className="text-xs text-gray-500">Showing the latest {PAGE}. Filter by state or search to narrow down.</p>}
    </div>
  )
}
