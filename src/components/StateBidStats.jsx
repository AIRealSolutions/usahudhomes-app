/**
 * What HUD has accepted in a state: net to HUD vs list price, time on market, and buyer type.
 * Signed-in buyers see the numbers; visitors see a sign-up prompt. Falls back to nationwide
 * figures when the state has too few accepted bids with a known list price.
 */

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Lock, Calculator } from 'lucide-react'
import { fetchOfferStats, formatMoney, formatDate } from '../services/acceptedOffers'

const MIN_PRICED = 8

const PCT_BANDS = { 1: 'Under 70%', 2: '70–79%', 3: '80–89%', 4: '90–99%', 5: '100%+' }
const AGE_BANDS = { 1: '0–14 days', 2: '15–30 days', 3: '31–60 days', 4: '60+ days' }
const BUYER_LABELS = { 'Owner-Occupant': 'Owner-occupants', Investor: 'Investors', Other: 'Nonprofits & other' }

const pct = (r) => (r == null ? '—' : `${Math.round(Number(r) * 100)}%`)
const days = (d) => (d == null ? '—' : `${Math.round(Number(d))} days`)

function Tile({ label, value, sub }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-600">{sub}</p>}
    </div>
  )
}

/** One-series horizontal bars; value printed at the end of each bar */
function Bars({ title, rows, max }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <ul className="mt-3 space-y-2">
        {rows.map(r => (
          <li key={r.label} className="grid grid-cols-[5.5rem_1fr] sm:grid-cols-[6.5rem_1fr] items-center gap-3 text-sm" title={r.title}>
            <span className="text-gray-600">{r.label}</span>
            <span className="flex items-center gap-2">
              <span className="min-w-0 flex-1">
                <span
                  className="block h-3 rounded-r bg-blue-600"
                  style={{ width: `${max ? Math.max((r.value / max) * 100, 1) : 0}%` }}
                />
              </span>
              <span className="w-32 shrink-0 text-gray-900 sm:w-36">{r.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BidCalculator({ stats }) {
  const [listPrice, setListPrice] = useState('150000')
  const price = Number(String(listPrice).replace(/[^0-9.]/g, ''))
  const at = (ratio) => (price && ratio != null ? formatMoney(price * Number(ratio)) : '—')
  const buyers = (stats.by_buyer || []).filter(b => b.pct_p50 != null && b.buyer !== 'Other')

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 p-5">
      <h3 className="flex items-center gap-2 font-semibold text-gray-900">
        <Calculator className="h-5 w-5 text-blue-700" aria-hidden="true" /> Apply it to a list price
      </h3>
      <label className="mt-3 block text-sm text-gray-700" htmlFor="bid-stats-list-price">HUD list price</label>
      <input
        id="bid-stats-list-price"
        inputMode="numeric"
        value={listPrice}
        onChange={e => setListPrice(e.target.value)}
        className="mt-1 w-full max-w-xs rounded-md border border-gray-300 px-3 py-2"
      />
      <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <div><dt className="text-gray-600">Lower quarter ({pct(stats.pct.p25)})</dt><dd className="font-semibold">{at(stats.pct.p25)}</dd></div>
        <div><dt className="text-gray-600">Typical ({pct(stats.pct.p50)})</dt><dd className="font-semibold">{at(stats.pct.p50)}</dd></div>
        <div><dt className="text-gray-600">Upper quarter ({pct(stats.pct.p75)})</dt><dd className="font-semibold">{at(stats.pct.p75)}</dd></div>
        {buyers.map(b => (
          <div key={b.buyer}><dt className="text-gray-600">{BUYER_LABELS[b.buyer]} typical ({pct(b.pct_p50)})</dt><dd className="font-semibold">{at(b.pct_p50)}</dd></div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-gray-600">
        These are net-to-HUD amounts. Your bid price is usually higher, because HUD may pay part of
        the closing costs and the broker commission out of the price.
      </p>
    </div>
  )
}

export default function StateBidStats({ stateInfo, stateSlug, signedIn }) {
  const [state, setState] = useState(null)
  const [national, setNational] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!signedIn || !stateInfo) return
    let cancelled = false
    setState(null)
    setError(null)
    Promise.all([fetchOfferStats(stateInfo.code), fetchOfferStats(null)])
      .then(([s, n]) => { if (!cancelled) { setState(s); setNational(n) } })
      .catch(e => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [signedIn, stateInfo])

  const heading = `What HUD has accepted in ${stateInfo.name}`

  if (!signedIn) {
    return (
      <section className="mt-14 rounded-xl border border-gray-200 bg-white p-7">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <BarChart3 className="h-6 w-6 shrink-0 text-blue-700" aria-hidden="true" /> {heading}
        </h2>
        <p className="mt-3 max-w-3xl text-gray-700">
          See how far below list price accepted bids in {stateInfo.name} netted HUD, how long homes sat
          before a bid was accepted, and how owner-occupant and investor bids compare.
        </p>
        <Link
          to={`/login?signup=1&next=${encodeURIComponent(`/hud-homes/${stateSlug}`)}`}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
        >
          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" /> Create a free account to see bid statistics
        </Link>
      </section>
    )
  }

  if (error) {
    return (
      <section className="mt-14 rounded-xl border border-gray-200 bg-white p-7">
        <h2 className="text-2xl font-bold text-gray-900">{heading}</h2>
        <p className="mt-3 text-sm text-red-600">Could not load bid statistics right now.</p>
      </section>
    )
  }

  if (!state || !national) {
    return (
      <section className="mt-14 rounded-xl border border-gray-200 bg-white p-7">
        <h2 className="text-2xl font-bold text-gray-900">{heading}</h2>
        <p className="mt-3 text-sm text-gray-500">Loading bid statistics…</p>
      </section>
    )
  }

  const useNational = state.priced < MIN_PRICED
  const stats = useNational ? national : state
  if (!stats.priced) return null

  const where = useNational ? 'nationwide' : `in ${stateInfo.name}`
  const bands = (stats.pct_bands || []).map(b => ({
    label: PCT_BANDS[b.band],
    value: b.n,
    text: `${b.n} ${b.n === 1 ? 'bid' : 'bids'}`,
    title: `${b.n} of ${stats.priced} accepted bids netted HUD ${PCT_BANDS[b.band]} of list`,
  }))
  const ages = (stats.by_age || []).filter(a => a.n > 0).map(a => ({
    label: AGE_BANDS[a.band],
    value: Number(a.pct_p50),
    text: `${pct(a.pct_p50)} of list · ${a.n} ${a.n === 1 ? 'bid' : 'bids'}`,
    title: `Median net to HUD for homes accepted after ${AGE_BANDS[a.band]} on the market`,
  }))
  const buyers = (stats.by_buyer || []).filter(b => b.buyer !== 'Other')

  return (
    <section className="mt-14 rounded-xl border border-gray-200 bg-white p-7">
      <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        <BarChart3 className="h-6 w-6 shrink-0 text-blue-700" aria-hidden="true" /> {heading}
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        {useNational
          ? `Only ${state.priced} accepted ${state.priced === 1 ? 'bid' : 'bids'} with a known list price in ${stateInfo.name} so far, so these figures are nationwide: `
          : ''}
        {stats.offers} accepted bids from {formatDate(stats.first_at)} to {formatDate(stats.last_at)}, from HUD's published bid results.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Typical net to HUD" value={`${pct(stats.pct.p50)} of list`} sub={`Middle half: ${pct(stats.pct.p25)}–${pct(stats.pct.p75)}`} />
        <Tile label="Typical accepted amount" value={formatMoney(stats.net.p50)} sub={`Middle half: ${formatMoney(stats.net.p25)}–${formatMoney(stats.net.p75)}`} />
        <Tile label="Typical time on market" value={days(stats.days.p50)} sub={`Middle half: ${days(stats.days.p25)}–${days(stats.days.p75)}`} />
        <Tile
          label="Contracts that fell through"
          value={stats.fell_through}
          sub={stats.offers ? `${Math.round((stats.fell_through / stats.offers) * 100)}% of accepted bids` : null}
        />
      </div>

      {buyers.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {buyers.map(b => (
            <div key={b.buyer} className="rounded-lg border border-gray-200 p-4">
              <p className="font-semibold text-gray-900">{BUYER_LABELS[b.buyer]} · {b.n} {b.n === 1 ? 'bid' : 'bids'}</p>
              <p className="mt-1 text-sm text-gray-700">
                Typically netted HUD <strong>{pct(b.pct_p50)}</strong> of list after <strong>{days(b.days_p50)}</strong> on the market
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Bars title={`Net to HUD as a share of list price ${where}`} rows={bands} max={Math.max(...bands.map(b => b.value), 0)} />
        {ages.length > 0 && (
          <Bars title={`Typical net to HUD by time on market ${where}`} rows={ages} max={Math.max(...ages.map(a => a.value), 0)} />
        )}
      </div>

      <div className="mt-8">
        <BidCalculator stats={stats} />
      </div>

      <p className="mt-6 text-xs leading-5 text-gray-500">
        Net to HUD is what HUD receives after any closing costs and commission it agreed to pay; HUD publishes
        it for every accepted bid. Time on market is counted from when our daily HUD sync first listed the
        home, so it is a minimum. Past results do not guarantee HUD will accept a similar bid. Your broker can
        help you weigh the property's condition, comparable sales, and the current listing period.
      </p>
    </section>
  )
}
