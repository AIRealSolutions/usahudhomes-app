/**
 * Agent Referrals (admin) — the Nationwide Agent Referral Program back office.
 * Verify referring agents and brokerages, accept or decline buyer referrals (with
 * duplicate review), countersign or upload agreements, move the transaction along,
 * record the actual commission and mark the referral fee paid.
 * The database enforces the business rules; this screen surfaces its errors.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Handshake, X, AlertTriangle, FileText, ExternalLink, RefreshCw } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../config/supabase'
import {
  REFERRAL_STATUSES, AGREEMENT_STATUSES, PAYMENT_STATUSES, VERIFICATION_STATUSES,
  referralFee, estimatedFee, money, shortDate,
} from '../../data/buyerReferralProgram'
import {
  fetchAdminData, fetchEvents, addNote, acceptReferral, updateReferral, updateAgreement,
  updateAgent, updateBrokerage, createPayment, updatePayment, uploadAgreementPdf, agreementPdfUrl,
} from '../../services/buyerReferrals'

const one = (x) => (Array.isArray(x) ? x[0] : x) || null
const inputCls = 'border rounded-lg px-3 py-2 text-sm w-full'
const btn = 'px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50'

function Pill({ map, value }) {
  const s = map[value] || { label: value, cls: 'bg-gray-100 text-gray-700' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${s.cls}`}>{s.label}</span>
}

function Section({ title, children }) {
  return (
    <section className="border rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {children}
    </section>
  )
}

const ACTIVE = ['submitted', 'needs_review', 'accepted', 'represented', 'under_contract']

// ── Referral detail ─────────────────────────────────────────────────────────
function ReferralDetail({ referral: r, agent, brokerage, onClose, onChanged }) {
  const { user, profile } = useAuth()
  const agreement = one(r.buyer_referral_agreements)
  const payments = r.buyer_referral_payments || []
  const [events, setEvents] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [declineReason, setDeclineReason] = useState('')
  const [contract, setContract] = useState({ caseNumber: r.contract_case_number || '', price: r.contract_price || '', date: '' })
  const [pay, setPay] = useState({ salePrice: r.contract_price || '', closingDate: '', commission: '' })
  const [counterName, setCounterName] = useState(profile?.name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' '))
  const [note, setNote] = useState('')
  const [pdf, setPdf] = useState(null)

  const loadEvents = useCallback(() => fetchEvents(r.id).then(setEvents).catch(() => {}), [r.id])
  useEffect(() => { loadEvents() }, [loadEvents])

  const run = async (fn) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await onChanged()
      loadEvents()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const duplicates = events.filter(e => e.event_type === 'possible_duplicate').flatMap(e => e.details?.matches || [])

  const markUnderContract = () => run(async () => {
    let propertyId = null
    if (contract.caseNumber.trim()) {
      const { data } = await supabase.from('properties').select('id').eq('case_number', contract.caseNumber.trim()).maybeSingle()
      propertyId = data?.id || null
    }
    await updateReferral(r.id, {
      status: 'under_contract', contract_case_number: contract.caseNumber.trim() || null,
      contract_price: contract.price || null, contract_property_id: propertyId,
      under_contract_at: contract.date ? new Date(`${contract.date}T12:00:00`).toISOString() : null,
    })
  })

  const countersign = () => run(() => updateAgreement(agreement.id, {
    lightkeeper_signer_name: counterName.trim(), lightkeeper_signed_at: new Date().toISOString(), lightkeeper_signed_by: user.id,
  }))

  const uploadExecuted = () => run(async () => {
    const path = await uploadAgreementPdf(agreement, pdf)
    await updateAgreement(agreement.id, {
      method: 'pdf', document_path: path, document_uploaded_by: user.id, document_uploaded_at: new Date().toISOString(),
      attest_buyer_disclosure: true, attest_no_nc_activity: true, attest_firm_eligible: true,
      lightkeeper_signer_name: counterName.trim() || null, lightkeeper_signed_at: new Date().toISOString(), lightkeeper_signed_by: user.id,
    })
    setPdf(null)
  })

  const openPdf = async () => {
    try { window.open(await agreementPdfUrl(agreement.document_path), '_blank', 'noopener') } catch (err) { setError(err.message) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" role="dialog" aria-modal="true">
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{r.buyer_first_name} {r.buyer_last_name}</h2>
            <p className="text-sm text-gray-500">Referred {shortDate(r.created_at)} by {agent ? `${agent.first_name} ${agent.last_name}` : '—'} · {brokerage?.name} ({brokerage?.state})</p>
            <div className="mt-1"><Pill map={REFERRAL_STATUSES} value={r.status} /></div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-800" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

          <Section title="Buyer">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-gray-500">Email</dt><dd>{r.buyer_email || '—'}</dd>
              <dt className="text-gray-500">Phone</dt><dd>{r.buyer_phone || '—'}</dd>
              <dt className="text-gray-500">NC area</dt><dd>{r.nc_area || '—'}</dd>
              <dt className="text-gray-500">Relationship</dt><dd>{r.relationship || '—'}</dd>
              <dt className="text-gray-500">Other buyer agency</dt><dd>{{ none: 'No', yes: 'Yes', unknown: 'Not sure' }[r.other_agency_status]}</dd>
              <dt className="text-gray-500">Consent</dt><dd>{r.consent_given ? `Given ${shortDate(r.consent_at)}` : 'No'}</dd>
              {r.protection_ends_at && <><dt className="text-gray-500">Protected through</dt><dd>{shortDate(r.protection_ends_at)}</dd></>}
              {r.lead_id && <><dt className="text-gray-500">Lead</dt><dd><a className="text-blue-600 underline" href={`/admin/leads/${r.lead_id}`}>Open lead</a></dd></>}
            </dl>
            {r.notes && <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">{r.notes}</p>}
            {r.possible_duplicate && (
              <div className="text-sm bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="font-semibold text-yellow-800 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Possible duplicate or existing client</p>
                <ul className="mt-1 text-yellow-900 list-disc pl-5">
                  {duplicates.map((m, i) => <li key={i}>{m.source.replace('_', ' ')} {m.id.slice(0, 8)}</li>)}
                </ul>
              </div>
            )}
          </Section>

          <Section title="Referring agent">
            <p className="text-sm">{agent?.first_name} {agent?.last_name} · {agent?.email} · license {agent?.license_state} {agent?.license_number} <Pill map={VERIFICATION_STATUSES} value={agent?.status} /></p>
            <p className="text-sm">{brokerage?.name} ({brokerage?.state}) <Pill map={VERIFICATION_STATUSES} value={brokerage?.verification_status} /> · W-9 {brokerage?.w9_status === 'received' ? 'received' : 'not received'}</p>
          </Section>

          {['submitted', 'needs_review'].includes(r.status) && (
            <Section title="Decision">
              <div className="flex flex-wrap gap-2">
                <button disabled={busy} onClick={() => run(() => acceptReferral(r, agent, brokerage))} className={`${btn} bg-green-600 text-white`}>Accept referral</button>
              </div>
              <p className="text-xs text-gray-500">Accepting starts the 1-year protection period, creates the referral agreement for signing, and adds the buyer to Leads.</p>
              <div className="flex gap-2">
                <input className={inputCls} value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="Decline reason (shown to the agent)" />
                <button disabled={busy || !declineReason.trim()} onClick={() => run(() => updateReferral(r.id, { status: 'declined', decline_reason: declineReason.trim() }))}
                  className={`${btn} bg-gray-200 text-gray-800 whitespace-nowrap`}>Decline</button>
              </div>
            </Section>
          )}

          {agreement && (
            <Section title="Referral agreement">
              <p className="text-sm flex flex-wrap items-center gap-2">
                <Pill map={AGREEMENT_STATUSES} value={agreement.status} />
                {Math.round(agreement.referral_pct * 100)}% capped at {money(agreement.fee_cap)} · protection {shortDate(agreement.effective_at)} – {shortDate(agreement.protection_ends_at)}
              </p>
              {agreement.referring_signer_name && <p className="text-sm text-gray-700">Referring signer: {agreement.referring_signer_name}{agreement.referring_signer_title && `, ${agreement.referring_signer_title}`}{agreement.referring_signed_at && ` · e-signed ${shortDate(agreement.referring_signed_at)}`}</p>}
              {agreement.lightkeeper_signed_at && <p className="text-sm text-gray-700">Lightkeeper: {agreement.lightkeeper_signer_name} · {shortDate(agreement.lightkeeper_signed_at)}</p>}
              <div className="flex flex-wrap gap-2">
                <details className="w-full"><summary className="text-sm text-blue-600 cursor-pointer">View agreement text</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-xs bg-gray-50 border rounded p-3 font-sans max-h-64 overflow-y-auto">{agreement.agreement_text}</pre>
                </details>
                {agreement.document_path && <button onClick={openPdf} className={`${btn} border text-gray-700 flex items-center gap-1`}><FileText className="h-4 w-4" /> Signed PDF <ExternalLink className="h-3 w-3" /></button>}
              </div>
              {agreement.status !== 'executed' && agreement.status !== 'void' && (
                <div className="space-y-2 border-t pt-3">
                  <input className={inputCls} value={counterName} onChange={e => setCounterName(e.target.value)} placeholder="Lightkeeper signer name" />
                  {agreement.status === 'awaiting_lightkeeper' && (
                    <button disabled={busy || !counterName.trim()} onClick={countersign} className={`${btn} bg-blue-600 text-white`}>
                      {agreement.method === 'pdf' ? 'Confirm PDF is fully executed' : 'Countersign electronically'}
                    </button>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="file" accept="application/pdf" onChange={e => setPdf(e.target.files?.[0] || null)} className="text-sm" />
                    <button disabled={busy || !pdf} onClick={uploadExecuted} className={`${btn} border text-gray-700`}>Upload PDF signed by both brokerages</button>
                  </div>
                </div>
              )}
            </Section>
          )}

          {ACTIVE.includes(r.status) && !['submitted', 'needs_review'].includes(r.status) && (
            <Section title="Transaction">
              {r.other_agency_status !== 'none' && (
                <label className="flex gap-2 text-sm">
                  <input type="checkbox" disabled={busy || !!r.other_agency_reviewed_at} checked={!!r.other_agency_reviewed_at}
                    onChange={() => run(() => updateReferral(r.id, { other_agency_reviewed_at: new Date().toISOString() }))} />
                  <span>Any existing buyer agency agreement has been reviewed {r.other_agency_reviewed_at && `(${shortDate(r.other_agency_reviewed_at)})`}</span>
                </label>
              )}
              {r.status === 'accepted' && (
                <button disabled={busy} onClick={() => run(() => updateReferral(r.id, { status: 'represented' }))} className={`${btn} bg-blue-600 text-white`}>
                  Buyer agency signed — start representation
                </button>
              )}
              {r.status === 'represented' && (
                <div className="grid sm:grid-cols-4 gap-2 items-end">
                  <input className={inputCls} value={contract.caseNumber} onChange={e => setContract(c => ({ ...c, caseNumber: e.target.value }))} placeholder="HUD case #" />
                  <input className={inputCls} type="number" value={contract.price} onChange={e => setContract(c => ({ ...c, price: e.target.value }))} placeholder="Contract price" />
                  <input className={inputCls} type="date" value={contract.date} onChange={e => setContract(c => ({ ...c, date: e.target.value }))} title="Contract date (defaults to today)" />
                  <button disabled={busy || !contract.price} onClick={markUnderContract} className={`${btn} bg-orange-500 text-white`}>Under contract</button>
                </div>
              )}
              {r.status === 'under_contract' && (
                <>
                  <p className="text-sm">Case {r.contract_case_number || '—'} · {money(r.contract_price)} · contract {shortDate(r.under_contract_at)} · estimated fee {money(estimatedFee(r.contract_price))}</p>
                  <div className="flex flex-wrap gap-2">
                    <button disabled={busy} onClick={() => run(() => updateReferral(r.id, { status: 'closed' }))} className={`${btn} bg-green-600 text-white`}>Closed</button>
                    <button disabled={busy} onClick={() => run(() => updateReferral(r.id, { status: 'represented', under_contract_at: null, contract_price: null, contract_case_number: null, contract_property_id: null }))}
                      className={`${btn} border text-gray-700`}>Contract fell through</button>
                  </div>
                </>
              )}
              <button disabled={busy} onClick={() => run(() => updateReferral(r.id, { status: 'canceled' }))} className={`${btn} text-red-600 border border-red-200`}>Cancel referral</button>
            </Section>
          )}

          {(r.status === 'closed' || payments.length > 0) && (
            <Section title="Referral payment">
              {payments.map(p => (
                <div key={p.id} className="text-sm border rounded-lg p-3 space-y-2">
                  <p className="flex flex-wrap items-center gap-2">
                    <Pill map={PAYMENT_STATUSES} value={p.status} />
                    Sale {money(p.sale_price)} · closed {shortDate(p.closing_date)} · commission {money(p.commission_received, true)} → fee <strong>{money(p.fee_amount, true)}</strong>
                  </p>
                  {p.paid_at && <p className="text-gray-600">Paid {shortDate(p.paid_at)} {p.payment_method && `by ${p.payment_method}`} {p.payment_reference && `· ${p.payment_reference}`}</p>}
                  <PaymentActions payment={p} busy={busy} run={run} />
                </div>
              ))}
              {r.status === 'closed' && agreement && !payments.some(p => p.status !== 'void') && (
                <div className="space-y-2">
                  <div className="grid sm:grid-cols-3 gap-2">
                    <input className={inputCls} type="number" value={pay.salePrice} onChange={e => setPay(x => ({ ...x, salePrice: e.target.value }))} placeholder="Sale price" />
                    <input className={inputCls} type="date" value={pay.closingDate} onChange={e => setPay(x => ({ ...x, closingDate: e.target.value }))} />
                    <input className={inputCls} type="number" step="0.01" value={pay.commission} onChange={e => setPay(x => ({ ...x, commission: e.target.value }))} placeholder="Commission received" />
                  </div>
                  <p className="text-sm text-gray-700">Referral fee: <strong>{money(referralFee(pay.commission, agreement.referral_pct, agreement.fee_cap), true)}</strong></p>
                  <button disabled={busy || !pay.salePrice || !pay.closingDate || pay.commission === ''}
                    onClick={() => run(() => createPayment({
                      referral_id: r.id, agreement_id: agreement.id, property_id: r.contract_property_id, case_number: r.contract_case_number,
                      sale_price: pay.salePrice, closing_date: pay.closingDate, commission_received: pay.commission,
                    }))} className={`${btn} bg-blue-600 text-white`}>Record commission</button>
                </div>
              )}
            </Section>
          )}

          <Section title="History and notes">
            <div className="flex gap-2">
              <input className={inputCls} value={note} onChange={e => setNote(e.target.value)} placeholder="Add a private note" />
              <button disabled={busy || !note.trim()} onClick={() => run(async () => { await addNote(r, note.trim()); setNote('') })} className={`${btn} border text-gray-700`}>Add</button>
            </div>
            <ul className="text-xs text-gray-600 space-y-1">
              {events.map(e => (
                <li key={e.id}>
                  <span className="text-gray-400">{new Date(e.created_at).toLocaleString()}</span>{' '}
                  {e.event_type === 'note' ? e.details?.note
                    : `${e.entity} ${e.event_type.replace('_', ' ')}${e.from_value ? ` ${e.from_value} →` : ''}${e.to_value ? ` ${e.to_value}` : ''}`}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  )
}

function PaymentActions({ payment: p, busy, run }) {
  const [method, setMethod] = useState('Check')
  const [ref, setRef] = useState('')
  if (p.status === 'paid' || p.status === 'void') return null
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {p.status === 'pending' && (
        <button disabled={busy} onClick={() => run(() => updatePayment(p.id, { status: 'approved' }))} className={`${btn} bg-blue-600 text-white`}>Authorize payment</button>
      )}
      {p.status === 'approved' && (
        <>
          <select value={method} onChange={e => setMethod(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
            <option>Check</option><option>ACH</option><option>Wire</option><option>At closing (settlement statement)</option>
          </select>
          <input value={ref} onChange={e => setRef(e.target.value)} placeholder="Check # / confirmation" className="border rounded-lg px-2 py-1.5 text-sm" />
          <button disabled={busy || !ref.trim()} onClick={() => run(() => updatePayment(p.id, { status: 'paid', payment_method: method, payment_reference: ref.trim() }))}
            className={`${btn} bg-green-600 text-white`}>Mark paid</button>
        </>
      )}
      <button disabled={busy} onClick={() => run(() => updatePayment(p.id, { status: 'void' }))} className={`${btn} text-red-600`}>Void</button>
    </div>
  )
}

// ── Agents & brokerages ─────────────────────────────────────────────────────
function AgentsTab({ agents, brokerages, onChanged }) {
  const { user } = useAuth()
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const byId = useMemo(() => Object.fromEntries(brokerages.map(b => [b.id, b])), [brokerages])

  const run = async (fn) => {
    setBusy(true)
    setError(null)
    try { await fn(); await onChanged() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const stamp = () => ({ verified_by: user.id, verified_at: new Date().toISOString() })

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {agents.length === 0 && <p className="text-gray-500 text-sm">No referring agents have registered yet.</p>}
      {agents.map(a => {
        const b = byId[a.brokerage_id]
        return (
          <div key={a.id} className="bg-white border rounded-lg p-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-gray-900">{a.first_name} {a.last_name} <Pill map={VERIFICATION_STATUSES} value={a.status} /></p>
              <p className="text-gray-600">{a.email}{a.phone && ` · ${a.phone}`}</p>
              <p>License <strong>{a.license_state} {a.license_number}</strong> · registered {shortDate(a.created_at)}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {a.status !== 'verified' && <button disabled={busy} onClick={() => run(() => updateAgent(a.id, { status: 'verified', rejection_reason: null, ...stamp() }))} className={`${btn} bg-green-600 text-white`}>Verify license</button>}
                {a.status !== 'rejected' && <button disabled={busy} onClick={() => { const reason = window.prompt('Reason (shown to the agent)'); if (reason) run(() => updateAgent(a.id, { status: 'rejected', rejection_reason: reason })) }} className={`${btn} border text-gray-700`}>Reject</button>}
                {a.status === 'verified' && <button disabled={busy} onClick={() => run(() => updateAgent(a.id, { status: 'suspended' }))} className={`${btn} border text-gray-700`}>Suspend</button>}
              </div>
            </div>
            {b && <BrokerageCard b={b} busy={busy} run={run} stamp={stamp} />}
          </div>
        )
      })}
    </div>
  )
}

function BrokerageCard({ b, busy, run, stamp }) {
  const [expires, setExpires] = useState(b.license_expires_on || '')
  const [notes, setNotes] = useState(b.verification_notes || '')
  return (
    <div className="space-y-1 text-sm border-t md:border-t-0 md:border-l md:pl-4 pt-3 md:pt-0">
      <p className="font-semibold text-gray-900">{b.name} ({b.state}) <Pill map={VERIFICATION_STATUSES} value={b.verification_status} /></p>
      <p className="text-gray-600">Firm license {b.firm_license_number || '—'} · BIC {b.broker_in_charge_name || '—'}</p>
      <p className="text-gray-600">{[b.email, b.phone, b.address].filter(Boolean).join(' · ') || '—'}</p>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <label className="text-xs text-gray-500">License expires<input type="date" className={inputCls} value={expires} onChange={e => setExpires(e.target.value)} /></label>
        <label className="text-xs text-gray-500">W-9
          <select className={inputCls} value={b.w9_status} disabled={busy} onChange={e => run(() => updateBrokerage(b.id, { w9_status: e.target.value }))}>
            <option value="not_received">Not received</option><option value="received">Received</option>
          </select>
        </label>
      </div>
      <textarea className={inputCls} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Verification notes (where you checked the license, eligibility to receive fees…)" />
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => run(() => updateBrokerage(b.id, { license_expires_on: expires || null, verification_notes: notes || null }))} className={`${btn} border text-gray-700`}>Save</button>
        {b.verification_status !== 'verified' && <button disabled={busy} onClick={() => run(() => updateBrokerage(b.id, { verification_status: 'verified', license_expires_on: expires || null, verification_notes: notes || null, ...stamp() }))} className={`${btn} bg-green-600 text-white`}>Verify brokerage</button>}
        {b.verification_status !== 'rejected' && <button disabled={busy} onClick={() => run(() => updateBrokerage(b.id, { verification_status: 'rejected', verification_notes: notes || null }))} className={`${btn} border text-gray-700`}>Reject</button>}
      </div>
    </div>
  )
}

// ── Panel ───────────────────────────────────────────────────────────────────
export default function BuyerReferralsAdmin() {
  const [data, setData] = useState({ referrals: [], agents: [], brokerages: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('referrals')
  const [filter, setFilter] = useState('open')
  const [selectedId, setSelectedId] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try { setData(await fetchAdminData()) } catch (err) { setError(err.message) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const agentsById = useMemo(() => Object.fromEntries(data.agents.map(a => [a.id, a])), [data.agents])
  const brokeragesById = useMemo(() => Object.fromEntries(data.brokerages.map(b => [b.id, b])), [data.brokerages])
  const referrals = data.referrals.filter(r => filter === 'all' ? true : filter === 'open' ? ACTIVE.includes(r.status) : r.status === filter)
  const payments = data.referrals.flatMap(r => (r.buyer_referral_payments || []).map(p => ({ ...p, referral: r })))
  const pendingAgents = data.agents.filter(a => a.status === 'pending').length
  const newReferrals = data.referrals.filter(r => ['submitted', 'needs_review'].includes(r.status)).length
  const selected = data.referrals.find(r => r.id === selectedId)

  const TABS = [
    { id: 'referrals', label: 'Referrals', count: newReferrals },
    { id: 'agents', label: 'Agents & brokerages', count: pendingAgents },
    { id: 'payments', label: 'Payments', count: payments.filter(p => ['pending', 'approved'].includes(p.status)).length },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Handshake className="h-6 w-6 text-teal-600" /> Agent Referrals</h2>
          <p className="text-sm text-gray-500">Buyers referred to Lightkeeper Realty by licensed agents nationwide. <a href="/refer-a-buyer" target="_blank" rel="noreferrer" className="text-blue-600 underline">Program page</a></p>
        </div>
        <button onClick={load} className="p-2 text-gray-500 hover:text-gray-800" aria-label="Refresh"><RefreshCw className="h-4 w-4" /></button>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600'}`}>
            {t.label}{t.count > 0 && <span className="ml-1.5 px-1.5 rounded-full bg-orange-500 text-white text-xs">{t.count}</span>}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && tab === 'referrals' && (
        <>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="open">Open</option>
            <option value="all">All</option>
            {Object.entries(REFERRAL_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div className="bg-white border rounded-lg overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr><th className="px-3 py-2">Buyer</th><th className="px-3 py-2">Referred by</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Agreement</th><th className="px-3 py-2">Submitted</th></tr>
              </thead>
              <tbody>
                {referrals.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">No referrals.</td></tr>}
                {referrals.map(r => {
                  const a = agentsById[r.referral_agent_id]
                  const agr = one(r.buyer_referral_agreements)
                  return (
                    <tr key={r.id} onClick={() => setSelectedId(r.id)} className="border-t cursor-pointer hover:bg-blue-50">
                      <td className="px-3 py-2 font-medium">{r.buyer_first_name} {r.buyer_last_name}{r.possible_duplicate && <AlertTriangle className="inline h-4 w-4 text-yellow-600 ml-1" aria-label="Possible duplicate" />}<div className="text-xs text-gray-500">{r.nc_area}</div></td>
                      <td className="px-3 py-2">{a ? `${a.first_name} ${a.last_name}` : '—'}<div className="text-xs text-gray-500">{brokeragesById[r.brokerage_id]?.name}</div></td>
                      <td className="px-3 py-2"><Pill map={REFERRAL_STATUSES} value={r.status} /></td>
                      <td className="px-3 py-2">{agr ? <Pill map={AGREEMENT_STATUSES} value={agr.status} /> : '—'}</td>
                      <td className="px-3 py-2 text-gray-600">{shortDate(r.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && tab === 'agents' && <AgentsTab agents={data.agents} brokerages={data.brokerages} onChanged={load} />}

      {!loading && tab === 'payments' && (
        <div className="bg-white border rounded-lg overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr><th className="px-3 py-2">Buyer</th><th className="px-3 py-2">Brokerage</th><th className="px-3 py-2 text-right">Commission</th><th className="px-3 py-2 text-right">Fee</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Closed</th></tr>
            </thead>
            <tbody>
              {payments.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">No referral payments yet.</td></tr>}
              {payments.map(p => (
                <tr key={p.id} onClick={() => setSelectedId(p.referral_id)} className="border-t cursor-pointer hover:bg-blue-50">
                  <td className="px-3 py-2">{p.referral.buyer_first_name} {p.referral.buyer_last_name}</td>
                  <td className="px-3 py-2">{brokeragesById[p.brokerage_id]?.name}<div className="text-xs text-gray-500">W-9 {brokeragesById[p.brokerage_id]?.w9_status === 'received' ? 'received' : 'missing'}</div></td>
                  <td className="px-3 py-2 text-right">{money(p.commission_received, true)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{money(p.fee_amount, true)}</td>
                  <td className="px-3 py-2"><Pill map={PAYMENT_STATUSES} value={p.status} /></td>
                  <td className="px-3 py-2 text-gray-600">{shortDate(p.closing_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ReferralDetail referral={selected} agent={agentsById[selected.referral_agent_id]} brokerage={brokeragesById[selected.brokerage_id]}
          onClose={() => setSelectedId(null)} onChanged={load} />
      )}
    </div>
  )
}
