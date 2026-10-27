/**
 * Buyer dashboard: offers the buyer's broker built for them. Each opens on
 * /offer/:token, where they accept, ask for changes, decline or save it.
 */

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileSignature, Heart } from 'lucide-react'
import { supabase } from '../config/supabase'

const money = n => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const STATUS = {
  sent: ['Ready for your review', 'bg-sky-100 text-sky-800'],
  changes_requested: ['You asked for changes', 'bg-amber-100 text-amber-800'],
  accepted: ['Accepted', 'bg-emerald-100 text-emerald-800'],
  submitted: ['Bid submitted to HUD', 'bg-indigo-100 text-indigo-800'],
  declined: ['Declined', 'bg-gray-100 text-gray-700'],
  withdrawn: ['Withdrawn', 'bg-gray-100 text-gray-500'],
}

export default function BrokerOffersSection() {
  const [offers, setOffers] = useState([])

  useEffect(() => {
    let active = true
    // RLS returns only offers sent to this buyer's account
    supabase.from('broker_offer_proposals')
      .select('id, share_token, case_number, status, offer_price, asking_price, is_favorite, updated_at')
      .neq('status', 'withdrawn')
      .order('updated_at', { ascending: false })
      .then(({ data }) => { if (active) setOffers(data || []) })
    return () => { active = false }
  }, [])

  if (!offers.length) return null
  const waiting = offers.filter(o => o.status === 'sent').length

  return (
    <section className="bg-white rounded-xl shadow p-6">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
        <FileSignature className="h-5 w-5 text-emerald-600" /> Offers from your broker
        {waiting > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{waiting} to review</span>}
      </h2>
      <div className="mt-4 space-y-3">
        {offers.map(o => (
          <Link key={o.id} to={`/offer/${o.share_token}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 hover:bg-gray-50">
            <div>
              <p className="font-semibold">{money(o.offer_price)} offer · HUD {o.case_number}</p>
              {o.asking_price && <p className="text-sm text-gray-500">Asking {money(o.asking_price)}</p>}
            </div>
            <div className="flex items-center gap-2">
              {o.is_favorite && <Heart className="h-4 w-4 fill-rose-600 text-rose-600" aria-label="In your favorites" />}
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[o.status]?.[1]}`}>{STATUS[o.status]?.[0]}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
