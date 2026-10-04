/**
 * Saved Homes on the buyer's dashboard: each saved home with its current status,
 * price change since it was saved, latest activity and last accepted offer.
 */

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Home as HomeIcon, MapPin } from 'lucide-react'
import { supabase } from '../config/supabase'
import { listSavedHomes, useSavedHomes } from '../contexts/SavedHomesContext'
import { fetchOffersByCase, formatMoney, formatDate, isUnderContract } from '../services/acceptedOffers'
import SaveHomeButton from './SaveHomeButton'
import { BidHistorySummary } from './BidHistory'

const ACTIVITY_TEXT = {
  listed: 'Listed',
  price_change: 'Price changed',
  status_change: 'Status update',
  under_contract: 'Went under contract',
  back_on_market: 'Back on the market',
}

export default function SavedHomesSection() {
  const { savedIds } = useSavedHomes()
  const [rows, setRows] = useState(null)
  const [latest, setLatest] = useState(new Map())   // case_number -> latest activity
  const [offers, setOffers] = useState(new Map())   // case_number -> accepted offers
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    listSavedHomes()
      .then(async (saved) => {
        if (cancelled) return
        setRows(saved)
        const cases = saved.map(s => s.case_number)
        if (!cases.length) return
        const [{ data: activity }, offerMap] = await Promise.all([
          supabase.from('property_activity').select('case_number, event, list_price, previous_price, status, occurred_at')
            .in('case_number', cases).order('occurred_at', { ascending: false }),
          fetchOffersByCase(cases).catch(() => new Map()),
        ])
        if (cancelled) return
        const m = new Map()
        for (const a of activity || []) if (!m.has(a.case_number)) m.set(a.case_number, a)
        setLatest(m)
        setOffers(offerMap)
      })
      .catch(e => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [])

  // Hide homes un-saved from this page right away
  const visible = (rows || []).filter(r => r.properties && savedIds.has(r.properties.id))

  return (
    <div className="bg-white rounded-lg shadow mb-8">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Heart className="h-5 w-5 fill-rose-500 text-rose-500" /> Saved Homes
          {rows && <span className="text-sm font-normal text-gray-500">({visible.length})</span>}
        </h2>
        <Link to="/search" className="text-sm font-medium text-blue-600 hover:text-blue-700">Find more homes →</Link>
      </div>

      {error ? (
        <p className="px-6 py-8 text-center text-red-600 text-sm">Could not load your saved homes.</p>
      ) : !rows ? (
        <p className="px-6 py-8 text-center text-gray-500 text-sm">Loading saved homes…</p>
      ) : visible.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <Heart className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-2 text-sm text-gray-600">
            Tap the heart on any home to save it here and follow its price and contract activity.
          </p>
        </div>
      ) : (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {visible.map(row => {
            const p = row.properties
            const sinceSave = row.price_at_save != null && p.price != null ? Number(p.price) - Number(row.price_at_save) : 0
            const act = latest.get(p.case_number)
            return (
              <div key={row.id} className="border rounded-lg overflow-hidden flex flex-col">
                <Link to={`/property/${p.case_number}`} className="block h-40 bg-gray-200 relative">
                  {p.main_image
                    ? <img src={p.main_image} alt={p.address} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><HomeIcon className="h-12 w-12 text-gray-400" /></div>}
                  {isUnderContract(p) && (
                    <span className="absolute top-2 left-2 bg-amber-500 text-white text-xs font-bold uppercase px-2 py-1 rounded">Under Contract</span>
                  )}
                  <SaveHomeButton property={p} className="absolute top-2 right-2" />
                </Link>
                <div className="p-4 flex-1 flex flex-col">
                  <Link to={`/property/${p.case_number}`} className="font-semibold text-gray-900 hover:text-blue-600">{p.address}</Link>
                  <p className="text-sm text-gray-600 flex items-center gap-1 mb-2"><MapPin className="h-3.5 w-3.5" />{p.city}, {p.state}</p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-xl font-bold text-blue-600">{formatMoney(p.price)}</span>
                    {sinceSave !== 0 && (
                      <span className={`text-sm font-semibold ${sinceSave < 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {sinceSave < 0 ? '↓' : '↑'} {formatMoney(Math.abs(sinceSave))} since saved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Saved {formatDate(row.created_at)}
                    {act && <> · {ACTIVITY_TEXT[act.event] || 'Update'} {formatDate(act.occurred_at)}</>}
                  </p>
                  <BidHistorySummary property={p} offers={offers.get(p.case_number)} signedIn />
                  <Link to={`/property/${p.case_number}`} className="mt-auto text-center text-sm font-semibold text-blue-600 border border-blue-600 rounded-lg py-2 hover:bg-blue-50">
                    View history & details
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
