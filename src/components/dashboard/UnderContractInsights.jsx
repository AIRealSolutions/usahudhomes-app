/**
 * UnderContractInsights — charts and meters for the admin Control Panel, built
 * from HUD accepted offers (accepted_offers) and the current listing pipeline
 * (properties.status).
 *
 * Colors follow the dataviz reference palette (validated light mode):
 * series blue #2a78d6, orange #eb6834, aqua #1baf7a; values are always shown as
 * text so no series relies on color alone.
 */

import React, { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList,
} from 'recharts'
import { startOfWeek, format } from 'date-fns'
import { RefreshCw, Table2, BarChart3 } from 'lucide-react'
import { fetchUnderContractData } from '../../services/marketActivity'

const C = {
  blue: '#2a78d6', blueTrack: '#cde2fb', orange: '#eb6834', orangeTrack: '#fbe1d6', aqua: '#1baf7a',
  grid: '#eceae6', axis: '#8a8984', ink: '#0b0b0b', ink2: '#52514e',
}
const ACTIVE_STATUSES = ['New Listing', 'Active', 'Price Reduced', 'Hard to Sell']
const median = (arr) => {
  const a = arr.filter(n => n != null && !Number.isNaN(n)).sort((x, y) => x - y)
  if (!a.length) return null
  const mid = Math.floor(a.length / 2)
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2
}

function Panel({ title, subtitle, children, table, right }) {
  const [showTable, setShowTable] = useState(false)
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {right}
          {table && (
            <button onClick={() => setShowTable(s => !s)} title={showTable ? 'Show chart' : 'Show table'}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50">
              {showTable ? <BarChart3 className="w-4 h-4" /> : <Table2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
      {showTable && table ? (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            {table.columns.map(c => <th key={c} className="py-1.5 font-medium">{c}</th>)}
          </tr></thead>
          <tbody>{table.rows.map((r, i) => (
            <tr key={i} className="border-b border-gray-50 last:border-0">
              {r.map((v, j) => <td key={j} className={`py-1.5 ${j ? 'tabular-nums text-gray-700' : 'text-gray-900'}`}>{v}</td>)}
            </tr>
          ))}</tbody>
        </table>
      ) : children}
    </div>
  )
}

// A meter: value fill on a lighter step of the same ramp
function Meter({ label, value, display, max = 100, hint, color = C.blue, track = C.blueTrack }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-lg font-semibold text-gray-900 tabular-nums">{value == null ? '—' : display}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full overflow-hidden" style={{ background: track }}
        role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value ?? 0}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}

function ChartTooltip({ active, payload, label, format: fmt }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-gray-900">{p.payload.tip || label}</p>
      <p className="text-gray-600 tabular-nums">{fmt ? fmt(p.value, p.payload) : p.value.toLocaleString()}</p>
    </div>
  )
}

export default function UnderContractInsights({ onNavigate }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchUnderContractData({ weeks: 12 })
      .then(setData)
      .catch(e => { console.error('UnderContractInsights:', e); setError('Under-contract statistics could not be loaded.') })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const s = useMemo(() => {
    if (!data) return null
    const { offers, properties } = data
    const pending = offers.filter(o => o.outcome !== 'fell_through')

    // Accepted offers per week, from the first week with data
    const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 })
    const weekly = new Map()
    for (const o of offers) {
      const wk = startOfWeek(new Date(o.accepted_at), { weekStartsOn: 1 })
      weekly.set(wk.getTime(), (weekly.get(wk.getTime()) || 0) + 1)
    }
    const weeks = [...weekly.keys()].sort((a, b) => a - b).map(t => ({
      week: format(new Date(t), 'MMM d'),
      tip: `Week of ${format(new Date(t), 'MMM d')}${t === thisWeek.getTime() ? ' (so far)' : ''}`,
      offers: weekly.get(t),
      partial: t === thisWeek.getTime(),
    }))

    // Pipeline from current listing statuses
    const byStatus = {}
    for (const p of properties) byStatus[p.status] = (byStatus[p.status] || 0) + 1
    const underContract = byStatus['UNDER CONTRACT'] || 0
    const available = ACTIVE_STATUSES.reduce((n, st) => n + (byStatus[st] || 0), 0)

    // Under contract by state, top 8
    const ucState = {}
    for (const p of properties) if (p.status === 'UNDER CONTRACT' && p.state) ucState[p.state] = (ucState[p.state] || 0) + 1
    const states = Object.entries(ucState).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([state, n]) => ({ state, n }))

    // Buyer mix
    const mix = { 'Owner-Occupant': 0, Investor: 0, Other: 0 }
    for (const o of pending) {
      const t = o.purchaser_type === 'Owner-Occupant' || o.purchaser_type === 'Investor' ? o.purchaser_type : 'Other'
      mix[t]++
    }

    const pctOfList = median(pending.map(o => o.list_price_used ? (o.net_to_hud / o.list_price_used) * 100 : null))
    const dom = median(pending.map(o => o.days_on_market))
    const reduced = pending.length ? (pending.filter(o => o.price_reduced).length / pending.length) * 100 : null
    const fellThrough = offers.length ? (offers.filter(o => o.outcome === 'fell_through').length / offers.length) * 100 : null
    const sellThrough = available + underContract ? (underContract / (available + underContract)) * 100 : null
    const ncUC = ucState.NC || 0

    return { weeks, byStatus, underContract, available, states, mix, total: pending.length, pctOfList, dom, reduced, fellThrough, sellThrough, ncUC, offers: offers.length }
  }, [data])

  if (loading && !s) {
    return <div className="bg-white rounded-xl border border-gray-200 h-64 flex items-center justify-center"><RefreshCw className="w-6 h-6 text-blue-600 animate-spin" /></div>
  }
  if (error) return <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-red-600">{error}</div>

  const mixTotal = s.mix['Owner-Occupant'] + s.mix.Investor + s.mix.Other
  const mixRows = [
    { key: 'Owner-Occupant', color: C.blue },
    { key: 'Investor', color: C.orange },
    { key: 'Other', color: C.aqua },
  ].filter(m => s.mix[m.key] > 0)

  return (
    <div className="space-y-4">
      {/* Pipeline tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Available now', value: s.available, sub: `${(s.byStatus['New Listing'] || 0).toLocaleString()} new · ${(s.byStatus['Price Reduced'] || 0).toLocaleString()} reduced`, tab: 'property-manage' },
          { label: 'Under contract', value: s.underContract, sub: `${s.ncUC.toLocaleString()} in North Carolina`, tab: 'accepted-offers' },
          { label: 'Accepted offers', value: s.offers, sub: 'Last 12 weeks', tab: 'accepted-offers' },
          { label: 'Sell-through', value: s.sellThrough, fmt: v => `${Math.round(v)}%`, sub: 'Under contract ÷ all tracked', tab: 'accepted-offers' },
        ].map(t => (
          <button key={t.label} onClick={() => onNavigate?.(t.tab)}
            className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md transition-shadow">
            <p className="text-xs font-medium text-gray-500">{t.label}</p>
            <p className="text-2xl font-semibold text-gray-900 tabular-nums mt-1">
              {t.value == null ? '—' : t.fmt ? t.fmt(t.value) : t.value.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{t.sub}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Weekly accepted offers */}
        <Panel
          title="Accepted offers per week"
          subtitle="HUD bid results, all states"
          right={<button onClick={load} title="Refresh" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>}
          table={{ columns: ['Week of', 'Offers'], rows: s.weeks.map(w => [w.week + (w.partial ? ' (so far)' : ''), w.offers.toLocaleString()]) }}
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.weeks} margin={{ top: 18, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={C.grid} />
                <XAxis dataKey="week" tickLine={false} axisLine={{ stroke: C.grid }} tick={{ fontSize: 11, fill: C.axis }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.axis }} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f5f4f1' }} content={<ChartTooltip format={v => `${v.toLocaleString()} accepted offers`} />} />
                <Bar dataKey="offers" maxBarSize={24} radius={[4, 4, 0, 0]}>
                  {s.weeks.map(w => <Cell key={w.week} fill={C.blue} fillOpacity={w.partial ? 0.45 : 1} />)}
                  <LabelList dataKey="offers" position="top" style={{ fontSize: 11, fill: C.ink2 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 mt-2">The lighter bar is the current week so far.</p>
        </Panel>

        {/* Under contract by state */}
        <Panel
          title="Under contract by state"
          subtitle="Top 8 states, current listings"
          table={{ columns: ['State', 'Under contract'], rows: s.states.map(r => [r.state, r.n.toLocaleString()]) }}
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.states} layout="vertical" margin={{ top: 0, right: 36, left: -18, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke={C.grid} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.axis }} allowDecimals={false} />
                <YAxis type="category" dataKey="state" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: C.ink2 }} width={48} />
                <Tooltip cursor={{ fill: '#f5f4f1' }} content={<ChartTooltip format={v => `${v.toLocaleString()} under contract`} />} />
                <Bar dataKey="n" maxBarSize={18} radius={[0, 4, 4, 0]} fill={C.blue}>
                  <LabelList dataKey="n" position="right" style={{ fontSize: 11, fill: C.ink2 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Meters */}
        <Panel title="How homes are selling" subtitle={`Medians across ${s.total.toLocaleString()} accepted offers, last 12 weeks`}>
          <div className="space-y-4">
            <Meter label="Net to HUD vs. list price" value={s.pctOfList} display={`${Math.round(s.pctOfList)}%`}
              hint="What winning bids net HUD, as a share of the list price" />
            <Meter label="Days on market" value={s.dom} max={90} display={`${Math.round(s.dom)} days`}
              hint="From listing to accepted offer (bar scaled to 90 days)" />
            <Meter label="Price reduced before contract" value={s.reduced} display={`${Math.round(s.reduced)}%`}
              color={C.orange} track={C.orangeTrack} hint="Share of contracts on homes that had a price drop" />
            <Meter label="Fell through" value={s.fellThrough} display={`${s.fellThrough?.toFixed(1)}%`}
              color={C.orange} track={C.orangeTrack} hint="Accepted offers that later came back on the market" />
          </div>
        </Panel>

        {/* Buyer mix */}
        <Panel
          title="Who is buying"
          subtitle="Purchaser type on accepted offers, last 12 weeks"
          table={{ columns: ['Purchaser', 'Offers', 'Share'], rows: mixRows.map(m => [m.key, s.mix[m.key].toLocaleString(), `${Math.round((s.mix[m.key] / mixTotal) * 100)}%`]) }}
        >
          <div className="flex h-6 gap-0.5 rounded-md overflow-hidden" role="img"
            aria-label={mixRows.map(m => `${m.key} ${Math.round((s.mix[m.key] / mixTotal) * 100)}%`).join(', ')}>
            {mixRows.map(m => (
              <div key={m.key} title={`${m.key}: ${s.mix[m.key].toLocaleString()}`}
                style={{ width: `${(s.mix[m.key] / mixTotal) * 100}%`, background: m.color, minWidth: 3 }} />
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {mixRows.map(m => (
              <li key={m.key} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-700">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: m.color }} />{m.key}
                </span>
                <span className="tabular-nums text-gray-900">
                  {s.mix[m.key].toLocaleString()} <span className="text-gray-500">· {Math.round((s.mix[m.key] / mixTotal) * 100)}%</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 mt-4">
            Owner-occupants get first look during HUD's Exclusive period; investors can bid once a listing goes Extended.
          </p>
        </Panel>
      </div>
    </div>
  )
}

