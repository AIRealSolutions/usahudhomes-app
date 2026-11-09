/**
 * /broker-referral/:token — a HUD broker answers a referral request emailed from
 * Broker Finder: accept or decline the buyer, and optionally sign up for more
 * HUD buyer leads in the regions of the state they cover.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { lookupReferral, respondToReferral } from '../services/brokerFinder'

const money = n => (Number(n) ? '$' + Math.round(Number(n)).toLocaleString() : '')

export default function BrokerReferralResponse() {
  const { token } = useParams()
  const initial = useMemo(() => new URLSearchParams(window.location.search).get('r'), [])
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [response, setResponse] = useState(['accept', 'decline', 'optout'].includes(initial) ? initial : '')
  const [note, setNote] = useState('')
  const [wantsMore, setWantsMore] = useState(initial !== 'optout')
  const [regions, setRegions] = useState([])
  const [agentLicense, setAgentLicense] = useState('')
  const [firmLicense, setFirmLicense] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  useEffect(() => {
    lookupReferral(token).then(d => {
      setData(d)
      if (d.request.regionsRequested?.length) setRegions(d.request.regionsRequested)
      if (d.request.taken) { setResponse(r0 => (r0 === 'optout' ? r0 : 'decline')); setWantsMore(true) }
      setAgentLicense(d.request.agentLicense || '')
      setFirmLicense(d.request.firmLicense || '')
      setEmail(d.broker.email || '')
    }).catch(e => setError(e.message))
  }, [token])

  const submit = async () => {
    if (!response) return setError('Choose a response.')
    const needsEmail = response === 'accept' || (response === 'decline' && wantsMore)
    if (needsEmail && !/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(email.trim())) {
      return setError(response === 'accept' ? 'Add your email so we can send you the referral agreement.' : 'Add your email so we can send you leads.')
    }
    setBusy(true); setError('')
    try {
      setDone(await respondToReferral({ token, response, note, wantsMoreLeads: response !== 'optout' && wantsMore, regions, agentLicense, firmLicense, email: email.trim() }))
    } catch (e) {
      if (e.data?.taken) {
        setData(d => ({ ...d, request: { ...d.request, taken: true } }))
        setResponse('decline'); setWantsMore(true)
      }
      setError(e.message)
    } finally { setBusy(false) }
  }

  const r = data?.request
  const where = r ? [r.address, [r.city, r.state].filter(Boolean).join(', ')].filter(Boolean).join(', ') : ''

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <Helmet><title>HUD Buyer Referral | USAHUDhomes.com</title><meta name="robots" content="noindex" /></Helmet>
      <div className="max-w-xl mx-auto bg-white rounded-lg shadow p-5 sm:p-6 space-y-5">
        <h1 className="text-2xl font-bold text-blue-900">HUD buyer referral</h1>
        {error && <div role="alert" className="border border-red-200 bg-red-50 text-red-800 rounded p-3 text-sm">{error}</div>}
        {!data && !error && <p className="text-gray-600">Loading…</p>}

        {data && !done && (
          <>
            <p className="text-gray-700">Hi {data.broker.contactName?.split(' ')[0] || 'there'} — we have a buyer who wants to bid on this HUD home near your office{data.broker.company ? ` (${data.broker.company})` : ''}.</p>
            <div className="border rounded p-4 bg-gray-50">
              <div className="font-semibold">{where}</div>
              <div className="text-sm text-gray-700">
                {r.caseNumber && <>HUD case #{r.caseNumber}<br /></>}
                {money(r.price) && <>List price {money(r.price)}<br /></>}
                {r.distanceMiles != null && <>About {r.distanceMiles} miles from your office<br /></>}
                Referral fee: {r.feePercent}% of the buyer-side compensation
              </div>
              {r.caseNumber && <a className="text-blue-700 underline text-sm" href={`/property/${encodeURIComponent(r.caseNumber)}`} target="_blank" rel="noreferrer">View the listing</a>}
              {r.note && <p className="mt-3 text-sm whitespace-pre-wrap border-l-4 border-blue-800 pl-3">{r.note}</p>}
            </div>
            {r.respondedAt && <p className="text-sm text-gray-600">You already answered on {new Date(r.respondedAt).toLocaleDateString()} ({r.status}). You can change your answer below.</p>}

            {r.taken && (
              <div role="status" className="border border-amber-300 bg-amber-50 rounded p-4">
                <p className="font-semibold">Already accepted</p>
                <p className="text-sm text-gray-700">Thank you — this buyer has already been placed with another agent. We'd still like to send you HUD buyers near your office.</p>
              </div>
            )}
            <fieldset className="space-y-2">
              <legend className="font-semibold mb-1">{r.taken ? 'Would you like future HUD buyer referrals?' : 'Can you represent this buyer and submit the bid?'}</legend>
              {(r.taken
                ? [['decline', 'Yes, send me future buyers'], ['optout', "Don't send me referrals"]]
                : [['accept', 'Yes, I can help this buyer'], ['decline', 'Not this one'], ['optout', "Don't send me referrals"]]
              ).map(([v, label]) => (
                <label key={v} className={`flex items-center gap-3 border rounded p-3 cursor-pointer ${response === v ? 'border-blue-700 bg-blue-50' : ''}`}>
                  <input type="radio" name="response" value={v} checked={response === v} onChange={() => setResponse(v)} /> {label}
                </label>
              ))}
            </fieldset>

            {response === 'accept' && (
              <div className="border rounded p-3 space-y-2">
                <p className="text-sm">Accepting makes you a USAHUDhomes.com partner agent: you'll get a login to see this buyer and future HUD buyer leads near you. We'll also email you the referral agreement (NC REALTORS® Form 730) to sign. Add your license numbers to fill them in (optional).</p>
                <label className="block text-sm">Your email *<input type="email" required className="border rounded p-2 w-full" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@yourfirm.com" /></label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="text-sm">Your license #<input className="border rounded p-2 w-full" maxLength={30} value={agentLicense} onChange={e => setAgentLicense(e.target.value)} /></label>
                  <label className="text-sm">Firm license #<input className="border rounded p-2 w-full" maxLength={30} value={firmLicense} onChange={e => setFirmLicense(e.target.value)} /></label>
                </div>
              </div>
            )}
            {r.agreementUrl && <p className="text-sm"><a className="text-blue-700 underline" href={r.agreementUrl} target="_blank" rel="noreferrer">Download your referral agreement</a></p>}

            {response !== 'optout' && (
              <>
                <label className="block text-sm">Note (optional)
                  <textarea className="border rounded p-2 w-full mt-1" rows={3} maxLength={1000} value={note} onChange={e => setNote(e.target.value)}
                    placeholder={response === 'accept' ? 'Best number or time to reach you about the buyer' : 'Anything we should know'} />
                </label>
                <div className="border rounded p-3 space-y-2">
                  <label className="flex items-center gap-2 font-medium">
                    <input type="checkbox" checked={wantsMore} onChange={e => setWantsMore(e.target.checked)} />
                    Send me more HUD buyer leads in {r.state || 'my state'}
                  </label>
                  {wantsMore && response === 'decline' && (
                    <label className="block text-sm">Your email *<input type="email" className="border rounded p-2 w-full" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@yourfirm.com" /></label>
                  )}
                  {wantsMore && data.regions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Which regions do you cover? Leave all unchecked for the whole state.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {data.regions.map(g => (
                          <label key={g.slug} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={regions.includes(g.slug)} onChange={e => setRegions(list => e.target.checked ? [...list, g.slug] : list.filter(x => x !== g.slug))} />
                            {g.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            <button type="button" disabled={busy || !response} onClick={submit} className="w-full bg-blue-800 text-white rounded px-4 py-3 font-semibold disabled:opacity-50">
              {busy ? 'Sending…' : 'Send my answer'}
            </button>
          </>
        )}

        {done && (
          <div className="space-y-4">
            <p className="text-lg">
              {response === 'accept' && (done.agreementEmailed
                ? 'Thank you! We emailed you the referral agreement to sign. Reply to that email with the signed copy and we will be in touch about the buyer.'
                : 'Thank you! We will call you shortly with the buyer’s details and the referral agreement.')}
              {response === 'decline' && (r?.taken ? 'Thank you! We will reach out with the next buyer near you.' : 'Thanks for letting us know.')}
              {response === 'optout' && 'You will not receive more referral requests from us.'}
            </p>
            {done.partner && (
              <div className="border rounded p-4 bg-blue-50 space-y-2">
                <p className="font-semibold">You're a USAHUDhomes.com partner agent.</p>
                <p className="text-sm text-gray-700">
                  {done.partner.invited
                    ? 'Check your email for a link to set your password, then sign in to see this buyer'
                    : 'Sign in to see this buyer'}
                  {done.partner.leadAssigned ? ' — they are already in your account.' : '.'}
                </p>
                <Link to="/login" className="inline-block bg-blue-800 text-white rounded px-4 py-2 font-semibold">Sign in</Link>
              </div>
            )}
            {done.agreementUrl && done.agreementEmailed && (
              <p><a className="text-blue-700 underline" href={done.agreementUrl} target="_blank" rel="noreferrer">Download the referral agreement</a></p>
            )}
            {done.registerUrl && (
              <div className="border rounded p-4 bg-green-50 space-y-2">
                <p className="font-semibold">Finish your partner sign-up to get HUD buyer leads in your regions.</p>
                <p className="text-sm text-gray-700">It takes about five minutes: your license details and our referral agreement.</p>
                <Link to={done.registerUrl} className="inline-block bg-green-700 text-white rounded px-4 py-2 font-semibold">Sign up for leads</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
