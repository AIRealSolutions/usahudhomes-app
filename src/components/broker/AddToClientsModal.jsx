/**
 * Add the homes selected in Find Properties to one or more clients (leads).
 * Each client gets them in their picks list (lead card + composers) and, when
 * they have a website account, in their Saved Homes.
 */

import React, { useEffect, useState } from 'react'
import { consultationService } from '../../services/database/consultationService'
import { addPicks } from '../../services/propertyPicks'
import { X, Search, CheckSquare, Square, Loader, CheckCircle, Heart } from 'lucide-react'

const leadName = (c) =>
  `${c.customer?.first_name || c.first_name || ''} ${c.customer?.last_name || c.last_name || ''}`.trim() || c.customer_name || c.customer?.email || c.email || 'Unnamed lead'

export default function AddToClientsModal({ agentId, properties, defaultConsultationId, onClose, onDone }) {
  const [leads, setLeads] = useState(null)
  const [search, setSearch] = useState('')
  const [chosen, setChosen] = useState(() => new Set(defaultConsultationId ? [defaultConsultationId] : []))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)

  useEffect(() => {
    if (!agentId) return
    consultationService.getBrokerConsultations(agentId).then(r => setLeads(r.data || []))
  }, [agentId])

  const filtered = (leads || []).filter(c => {
    const q = search.trim().toLowerCase()
    return !q || leadName(c).toLowerCase().includes(q) || (c.customer?.email || c.email || '').toLowerCase().includes(q)
  })

  const toggle = (id) => setChosen(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const data = await addPicks([...chosen], properties, note.trim())
      setResults(data)
      onDone?.(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const nameFor = (id) => leadName((leads || []).find(c => c.id === id) || {})

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Add {properties.length} {properties.length === 1 ? 'home' : 'homes'} to clients</h3>
            <p className="text-xs text-gray-500">They'll be ready to insert in emails and texts, and saved to clients' accounts.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        {results ? (
          <div className="p-5 space-y-3 overflow-y-auto">
            {results.map(r => (
              <div key={r.consultationId} className="flex items-start gap-2 text-sm">
                <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${r.error ? 'text-gray-300' : 'text-green-600'}`} />
                <p className="text-gray-700">
                  <strong>{nameFor(r.consultationId)}</strong>:{' '}
                  {r.error ? `not added (${r.error})` : (
                    <>
                      {r.added} added{r.alreadyPicked ? `, ${r.alreadyPicked} already picked` : ''}.{' '}
                      {r.hasAccount
                        ? <span className="inline-flex items-center gap-1 text-rose-600"><Heart className="w-3.5 h-3.5" /> Also in their Saved Homes</span>
                        : <span className="text-gray-500">No website account yet; the homes are on their lead card for your emails and texts.</span>}
                    </>
                  )}
                </p>
              </div>
            ))}
            <button onClick={onClose} className="w-full mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">Done</button>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-3 overflow-y-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search your clients…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="border border-gray-100 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {!leads ? (
                  <p className="p-4 text-sm text-gray-500 flex items-center gap-2"><Loader className="w-4 h-4 animate-spin" /> Loading clients…</p>
                ) : filtered.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">No clients match. Clients are the leads in your Active Leads.</p>
                ) : filtered.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 ${chosen.has(c.id) ? 'bg-blue-50' : ''}`}
                  >
                    {chosen.has(c.id) ? <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" /> : <Square className="w-4 h-4 text-gray-400 shrink-0" />}
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-900 truncate">{leadName(c)}</span>
                      <span className="block text-xs text-gray-500 truncate">{[c.customer?.email || c.email, c.state].filter(Boolean).join(' · ')}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div>
                <label htmlFor="pick-note" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Note (optional, for you)</label>
                <input
                  id="pick-note"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  maxLength={500}
                  placeholder="e.g. Fits budget, close to family"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={onClose} disabled={saving} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={save}
                disabled={saving || chosen.size === 0}
                className="flex-1 px-4 py-2 bg-blue-600 rounded-lg text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader className="w-4 h-4 animate-spin" />}
                Add to {chosen.size || ''} {chosen.size === 1 ? 'client' : 'clients'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
