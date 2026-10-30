/**
 * /offer/:token — an offer a broker built for this buyer. Opened from the broker's
 * email or text, or from the buyer's dashboard. No account needed: the token is the
 * key. The buyer can accept (authorizing the broker to submit the bid), ask for
 * changes, decline, or save it to their favorites (their Saved Homes, when they
 * have an account).
 */

import React, { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Heart } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { DealMeterChip } from '../components/DealMeter'
import { waitLabel } from '../lib/dealMeter'
import { getOfferByToken, respondToOffer } from '../services/offerProposals'
import { offerPagePath } from '../services/offerDocuments'

const money = n => (n == null ? '—' : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }))
const when = d => (d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '')
const FINANCING = { fha: 'FHA', '203k': 'FHA 203(k) rehab', conventional: 'Conventional', cash: 'Cash' }

const OUTCOMES = {
  accepted: ['border-emerald-300 bg-emerald-50 text-emerald-950', 'You accepted this offer', 'Your broker has been notified and will submit your bid to HUD.'],
  submitted: ['border-indigo-300 bg-indigo-50 text-indigo-950', 'Your bid was submitted to HUD', 'Your broker will let you know as soon as HUD posts results.'],
  declined: ['border-gray-300 bg-gray-50 text-gray-800', 'You declined this offer', 'Changed your mind? Contact your broker for an updated offer.'],
  withdrawn: ['border-gray-300 bg-gray-50 text-gray-800', 'This offer was withdrawn', 'Your broker withdrew this offer. Contact them with any questions.'],
}

export default function BrokerOfferPage() {
  const { token } = useParams()
  const { isAuthenticated } = useAuth()
  const [offer, setOffer] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [favBusy, setFavBusy] = useState(false)
  const [favNote, setFavNote] = useState('')

  const load = useCallback(async () => {
    try {
      setOffer(await getOfferByToken(token))
      setLoadError('')
    } catch (e) {
      setLoadError(e.message)
    }
  }, [token])
  // Signing in reveals the street address, so reload when that changes
  useEffect(() => { load() }, [load, isAuthenticated])

  const toggleFavorite = async () => {
    setFavBusy(true); setFavNote('')
    try {
      const r = await respondToOffer(token, offer.is_favorite ? 'unfavorite' : 'favorite')
      setOffer(o => ({ ...o, is_favorite: r.is_favorite }))
      if (r.is_favorite) setFavNote(r.savedToAccount ? 'Saved to your favorites. It is also in Saved Homes on your dashboard.' : 'Saved. Create a free account with this email to keep it in your Saved Homes.')
    } catch (e) {
      setFavNote(e.message)
    } finally {
      setFavBusy(false)
    }
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Offer not found</h1>
        <p className="mt-2 text-gray-600">{loadError} Ask your broker for a new link.</p>
      </div>
    )
  }
  if (!offer) return <div className="max-w-3xl mx-auto px-4 py-16 text-gray-500">Loading your offer…</div>

  const p = offer.property || {}
  const agentName = offer.agent ? `${offer.agent.first_name || ''} ${offer.agent.last_name || ''}`.trim() : 'your broker'
  const actionable = ['sent', 'changes_requested'].includes(offer.status)
  const outcome = OUTCOMES[offer.status]
  const ratio = offer.asking_price ? Number(offer.offer_price) / Number(offer.asking_price) : null
  const closing = Number(offer.offer_price) * Number(offer.closing_cost_percent) / 100

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Helmet><title>Your HUD home offer | USAHUDhomes</title><meta name="robots" content="noindex" /></Helmet>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">{offer.buyerName ? `Prepared for ${offer.buyerName} by ${agentName}` : `Prepared by ${agentName}`}</p>
          <h1 className="text-3xl font-bold">Your offer: {money(offer.offer_price)}</h1>
          {p.bid_deadline && actionable && <p className="text-sm font-medium text-amber-700">HUD bid deadline {when(p.bid_deadline)}</p>}
        </div>
        {offer.status !== 'withdrawn' && (
          <button type="button" disabled={favBusy} onClick={toggleFavorite} aria-pressed={offer.is_favorite}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-semibold disabled:opacity-50 ${offer.is_favorite ? 'border-rose-300 bg-rose-50 text-rose-700' : 'bg-white hover:bg-gray-50'}`}>
            <Heart className={`h-4 w-4 ${offer.is_favorite ? 'fill-rose-600 text-rose-600' : ''}`} />
            {offer.is_favorite ? 'Saved to favorites' : 'Save to favorites'}
          </button>
        )}
      </div>
      {favNote && <p role="status" className="text-sm text-gray-700">{favNote}</p>}

      {outcome && (
        <div className={`rounded-xl border p-5 ${outcome[0]}`}>
          <p className="font-semibold">{outcome[1]}</p>
          <p className="text-sm mt-1">{outcome[2]}</p>
          {offer.accepted_signature && ['accepted', 'submitted'].includes(offer.status) && <p className="text-xs mt-2">Signed “{offer.accepted_signature}” on {when(offer.responded_at)}</p>}
        </div>
      )}
      {offer.status === 'changes_requested' && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
          <p className="font-semibold">You asked for changes</p>
          {offer.buyer_note && <p className="text-sm mt-1">“{offer.buyer_note}”</p>}
          <p className="text-sm mt-2">{agentName} will send revised terms. You can still accept this version below.</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {p.main_image && <img src={p.main_image} alt="" className="h-56 w-full object-cover sm:h-72" />}
        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-500">HUD case {offer.case_number}{[p.beds && `${p.beds} bd`, p.baths && `${p.baths} ba`, p.sq_ft && `${Number(p.sq_ft).toLocaleString()} sq ft`].filter(Boolean).map(x => ` · ${x}`).join('')}</p>
            <h2 className="text-xl font-bold">{p.address ? `${p.address}, ` : ''}{[p.city, p.state].filter(Boolean).join(', ')} {p.zip_code || ''}</h2>
            {!p.address && !offer.signedIn && <p className="text-sm"><Link className="text-blue-700 underline" to={`/login?next=${encodeURIComponent(`/offer/${token}`)}`}>Sign in</Link> to see the street address.</p>}
            <p className="text-sm text-gray-600">HUD asking price {money(offer.asking_price ?? p.price)} · <Link className="text-blue-700 underline" to={`/property/${encodeURIComponent(offer.case_number)}`}>View the home</Link>{offer.signedIn && offer.status !== 'draft' && <> · <Link className="text-blue-700 underline" to={offerPagePath('proposal', offer.id)}>Documents &amp; timeline</Link></>}</p>
          </div>

          <div className="grid gap-4 rounded-lg bg-blue-50 p-4 sm:grid-cols-3">
            <div><p className="text-xs uppercase text-gray-500">Offer price</p><p className="text-2xl font-bold text-blue-800">{money(offer.offer_price)}</p>{ratio && <p className="text-xs text-gray-600">{(ratio * 100).toFixed(1)}% of asking</p>}</div>
            <div><p className="text-xs uppercase text-gray-500">Closing costs paid by HUD</p><p className="text-lg font-semibold">{money(closing)}</p><p className="text-xs text-gray-600">{Number(offer.closing_cost_percent)}% requested</p></div>
            <div><p className="text-xs uppercase text-gray-500">Earnest money deposit</p><p className="text-lg font-semibold">{money(offer.earnest_money)}</p></div>
          </div>

          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {[
              ['Buying as', offer.occupancy === 'owner' ? 'Owner occupant' : 'Investor'],
              ['Financing', FINANCING[offer.financing] || offer.financing],
              ['Est. net to HUD', money(offer.est_net_to_hud)],
              ['Commissions (listing / buyer broker)', `${Number(offer.listing_commission_percent)}% / ${Number(offer.buyer_commission_percent)}%`],
              offer.accept_wait_days != null && ['Typical time to acceptance', waitLabel(offer.accept_wait_days)],
            ].filter(Boolean).map(([k, v]) => <div key={k} className="flex justify-between gap-3 border-b border-gray-100 py-1"><dt className="text-gray-500">{k}</dt><dd className="font-medium text-right">{v}</dd></div>)}
          </dl>
          {offer.deal_meter_score != null && <p className="flex flex-wrap items-center gap-2 text-sm">Deal meter <DealMeterChip score={offer.deal_meter_score} />{offer.deal_meter_basis && <span className="text-xs text-gray-500">vs {offer.deal_meter_sample} {offer.deal_meter_basis}</span>}</p>}
          {offer.financing_estimate?.scenarios?.length > 0 && (
            <div className="text-sm">
              <p className="font-semibold">Estimated payment at {money(offer.financing_estimate.price)} ({offer.financing_estimate.term_years} yr)</p>
              <div className="grid sm:grid-cols-3 gap-2 mt-1">{offer.financing_estimate.scenarios.map(f => <div key={f.label} className="rounded border bg-gray-50 p-2"><p className="text-xs text-gray-600">{f.label} · {f.rate}%</p><strong>{money(f.monthly_total)}/mo</strong><p className="text-xs">{money(f.cash_to_close)} cash to close</p></div>)}</div>
            </div>
          )}
        </div>
      </div>

      {offer.broker_message && (
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-sm font-semibold text-gray-500">Note from {agentName}</p>
          <p className="mt-2 whitespace-pre-wrap">{offer.broker_message}</p>
        </div>
      )}

      {actionable && <ResponsePanel token={token} offer={offer} agentName={agentName} onDone={load} />}

      {offer.agent && (
        <p className="text-sm text-gray-600">Questions? Contact {agentName}{offer.agent.company ? ` (${offer.agent.company})` : ''}
          {offer.agent.phone && <> · <a className="text-blue-700 underline" href={`tel:${offer.agent.phone}`}>{offer.agent.phone}</a></>}
          {offer.agent.email && <> · <a className="text-blue-700 underline" href={`mailto:${offer.agent.email}`}>{offer.agent.email}</a></>}
        </p>
      )}
      <p className="text-xs text-gray-400">Figures are estimates for discussion. HUD decides which bids to accept based on its net-to-HUD and program rules. This is not a bid until your broker submits it to HUD.</p>
    </div>
  )
}

function ResponsePanel({ token, offer, agentName, onDone }) {
  const [mode, setMode] = useState('accept')
  const [authorize, setAuthorize] = useState(false)
  const [signature, setSignature] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      if (mode === 'accept') await respondToOffer(token, 'accept', { authorize, signature, terms: offer.terms })
      else await respondToOffer(token, mode, { note })
      await onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const tabs = [['accept', 'Accept & submit'], ['changes', 'Request changes'], ['decline', 'Decline']]
  return (
    <form onSubmit={submit} className="bg-white rounded-xl shadow p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Your decision</h2>
        <p className="text-sm text-gray-600">Not ready? Save it to your favorites and come back any time.</p>
      </div>
      <div role="tablist" className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => { setMode(id); setError('') }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${mode === id ? 'bg-white shadow-sm' : 'text-gray-600'}`}>{label}</button>
        ))}
      </div>

      {mode === 'accept' ? <>
        <label className="flex gap-3 rounded-lg border p-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4" checked={authorize} onChange={e => setAuthorize(e.target.checked)} required />
          <span>I authorize {agentName} to submit a bid of <strong>{money(offer.offer_price)}</strong> on HUD case {offer.case_number} on my behalf with the terms above. I understand a signed sales contract and an earnest money deposit of {money(offer.earnest_money)} will be required if HUD accepts the bid.</span>
        </label>
        <label className="block text-sm font-medium">Type your full name to sign
          <input className="mt-1 w-full rounded-lg border p-2 font-serif text-lg italic" value={signature} onChange={e => setSignature(e.target.value)} placeholder={offer.buyerName || 'Full name'} autoComplete="name" required />
        </label>
      </> : (
        <label className="block text-sm font-medium">{mode === 'changes' ? 'What would you like changed?' : `Anything ${agentName} should know? (optional)`}
          <textarea className="mt-1 w-full rounded-lg border p-2" rows={4} value={note} onChange={e => setNote(e.target.value)} required={mode === 'changes'}
            placeholder={mode === 'changes' ? 'e.g. Can we go a little higher and ask for 3% closing costs?' : ''} />
        </label>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className={`w-full rounded-lg px-4 py-3 font-semibold disabled:opacity-50 ${mode === 'accept' ? 'bg-emerald-600 text-white' : mode === 'changes' ? 'bg-blue-700 text-white' : 'border border-red-300 text-red-700'}`}>
        {busy ? 'Sending…' : mode === 'accept' ? 'Accept offer & authorize submission' : mode === 'changes' ? `Send to ${agentName}` : 'Decline this offer'}
      </button>
    </form>
  )
}
