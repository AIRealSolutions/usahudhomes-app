/**
 * Broker & Property Map — HUD homes and HUD-registered brokers on one map,
 * filtered by state and economic region, with coverage counts per region.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../config/supabase'
import { US_STATES } from '../../utils/states'
import LeafletMap from '../../components/maps/LeafletMap'
import { getEconomicRegions, scanStateBrokers, geocodeBrokers, BROKER_STATUS } from '../../services/brokerFinder'

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const money = n => (Number(n) ? '$' + Math.round(Number(n)).toLocaleString() : '')
const PROPERTY_COLOR = '#dc2626'

async function fetchAll(build) {
  const out = []
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await build().range(from, from + 999)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}

export default function BrokerMapAdmin({ onNavigate }) {
  const [state, setState] = useState('NC')
  const [region, setRegion] = useState('')
  const [regions, setRegions] = useState([])
  const [properties, setProperties] = useState([])
  const [brokers, setBrokers] = useState([])
  const [agents, setAgents] = useState([])
  const [show, setShow] = useState({ properties: true, brokers: true })
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [regs, props, brks, ags] = await Promise.all([
        getEconomicRegions(state),
        fetchAll(() => supabase.from('properties').select('id,case_number,address,city,state,zip_code,county,price,status,economic_region,latitude,longitude').eq('state', state).eq('is_active', true)),
        fetchAll(() => supabase.from('hud_brokers').select('*').eq('state', state)),
        supabase.from('agents').select('id,first_name,last_name,company,states_covered,economic_regions,is_active').eq('is_active', true).then(r => r.data || []),
      ])
      setRegions(regs); setProperties(props); setBrokers(brks)
      setAgents(ags.filter(a => (a.states_covered || []).includes(state)))
    } catch (e) { setNotice(e.message) } finally { setLoading(false) }
  }, [state])
  useEffect(() => { setRegion(''); setSelected(null); load() }, [load])

  const regionName = slug => regions.find(r => r.slug === slug)?.name || slug || 'No region'

  const visibleProps = useMemo(() => properties.filter(p => !region || p.economic_region === region), [properties, region])
  const visibleBrokers = useMemo(() => brokers.filter(b => (!region || b.economic_region === region) && (!statusFilter || b.status === statusFilter)), [brokers, region, statusFilter])

  const points = useMemo(() => [
    ...(show.brokers ? visibleBrokers.filter(b => b.latitude != null).map(b => ({
      id: `b:${b.id}`, lat: Number(b.latitude), lng: Number(b.longitude), radius: 6,
      color: BROKER_STATUS[b.status]?.color || '#2563eb',
      label: `${b.company_name} (${b.city})`,
      popup: `<strong>${esc(b.company_name)}</strong><br>${esc(b.contact_name)}<br>${esc(b.address)}, ${esc(b.city)} ${esc(b.zip)}<br>${esc(b.phone)}${b.email ? `<br>${esc(b.email)}` : ''}<br><em>${esc(BROKER_STATUS[b.status]?.label)}</em>`,
    })) : []),
    ...(show.properties ? visibleProps.filter(p => p.latitude != null).map(p => ({
      id: `p:${p.id}`, lat: Number(p.latitude), lng: Number(p.longitude), radius: 8, color: PROPERTY_COLOR,
      label: `${p.address}, ${p.city} — ${money(p.price)}`,
      popup: `<strong>${esc(p.address)}</strong><br>${esc(p.city)}, ${esc(p.state)} ${esc(p.zip_code)}<br>#${esc(p.case_number)} · ${esc(money(p.price))}<br>${esc(p.county)} County · ${esc(regionName(p.economic_region))}`,
    })) : []),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [visibleBrokers, visibleProps, show, regions])

  // Coverage per region: homes, HUD brokers, partners who registered for it
  const coverage = useMemo(() => {
    const rows = [...regions.map(r => r.slug), null].map(slug => {
      const partners = agents.filter(a => {
        const list = (a.economic_regions || []).filter(k => String(k).startsWith(`${state}:`))
        return slug ? (!list.length || list.includes(`${state}:${slug}`)) : false
      }).length
      return {
        slug, name: slug ? regionName(slug) : 'No region',
        homes: properties.filter(p => (p.economic_region || null) === slug).length,
        brokers: brokers.filter(b => (b.economic_region || null) === slug).length,
        contacted: brokers.filter(b => (b.economic_region || null) === slug && b.status !== 'new').length,
        partners,
      }
    })
    return rows.filter(r => r.slug || r.homes || r.brokers)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions, properties, brokers, agents, state])

  const fillDirectory = async () => {
    setBusy('scan'); setNotice('')
    try {
      let total = 0
      for (let round = 0; round < 15; round++) {
        const r = await scanStateBrokers(state)
        total += r.foundNow
        setNotice(`Checked ${r.cities - r.remaining} of ${r.cities} property towns in ${state} on HUD · ${total} broker listings found this run…`)
        if (!r.remaining || (!r.searchedNow && r.errors.length)) {
          if (r.errors.length) setNotice(n => `${n} Errors: ${r.errors.slice(0, 2).join('; ')}`)
          break
        }
      }
      await load()
    } catch (e) { setNotice(e.message) } finally { setBusy('') }
  }

  const placePins = async () => {
    setBusy('geo')
    try {
      let r
      for (let i = 0; i < 10; i++) { r = await geocodeBrokers(40); if (!r.remaining || !r.geocoded) break }
      setNotice(`${r.remaining} brokers still without a map pin.`)
      await load()
    } catch (e) { setNotice(e.message) } finally { setBusy('') }
  }

  const unplaced = brokers.filter(b => b.latitude == null).length

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-5 space-y-4">
      <header className="flex flex-wrap justify-between gap-3 items-end">
        <div>
          <h1 className="text-2xl font-bold">Broker &amp; Property Map</h1>
          <p className="text-sm text-gray-600">HUD homes and HUD-registered brokers by economic region.</p>
        </div>
        {onNavigate && <button type="button" onClick={() => onNavigate('broker-finder')} className="bg-blue-700 text-white rounded px-4 py-2 text-sm">Find brokers for a property</button>}
      </header>
      {notice && <div role="status" className="border bg-blue-50 rounded p-3 text-sm">{notice}</div>}

      <section className="bg-white rounded shadow p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <select aria-label="State" className="border rounded p-2" value={state} onChange={e => setState(e.target.value)}>
            {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
          <select aria-label="Economic region" className="border rounded p-2" value={region} onChange={e => setRegion(e.target.value)}>
            <option value="">All regions{regions.length ? ` (${regions.length})` : ''}</option>
            {regions.map(r => <option key={r.slug} value={r.slug}>{r.name}</option>)}
          </select>
          <select aria-label="Broker status" className="border rounded p-2" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All broker statuses</option>
            {Object.entries(BROKER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={show.properties} onChange={e => setShow(s => ({ ...s, properties: e.target.checked }))} /> Homes ({visibleProps.length})</label>
          <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={show.brokers} onChange={e => setShow(s => ({ ...s, brokers: e.target.checked }))} /> Brokers ({visibleBrokers.length})</label>
        </div>
        {!regions.length && !loading && <p className="text-sm text-amber-700">No economic regions are set up for {state} yet. Add them in Economic Regions.</p>}
        <LeafletMap points={points} fitKey={`${state}|${region}|${loading}`} onSelect={setSelected} height={520} />
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1"><i className="inline-block w-3 h-3 rounded-full" style={{ background: PROPERTY_COLOR }} /> HUD home</span>
          {Object.entries(BROKER_STATUS).map(([k, v]) => <span key={k} className="flex items-center gap-1"><i className="inline-block w-3 h-3 rounded-full" style={{ background: v.color }} /> {v.label}</span>)}
        </div>
        {selected?.startsWith('p:') && onNavigate && (
          <button type="button" className="text-blue-700 underline text-sm" onClick={() => {
            const p = properties.find(x => `p:${x.id}` === selected)
            if (p) { window.history.replaceState(null, '', `/admin?tab=broker-finder&case=${encodeURIComponent(p.case_number)}`); onNavigate('broker-finder') }
          }}>Find brokers for the selected home</button>
        )}
      </section>

      <section className="bg-white rounded shadow p-4 space-y-3">
        <div className="flex flex-wrap justify-between gap-2 items-center">
          <h2 className="font-semibold">Coverage by region — {state}</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!!busy} onClick={fillDirectory} className="border border-blue-700 text-blue-700 rounded px-3 py-2 text-sm disabled:opacity-50">
              {busy === 'scan' ? 'Searching HUD…' : `Fill broker directory for ${state} property towns`}
            </button>
            {unplaced > 0 && <button type="button" disabled={!!busy} onClick={placePins} className="border rounded px-3 py-2 text-sm disabled:opacity-50">{busy === 'geo' ? 'Placing…' : `Place ${unplaced} missing pins`}</button>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b"><th className="py-2 pr-3">Region</th><th className="pr-3">HUD homes</th><th className="pr-3">HUD brokers</th><th className="pr-3">Contacted</th><th>Partner agents</th></tr></thead>
            <tbody>
              {coverage.map(r => (
                <tr key={r.slug || 'none'} className={`border-b cursor-pointer hover:bg-gray-50 ${region === r.slug ? 'bg-teal-50' : ''}`} onClick={() => r.slug && setRegion(region === r.slug ? '' : r.slug)}>
                  <td className="py-2 pr-3 font-medium">{r.name}</td>
                  <td className="pr-3">{r.homes}</td>
                  <td className="pr-3">{r.brokers}</td>
                  <td className="pr-3">{r.contacted}</td>
                  <td className={r.homes && !r.partners ? 'text-red-700 font-semibold' : ''}>{r.partners}{r.homes && !r.partners ? ' — needs an agent' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500">Brokers are placed at their office address (U.S. Census geocoder) and filed into a region by county. Partner agents count for a region if they chose it, or if they cover the whole state.</p>
      </section>
    </main>
  )
}
