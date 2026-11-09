/**
 * Economic Regions — named groups of counties per state. Properties and HUD brokers
 * are filed into a region automatically (by county); brokers who sign up choose the
 * regions they want leads in. North Carolina starts with the eight Prosperity Zones.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../config/supabase'
import { US_STATES } from '../../utils/states'
import { getEconomicRegions } from '../../services/brokerFinder'

const countyKey = c => String(c || '').trim().replace(/\s+(county|parish|borough)$/i, '').replace(/\s+/g, ' ').toLowerCase()
const slugify = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
const parseCounties = text => [...new Map(text.split(/[,\n]/).map(c => c.trim().replace(/\s+(county|parish|borough)$/i, '')).filter(Boolean).map(c => [countyKey(c), c])).values()]
const blank = { id: null, name: '', slug: '', description: '', countiesText: '', sort_order: 0 }

export default function EconomicRegionsAdmin() {
  const [state, setState] = useState('NC')
  const [regions, setRegions] = useState([])
  const [propertyCounties, setPropertyCounties] = useState([])
  const [edit, setEdit] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const load = async () => {
    try {
      const [regs, { data: props }] = await Promise.all([
        getEconomicRegions(state),
        supabase.from('properties').select('county').eq('state', state).not('county', 'is', null).limit(5000),
      ])
      setRegions(regs)
      const counts = new Map()
      for (const p of props || []) { const k = countyKey(p.county); if (k) counts.set(k, { name: p.county.replace(/\s+county$/i, ''), n: (counts.get(k)?.n || 0) + 1 }) }
      setPropertyCounties([...counts.values()].sort((a, b) => b.n - a.n))
    } catch (e) { setNotice(e.message) }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setEdit(null); load() }, [state])

  const assigned = useMemo(() => {
    const m = new Map()
    for (const r of regions) for (const c of r.counties || []) m.set(countyKey(c), r.name)
    return m
  }, [regions])
  const unassigned = propertyCounties.filter(c => !assigned.has(countyKey(c.name)))

  const save = async () => {
    const name = edit.name.trim()
    if (!name) return setNotice('Give the region a name.')
    const counties = parseCounties(edit.countiesText)
    const clash = counties.find(c => assigned.has(countyKey(c)) && !(edit.id && regions.find(r => r.id === edit.id)?.counties.some(x => countyKey(x) === countyKey(c))))
    if (clash) return setNotice(`${clash} County is already in ${assigned.get(countyKey(clash))}. Each county belongs to one region.`)
    const row = { state, name, slug: edit.slug.trim() || slugify(name), description: edit.description.trim() || null, counties, sort_order: Number(edit.sort_order) || 0, updated_at: new Date().toISOString() }
    setBusy(true)
    try {
      const { error } = edit.id ? await supabase.from('economic_regions').update(row).eq('id', edit.id) : await supabase.from('economic_regions').insert(row)
      if (error) throw error
      setNotice(`Saved ${name}. Homes and brokers in its counties are re-filed automatically.`)
      setEdit(null); await load()
    } catch (e) { setNotice(e.message) } finally { setBusy(false) }
  }

  const remove = async r => {
    if (!window.confirm(`Delete the ${r.name} region? Homes and brokers in it will have no region, and partners who chose it keep the setting until they update it.`)) return
    const { error } = await supabase.from('economic_regions').delete().eq('id', r.id)
    if (error) setNotice(error.message); else { setNotice(`Deleted ${r.name}.`); load() }
  }

  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-5 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Economic Regions</h1>
        <p className="text-sm text-gray-600">Group each state's counties into regions. Homes and HUD brokers are placed in a region by county, and brokers choose the regions they want leads in when they sign up.</p>
      </header>
      {notice && <div role="status" className="border bg-blue-50 rounded p-3 text-sm">{notice}</div>}
      <section className="bg-white rounded shadow p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <select aria-label="State" className="border rounded p-2" value={state} onChange={e => setState(e.target.value)}>
            {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
          <button type="button" className="bg-blue-700 text-white rounded px-4 py-2 text-sm" onClick={() => setEdit({ ...blank, sort_order: regions.length + 1 })}>Add region</button>
        </div>

        {edit && (
          <div className="border rounded p-3 space-y-2 bg-gray-50">
            <div className="grid sm:grid-cols-3 gap-2">
              <label className="text-sm sm:col-span-2">Name<input className="border rounded p-2 w-full" value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Coastal Plain" /></label>
              <label className="text-sm">Order<input type="number" className="border rounded p-2 w-full" value={edit.sort_order} onChange={e => setEdit({ ...edit, sort_order: e.target.value })} /></label>
            </div>
            <label className="text-sm block">Description<input className="border rounded p-2 w-full" value={edit.description} onChange={e => setEdit({ ...edit, description: e.target.value })} placeholder="Source or notes (optional)" /></label>
            <label className="text-sm block">Counties (comma or one per line)
              <textarea className="border rounded p-2 w-full" rows={4} value={edit.countiesText} onChange={e => setEdit({ ...edit, countiesText: e.target.value })} />
            </label>
            {unassigned.length > 0 && (
              <p className="text-xs">Add a county with HUD homes:{' '}
                {unassigned.map(c => <button key={c.name} type="button" className="underline text-blue-700 mr-2" onClick={() => setEdit(ed => ({ ...ed, countiesText: [ed.countiesText.trim(), c.name].filter(Boolean).join(', ') }))}>{c.name}</button>)}
              </p>
            )}
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={save} className="bg-green-700 text-white rounded px-4 py-2 text-sm disabled:opacity-50">{busy ? 'Saving…' : 'Save region'}</button>
              <button type="button" onClick={() => setEdit(null)} className="border rounded px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="divide-y border rounded">
          {regions.map(r => (
            <div key={r.id} className="p-3 flex flex-col sm:flex-row gap-2 sm:items-start justify-between">
              <div className="min-w-0">
                <div className="font-medium">{r.name} <span className="text-xs text-gray-500">({r.counties.length} counties)</span></div>
                {r.description && <div className="text-xs text-gray-500">{r.description}</div>}
                <div className="text-sm text-gray-700">{r.counties.join(', ')}</div>
              </div>
              <div className="flex gap-3 text-sm shrink-0">
                <button type="button" className="text-blue-700 underline" onClick={() => setEdit({ id: r.id, name: r.name, slug: r.slug, description: r.description || '', countiesText: r.counties.join(', '), sort_order: r.sort_order })}>Edit</button>
                <button type="button" className="text-red-700 underline" onClick={() => remove(r)}>Delete</button>
              </div>
            </div>
          ))}
          {!regions.length && <p className="p-3 text-sm text-gray-500">No regions for {state} yet.</p>}
        </div>
        {unassigned.length > 0 && regions.length > 0 && (
          <p className="text-sm text-amber-700">Counties with HUD homes that are not in a region: {unassigned.map(c => `${c.name} (${c.n})`).join(', ')}</p>
        )}
      </section>
    </main>
  )
}
