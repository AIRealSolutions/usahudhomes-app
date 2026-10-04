/**
 * Bid history shown to signed-in buyers: what HUD accepted on a home before.
 * BidHistorySummary — one line on a search result card
 * PropertyHistoryPanel — price summary and activity timeline on the property page
 */

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gavel, Lock, Clock } from 'lucide-react'
import {
  fetchPropertyHistory, buildTimeline, priceChange, formatMoney, formatDate, percentOfList, isUnderContract, OUTCOME_LABELS,
} from '../services/acceptedOffers'

const signUpLink = (caseNumber) => `/login?signup=1&next=${encodeURIComponent(`/property/${caseNumber}`)}`

export function BidHistorySummary({ property, offers, signedIn }) {
  if (!signedIn) {
    if (!isUnderContract(property)) return null
    return (
      <Link to={signUpLink(property.case_number)} className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 rounded px-2 py-1.5 mb-4 hover:bg-blue-100">
        <Lock className="h-3.5 w-3.5 shrink-0" /> Free account: see the accepted bid
      </Link>
    )
  }
  if (!offers?.length) return null
  const latest = offers[0]
  const pct = percentOfList(latest, property.price)
  return (
    <div className="text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-4 text-amber-900">
      <div className="flex items-center gap-1.5 font-semibold">
        <Gavel className="h-3.5 w-3.5 shrink-0" />
        Accepted {formatMoney(latest.net_to_hud)} net{pct ? ` · ${pct}% of list` : ''}
      </div>
      <div className="mt-0.5 text-amber-800">
        {latest.purchaser_type || 'Buyer'} · {formatDate(latest.accepted_at)}
        {latest.outcome === 'fell_through' && ' · fell through'}
        {offers.length > 1 && ` · ${offers.length} contracts on record`}
      </div>
    </div>
  )
}

const EVENT_STYLE = {
  listed:          { dot: 'bg-blue-500',    title: 'Listed by HUD' },
  price_change:    { dot: 'bg-green-500',   title: 'Price change' },
  status_change:   { dot: 'bg-gray-400',    title: 'Status update' },
  under_contract:  { dot: 'bg-amber-500',   title: 'Went under contract' },
  offer_accepted:  { dot: 'bg-amber-600',   title: 'Offer accepted by HUD' },
  back_on_market:  { dot: 'bg-purple-500',  title: 'Back on the market' },
}

function TimelineDetail({ item, property, signedIn }) {
  switch (item.kind) {
    case 'listed':
      return <>Listed at {formatMoney(item.list_price)}</>
    case 'price_change': {
      const diff = Number(item.list_price) - Number(item.previous_price)
      const pct = item.previous_price ? Math.round((diff / Number(item.previous_price)) * 100) : null
      return (
        <>
          {formatMoney(item.previous_price)} → <strong>{formatMoney(item.list_price)}</strong>{' '}
          <span className={diff < 0 ? 'text-green-700' : 'text-red-700'}>
            ({diff < 0 ? '−' : '+'}{formatMoney(Math.abs(diff))}{pct ? `, ${pct > 0 ? '+' : ''}${pct}%` : ''})
          </span>
        </>
      )
    }
    case 'status_change':
      return <>HUD status: {item.status}</>
    case 'under_contract':
      return <>Removed from HUD's available list at {formatMoney(item.list_price)}</>
    case 'back_on_market':
      return <>Relisted at {formatMoney(item.list_price)}; the previous contract did not close</>
    case 'offer_accepted': {
      if (!signedIn) {
        return (
          <Link to={signUpLink(property.case_number)} className="inline-flex items-center gap-1 text-blue-700 hover:underline">
            <Lock className="h-3.5 w-3.5" /> Create a free account to see the accepted amount and buyer type
          </Link>
        )
      }
      const o = item.offer
      const pct = percentOfList(o, property.price)
      return (
        <>
          <strong>{formatMoney(o.net_to_hud)}</strong> net to HUD{pct ? ` (${pct}% of list)` : ''} · {o.purchaser_type || 'Buyer'}
          {o.outcome !== 'pending' && <> · {OUTCOME_LABELS[o.outcome]}</>}
        </>
      )
    }
    default:
      return null
  }
}

/** Price summary plus a timeline of everything that has happened to the home */
export function PropertyHistoryPanel({ property, signedIn }) {
  const [history, setHistory] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!property?.case_number) return
    let cancelled = false
    setHistory(null)
    fetchPropertyHistory(property.case_number, { withOffers: signedIn })
      .then(h => { if (!cancelled) setHistory(h) })
      .catch(e => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [signedIn, property?.case_number])

  const timeline = history ? buildTimeline(history) : []
  // Visitors see that an offer was accepted when the home went under contract, without the terms
  if (history && !signedIn && isUnderContract(property) && !timeline.some(t => t.kind === 'offer_accepted')) {
    const uc = timeline.find(t => t.kind === 'under_contract')
    if (uc) timeline.splice(timeline.indexOf(uc) + 1, 0, { kind: 'offer_accepted', at: uc.at, id: 'offer-locked' })
  }
  const change = priceChange(property)
  const contracts = timeline.filter(t => t.kind === 'under_contract').length
  const reductions = timeline.filter(t => t.kind === 'price_change' && Number(t.list_price) < Number(t.previous_price)).length

  return (
    <div className="bg-white border rounded-lg p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Clock className="h-6 w-6 text-blue-600" /> Price &amp; Activity History</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">First list price</p>
          <p className="font-semibold">{formatMoney(property.original_list_price || property.price)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Current price</p>
          <p className="font-semibold">{formatMoney(property.price)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Change</p>
          <p className={`font-semibold ${change ? (change.amount < 0 ? 'text-green-700' : 'text-red-700') : ''}`}>
            {change ? `${change.amount < 0 ? '−' : '+'}${formatMoney(Math.abs(change.amount))} (${change.percent}%)` : 'None'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Times under contract</p>
          <p className="font-semibold">{history ? contracts : '—'}</p>
        </div>
      </div>

      {error ? (
        <p className="text-red-600 text-sm">Could not load the history for this home.</p>
      ) : !history ? (
        <p className="text-gray-500 text-sm">Loading history…</p>
      ) : timeline.length === 0 ? (
        <p className="text-gray-600 text-sm">No activity recorded yet.</p>
      ) : (
        <ol className="relative border-l-2 border-gray-200 ml-2">
          {timeline.map(item => {
            const style = EVENT_STYLE[item.kind] || EVENT_STYLE.status_change
            const title = item.kind === 'price_change' && Number(item.list_price) < Number(item.previous_price) ? 'Price reduced'
              : item.kind === 'price_change' ? 'Price increased' : style.title
            return (
              <li key={item.id} className="ml-5 mb-5 last:mb-0">
                <span className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full ring-4 ring-white ${style.dot}`} />
                <p className="text-xs text-gray-500">{formatDate(item.at)}</p>
                <p className="font-semibold text-gray-900">{title}</p>
                <p className="text-sm text-gray-700"><TimelineDetail item={item} property={property} signedIn={signedIn} /></p>
              </li>
            )
          })}
        </ol>
      )}

      {history && (reductions > 0 || contracts > 1) && (
        <p className="text-sm text-gray-600 mt-5">
          {reductions > 0 && `${reductions} price ${reductions === 1 ? 'reduction' : 'reductions'} recorded. `}
          {contracts > 1 && `This home has gone under contract ${contracts} times.`}
        </p>
      )}
      {signedIn && history?.offers?.length > 0 && (
        <p className="text-xs text-gray-400 mt-4">
          Net to HUD is what HUD receives after any closing costs and commissions it agreed to pay, so the contract price is usually higher.
        </p>
      )}
    </div>
  )
}
