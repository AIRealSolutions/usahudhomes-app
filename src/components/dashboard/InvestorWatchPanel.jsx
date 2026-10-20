/**
 * InvestorWatchPanel — clients waiting for a property to open to investor bids.
 * Takes the object from useInvestorWatches() so the calendar on the page stays in sync.
 * clients: leads to pick from (consultations); when omitted, loads all (admin).
 */

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, Plus, X } from 'lucide-react'
import { supabase } from '../../config/supabase'
import { watchClientName } from '../../services/investorWatches'

const STATUS = {
  open:     { label: 'Open to investors now', cls: 'bg-violet-100 text-violet-800' },
  waiting:  { label: 'Owner-occupant period', cls: 'bg-gray-100 text-gray-700' },
  contract: { label: 'Under contract', cls: 'bg-amber-100 text-amber-800' },
}

export default function InvestorWatchPanel({ watches, clients: clientsProp }) {
  const [clients, setClients] = useState(clientsProp || [])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ clientId: '', caseNumber: '', note: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (clientsProp) { setClients(clientsProp); return }
    supabase.from('consultations')
      .select('id, first_name, last_name, email, customer_name, customer_email, agent_id')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Investor watch clients:', error)
        setClients(data || [])
      })
  }, [clientsProp])

  const submit = async (e) => {
    e.preventDefault()
    const client = clients.find(c => c.id === form.clientId)
    if (!client || !form.caseNumber.trim()) return
    setSaving(true)
    const ok = await watches.add({ client, caseNumber: form.caseNumber, note: form.note })
    setSaving(false)
    if (ok) {
      setForm({ clientId: '', caseNumber: '', note: '' })
      setAdding(false)
    }
  }

  const open = watches.items.filter(w => w.status.kind === 'open').length

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Briefcase className="w-4 h-4 text-violet-600 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">Investor Watch</h3>
            <p className="text-xs text-gray-500 line-clamp-2">
              Clients waiting to bid as investors{open ? ` · ${open} open now` : ''}. Shown on your calendar and theirs.
            </p>
          </div>
        </div>
        <button onClick={() => setAdding(a => !a)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 flex-shrink-0">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {adding && (
        <form onSubmit={submit} className="px-5 py-3 space-y-2 border-b border-gray-100">
          <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500">
            <option value="">Choose a client…</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {watchClientName(c)}{(c.email || c.customer_email) ? ` · ${c.email || c.customer_email}` : ''}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <input value={form.caseNumber} onChange={e => setForm(f => ({ ...f, caseNumber: e.target.value }))}
              placeholder="HUD case # (e.g. 387-123456)" maxLength={20}
              className="w-44 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500" />
            <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Note (optional)" maxLength={300}
              className="flex-1 min-w-[8rem] text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500" />
          </div>
          <p className="text-[11px] text-gray-500">The client sees this on their dashboard calendar if they have a site account with the same email.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="text-xs font-medium px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button>
            <button type="submit" disabled={saving || !form.clientId || !form.caseNumber.trim()}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Add to watch list'}
            </button>
          </div>
        </form>
      )}

      {watches.error && <p className="px-5 py-2 text-xs text-red-600">{watches.error}</p>}

      <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
        {watches.loading && !watches.items.length ? (
          <p className="px-5 py-4 text-xs text-gray-400">Loading…</p>
        ) : !watches.items.length ? (
          <p className="px-5 py-4 text-xs text-gray-400">No clients on the watch list. Use Add when a client wants a home that's still owner-occupant only.</p>
        ) : watches.items.map(w => {
          const s = STATUS[w.status.kind]
          const place = [w.property?.address, w.property?.city, w.property?.state].filter(Boolean).join(', ')
          return (
            <div key={w.id} className="flex items-start gap-3 px-5 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{w.client_name}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                </div>
                <Link to={`/property/${w.case_number}`} className="block text-xs text-blue-600 hover:underline truncate">
                  {place || `Case ${w.case_number}`}
                </Link>
                <p className="text-xs text-gray-500">
                  {w.status.kind === 'waiting'
                    ? (!w.status.expected
                        ? 'Waiting for HUD to open it to investors'
                        : w.status.expected < new Date(new Date().setHours(0, 0, 0, 0))
                          ? `Bids opened ${w.status.expected.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}; waiting for HUD to open it to investors`
                          : `Bids open ${w.status.expected.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}; investors after if unsold`)
                    : w.status.kind === 'open' ? 'Investors can bid now' : 'No longer available'}
                  {w.note ? ` · ${w.note}` : ''}
                </p>
              </div>
              <button onClick={() => { if (window.confirm(`Remove ${w.client_name}'s watch on ${place || w.case_number}?`)) watches.remove(w.id) }}
                title="Remove" className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
