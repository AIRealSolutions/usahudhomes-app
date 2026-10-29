/**
 * ListingTimeline — progress meter under the property photo: how long the home has been on the
 * market, the events recorded along the way, and when HUD's next price cut is expected.
 * Cut timing follows price_cut_schedule (about 10% after each 30 days at the same price) and,
 * like that view, is shown to signed-in visitors only.
 */

import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Lock, TrendingDown } from 'lucide-react'
import { fetchPropertyHistory, buildTimeline, formatMoney, formatDate, isUnderContract } from '../services/acceptedOffers'
import { PRICE_CUT } from '../lib/dealMeter'
import { EVENT_STYLE } from './BidHistory'

const DAY = 86400000
// The projected post-cut price and suggested offers stay hidden until the home has been listed this long
const SHOW_CUT_PRICE_AFTER_DAYS = 21
// How many future cuts the schedule lists, and how far ahead the target-price estimate looks (one year)
const SCHEDULE_CUTS = 3
const MAX_CUTS = 12
// Lowest offer worth suggesting once the cut lands, as a share of the projected new price.
// Owner-occupant bids often ask HUD for 3% closing costs, so their floor sits 3 points higher.
const MIN_OFFERS = [
  { label: 'Investor', ratio: 0.94 },
  { label: 'Owner-occupant', ratio: 0.97, note: 'allows for 3% closing costs' },
]
// Date-only values are read at noon so they don't slip a day across time zones
const toDate = d => (d ? new Date(String(d).length <= 10 ? `${d}T12:00:00` : d) : null)
const dayStart = d => { const x = new Date(d); x.setHours(12, 0, 0, 0); return x }
const daysBetween = (a, b) => Math.floor((dayStart(b) - dayStart(a)) / DAY)
const isCut = e => e.kind === 'price_change' && Number(e.list_price) < Number(e.previous_price)

const CUT_FACTOR = 1 - PRICE_CUT.percent / 100
const waitText = days => (days <= 0 ? 'now' : `in ~${days} day${days === 1 ? '' : 's'}`)

const LINE = '#2563eb'   // blue-600: the price line (actual solid, projected dashed)
const GRID = '#e5e7eb'   // gray-200 hairlines
const INK = '#111827', MUTED = '#6b7280'
const TARGET = '#15803d' // green-700: the buyer's price
const compactMoney = n => (n >= 1e6 ? `$${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M` : `$${Math.round(n / 1000)}K`)
function niceStep(range, count) {
  const raw = range / count, pow = Math.pow(10, Math.floor(Math.log10(raw)))
  return [1, 2, 2.5, 5, 10].map(m => m * pow).find(st => st >= raw)
}
// Price on a given day on market, from a list of {day, price} changes (a step function)
const priceOn = (steps, day) => steps.reduce((p, st) => (st.day <= day ? st.price : p), steps[0].price)

/**
 * Price against days on market: the recorded prices so far (solid) and HUD's usual cuts from here (dashed),
 * with today marked and, when the buyer enters one, their price and the day the projection reaches it.
 */
function PriceDropChart({ actual, projected, today, endDay, listedAt, target, reach }) {
  const [hover, setHover] = useState(null)
  // Drawn at its real width so text stays readable on a phone instead of shrinking with the picture
  const wrap = useRef(null)
  const [W, setW] = useState(640)
  useEffect(() => {
    const el = wrap.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const narrow = W < 480
  const H = narrow ? 220 : 250, m = { l: 48, r: narrow ? 30 : 18, t: 18, b: 34 }
  const steps = [...actual, ...projected]
  const prices = [...steps.map(st => st.price), ...(target ? [target] : [])]
  const yStep = niceStep(Math.max(...prices) - Math.min(...prices) || Math.max(...prices) * 0.2, 4)
  const yMin = Math.floor((Math.min(...prices) * 0.97) / yStep) * yStep
  const yMax = Math.ceil((Math.max(...prices) * 1.01) / yStep) * yStep
  const x = d => m.l + (d / endDay) * (W - m.l - m.r)
  const y = v => m.t + ((yMax - v) / (yMax - yMin)) * (H - m.t - m.b)
  const yTicks = []
  for (let v = yMin; v <= yMax + 1; v += yStep) yTicks.push(v)
  const xEvery = (narrow ? 2 : 1) * (endDay > 300 ? 90 : endDay > 150 ? 60 : PRICE_CUT.day)
  const xTicks = []
  for (let d = 0; d <= endDay; d += xEvery) xTicks.push(d)

  const stepPath = (pts, until) => pts.map((p, i) => (i === 0 ? `M${x(p.day)},${y(p.price)}` : `H${x(p.day)}V${y(p.price)}`)).join('') + `H${x(until)}`
  const actualPath = stepPath(actual, today)
  const projectedPath = stepPath([{ day: today, price: priceOn(actual, today) }, ...projected], endDay)
  const dateOn = d => new Date(dayStart(listedAt).getTime() + d * DAY).toISOString()

  const onMove = e => {
    const r = e.currentTarget.getBoundingClientRect()
    const vx = ((e.clientX - r.left) / r.width) * W
    const day = Math.round(Math.min(endDay, Math.max(0, ((vx - m.l) / (W - m.l - m.r)) * endDay)))
    setHover({ day, price: priceOn(steps, day), projected: day > today })
  }
  const last = projected[projected.length - 1]

  return (
    <div ref={wrap} className="relative mt-2">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block w-full h-auto touch-none select-none" role="img"
        aria-label={`List price by days on market: ${formatMoney(priceOn(actual, today))} today at day ${today}, projected ${formatMoney(last?.price)} by day ${last?.day}`}
        onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        {yTicks.map(v => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth="1" />
            <text x={m.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill={MUTED} style={{ fontVariantNumeric: 'tabular-nums' }}>{compactMoney(v)}</text>
          </g>
        ))}
        {xTicks.map(d => (
          <text key={d} x={x(d)} y={H - m.b + 16} textAnchor="middle" fontSize="11" fill={MUTED}>{d}</text>
        ))}
        <text x={W - m.r} y={H - 4} textAnchor="end" fontSize="11" fill={MUTED}>Days on market</text>

        {/* Price so far, with a light wash, then the projection */}
        <path d={`${actualPath}V${y(yMin)}H${x(0)}Z`} fill={LINE} opacity="0.08" />
        <path d={actualPath} fill="none" stroke={LINE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d={projectedPath} fill="none" stroke={LINE} strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />

        {target && (
          <g>
            <line x1={m.l} x2={W - m.r} y1={y(target)} y2={y(target)} stroke={TARGET} strokeWidth="1" />
            <text x={m.l + 6} y={y(target) - 5} fontSize="11" fill={INK}>Your price {compactMoney(target)}</text>
          </g>
        )}

        {/* Today */}
        <line x1={x(today)} x2={x(today)} y1={m.t} y2={H - m.b} stroke={INK} strokeWidth="1" opacity="0.5" />
        <circle cx={x(today)} cy={y(priceOn(actual, today))} r="5" fill={LINE} stroke="#fff" strokeWidth="2" />
        <text x={x(today) + (x(today) > W * 0.7 ? -6 : 6)} y={m.t + 10} textAnchor={x(today) > W * 0.7 ? 'end' : 'start'} fontSize="11" fontWeight="600" fill={INK}>Today · day {today}</text>

        {/* Each projected cut, labeled sparingly: price above the step */}
        {projected.map((p, i) => (
          <g key={p.day}>
            <circle cx={x(p.day)} cy={y(p.price)} r="4" fill="#fff" stroke={LINE} strokeWidth="2" />
            {((!narrow && projected.length <= 4) || i === projected.length - 1 || p === reach) && (
              <text x={x(p.day) + 5} y={y(p.price) - 7} fontSize="11" fill={INK}>{compactMoney(p.price)}</text>
            )}
          </g>
        ))}
        {reach && <circle cx={x(reach.day)} cy={y(reach.price)} r="6" fill={TARGET} stroke="#fff" strokeWidth="2" />}

        {hover && (
          <g pointerEvents="none">
            <line x1={x(hover.day)} x2={x(hover.day)} y1={m.t} y2={H - m.b} stroke={MUTED} strokeWidth="1" />
            <circle cx={x(hover.day)} cy={y(hover.price)} r="4" fill={LINE} stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute top-0 whitespace-nowrap rounded-md border bg-white px-2.5 py-1.5 text-xs shadow"
          style={{ left: `${(x(hover.day) / W) * 100}%`, transform: `translateX(${x(hover.day) > W / 2 ? 'calc(-100% - 8px)' : '8px'})` }}>
          <p className="text-gray-500">{formatDate(dateOn(hover.day))} · day {hover.day}</p>
          <p className="font-semibold text-gray-900">{formatMoney(hover.price)}{hover.projected ? ' (projected)' : ''}</p>
        </div>
      )}
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        <span className="flex items-center gap-1.5"><svg width="18" height="6"><line x1="0" x2="18" y1="3" y2="3" stroke={LINE} strokeWidth="2" /></svg>List price so far</span>
        <span className="flex items-center gap-1.5"><svg width="18" height="6"><line x1="0" x2="18" y1="3" y2="3" stroke={LINE} strokeWidth="2" strokeDasharray="5 4" /></svg>Projected: −{PRICE_CUT.percent}% every {PRICE_CUT.day} days</span>
        {target && <span className="flex items-center gap-1.5"><svg width="18" height="6"><line x1="0" x2="18" y1="3" y2="3" stroke={TARGET} strokeWidth="2" /></svg>Your price</span>}
      </div>
    </div>
  )
}

/**
 * HUD keeps cutting about 10% every 30 days a home goes unsold: a chart of the price so far and the cuts ahead,
 * and how long it would generally take for the list price to reach a price the buyer has in mind.
 */
function CutSchedule({ price, cutDue, dom, daysToCut, listedAt, priceHistory }) {
  const [target, setTarget] = useState('')
  const want = Number(String(target).replace(/[^0-9.]/g, ''))
  const needed = want > 0 && want < price ? Math.ceil(Math.log(want / price) / Math.log(CUT_FACTOR)) : 0
  const count = Math.max(SCHEDULE_CUTS, needed <= MAX_CUTS ? needed : 0)
  const cuts = Array.from({ length: count }, (_, i) => ({
    n: i + 1,
    on: new Date(cutDue.getTime() + i * PRICE_CUT.day * DAY),
    wait: daysToCut + i * PRICE_CUT.day,
    day: dom + daysToCut + i * PRICE_CUT.day,
    price: Math.round(price * Math.pow(CUT_FACTOR, i + 1)),
  }))
  const reach = needed && needed <= MAX_CUTS ? cuts[needed - 1] : null

  let answer = null
  if (want > 0) {
    if (want >= price) answer = <>It's already listed at {formatMoney(price)}, at or below your price.</>
    else if (!reach) answer = <>That would take more than {MAX_CUTS} cuts (over a year). HUD rarely lets a home sit that long.</>
    else answer = (
      <>
        About <strong>{reach.n} cut{reach.n === 1 ? '' : 's'}</strong>, down to roughly <strong className="text-green-700">{formatMoney(reach.price)}</strong>
        {' '}around <strong>{formatDate(reach.on.toISOString())}</strong> ({waitText(reach.wait)}, at {reach.day} days on market), if it hasn't sold by then.
      </>
    )
  }

  return (
    <div className="mt-3 rounded-lg border px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Price over time if it doesn't sell</p>
      <p className="text-xs text-gray-500">HUD generally cuts about {PRICE_CUT.percent}% every {PRICE_CUT.day} days, so {SCHEDULE_CUTS * PRICE_CUT.day} more days usually means {SCHEDULE_CUTS} cuts. Hover or tap the chart for any day.</p>
      <PriceDropChart actual={priceHistory} projected={cuts} today={dom} endDay={cuts[cuts.length - 1].day + 15}
        listedAt={listedAt} target={want > 0 && want < price * 1.2 ? want : null} reach={reach} />
      <label className="mt-3 block text-sm font-medium text-gray-800" htmlFor="target-price">How long until it reaches your price?</label>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <input id="target-price" inputMode="numeric" value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. 120,000"
          className="w-40 rounded-md border px-3 py-1.5 text-sm" />
        {answer && <p className="text-sm text-gray-700 flex-1 min-w-[200px]">{answer}</p>}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-gray-600">See the numbers</summary>
        <table className="mt-2 w-full text-left" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <thead><tr className="text-xs text-gray-500"><th className="py-1 font-medium">Cut</th><th className="font-medium">Around</th><th className="font-medium">Day on market</th><th className="font-medium text-right">List price</th></tr></thead>
          <tbody className="divide-y">
            <tr><td className="py-1">Today</td><td>{formatDate(new Date().toISOString())}</td><td>{dom}</td><td className="text-right">{formatMoney(price)}</td></tr>
            {cuts.map(c => (
              <tr key={c.n}><td className="py-1">{c.n}</td><td>{formatDate(c.on.toISOString())}</td><td>{c.day}</td><td className="text-right">{formatMoney(c.price)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

function eventLabel(e) {
  if (e.kind === 'price_change') {
    const diff = Number(e.list_price) - Number(e.previous_price)
    return `${diff < 0 ? 'Price cut' : 'Price increase'} to ${formatMoney(e.list_price)}`
  }
  if (e.kind === 'offer_accepted') return `Offer accepted · ${formatMoney(e.offer?.net_to_hud)} net`
  if (e.kind === 'listed') return `Listed at ${formatMoney(e.list_price)}`
  if (e.kind === 'status_change') return `Status: ${e.status}`
  return (EVENT_STYLE[e.kind] || EVENT_STYLE.status_change).title
}

export default function ListingTimeline({ property, signedIn }) {
  const [history, setHistory] = useState(null)
  const [active, setActive] = useState(null)

  useEffect(() => {
    if (!property?.case_number) return
    let cancelled = false
    setHistory(null)
    fetchPropertyHistory(property.case_number, { withOffers: signedIn })
      .then(h => { if (!cancelled) setHistory(h) })
      .catch(() => { if (!cancelled) setHistory({ activity: [], offers: [] }) })
    return () => { cancelled = true }
  }, [signedIn, property?.case_number])

  const events = history ? buildTimeline(history).filter(e => toDate(e.at)).reverse() : [] // oldest first
  const today = new Date()
  const listedAt = toDate(property.listing_date) || toDate(events.find(e => e.kind === 'listed')?.at)
  const start = [listedAt, ...events.map(e => toDate(e.at))].filter(Boolean).sort((a, b) => a - b)[0]

  if (!history) {
    return <div className="bg-white border rounded-lg p-5 mb-8 text-sm text-gray-500">Loading listing timeline…</div>
  }
  if (!start) return null

  const dom = listedAt ? daysBetween(listedAt, today) : null
  const underContract = isUnderContract(property)

  // Same rule as price_cut_schedule: the clock restarts at the last price change
  const lastChange = events.filter(e => e.kind === 'price_change').map(e => toDate(e.at)).pop()
  const priceSince = [listedAt, lastChange].filter(Boolean).sort((a, b) => b - a)[0] || start
  const daysAtPrice = Math.max(0, daysBetween(priceSince, today))
  const cutDue = new Date(dayStart(priceSince).getTime() + (Math.floor(daysAtPrice / PRICE_CUT.day) + 1) * PRICE_CUT.day * DAY)
  const daysToCut = daysBetween(today, cutDue)
  const cutPriceVisible = dom !== null && dom > SHOW_CUT_PRICE_AFTER_DAYS
  const estNewPrice = cutPriceVisible && Number(property.price) > 0 ? Math.round(Number(property.price) * (1 - PRICE_CUT.percent / 100)) : null
  const minOffers = estNewPrice ? MIN_OFFERS.map(o => ({ ...o, amount: Math.round(estNewPrice * o.ratio) })) : null
  const showCut = !underContract && Number(property.price) > 0

  // The meter runs from the first record to the projected cut (or to today while under contract)
  const end = showCut ? cutDue : today
  const span = Math.max(1, dayStart(end) - dayStart(start))
  const pos = d => Math.min(100, Math.max(0, ((dayStart(d) - dayStart(start)) / span) * 100))
  const todayPct = pos(today)
  const priceSincePct = pos(priceSince)

  const cuts = events.filter(isCut)
  const firstPrice = Number(property.original_list_price) || Number(events.find(e => e.kind === 'listed')?.list_price) || null
  // List price by day on market, for the chart: the first price, then each recorded change
  const priceHistory = listedAt ? [
    { day: 0, price: firstPrice || Number(property.price) },
    ...events.filter(e => e.kind === 'price_change' && Number(e.list_price) > 0)
      .map(e => ({ day: Math.max(0, daysBetween(listedAt, toDate(e.at))), price: Number(e.list_price) })),
  ] : []
  // If the recorded history missed a change, the line still ends at today's actual price
  if (priceHistory.length && dom !== null && Number(property.price) > 0 && priceHistory[priceHistory.length - 1].price !== Number(property.price)) {
    priceHistory.push({ day: dom, price: Number(property.price) })
  }
  const totalCutPct = firstPrice && Number(property.price) < firstPrice ? Math.round((1 - Number(property.price) / firstPrice) * 100) : 0
  const selected = active != null ? events[active] : null

  return (
    <div className="bg-white border rounded-lg p-5 mb-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><Clock className="h-5 w-5 text-blue-600" /> Listing Timeline</h2>
        {dom !== null && <p className="text-sm text-gray-600">Listed {formatDate(listedAt.toISOString())}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Days on market</p>
          <p className="text-lg font-bold">{dom ?? '—'}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Price cuts</p>
          <p className="text-lg font-bold">{cuts.length}{totalCutPct > 0 && <span className="text-sm font-semibold text-green-700"> (−{totalCutPct}%)</span>}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Days at this price</p>
          <p className="text-lg font-bold">{daysAtPrice}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Next price cut</p>
          {underContract ? <p className="text-sm font-semibold text-amber-700">Paused · under contract</p>
            : !signedIn ? <p className="text-sm font-semibold text-blue-700 flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Members</p>
            : <p className="text-lg font-bold">{daysToCut <= 0 ? 'Due now' : `~${daysToCut} day${daysToCut === 1 ? '' : 's'}`}</p>}
        </div>
      </div>

      {/* Progress meter with recorded events */}
      <div className="relative pt-2 pb-10 px-1.5">
        <div className="relative h-3 rounded-full bg-gray-200">
          <div className="absolute inset-y-0 left-0 rounded-full bg-blue-200" style={{ width: `${todayPct}%` }} />
          {/* The current 30-day cycle at this price, filling toward the cut */}
          {showCut && (
            <div className={`absolute inset-y-0 rounded-full ${daysToCut <= 5 ? 'bg-amber-500' : 'bg-blue-600'}`}
              style={{ left: `${priceSincePct}%`, width: `${Math.max(0, todayPct - priceSincePct)}%` }} />
          )}
          {underContract && <div className="absolute inset-y-0 left-0 rounded-full bg-amber-400" style={{ width: '100%' }} />}

          {events.map((e, i) => {
            const style = EVENT_STYLE[e.kind] || EVENT_STYLE.status_change
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => setActive(active === i ? null : i)}
                title={`${formatDate(e.at)} · ${eventLabel(e)}`}
                aria-label={`${formatDate(e.at)}: ${eventLabel(e)}`}
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 rounded-full ring-2 ring-white shadow ${style.dot} ${active === i ? 'scale-125 ring-gray-900' : 'hover:scale-125'} transition-transform`}
                style={{ left: `${pos(toDate(e.at))}%` }}
              />
            )
          })}

          {/* Today */}
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-1 rounded bg-gray-900" style={{ left: `${todayPct}%` }} />
          {showCut && (
            <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 h-5 w-5 rounded-full border-2 border-dashed border-green-600 bg-white flex items-center justify-center">
              <TrendingDown className="h-3 w-3 text-green-700" />
            </div>
          )}
        </div>

        <span className="absolute left-0 top-8 text-xs text-gray-500">{formatDate(start.toISOString())}</span>
        {showCut && todayPct > 15 && todayPct < 75 && (
          <span className="absolute top-8 -translate-x-1/2 text-xs font-semibold text-gray-900" style={{ left: `${todayPct}%` }}>Today</span>
        )}
        <span className="absolute right-0 top-8 text-xs font-semibold text-right text-gray-900">
          {showCut ? (signedIn ? <>Next cut ~{formatDate(cutDue.toISOString())}</> : 'Next cut') : 'Today'}
        </span>
      </div>

      {selected && (
        <div className="mb-4 rounded-lg bg-gray-50 border px-3 py-2 text-sm">
          <span className="text-gray-500">{formatDate(selected.at)}</span> · <span className="font-semibold">{eventLabel(selected)}</span>
        </div>
      )}

      {showCut && (signedIn ? (
        <p className="text-sm text-gray-700">
          Day <strong>{daysAtPrice}</strong> of {PRICE_CUT.day} at {formatMoney(property.price)}.{' '}
          {daysToCut <= 0
            ? <>HUD's usual {PRICE_CUT.percent}% cut is due now</>
            : <>If it doesn't sell, HUD typically cuts about {PRICE_CUT.percent}% around <strong>{formatDate(cutDue.toISOString())}</strong></>}
          {estNewPrice && <> — to roughly <strong className="text-green-700">{formatMoney(estNewPrice)}</strong></>}.
          {!cutPriceVisible && dom !== null && (
            <span className="block mt-1 text-gray-500">
              The projected price and minimum suggested offers appear after {SHOW_CUT_PRICE_AFTER_DAYS} days on the market
              {' '}(in {SHOW_CUT_PRICE_AFTER_DAYS + 1 - dom} day{SHOW_CUT_PRICE_AFTER_DAYS + 1 - dom === 1 ? '' : 's'}).
            </span>
          )}
        </p>
      ) : null)}
      {showCut && signedIn && minOffers && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-800">Minimum suggested offer at the price cut</p>
          <p className="text-xs text-green-900">
            {formatMoney(property.price)} − {PRICE_CUT.percent}% = {formatMoney(estNewPrice)}, then {MIN_OFFERS.map(o => `${Math.round(o.ratio * 100)}%`).join('–')} of that
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {minOffers.map(o => (
              <div key={o.label} className="rounded-md bg-white/70 px-3 py-2">
                <p className="text-xs font-semibold text-green-800">{o.label} · {Math.round(o.ratio * 100)}%</p>
                <p className="text-2xl font-bold text-green-800">{formatMoney(o.amount)}</p>
                {o.note && <p className="text-xs text-green-900">{o.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {showCut && signedIn && estNewPrice && (
        <CutSchedule price={Number(property.price)} cutDue={cutDue} dom={dom} daysToCut={daysToCut} listedAt={listedAt} priceHistory={priceHistory} />
      )}
      {showCut && !signedIn && (
        <Link to={`/login?signup=1&next=${encodeURIComponent(`/property/${property.case_number}`)}`}
          className="inline-flex items-center gap-1.5 text-sm text-blue-700 bg-blue-50 rounded px-3 py-2 hover:bg-blue-100">
          <Lock className="h-4 w-4" /> Free account: see when HUD's next price cut is expected, the projected price and the minimum suggested offer
        </Link>
      )}

      {events.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-600">
          {events.map((e, i) => (
            <li key={e.id}>
              <button type="button" onClick={() => setActive(active === i ? null : i)} className="flex items-center gap-1.5 hover:text-gray-900">
                <span className={`h-2.5 w-2.5 rounded-full ${(EVENT_STYLE[e.kind] || EVENT_STYLE.status_change).dot}`} />
                {formatDate(e.at)} · {eventLabel(e)}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-gray-400">Projected cuts are estimates based on HUD's usual schedule, not a HUD commitment.</p>
    </div>
  )
}
