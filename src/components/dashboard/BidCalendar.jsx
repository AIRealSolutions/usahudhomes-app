/**
 * BidCalendar — month view of upcoming HUD bid deadlines (Exclusive and Lottery
 * listings), expected HUD price cuts (signed-in users only), plus optional workflow events (e.g. a broker's referral deadlines
 * and appointments). Click a day for its agenda.
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, addMonths, format,
} from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Gavel, RefreshCw, Clock, TrendingDown } from 'lucide-react'
import { fetchBidOpenings, fetchPriceCuts, dayKey, money } from '../../services/marketActivity'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function BidCalendar({
  title = 'Bid Calendar',
  subtitle,
  states,
  caseNumbers,
  highlightCases,
  extraEvents = [],
}) {
  const [openings, setOpenings] = useState([])
  const [cuts, setCuts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(() => dayKey(new Date()))

  const statesKey = (states || []).join(',')
  const casesKey = caseNumbers ? caseNumbers.join(',') : null

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const scope = {
      states: statesKey ? statesKey.split(',') : undefined,
      caseNumbers: casesKey == null ? undefined : (casesKey ? casesKey.split(',') : []),
    }
    // Price cuts are extra: if they fail, bid dates still show
    Promise.all([fetchBidOpenings(scope), fetchPriceCuts(scope).catch(e => { console.error('BidCalendar price cuts:', e); return [] })])
      .then(([rows, cutRows]) => { if (!cancelled) { setOpenings(rows); setCuts(cutRows) } })
      .catch(e => { console.error('BidCalendar load:', e); if (!cancelled) setError('Bid dates could not be loaded.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [statesKey, casesKey])

  const highlight = useMemo(() => new Set(highlightCases || []), [highlightCases])

  // day key -> { bids: [], events: [] }
  const byDay = useMemo(() => {
    const map = new Map()
    const slot = (k) => map.get(k) || (map.set(k, { bids: [], cuts: [], events: [] }), map.get(k))
    for (const o of openings) slot(dayKey(o.date)).bids.push(o)
    for (const c of cuts) slot(dayKey(c.date)).cuts.push(c)
    for (const e of extraEvents) if (e.date) slot(dayKey(e.date)).events.push(e)
    return map
  }, [openings, cuts, extraEvents])

  // Start on the first day that has something, if today is empty
  useEffect(() => {
    if (loading || byDay.has(selected) || !byDay.size) return
    const keys = [...byDay.keys()].sort()
    const first = keys.find(k => k >= dayKey(new Date())) || keys[keys.length - 1]
    if (first) {
      setSelected(first)
      const [y, m] = first.split('-').map(Number)
      setMonth(new Date(y, m - 1, 1))
    }
  }, [byDay, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const days = eachDayOfInterval({ start: startOfWeek(month), end: endOfWeek(endOfMonth(month)) })
  const todayKey = dayKey(new Date())
  const agenda = byDay.get(selected) || { bids: [], cuts: [], events: [] }
  const [sy, sm, sd] = selected.split('-').map(Number)
  const next7 = openings.filter(o => o.date - new Date() < 7 * 86400000).length

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1 basis-56">
          <CalendarDays className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500 line-clamp-2">
              {subtitle || `Bids due on ${next7.toLocaleString()} home${next7 === 1 ? '' : 's'} in the next 7 days${statesKey ? ` · ${statesKey.replace(/,/g, ', ')}` : ''}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setMonth(m => addMonths(m, -1))} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-50" aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 w-28 text-center">{format(month, 'MMMM yyyy')}</span>
          <button onClick={() => setMonth(m => addMonths(m, 1))} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-50" aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-gray-400 uppercase mb-1">
          {WEEKDAYS.map(d => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(d => {
            const k = dayKey(d)
            const entry = byDay.get(k)
            const bids = entry?.bids.length || 0
            const events = entry?.events.length || 0
            const cutCount = entry?.cuts.length || 0
            const saved = entry?.bids.some(b => highlight.has(b.case_number))
            const savedCut = entry?.cuts.some(c => highlight.has(c.case_number))
            const isSel = k === selected
            return (
              <button key={k} onClick={() => setSelected(k)}
                className={`relative h-14 rounded-lg text-left px-1.5 py-1 transition-colors border flex flex-col items-start ${
                  isSel ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-50'
                } ${isSameMonth(d, month) ? '' : 'opacity-40'}`}>
                <span className={`text-xs font-medium ${k === todayKey ? 'bg-blue-600 text-white rounded-full px-1.5 py-0.5' : 'text-gray-700'}`}>
                  {d.getDate()}
                </span>
                {bids > 0 && (
                  <span title={`Bids due on ${bids} home${bids === 1 ? '' : 's'}`}
                    className={`mt-auto text-[11px] leading-4 font-semibold rounded px-1.5 tabular-nums ${saved ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                    {bids}
                  </span>
                )}
                {cutCount > 0 && (
                  <span title={`Price cut expected on ${cutCount} home${cutCount === 1 ? '' : 's'}`}
                    className={`${bids ? 'mt-0.5' : 'mt-auto'} text-[11px] leading-4 font-semibold rounded px-1.5 tabular-nums ${savedCut ? 'bg-yellow-100 text-yellow-800' : 'bg-amber-100 text-amber-800'}`}>
                    −{cutCount}
                  </span>
                )}
                {events > 0 && <span className="absolute right-1.5 top-1.5 w-2 h-2 rounded-full bg-orange-500" title={`${events} task${events === 1 ? '' : 's'}`} />}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-2 px-1 text-[11px] text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-100" /> Homes with bids due that day</span>
          {cuts.length > 0 && <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-100" /> Price cut expected (−)</span>}
          {highlight.size > 0 && <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-yellow-100" /> Includes a saved home</span>}
          {extraEvents.length > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Your tasks</span>}
          <span>Bids open overnight (about 1 AM Central) the next day. Extended listings take bids every business day.</span>
        </div>
      </div>

      {/* Agenda for the selected day */}
      <div className="border-t border-gray-100">
        <p className="px-5 py-2 text-xs font-semibold text-gray-600 bg-gray-50">
          {new Date(sy, sm - 1, sd).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
          {loading ? (
            <div className="flex justify-center py-6"><RefreshCw className="w-5 h-5 text-blue-600 animate-spin" /></div>
          ) : error ? (
            <p className="px-5 py-6 text-sm text-red-600 text-center">{error}</p>
          ) : !agenda.bids.length && !agenda.cuts.length && !agenda.events.length ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">Nothing scheduled this day.</p>
          ) : (
            <>
              {agenda.events.map((e, i) => {
                const body = (
                  <span className="flex items-start gap-3 px-5 py-2.5 hover:bg-gray-50">
                    <Clock className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-900 truncate">{e.label}</span>
                      {e.detail && <span className="block text-xs text-gray-500 truncate">{e.detail}</span>}
                    </span>
                  </span>
                )
                return e.href
                  ? <Link key={`e${i}`} to={e.href} className="block">{body}</Link>
                  : <button key={`e${i}`} onClick={e.onClick} className="block w-full text-left">{body}</button>
              })}
              {agenda.bids.length > 0 && (
                <p className="px-5 pt-2.5 pb-1 text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
                  Bids due · {agenda.bids.length} home{agenda.bids.length === 1 ? '' : 's'}
                </p>
              )}
              {agenda.bids.map(b => (
                <Link key={b.id} to={`/property/${b.case_number}`} className="flex items-start gap-3 px-5 py-2.5 hover:bg-gray-50">
                  <Gavel className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{b.address}, {b.city}</span>
                      <span className="text-[11px] text-gray-400 flex-shrink-0">{b.state}</span>
                      {highlight.has(b.case_number) && <span className="text-[11px] font-semibold text-yellow-700 flex-shrink-0">Saved</span>}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {money(b.price)} · {b.beds ?? '—'} bd / {b.baths ?? '—'} ba · {b.listing_period ? `${b.listing_period} · ` : ''}bids open {b.opensOn?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </span>
                </Link>
              ))}
              {agenda.cuts.length > 0 && (
                <p className="px-5 pt-2.5 pb-1 text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                  Price cut expected · {agenda.cuts.length} home{agenda.cuts.length === 1 ? '' : 's'}
                </p>
              )}
              {agenda.cuts.map(c => (
                <Link key={`cut-${c.case_number}`} to={`/property/${c.case_number}`} className="flex items-start gap-3 px-5 py-2.5 hover:bg-gray-50">
                  <TrendingDown className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{c.address}, {c.city}</span>
                      <span className="text-[11px] text-gray-400 flex-shrink-0">{c.state}</span>
                      {highlight.has(c.case_number) && <span className="text-[11px] font-semibold text-yellow-700 flex-shrink-0">Saved</span>}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {money(c.price)} → about {money(c.est_new_price)} · {c.days_at_price} days at this price · HUD usually cuts about 10% at 30 days
                    </span>
                  </span>
                </Link>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
