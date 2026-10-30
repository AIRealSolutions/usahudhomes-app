/**
 * /offers/:kind/:id — one offer's file: the terms, its documents (bid confirmation,
 * pre-qual letter, earnest money, contract, addenda...) and a timeline of the offer's
 * changes alongside the property's listing history. kind is 'bid' (the buyer proposed
 * it) or 'proposal' (the broker built it). Open to the buyer, their broker and admins.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FileText, Upload } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { EVENT_STYLE } from '../components/BidHistory'
import OfferDocumentViewer from '../components/OfferDocumentViewer'
import DealStatusBadge from '../components/DealStatusBadge'
import { fetchPropertyHistory, formatMoney } from '../services/acceptedOffers'
import { PROPOSAL_EVENT_LABELS, PROPOSAL_STATUS } from '../services/offerProposals'
import {
  ACCEPT, DEAL_STATUS, DEAL_STATUS_ORDER, DOC_TYPES, deleteDocument, docTypeLabel, downloadDocument, getOfferDetails,
  getOfferTimeline, listDocuments, MAX_FILE_BYTES, setDealStatus, uploadDocument,
} from '../services/offerDocuments'

const when = d => (d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '')
const day = d => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '')
const today = () => new Date().toLocaleDateString('en-CA')
const fileSize = n => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
const FINANCING = { fha: 'FHA', '203k': 'FHA 203(k)', conventional: 'Conventional', cash: 'Cash' }
const OCCUPANCY = { owner: 'Owner occupant', investor: 'Investor', other: 'Other' }
const BID_STATUS = {
  draft: { label: 'Draft', tone: 'bg-gray-100 text-gray-700' },
  submitted: { label: 'Sent to broker for review', tone: 'bg-sky-100 text-sky-800' },
  changes_requested: { label: 'Changes requested', tone: 'bg-amber-100 text-amber-800' },
  reviewed: { label: 'Reviewed by broker', tone: 'bg-emerald-100 text-emerald-800' },
  withdrawn: { label: 'Withdrawn', tone: 'bg-gray-200 text-gray-600' },
}

// How each tracked field reads in the timeline
const FIELDS = {
  status: ['Status', v => BID_STATUS[v]?.label || v],
  offer_price: ['Offer price', formatMoney],
  occupancy: ['Buying as', v => OCCUPANCY[v] || v],
  financing: ['Financing', v => FINANCING[v] || v],
  closing_cost_percent: ['Closing costs requested', v => `${Number(v)}%`],
  earnest_money: ['Earnest money', formatMoney],
  listing_commission_percent: ['Listing commission', v => `${Number(v)}%`],
  buyer_commission_percent: ['Buyer broker commission', v => `${Number(v)}%`],
  notes: ['Buyer notes', v => `“${v}”`],
  broker_message: ['Broker message', v => `“${v}”`],
  closing_agent_id: ['Closing agent', () => 'updated'],
  deal_status: ['Deal status', v => DEAL_STATUS[v]?.label || v],
  deal_status_date: ['Status date', day],
  closing_date: ['Closing date', day],
  deal_note: ['Deal note', v => `“${v}”`],
}
const showValue = (field, v) => (v == null || v === '' ? (field === 'deal_status' ? 'Waiting on HUD' : 'none') : (FIELDS[field]?.[1] || String)(v))

export default function OfferDetailsPage() {
  const { kind, id } = useParams()
  const { user } = useAuth()
  const [details, setDetails] = useState(null)
  const [docs, setDocs] = useState([])
  const [timeline, setTimeline] = useState([])
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadOfferSide = useCallback(async () => {
    const [d, t] = await Promise.all([listDocuments(kind, id), getOfferTimeline(kind, id)])
    setDocs(d); setTimeline(t)
  }, [kind, id])

  useEffect(() => {
    if (!['bid', 'proposal'].includes(kind)) { setError('This offer link is not valid.'); setLoading(false); return }
    let active = true
    ;(async () => {
      try {
        const info = await getOfferDetails(kind, id)
        if (!active) return
        if (!info) { setError("This offer doesn't exist or isn't shared with your account."); return }
        setDetails(info)
        await loadOfferSide()
        const prop = await fetchPropertyHistory(info.offer.case_number).catch(() => ({ activity: [] }))
        if (active) setHistory(prop.activity)
      } catch (e) {
        if (active) setError(e.message)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [kind, id, loadOfferSide])

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-gray-500">Loading offer…</div>
  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Offer not available</h1>
        <p className="mt-2 text-gray-600">{error}</p>
        <Link to="/dashboard" className="mt-4 inline-block text-blue-700 underline">Back to your dashboard</Link>
      </div>
    )
  }

  const { offer: o, property: p = {}, client, broker, can_manage: canManage } = details
  const onDealSaved = async (deal) => {
    setDetails(d => ({ ...d, offer: { ...d.offer, ...deal } }))
    await loadOfferSide()
  }
  const status = (kind === 'bid' ? BID_STATUS : PROPOSAL_STATUS)[o.status] || { label: o.status, tone: 'bg-gray-100' }
  const clientName = client?.name || client?.fallback_name
  const where = [p?.address, p?.city, p?.state].filter(Boolean).join(', ')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Helmet><title>Offer for HUD {o.case_number} | USAHUDhomes</title><meta name="robots" content="noindex" /></Helmet>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-gray-500">{kind === 'bid' ? 'Buyer offer' : 'Broker offer'}{clientName ? ` · ${clientName}` : ''}{broker?.name ? ` · broker ${broker.name}` : ''}</p>
          <h1 className="text-2xl sm:text-3xl font-bold">{formatMoney(o.offer_price)} offer · HUD {o.case_number}</h1>
          <p className="text-gray-600">{where || 'Address shown on the property page'} · <Link className="text-blue-700 underline" to={`/property/${encodeURIComponent(o.case_number)}`}>View the home</Link></p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${status.tone}`}>{status.label}</span>
          <DealStatusBadge offer={o} className="px-3 py-1 text-sm" />
        </div>
      </header>

      <DealStatusSection kind={kind} id={id} offer={o} canManage={canManage} onSaved={onDealSaved} />

      <section className="bg-white rounded-xl border p-5">
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {[
            ['Offer price', formatMoney(o.offer_price)],
            ['HUD asking price', formatMoney(o.asking_price ?? p?.price)],
            ['Buying as', OCCUPANCY[o.occupancy] || o.occupancy],
            ['Financing', FINANCING[o.financing] || o.financing],
            ['Closing costs requested', `${Number(o.closing_cost_percent)}%`],
            ['Earnest money', formatMoney(o.earnest_money)],
            o.est_net_to_hud != null && ['Est. net to HUD', formatMoney(o.est_net_to_hud)],
            p?.bid_deadline && ['HUD bid deadline', when(p.bid_deadline)],
          ].filter(Boolean).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-gray-100 py-1"><dt className="text-gray-500">{k}</dt><dd className="font-medium text-right">{v}</dd></div>
          ))}
        </dl>
      </section>

      <DocumentsSection kind={kind} id={id} docs={docs} userId={user?.id} onChange={loadOfferSide} />
      <TimelineSection offerItems={timeline} propertyItems={history} />
    </div>
  )
}

function DealStatusSection({ kind, id, offer: o, canManage, onSaved }) {
  const [status, setStatus] = useState(o.deal_status || '')
  const [date, setDate] = useState(o.deal_status_date || today())
  const [closingDate, setClosingDate] = useState(o.closing_date || '')
  const [note, setNote] = useState(o.deal_note || '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const current = DEAL_STATUS[o.deal_status]

  const pick = (s) => {
    setStatus(s); setMessage('')
    // A new status starts on today's date; reopening the current one keeps its date
    setDate(s === o.deal_status ? o.deal_status_date || today() : today())
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setMessage('')
    try {
      await onSaved(await setDealStatus(kind, id, { status: status || null, date, closingDate, note }))
      setMessage('Saved.')
    } catch (err) {
      setMessage(err.message)
    } finally {
      setBusy(false)
    }
  }

  // Buyers see where things stand; only the broker and admins change it
  if (!canManage) {
    if (!current) return null
    return (
      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-xl font-bold">Deal status</h2>
        <p className="mt-2"><DealStatusBadge offer={o} withDate className="px-3 py-1 text-sm" /></p>
        {o.closing_date && <p className="mt-2 text-sm">{o.deal_status === 'closed' ? 'Closed' : 'Expected closing'}: <strong>{day(o.closing_date)}</strong></p>}
        {o.deal_note && <p className="mt-1 text-sm text-gray-700">{o.deal_note}</p>}
      </section>
    )
  }

  const unchanged = (status || null) === (o.deal_status || null) && (!status || (date === (o.deal_status_date || today())
    && (closingDate || null) === (o.closing_date || null) && (note.trim() || null) === (o.deal_note || null)))

  return (
    <section className="rounded-xl border bg-white p-5 space-y-4">
      <div>
        <h2 className="text-xl font-bold">Deal status</h2>
        <p className="text-sm text-gray-600">Where this offer stands with HUD. The buyer sees it on their offer, and every change goes in the timeline.</p>
      </div>
      <form onSubmit={save} className="space-y-4">
        <div role="radiogroup" aria-label="Deal status" className="flex flex-wrap gap-2">
          {[['', 'Waiting on HUD', 'bg-gray-100 text-gray-700'], ...DEAL_STATUS_ORDER.map(k => [k, DEAL_STATUS[k].label, DEAL_STATUS[k].tone])].map(([key, label, tone]) => (
            <button key={key || 'none'} type="button" role="radio" aria-checked={status === key} onClick={() => pick(key)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${status === key ? `${tone} border-transparent ring-2 ring-blue-600` : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>
        {status && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">{DEAL_STATUS[status].dateLabel}</span>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-lg border px-3 py-2" />
            </label>
            {['hud_accepted', 'under_contract', 'closed'].includes(status) && (
              <label className="text-sm">
                <span className="mb-1 block font-medium">{status === 'closed' ? 'Closing date' : 'Expected closing date (optional)'}</span>
                <input type="date" value={closingDate} onChange={e => setClosingDate(e.target.value)} className="w-full rounded-lg border px-3 py-2" />
              </label>
            )}
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Note (optional)</span>
              <input value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder={status === 'fell_through' ? 'e.g. Financing denied' : 'e.g. HUD-9548 signed, EMD sent to closing agent'} className="w-full rounded-lg border px-3 py-2" />
            </label>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || unchanged} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save deal status'}</button>
          {message && <p role="status" className={`text-sm ${message === 'Saved.' ? 'text-emerald-700' : 'text-red-700'}`}>{message}</p>}
        </div>
      </form>
    </section>
  )
}

function DocumentsSection({ kind, id, docs, userId, onChange }) {
  const [docType, setDocType] = useState(DOC_TYPES[0].id)
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [inputKey, setInputKey] = useState(0)
  const [viewing, setViewing] = useState(null)

  const upload = async (e) => {
    e.preventDefault()
    if (!file) return setMessage('Choose a file to upload.')
    if (file.size > MAX_FILE_BYTES) return setMessage('Files can be up to 15 MB.')
    setBusy(true); setMessage('')
    try {
      await uploadDocument(kind, id, docType, file, notes)
      setFile(null); setNotes(''); setInputKey(k => k + 1)
      await onChange()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setBusy(false)
    }
  }

  const download = async (doc) => {
    try { await downloadDocument(doc) } catch (err) { setMessage(err.message) }
  }

  const remove = async (doc) => {
    if (!window.confirm(`Remove ${doc.file_name}? The timeline keeps a record that it was removed.`)) return
    try { await deleteDocument(doc); await onChange() } catch (err) { setMessage(err.message) }
  }

  const groups = DOC_TYPES.map(t => ({ ...t, rows: docs.filter(d => d.doc_type === t.id) })).filter(g => g.rows.length)
  // The viewer steps through documents in the order they're listed
  const ordered = groups.flatMap(g => g.rows)
  const view = (doc) => setViewing(ordered.findIndex(d => d.id === doc.id))

  return (
    <section className="bg-white rounded-xl border p-5 space-y-4">
      <div>
        <h2 className="text-xl font-bold">Documents</h2>
        <p className="text-sm text-gray-600">Private to the buyer, their broker and USAHUDhomes admins. PDF or photo, up to 15 MB.</p>
      </div>

      <form onSubmit={upload} className="grid gap-3 rounded-lg bg-gray-50 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-sm">
          <span className="block font-medium mb-1">Document type</span>
          <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2">
            {DOC_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="block font-medium mb-1">File</span>
          <input key={inputKey} type="file" accept={ACCEPT} onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-sm" />
        </label>
        <button type="submit" disabled={busy || !file} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
          <Upload className="h-4 w-4" /> {busy ? 'Uploading…' : 'Upload'}
        </button>
        <label className="text-sm sm:col-span-3">
          <span className="block font-medium mb-1">Note (optional)</span>
          <input value={notes} onChange={e => setNotes(e.target.value)} maxLength={300} placeholder="e.g. Signed by both buyers" className="w-full rounded-lg border bg-white px-3 py-2" />
        </label>
      </form>
      {message && <p role="alert" className="text-sm text-red-700">{message}</p>}

      {groups.length === 0 ? <p className="text-sm text-gray-500">No documents yet.</p> : groups.map(g => (
        <div key={g.id}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{g.label}</h3>
          <ul className="divide-y rounded-lg border">
            {g.rows.map(d => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <div className="min-w-0">
                    <button type="button" onClick={() => view(d)} className="text-left font-medium text-blue-700 underline break-all">{d.file_name}</button>
                    <p className="text-xs text-gray-500">{when(d.created_at)}{d.size_bytes ? ` · ${fileSize(d.size_bytes)}` : ''}</p>
                    {d.notes && <p className="text-sm text-gray-600">{d.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <button type="button" onClick={() => view(d)} className="rounded-lg border px-3 py-1">View</button>
                  <button type="button" onClick={() => download(d)} className="rounded-lg border px-3 py-1">Download</button>
                  {d.uploaded_by === userId && <button type="button" onClick={() => remove(d)} className="px-1 text-red-700 underline">Remove</button>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {viewing != null && ordered[viewing] && (
        <OfferDocumentViewer docs={ordered} index={viewing} onIndex={setViewing} onClose={() => setViewing(null)} />
      )}
    </section>
  )
}

const FILTERS = [['all', 'Everything'], ['offer', 'Offer'], ['documents', 'Documents'], ['property', 'Property']]

function TimelineSection({ offerItems, propertyItems }) {
  const [filter, setFilter] = useState('all')
  const items = useMemo(() => {
    const offer = offerItems.map(i => ({ ...i, group: i.event?.startsWith('document_') ? 'documents' : 'offer' }))
    const property = propertyItems.map(a => ({ ...a, id: `p${a.id}`, at: a.occurred_at, group: 'property', source: 'property' }))
    return [...offer, ...property]
      .filter(i => filter === 'all' || i.group === filter)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
  }, [offerItems, propertyItems, filter])

  return (
    <section className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Timeline</h2>
          <p className="text-sm text-gray-600">Every change to this offer and its documents, with the home's price and status history from HUD.</p>
        </div>
        <div role="tablist" className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1 text-sm">
          {FILTERS.map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={filter === key} onClick={() => setFilter(key)}
              className={`rounded-md px-3 py-1 ${filter === key ? 'bg-white font-medium shadow-sm' : 'text-gray-600'}`}>{label}</button>
          ))}
        </div>
      </div>
      {items.length === 0 ? <p className="text-sm text-gray-500">Nothing recorded yet.</p> : (
        <ol className="relative ml-2 border-l-2 border-gray-200">
          {items.map(item => <TimelineItem key={item.id} item={item} />)}
        </ol>
      )}
    </section>
  )
}

const OFFER_DOT = { offer: 'bg-blue-600', documents: 'bg-teal-500' }

function TimelineItem({ item }) {
  let dot, title, body = null
  if (item.source === 'property') {
    const style = EVENT_STYLE[item.kind || item.event] || EVENT_STYLE.status_change
    dot = style.dot
    const cut = item.event === 'price_change' && Number(item.list_price) < Number(item.previous_price)
    title = item.event === 'price_change' ? (cut ? 'HUD reduced the price' : 'HUD raised the price') : style.title
    if (item.event === 'price_change') body = <>{formatMoney(item.previous_price)} → <strong>{formatMoney(item.list_price)}</strong></>
    else if (item.event === 'listed') body = <>Listed at {formatMoney(item.list_price)}</>
    else if (item.status) body = <>Status: {item.status}</>
  } else {
    dot = OFFER_DOT[item.group]
    const by = item.actor || (item.actor_role ? `the ${item.actor_role}` : '')
    if (item.event === 'document_added' || item.event === 'document_removed') {
      title = `${docTypeLabel(item.detail?.doc_type)} ${item.event === 'document_added' ? 'uploaded' : 'removed'}`
      body = <span className="break-all">{item.detail?.file_name}</span>
    } else if (item.event === 'created') {
      title = 'Offer created'
      const fields = Object.entries(item.changes || {})
      if (fields.length) body = fields.map(([f, v]) => `${FIELDS[f]?.[0] || f}: ${showValue(f, v.to)}`).join(' · ')
    } else if (item.event === 'updated') {
      const fields = Object.entries(item.changes || {})
      title = fields.some(([f]) => f === 'deal_status') ? `Deal status: ${showValue('deal_status', item.changes.deal_status.to)}`
        : fields.every(([f]) => f.startsWith('deal_') || f === 'closing_date') ? 'Deal details updated'
          : fields.length === 1 && fields[0][0] === 'status' ? 'Status changed' : 'Offer changed'
      body = (
        <ul className="mt-1 space-y-0.5">
          {fields.map(([f, v]) => (
            <li key={f}><span className="text-gray-500">{FIELDS[f]?.[0] || f}:</span> <span className="line-through text-gray-400">{showValue(f, v.from)}</span> → <strong>{showValue(f, v.to)}</strong></li>
          ))}
        </ul>
      )
    } else {
      title = PROPOSAL_EVENT_LABELS[item.event] || item.event
      if (item.note) body = <>“{item.note}”</>
    }
    if (by) title = <>{title} <span className="font-normal text-gray-500">by {by}</span></>
  }

  return (
    <li className="ml-5 mb-5 last:mb-0">
      <span className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full ring-4 ring-white ${dot}`} />
      <p className="text-xs text-gray-500">{when(item.at)}{item.source === 'property' ? ' · property' : ''}</p>
      <p className="font-semibold text-gray-900">{title}</p>
      {body && <div className="text-sm text-gray-700">{body}</div>}
    </li>
  )
}
