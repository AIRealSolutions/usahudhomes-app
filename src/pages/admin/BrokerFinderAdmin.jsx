/**
 * Broker Finder — when a buyer wants to bid on a home where we have no agent,
 * find the nearest HUD-registered selling brokers (hudhomestore.gov/brokersearch)
 * and email them referral requests.
 *
 * Deep link: /admin?tab=broker-finder&case=<HUD case #>&lead=<lead id>
 */
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../config/supabase'
import { US_STATES } from '../../utils/states'
import LeafletMap from '../../components/maps/LeafletMap'
import {
  suggestBrokers, sendReferralRequests, resendReferralRequest, getEconomicRegions,
  BROKER_STATUS, REQUEST_STATUS, DEFAULT_FEE_PERCENT,
  agreementFormStatus, uploadAgreementForm, previewAgreement,
  createReferralLink, smsHref, mailtoHref, releaseReferral,
} from '../../services/brokerFinder'

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const money = n => (Number(n) ? '$' + Math.round(Number(n)).toLocaleString() : '')
const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/
const PROPERTY_COLS = 'id,case_number,address,city,state,zip_code,county,price,status,economic_region,latitude,longitude'

export default function BrokerFinderAdmin() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const [state, setState] = useState('NC')
  const [query, setQuery] = useState('')
  const [properties, setProperties] = useState([])
  const [property, setProperty] = useState(null)
  const [leadId, setLeadId] = useState(params.get('lead') || '')
  const [regions, setRegions] = useState([])
  const [result, setResult] = useState(null)
  const [searching, setSearching] = useState(false)
  const [maxMiles, setMaxMiles] = useState(50)
  const [selected, setSelected] = useState([])
  const [emails, setEmails] = useState({})
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [feePercent, setFeePercent] = useState(DEFAULT_FEE_PERCENT)
  const [prospectAware, setProspectAware] = useState(true)
  const [form, setForm] = useState(undefined) // undefined = loading, null = not uploaded
  const [uploading, setUploading] = useState(false)
  const [share, setShare] = useState(null) // { brokerId, url, message, subject, phone, email, busy }
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  const openShare = async b => {
    setShare({ brokerId: b.id, busy: true }); setError('')
    try {
      const r = await createReferralLink({
        propertyId: property.id, brokerId: b.id, leadId: leadId || null, note,
        feePercent: Number(feePercent), prospectAware, distanceMiles: b.distance_miles,
      })
      setShare({ brokerId: b.id, ...r, email: emails[b.id] || r.email })
      setResult(res => res && ({ ...res, brokers: res.brokers.map(x => x.id === b.id ? { ...x, status: x.status === 'new' ? 'contacted' : x.status, request: x.request || { id: r.requestId, status: r.status } } : x) }))
    } catch (e) { setShare(null); setError(e.message) }
  }
  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); setNotice(`${what} copied.`) } catch { setNotice('Copy failed — select the text and copy it.') }
  }
  const nativeShare = async () => {
    try { await navigator.share({ title: share.subject, text: share.message }) } catch { /* cancelled */ }
  }

  useEffect(() => { agreementFormStatus().then(setForm).catch(() => setForm(null)) }, [])

  const uploadForm = async file => {
    if (!file) return
    setUploading(true); setError('')
    try {
      await uploadAgreementForm(file)
      setForm(await agreementFormStatus())
      setNotice('Referral agreement form saved. Use "Preview" to check the filled-in version.')
    } catch (e) { setError(e.message) } finally { setUploading(false) }
  }
  const preview = async requestId => { try { await previewAgreement(requestId) } catch (e) { setError(e.message) } }

  // Property list for the chosen state (search by case #, address or city)
  useEffect(() => {
    let alive = true
    const t = setTimeout(async () => {
      let q = supabase.from('properties').select(PROPERTY_COLS).eq('state', state).eq('is_active', true).order('city').limit(60)
      const s = query.trim().replace(/[%_,()]/g, '')
      if (s) q = q.or(`case_number.ilike.%${s}%,address.ilike.%${s}%,city.ilike.%${s}%,county.ilike.%${s}%`)
      const { data, error: e } = await q
      if (alive) { if (e) setError(e.message); else setProperties(data || []) }
    }, 250)
    return () => { alive = false; clearTimeout(t) }
  }, [state, query])

  useEffect(() => { getEconomicRegions(state).then(setRegions).catch(() => setRegions([])) }, [state])

  // Deep link from a lead: ?case=387-123456
  useEffect(() => {
    const cn = params.get('case')
    if (!cn) return
    window.history.replaceState(null, '', '/admin?tab=broker-finder') // don't reapply on a later visit
    supabase.from('properties').select(PROPERTY_COLS).eq('case_number', cn).maybeSingle().then(({ data }) => {
      if (data) { setState(data.state); pick(data) } else setError(`No property with case # ${cn}`)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const regionName = slug => regions.find(r => r.slug === slug)?.name || slug

  const pick = p => {
    setProperty(p); setResult(null); setSelected([]); setEmails({}); setNotice(''); setError('')
  }

  const search = async (miles = maxMiles) => {
    if (!property) return
    setSearching(true); setError(''); setNotice('')
    try {
      const r = await suggestBrokers(property.id, { maxMiles: miles, want: 10 })
      setResult(r)
      setEmails(Object.fromEntries(r.brokers.map(b => [b.id, b.email || ''])))
      if (!r.brokers.length) setNotice(`No HUD brokers found within ${r.maxMiles} miles yet.${r.moreToSearch ? ' More towns remain — search again to keep going.' : ''}`)
      else if (r.errors?.length) setNotice(`Some HUD searches failed: ${r.errors.slice(0, 3).join('; ')}`)
    } catch (e) { setError(e.message) } finally { setSearching(false) }
  }

  const toggle = id => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))

  const send = async () => {
    const brokers = result.brokers.filter(b => selected.includes(b.id))
    const missing = brokers.filter(b => !EMAIL_RE.test((emails[b.id] || '').trim()))
    if (missing.length) return setError(`Add an email for: ${missing.map(b => b.company_name).join(', ')}`)
    setSending(true); setError('')
    try {
      const r = await sendReferralRequests({
        propertyId: property.id, leadId: leadId || null, note, feePercent: Number(feePercent), prospectAware,
        recipients: brokers.map(b => ({ brokerId: b.id, email: emails[b.id].trim(), distanceMiles: b.distance_miles })),
      })
      const failed = r.results.filter(x => x.status !== 'sent')
      setNotice(`Sent ${r.sent} referral request${r.sent === 1 ? '' : 's'}.${failed.length ? ` Not sent: ${failed.map(f => f.error).join('; ')}` : ''}`)
      setSelected([])
      await search()
    } catch (e) { setError(e.message) } finally { setSending(false) }
  }

  const release = async b => {
    if (!window.confirm(`Release ${b.company_name}? Use this if the buyer fell through with them. The other brokers' links open up again so someone else can accept.`)) return
    try { await releaseReferral(b.request.id); setNotice(`${b.company_name} released. Other brokers can accept this buyer again.`); await search() } catch (e) { setError(e.message) }
  }

  // Short "this one has been placed" text for brokers who didn't get the buyer
  const takenText = b => {
    const first = String(b.contact_name || '').trim().split(/\s+/)[0]
    return `Hi${first ? ` ${first}` : ''}, thanks for your time. The buyer for the HUD home at ${[property?.address, property?.city].filter(Boolean).join(', ')} has been placed with another agent. I'll reach out when I have the next buyer near you.`
  }

  const resend = async reqId => {
    try { await resendReferralRequest(reqId); setNotice('Request sent again.'); await search() } catch (e) { setError(e.message) }
  }

  // The broker who accepted this home (first to accept gets the buyer), even if not in the distance list
  const acceptedBy = useMemo(() => {
    if (!result) return null
    const inList = result.brokers?.find(b => b.request?.status === 'accepted')
    if (inList) return inList
    const a = result.accepted
    return a ? { id: a.broker_id, company_name: a.broker?.company_name || 'another broker', contact_name: a.broker?.contact_name, request: { id: a.id, responded_at: a.responded_at } } : null
  }, [result])

  const mapPoints = useMemo(() => {
    if (!result) return []
    const p = result.property
    const pts = result.brokers.filter(b => b.latitude != null).map(b => ({
      id: b.id, lat: Number(b.latitude), lng: Number(b.longitude),
      color: selected.includes(b.id) ? '#7c3aed' : (BROKER_STATUS[b.status]?.color || '#2563eb'),
      label: `${b.company_name} — ${b.distance_miles ?? '?'} mi`,
      popup: `<strong>${esc(b.company_name)}</strong><br>${esc(b.contact_name)}<br>${esc(b.address)}, ${esc(b.city)}<br>${esc(b.phone)}`,
    }))
    if (p.origin) pts.push({ id: 'property', lat: p.origin.lat, lng: p.origin.lng, color: '#dc2626', radius: 10, label: `Property: ${p.address || ''}, ${p.city}` })
    return pts
  }, [result, selected])

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-5 space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Broker Finder</h1>
        <p className="text-sm text-gray-600">A buyer wants to bid where you have no agent? Find the nearest HUD-registered selling brokers and send them a referral request.</p>
      </header>
      {error && <div role="alert" className="border border-red-200 bg-red-50 text-red-800 rounded p-3 text-sm">{error}</div>}
      {notice && <div role="status" className="border bg-blue-50 rounded p-3 text-sm">{notice}</div>}

      {/* 1. Property */}
      <section className="bg-white rounded shadow p-4 sm:p-5 space-y-3">
        <h2 className="font-semibold">1. Choose the property</h2>
        <div className="flex flex-wrap gap-2">
          <select aria-label="State" className="border rounded p-2" value={state} onChange={e => { setState(e.target.value); setProperty(null); setResult(null) }}>
            {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            <option value="PR">Puerto Rico</option>
          </select>
          <input className="border rounded p-2 flex-1 min-w-48" placeholder="Case #, address, city or county" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        {!property && (
          <div className="max-h-72 overflow-auto divide-y border rounded">
            {properties.map(p => (
              <button key={p.id} type="button" onClick={() => pick(p)} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                <strong>{p.address}</strong>, {p.city} {p.zip_code} · {p.county} County
                {p.economic_region && <span className="ml-2 text-xs bg-teal-50 text-teal-800 rounded px-1.5 py-0.5">{regionName(p.economic_region)}</span>}
                <span className="text-gray-500"> · #{p.case_number} · {money(p.price)}</span>
              </button>
            ))}
            {!properties.length && <p className="p-3 text-sm text-gray-500">No active properties match.</p>}
          </div>
        )}
        {property && (
          <div className="border rounded p-3 bg-gray-50 flex flex-wrap items-center gap-3 justify-between">
            <div className="text-sm">
              <div className="font-semibold">{property.address}, {property.city}, {property.state} {property.zip_code}</div>
              <div className="text-gray-600">#{property.case_number} · {money(property.price)} · {property.county} County{property.economic_region ? ` · ${regionName(property.economic_region)} region` : ''}</div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <label className="text-sm">Lead ID (optional) <input className="border rounded p-1.5 w-40 ml-1 text-xs" value={leadId} onChange={e => setLeadId(e.target.value.trim())} placeholder="link to a lead" /></label>
              <button type="button" className="text-blue-700 underline text-sm" onClick={() => { setProperty(null); setResult(null) }}>Change</button>
            </div>
          </div>
        )}
      </section>

      {/* 2. Search */}
      {property && (
        <section className="bg-white rounded shadow p-4 sm:p-5 space-y-3">
          <h2 className="font-semibold">2. Find the nearest HUD brokers</h2>
          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-sm">Search up to
              <select className="border rounded p-2 ml-2" value={maxMiles} onChange={e => setMaxMiles(Number(e.target.value))}>
                {[25, 50, 75, 100, 150].map(m => <option key={m} value={m}>{m} miles</option>)}
              </select>
            </label>
            <button type="button" disabled={searching} onClick={() => search()} className="bg-blue-700 text-white rounded px-4 py-2 disabled:opacity-50">
              {searching ? 'Searching HUD…' : result ? 'Search again' : 'Find brokers'}
            </button>
            {result?.moreToSearch && !searching && <span className="text-sm text-amber-700">More towns left to check — search again to keep going (earlier towns are remembered).</span>}
          </div>
          <p className="text-xs text-gray-500">Starts with the property's ZIP and town, then works outward town by town. HUD searches are remembered for 14 days. HUD lists phone numbers but not emails.</p>

          {result?.partners?.length > 0 && (
            <div className="border border-green-200 bg-green-50 rounded p-3 text-sm">
              <strong>Partner agents already covering this area:</strong>{' '}
              {result.partners.map(p => `${p.name}${p.company ? ` (${p.company})` : ''} ${p.phone || ''}`).join(' · ')}
            </div>
          )}
          {result && (
            <>
              <p className="text-xs text-gray-500">Searched: {result.searched.map(s => `${s.label} (${s.count})`).join(', ') || 'nothing yet'}</p>
              {result.brokers.length > 0 && <LeafletMap points={mapPoints} fitKey={result.property.id + result.brokers.length} onSelect={id => id !== 'property' && toggle(id)} height={360} />}
            </>
          )}
        </section>
      )}

      {/* 3. Choose and send */}
      {result?.brokers?.length > 0 && (
        <section className="bg-white rounded shadow p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap justify-between gap-2 items-center">
            <h2 className="font-semibold">3. Choose brokers and send a referral request ({selected.length} selected)</h2>
            {!acceptedBy && <button type="button" className="text-blue-700 underline text-sm" onClick={() => setSelected(result.brokers.filter(b => b.status !== 'do_not_contact').slice(0, 5).map(b => b.id))}>Select nearest 5</button>}
          </div>
          {acceptedBy && (
            <div className="border border-green-300 bg-green-50 rounded p-3 text-sm">
              <strong>Accepted by {acceptedBy.company_name}</strong>{acceptedBy.contact_name ? ` (${acceptedBy.contact_name})` : ''}
              {acceptedBy.request.responded_at && ` on ${new Date(acceptedBy.request.responded_at).toLocaleDateString()}`}.
              {' '}Every other broker's link for this home now shows it as already accepted. If the buyer falls through with them, use Release to open it up again.
            </div>
          )}
          <div className="divide-y border rounded">
            {result.brokers.map(b => {
              const st = BROKER_STATUS[b.status] || BROKER_STATUS.new
              const taken = !!acceptedBy && acceptedBy.id !== b.id
              const blocked = b.status === 'do_not_contact' || taken
              return (
                <div key={b.id} className={selected.includes(b.id) ? 'bg-violet-50' : ''}>
                <div className="p-3 flex flex-col sm:flex-row gap-3">
                  <label className="flex gap-3 flex-1 min-w-0 cursor-pointer">
                    <input type="checkbox" className="mt-1" disabled={blocked} checked={selected.includes(b.id)} onChange={() => toggle(b.id)} />
                    <span className="min-w-0">
                      <span className="font-medium">{b.company_name}</span>
                      <span className="ml-2 text-xs rounded px-1.5 py-0.5 text-white" style={{ background: st.color }}>{st.label}</span>
                      <span className="block text-sm text-gray-700">{b.contact_name} · <a className="text-blue-700" href={`tel:${b.phone}`}>{b.phone}</a></span>
                      <span className="block text-xs text-gray-500">{b.address}, {b.city}, {b.state} {b.zip}{b.economic_region ? ` · ${regionName(b.economic_region)}` : ''} · <strong>{b.distance_miles ?? '?'} mi</strong></span>
                      {b.request && (
                        <span className="block text-xs mt-1">
                          Request: <strong>{REQUEST_STATUS[b.request.status]}</strong>
                          {b.request.sent_at && ` ${new Date(b.request.sent_at).toLocaleDateString()}`}
                          {b.request.response_note && ` — “${b.request.response_note}”`}
                          {b.request.wants_more_leads && ' · wants more leads'}
                          {['sent', 'opened', 'failed'].includes(b.request.status) && <button type="button" className="ml-2 text-blue-700 underline" onClick={() => resend(b.request.id)}>Resend</button>}
                          {b.request.status === 'accepted' && <button type="button" className="ml-2 text-blue-700 underline" onClick={() => preview(b.request.id)}>Referral agreement</button>}
                          {b.request.status === 'accepted' && <button type="button" className="ml-2 text-red-700 underline" onClick={() => release(b)}>Release (buyer fell through)</button>}
                        </span>
                      )}
                    </span>
                  </label>
                  <div className="flex flex-col gap-1 sm:w-64">
                    <input type="email" aria-label={`Email for ${b.company_name}`} className="border rounded p-2 text-sm" placeholder="broker email (to send by email)"
                      value={emails[b.id] || ''} disabled={blocked} onChange={e => setEmails(m => ({ ...m, [b.id]: e.target.value }))} />
                    {taken && (
                      <span className="text-xs text-gray-600">
                        Taken — accepted by {acceptedBy.company_name}.
                        {b.request && b.phone && <> <a className="text-teal-800 underline" href={smsHref(b.phone, takenText(b))}>Text update</a></>}
                      </span>
                    )}
                    {!blocked && (
                      <button type="button" className="text-sm border border-teal-700 text-teal-800 rounded px-2 py-1.5 disabled:opacity-50"
                        disabled={share?.brokerId === b.id && share.busy} onClick={() => openShare(b)}>
                        {share?.brokerId === b.id && share.busy ? 'Creating link…' : 'Share link (text / other)'}
                      </button>
                    )}
                  </div>
                </div>
                {share?.brokerId === b.id && !share.busy && (
                  <div className="mx-3 mb-3 border border-teal-200 bg-teal-50 rounded p-3 space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <strong className="text-sm">Share with {b.contact_name || b.company_name}</strong>
                      <button type="button" className="text-sm text-gray-600 underline" onClick={() => setShare(null)}>Close</button>
                    </div>
                    <label className="block text-xs">Message (edit before sending)
                      <textarea className="border rounded p-2 w-full text-sm mt-1 bg-white" rows={4} value={share.message} onChange={e => setShare(sh => ({ ...sh, message: e.target.value }))} />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {share.phone && <a className="bg-green-700 text-white rounded px-3 py-2 text-sm" href={smsHref(share.phone, share.message)}>Text {share.phone}</a>}
                      <a className="bg-blue-700 text-white rounded px-3 py-2 text-sm" href={mailtoHref(emails[b.id] || share.email, share.subject, share.message)}>Email</a>
                      {canNativeShare && <button type="button" className="bg-gray-800 text-white rounded px-3 py-2 text-sm" onClick={nativeShare}>Share…</button>}
                      <button type="button" className="border rounded px-3 py-2 text-sm bg-white" onClick={() => copy(share.message, 'Message')}>Copy message</button>
                      <button type="button" className="border rounded px-3 py-2 text-sm bg-white" onClick={() => copy(share.url, 'Link')}>Copy link</button>
                    </div>
                    <input readOnly aria-label="Referral link" className="border rounded p-2 w-full text-xs bg-white" value={share.url} onFocus={e => e.target.select()} />
                    <p className="text-xs text-gray-600">The link is this broker's own referral page: they can accept, decline or ask for more leads. When they accept, they give their email and the referral agreement is sent to them. Text works best from your phone; on a computer, use Copy message.</p>
                  </div>
                )}
                </div>
              )
            })}
          </div>
          <label className="block text-sm">Message to the brokers (optional)
            <textarea className="border rounded p-2 w-full mt-1" rows={3} maxLength={2000} value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. Buyer is an owner-occupant, pre-approved FHA, wants to bid before the deadline on Friday." />
          </label>
          <div className="flex flex-wrap gap-4 items-center text-sm">
            <label>Referral fee
              <input type="number" min="1" max="100" step="0.5" className="border rounded p-2 w-20 mx-2" value={feePercent} onChange={e => setFeePercent(e.target.value)} />
              % of buyer-side compensation
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={prospectAware} onChange={e => setProspectAware(e.target.checked)} />
              The buyer knows about this referral and that a fee may be paid
            </label>
          </div>
          {!prospectAware && <p className="text-xs text-amber-700">NC license law requires telling the buyer about the referral and that a fee may be paid. The agreement will show “is not aware”.</p>}
          {!leadId && <p className="text-xs text-gray-500">Link a lead ID above to put the buyer's name and contact on the referral agreement.</p>}
          <button type="button" disabled={sending || !selected.length} onClick={send} className="bg-green-700 text-white rounded px-5 py-3 disabled:opacity-50">
            {sending ? 'Sending…' : `Send referral request to ${selected.length} broker${selected.length === 1 ? '' : 's'}`}
          </button>
          <p className="text-xs text-gray-500">Each broker gets a link to accept or decline, and to sign up for more HUD buyer leads in the regions of {property.state} they cover. When a broker accepts, the referral agreement is filled in and emailed to them to sign, with a copy to you.</p>
        </section>
      )}

      {/* Referral agreement form */}
      <section className="bg-white rounded shadow p-4 sm:p-5 space-y-2">
        <h2 className="font-semibold">Referral agreement (NC REALTORS® Form 730)</h2>
        {form === undefined && <p className="text-sm text-gray-500">Checking…</p>}
        {form === null && <p className="text-sm text-amber-700">Not uploaded yet. Upload your copy of Form 730 so accepted referrals get a filled-in agreement automatically.</p>}
        {form && <p className="text-sm text-green-800">Uploaded {form.updated_at ? new Date(form.updated_at).toLocaleDateString() : ''}. Brokers who accept get it filled in with the property, buyer, their firm, a {DEFAULT_FEE_PERCENT}% buyer-side fee (or the % you set), a 6-month End Date and payment within 10 days.</p>}
        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-sm border rounded px-3 py-2 cursor-pointer bg-gray-50">
            {uploading ? 'Uploading…' : form ? 'Replace form PDF' : 'Upload form PDF'}
            <input type="file" accept="application/pdf" className="hidden" disabled={uploading} onChange={e => { uploadForm(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          {form && <button type="button" className="text-blue-700 underline text-sm" onClick={() => preview(null)}>Preview with sample data</button>}
        </div>
        <p className="text-xs text-gray-500">Use the copy that already shows your name and office address (as produced in Lone Wolf Transact). It is stored privately and only sent out filled in, to the broker who accepted. Set your firm and agent license numbers in Vercel as REFERRAL_FIRM_LICENSE and REFERRAL_AGENT_LICENSE.</p>
      </section>
    </main>
  )
}
