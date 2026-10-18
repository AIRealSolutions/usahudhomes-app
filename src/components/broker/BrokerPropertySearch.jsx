/**
 * Property search for brokers: filter HUD listings, select homes, and add them
 * to clients (see AddToClientsModal).
 */

import React, { useEffect, useState } from 'react'
import { supabase } from '../../config/supabase'
import { US_STATES } from '../../utils/states'
import { Search, Home, Bed, Bath, Maximize, CheckCircle, Circle, Loader, UserPlus, ExternalLink, Images } from 'lucide-react'
import PropertyGallery from '../PropertyGallery'

const RESULT_LIMIT = 60
const FIELDS = 'id, case_number, address, city, state, zip_code, price, beds, baths, sq_ft, status, main_image, county'

const money = (v) => (v || v === 0 ? `$${Number(v).toLocaleString()}` : '—')

const EMPTY = { state: 'NC', city: '', minPrice: '', maxPrice: '', minBeds: '', hideUnderContract: true }

export default function BrokerPropertySearch({ initialFilters, onAddToClients, actionLabel = 'Add to clients' }) {
  const [filters, setFilters] = useState(() => ({ ...EMPTY, ...withValues(initialFilters) }))
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(() => new Map()) // id -> property
  const [galleryFor, setGalleryFor] = useState(null) // property whose photos are open

  // Re-run when a different client's preferences are applied
  const filtersKey = JSON.stringify(initialFilters || {})
  useEffect(() => {
    const next = { ...EMPTY, ...withValues(JSON.parse(filtersKey)) }
    setFilters(next)
    runSearch(next)
  }, [filtersKey]) // eslint-disable-line react-hooks/exhaustive-deps

  async function runSearch(f = filters) {
    setLoading(true)
    setError(null)
    let q = supabase.from('properties').select(FIELDS).order('price', { ascending: true }).limit(RESULT_LIMIT)
    if (f.state) q = q.eq('state', f.state)
    if (f.city.trim()) q = q.ilike('city', `%${f.city.trim().replace(/[\\%_]/g, '\\$&')}%`)
    if (f.minPrice) q = q.gte('price', Number(f.minPrice))
    if (f.maxPrice) q = q.lte('price', Number(f.maxPrice))
    if (f.minBeds) q = q.gte('beds', Number(f.minBeds))
    if (f.hideUnderContract) q = q.neq('status', 'UNDER CONTRACT')
    const { data, error: err } = await q
    setLoading(false)
    if (err) return setError(err.message)
    setResults(data || [])
  }

  const set = (key) => (e) => setFilters(f => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const toggle = (p) => setSelected(prev => {
    const next = new Map(prev)
    next.has(p.id) ? next.delete(p.id) : next.set(p.id, p)
    return next
  })
  const allShownSelected = results?.length > 0 && results.every(p => selected.has(p.id))
  const toggleAllShown = () => setSelected(prev => {
    const next = new Map(prev)
    results.forEach(p => (allShownSelected ? next.delete(p.id) : next.set(p.id, p)))
    return next
  })

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'

  return (
    <div className="space-y-4">
      <form
        onSubmit={e => { e.preventDefault(); runSearch() }}
        className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 md:grid-cols-6 gap-3 items-end"
      >
        <div>
          <label htmlFor="fp-state" className={labelCls}>State</label>
          <select id="fp-state" value={filters.state} onChange={set('state')} className={`${inputCls} bg-white`}>
            <option value="">All states</option>
            {US_STATES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
          </select>
        </div>
        <div className="col-span-2 md:col-span-1">
          <label htmlFor="fp-city" className={labelCls}>City</label>
          <input id="fp-city" value={filters.city} onChange={set('city')} placeholder="Any" className={inputCls} />
        </div>
        <div>
          <label htmlFor="fp-min" className={labelCls}>Min price</label>
          <input id="fp-min" type="number" min="0" step="5000" value={filters.minPrice} onChange={set('minPrice')} placeholder="Any" className={inputCls} />
        </div>
        <div>
          <label htmlFor="fp-max" className={labelCls}>Max price</label>
          <input id="fp-max" type="number" min="0" step="5000" value={filters.maxPrice} onChange={set('maxPrice')} placeholder="Any" className={inputCls} />
        </div>
        <div>
          <label htmlFor="fp-beds" className={labelCls}>Beds</label>
          <select id="fp-beds" value={filters.minBeds} onChange={set('minBeds')} className={`${inputCls} bg-white`}>
            <option value="">Any</option>
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+</option>)}
          </select>
        </div>
        <button type="submit" className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">
          <Search className="w-4 h-4" /> Search
        </button>
        <label className="col-span-2 md:col-span-6 flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={filters.hideUnderContract} onChange={set('hideUnderContract')} className="rounded" />
          Hide homes under contract
        </label>
      </form>

      {selected.size > 0 && (
        <div className="sticky top-2 z-10 bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-sm">
          <p className="text-sm font-medium text-blue-900">{selected.size} {selected.size === 1 ? 'home' : 'homes'} selected</p>
          <div className="flex gap-2">
            <button onClick={() => setSelected(new Map())} className="px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 rounded-lg">Clear</button>
            <button
              onClick={() => onAddToClients([...selected.values()], () => setSelected(new Map()))}
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
            >
              <UserPlus className="w-4 h-4" /> {actionLabel}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">Search failed: {error}</p>}

      {loading ? (
        <p className="py-10 text-center text-sm text-gray-500 flex items-center justify-center gap-2"><Loader className="w-4 h-4 animate-spin" /> Searching…</p>
      ) : results && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {results.length === RESULT_LIMIT ? `Showing the first ${RESULT_LIMIT} homes, lowest price first. Narrow the filters to see more.` : `${results.length} ${results.length === 1 ? 'home' : 'homes'} found`}
            </p>
            {results.length > 0 && (
              <button onClick={toggleAllShown} className="text-sm font-medium text-blue-700 hover:underline">
                {allShownSelected ? 'Deselect shown' : 'Select all shown'}
              </button>
            )}
          </div>

          {results.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-500">
              <Home className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No homes match these filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {results.map(p => {
                const on = selected.has(p.id)
                return (
                  <div key={p.id} className={`bg-white rounded-xl border-2 overflow-hidden transition-colors ${on ? 'border-blue-500' : 'border-gray-200'}`}>
                    <button type="button" onClick={() => toggle(p)} className="block w-full text-left">
                      <div className="h-36 bg-gray-100 relative">
                        {p.main_image
                          ? <img src={p.main_image} alt="" className="w-full h-full object-cover" loading="lazy" />
                          : <div className="w-full h-full flex items-center justify-center"><Home className="w-10 h-10 text-gray-300" /></div>}
                        <span className="absolute top-2 left-2 bg-white/90 rounded-full p-0.5">
                          {on ? <CheckCircle className="w-6 h-6 text-blue-600" /> : <Circle className="w-6 h-6 text-gray-400" />}
                        </span>
                        {p.status && (
                          <span className="absolute top-2 right-2 bg-white/90 text-gray-700 text-[11px] font-semibold px-2 py-0.5 rounded">{p.status}</span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-semibold text-gray-900 truncate">{p.address}</p>
                        <p className="text-xs text-gray-500 truncate">{p.city}, {p.state} {p.zip_code} · Case #{p.case_number}</p>
                        <p className="text-lg font-bold text-blue-600 mt-1">{money(p.price)}</p>
                        <p className="text-xs text-gray-600 flex items-center gap-3 mt-1">
                          {p.beds != null && <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5" />{p.beds}</span>}
                          {p.baths != null && <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{p.baths}</span>}
                          {p.sq_ft && <span className="flex items-center gap-1"><Maximize className="w-3.5 h-3.5" />{Number(p.sq_ft).toLocaleString()} sq ft</span>}
                        </p>
                      </div>
                    </button>
                    <div className="px-3 pb-3 flex items-center gap-4">
                      <a href={`/property/${p.case_number}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline">
                        View listing <ExternalLink className="w-3 h-3" />
                      </a>
                      <button type="button" onClick={() => setGalleryFor(p)} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline">
                        <Images className="w-3.5 h-3.5" /> Photos
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {galleryFor && (
        <PropertyGallery
          property={galleryFor}
          title={`${galleryFor.address}, ${galleryFor.city} · Case #${galleryFor.case_number}`}
          canDownload
          onClose={() => setGalleryFor(null)}
        />
      )}
    </div>
  )
}

function withValues(obj) {
  return Object.fromEntries(Object.entries(obj || {}).filter(([, v]) => v !== '' && v != null))
}
