/**
 * Bid history shown to signed-in buyers: what HUD accepted on a home before.
 * BidHistorySummary — one line on a search result card
 * BidHistoryPanel   — the full contract history on the property page
 */

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gavel, Lock } from 'lucide-react'
import {
  fetchPropertyHistory, formatMoney, formatDate, percentOfList, isUnderContract, OUTCOME_LABELS,
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

export function BidHistoryPanel({ property, signedIn, onUnlock }) {
  const [history, setHistory] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!signedIn || !property?.case_number) return
    let cancelled = false
    fetchPropertyHistory(property.case_number)
      .then(h => { if (!cancelled) setHistory(h) })
      .catch(e => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [signedIn, property?.case_number])

  if (!signedIn) {
    return (
      <div className="bg-white border rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Gavel className="h-6 w-6 text-amber-600" /> Bid History</h2>
        <p className="text-gray-700 mb-4">
          See what HUD accepted on this home: the net-to-HUD amount, buyer type, and every time it went under contract.
          Bid history is free for registered buyers.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to={signUpLink(property.case_number)} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700">
            Create free account
          </Link>
          {onUnlock && (
            <button onClick={onUnlock} className="px-5 py-2 rounded-lg font-semibold border border-blue-600 text-blue-600 hover:bg-blue-50">
              Unlock details
            </button>
          )}
        </div>
      </div>
    )
  }

  const offers = history?.offers || []
  const contractEvents = (history?.events || []).filter(e => e.event === 'under_contract').length
  const relists = (history?.events || []).filter(e => e.event === 'back_on_market').length

  return (
    <div className="bg-white border rounded-lg p-6 mb-8">
      <h2 className="text-2xl font-bold mb-1 flex items-center gap-2"><Gavel className="h-6 w-6 text-amber-600" /> Bid History</h2>
      <p className="text-sm text-gray-500 mb-4">Accepted offers published by HUD for case #{property.case_number}.</p>

      {error ? (
        <p className="text-red-600 text-sm">Could not load bid history.</p>
      ) : !history ? (
        <p className="text-gray-500 text-sm">Loading bid history…</p>
      ) : offers.length === 0 ? (
        <p className="text-gray-600 text-sm">
          No accepted offers on record for this home yet.
          {isUnderContract(property) && ' It went under contract before we started tracking accepted bids; terms appear here once HUD publishes them.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-4 font-medium">Accepted</th>
                <th className="py-2 pr-4 font-medium">Net to HUD</th>
                <th className="py-2 pr-4 font-medium">% of list</th>
                <th className="py-2 pr-4 font-medium">Buyer type</th>
                <th className="py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(o => {
                const pct = percentOfList(o, property.price)
                return (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap">{formatDate(o.accepted_at)}</td>
                    <td className="py-2 pr-4 font-semibold whitespace-nowrap">{formatMoney(o.net_to_hud)}</td>
                    <td className="py-2 pr-4">{pct ? `${pct}%` : '—'}</td>
                    <td className="py-2 pr-4">{o.purchaser_type || '—'}</td>
                    <td className="py-2">{OUTCOME_LABELS[o.outcome] || o.outcome}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {history && (contractEvents > 0 || relists > 0) && (
        <p className="text-sm text-gray-600 mt-4">
          Our listing sync has seen this home go under contract {contractEvents} {contractEvents === 1 ? 'time' : 'times'}
          {relists > 0 && ` and return to market ${relists} ${relists === 1 ? 'time' : 'times'}`}.
        </p>
      )}
      <p className="text-xs text-gray-400 mt-4">
        Net to HUD is what HUD receives after any closing costs and commissions it agreed to pay, so the contract price is usually higher.
      </p>
    </div>
  )
}
