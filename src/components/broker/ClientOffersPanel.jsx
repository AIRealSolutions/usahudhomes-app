/**
 * Offers the broker built for clients (broker_offer_proposals): share links, see
 * who opened, favorited, accepted or asked for changes, and record the HUD submission.
 * With attentionOnly it shows just the offers waiting on the broker (for Overview).
 */

import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useActiveClient } from '../../contexts/ActiveClientContext'
import {
  deleteProposal, listProposals, offerLink, offerMessage, PROPOSAL_EVENT_LABELS, PROPOSAL_STATUS, setProposalStatus,
} from '../../services/offerProposals'
import { offerPagePath } from '../../services/offerDocuments'

const money = n => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const when = d => (d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '')
const FINANCING = { fha: 'FHA', '203k': 'FHA 203(k)', conventional: 'Conventional', cash: 'Cash' }
const GROUPS = [
  { title: 'Needs you', statuses: ['accepted', 'changes_requested'] },
  { title: 'With buyers', statuses: ['sent'] },
  { title: 'Drafts', statuses: ['draft'] },
  { title: 'Closed', statuses: ['submitted', 'declined', 'withdrawn'] },
]

export default function ClientOffersPanel({ attentionOnly = false, onShowAll }) {
  const [offers, setOffers] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setOffers(await listProposals())
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const replace = (updated) => setOffers(list => list.map(o => (o.id === updated.id ? updated : o)))

  if (attentionOnly) {
    const waiting = offers.filter(o => ['accepted', 'changes_requested'].includes(o.status))
    if (!waiting.length) return null
    return (
      <section className="bg-white rounded-xl border border-emerald-200 p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="font-bold text-xl">Client offers waiting on you <span className="ml-1 rounded-full bg-emerald-600 text-white px-2 py-0.5 text-xs">{waiting.length}</span></h2>
          {onShowAll && <button type="button" onClick={onShowAll} className="text-sm text-blue-700 underline">All offers to clients</button>}
        </div>
        <div className="space-y-3">{waiting.map(o => <OfferCard key={o.id} offer={o} onChange={replace} onRemoved={load} />)}</div>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        To build an offer, open the client&apos;s lead (that puts you in <strong>Working for</strong> mode), then open the home and use the offer builder. The client gets a link where they can accept (authorizing you to submit the bid), ask for changes, decline, or save it to their favorites.
      </div>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {loading ? <p className="text-gray-500">Loading offers…</p> : GROUPS.map(g => {
        const rows = offers.filter(o => g.statuses.includes(o.status))
        return (
          <section key={g.title}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{g.title} ({rows.length})</h2>
            {rows.length === 0
              ? <p className="text-sm text-gray-400">None.</p>
              : <div className="space-y-3">{rows.map(o => <OfferCard key={o.id} offer={o} onChange={replace} onRemoved={load} />)}</div>}
          </section>
        )
      })}
    </div>
  )
}

function OfferCard({ offer: o, onChange, onRemoved }) {
  const navigate = useNavigate()
  const { start } = useActiveClient()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState(null)
  const status = PROPOSAL_STATUS[o.status] || {}
  const firstName = (o.buyer?.name || 'there').split(' ')[0]
  const p = o.property || {}
  const where = [p.address, p.city, p.state].filter(Boolean).join(', ')
  const live = o.status !== 'draft'

  const act = async (fn, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(true); setMessage('')
    try {
      const updated = await fn()
      if (updated) onChange(updated); else onRemoved()
    } catch (e) {
      setMessage(e.message)
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(offerLink(o.share_token))
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch {
      setMessage(offerLink(o.share_token))
    }
  }

  // Revising happens in the offer builder, working for this client
  const revise = () => {
    const [first, ...rest] = (o.buyer?.name || '').split(' ')
    start({ id: o.consultation_id, first_name: first, last_name: rest.join(' '), email: o.buyer?.email, phone: o.buyer?.phone })
    navigate(`/property/${encodeURIComponent(o.case_number)}#prepare-offer`)
  }

  const toggleHistory = async () => {
    if (history) return setHistory(null)
    const { data, error } = await supabase.from('broker_offer_proposal_events')
      .select('id, actor, event, note, created_at').eq('proposal_id', o.id).order('created_at', { ascending: false })
    if (error) setMessage(error.message); else setHistory(data || [])
  }

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{o.buyer?.name} · {money(o.offer_price)}
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span>
          </p>
          <p className="text-sm text-gray-600">HUD {o.case_number}{where ? ` · ${where}` : ''}{o.asking_price ? ` · asking ${money(o.asking_price)}` : ''}</p>
          <p className="text-xs text-gray-500 mt-1">
            {o.occupancy === 'owner' ? 'Owner occupant' : 'Investor'} · {FINANCING[o.financing] || o.financing} · closing {Number(o.closing_cost_percent)}% · EMD {money(o.earnest_money)}
            {o.est_net_to_hud != null && <> · net to HUD {money(o.est_net_to_hud)}</>}
          </p>
          <p className="text-xs text-gray-500">
            {live && (o.viewed_at ? 'Opened' : 'Not opened yet')}
            {o.is_favorite && <span className="ml-2 text-amber-700">★ In their favorites</span>}
          </p>
        </div>
        <p className="text-xs text-gray-400">{when(o.updated_at)}</p>
      </div>

      {o.buyer_note && (
        <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
          <strong>{o.status === 'changes_requested' ? `${firstName} asked for changes:` : `${firstName}'s note:`}</strong> {o.buyer_note}
        </p>
      )}
      {['accepted', 'submitted'].includes(o.status) && o.accepted_terms && (
        <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-950">
          <p><strong>Signed “{o.accepted_signature}”</strong> on {when(o.responded_at)}, authorizing you to submit:</p>
          <p className="mt-1">{money(o.accepted_terms.offer_price)} · {o.accepted_terms.occupancy === 'owner' ? 'owner occupant' : 'investor'} · {FINANCING[o.accepted_terms.financing] || o.accepted_terms.financing} · closing {o.accepted_terms.closing_cost_percent}% · EMD {money(o.accepted_terms.earnest_money)} · commissions {o.accepted_terms.listing_commission_percent}% / {o.accepted_terms.buyer_commission_percent}%</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {o.status === 'draft' && <button type="button" disabled={busy} onClick={() => act(() => setProposalStatus(o.id, 'sent'))} className="rounded-lg bg-blue-700 px-3 py-1.5 text-white disabled:opacity-50">Send to {firstName}</button>}
        {live && o.status !== 'withdrawn' && <>
          <button type="button" onClick={copy} className="rounded-lg border px-3 py-1.5">{copied ? 'Link copied' : 'Copy link'}</button>
          {o.buyer?.email && <a className="rounded-lg border px-3 py-1.5" href={`mailto:${o.buyer.email}?subject=${encodeURIComponent(`Your offer for HUD ${o.case_number}`)}&body=${encodeURIComponent(offerMessage(o, firstName))}`}>Email link</a>}
          {o.buyer?.phone && <a className="rounded-lg border px-3 py-1.5" href={`sms:${o.buyer.phone}?&body=${encodeURIComponent(offerMessage(o, firstName, { sms: true }))}`}>Text link</a>}
        </>}
        {o.status === 'accepted' && <>
          <a className="rounded-lg border px-3 py-1.5" href="https://www.hudhomestore.gov" target="_blank" rel="noopener noreferrer">Open HUDHomestore ↗</a>
          <button type="button" disabled={busy} onClick={() => act(() => setProposalStatus(o.id, 'submitted'))} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white disabled:opacity-50">Mark submitted to HUD</button>
        </>}
        {['draft', 'sent', 'changes_requested', 'declined'].includes(o.status) && <button type="button" onClick={revise} className="rounded-lg border px-3 py-1.5">{o.status === 'draft' ? 'Edit' : 'Revise terms'}</button>}
        {['sent', 'changes_requested', 'accepted', 'declined'].includes(o.status) && <button type="button" disabled={busy} onClick={() => act(() => setProposalStatus(o.id, 'withdrawn'), `Withdraw this offer? ${firstName} will no longer be able to accept it.`)} className="rounded-lg border border-red-200 px-3 py-1.5 text-red-700 disabled:opacity-50">Withdraw</button>}
        {['draft', 'withdrawn'].includes(o.status) && <button type="button" disabled={busy} onClick={() => act(async () => { await deleteProposal(o.id); return null }, o.status === 'draft' ? 'Delete this draft?' : 'Delete this withdrawn offer? Its documents and history will be removed for good.')} className="rounded-lg border border-red-200 px-3 py-1.5 text-red-700 disabled:opacity-50">Delete</button>}
        <Link to={offerPagePath('proposal', o.id)} className="rounded-lg border px-3 py-1.5">Documents &amp; timeline</Link>
        <button type="button" onClick={toggleHistory} className="px-2 py-1.5 text-blue-700 underline">{history ? 'Hide history' : 'History'}</button>
      </div>
      {message && <p role="alert" className="mt-2 text-sm text-red-700 break-all">{message}</p>}
      {history && (
        <ol className="mt-3 space-y-1 border-l-2 border-gray-200 pl-3 text-sm">
          {history.map(e => <li key={e.id}><span className="font-medium">{PROPOSAL_EVENT_LABELS[e.event] || e.event}</span>{e.note && <span className="text-gray-600"> · “{e.note}”</span>} <span className="text-xs text-gray-400">{when(e.created_at)}</span></li>)}
        </ol>
      )}
    </div>
  )
}
