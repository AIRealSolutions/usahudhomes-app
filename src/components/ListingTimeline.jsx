/**
 * ListingTimeline — progress meter under the property photo: how long the home has been on the
 * market, the events recorded along the way, and when HUD's next price cut is expected.
 * Cut timing follows price_cut_schedule (about 10% after each 30 days at the same price) and,
 * like that view, is shown to signed-in visitors only.
 */

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Lock, TrendingDown } from 'lucide-react'
import { fetchPropertyHistory, buildTimeline, formatMoney, formatDate, isUnderContract } from '../services/acceptedOffers'
import { PRICE_CUT } from '../lib/dealMeter'
import { EVENT_STYLE } from './BidHistory'

const DAY = 86400000
// Lowest offer worth suggesting once the cut lands: 94% of the projected new price
const MIN_OFFER_RATIO = 0.94
// Date-only values are read at noon so they don't slip a day across time zones
const toDate = d => (d ? new Date(String(d).length <= 10 ? `${d}T12:00:00` : d) : null)
const dayStart = d => { const x = new Date(d); x.setHours(12, 0, 0, 0); return x }
const daysBetween = (a, b) => Math.floor((dayStart(b) - dayStart(a)) / DAY)
const isCut = e => e.kind === 'price_change' && Number(e.list_price) < Number(e.previous_price)

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
  const estNewPrice = Number(property.price) > 0 ? Math.round(Number(property.price) * (1 - PRICE_CUT.percent / 100)) : null
  const minOffer = estNewPrice ? Math.round(estNewPrice * MIN_OFFER_RATIO) : null
  const showCut = !underContract && Number(property.price) > 0

  // The meter runs from the first record to the projected cut (or to today while under contract)
  const end = showCut ? cutDue : today
  const span = Math.max(1, dayStart(end) - dayStart(start))
  const pos = d => Math.min(100, Math.max(0, ((dayStart(d) - dayStart(start)) / span) * 100))
  const todayPct = pos(today)
  const priceSincePct = pos(priceSince)

  const cuts = events.filter(isCut)
  const firstPrice = Number(property.original_list_price) || Number(events.find(e => e.kind === 'listed')?.list_price) || null
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
        </p>
      ) : null)}
      {showCut && signedIn && minOffer && (
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-800">Minimum suggested offer at the price cut</p>
            <p className="text-xs text-green-900">{formatMoney(property.price)} − {PRICE_CUT.percent}% = {formatMoney(estNewPrice)} × {Math.round(MIN_OFFER_RATIO * 100)}%</p>
          </div>
          <p className="text-2xl font-bold text-green-800">{formatMoney(minOffer)}</p>
        </div>
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
