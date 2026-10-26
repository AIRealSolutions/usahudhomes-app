/**
 * /agent-referrals — the referring agent's side of the Nationwide Agent Referral Program:
 * register (license + brokerage), wait for verification, then refer buyers, sign
 * agreements and follow each referral through to payment.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Send, Clock, CheckCircle, XCircle, FileSignature, DollarSign, Home } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { US_STATES } from '../services/buyerProfile'
import {
  CONSENT_TEXT, REFERRAL_STATUSES, AGREEMENT_STATUSES, PAYMENT_STATUSES, VERIFICATION_STATUSES,
  REFERRAL_FEE_CAP, REFERRAL_PCT, RECEIVING_BROKERAGE, estimatedFee, money, shortDate,
} from '../data/buyerReferralProgram'
import { fetchMyRegistration, registerReferralAgent, submitBuyerReferral, fetchReferrals } from '../services/buyerReferrals'
import AgreementSignDialog from '../components/referrals/AgreementSignDialog'

const STATE_OPTIONS = Object.entries(US_STATES)
const one = (x) => (Array.isArray(x) ? x[0] : x) || null

function Pill({ map, value }) {
  const s = map[value] || { label: value, cls: 'bg-gray-100 text-gray-700' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${s.cls}`}>{s.label}</span>
}

function Field({ label, children, hint }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
    </label>
  )
}

const inputCls = 'mt-1 w-full border rounded-lg px-3 py-2'

function StateSelect({ value, onChange, required }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} required={required} className={inputCls}>
      <option value="">Select state</option>
      {STATE_OPTIONS.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
    </select>
  )
}

// ── Registration ────────────────────────────────────────────────────────────
function RegistrationForm({ profile, onRegistered }) {
  const [f, setF] = useState({
    firstName: profile?.first_name || '', lastName: profile?.last_name || '', phone: profile?.phone || '',
    licenseNumber: '', licenseState: '', brokerageName: '', brokerageState: '', firmLicenseNumber: '',
    brokerInCharge: '', brokerageEmail: '', brokeragePhone: '', brokerageAddress: '', terms: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (e) => setF(p => ({ ...p, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await registerReferralAgent(f)
      onRegistered()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Register for the referral program</h2>
        <p className="text-sm text-gray-600 mt-1">Lightkeeper Realty verifies your license and brokerage before you can refer buyers. Referral fees are paid to your brokerage.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name"><input className={inputCls} value={f.firstName} onChange={set('firstName')} required /></Field>
        <Field label="Last name"><input className={inputCls} value={f.lastName} onChange={set('lastName')} required /></Field>
        <Field label="Phone"><input className={inputCls} value={f.phone} onChange={set('phone')} type="tel" /></Field>
        <div />
        <Field label="Your license number"><input className={inputCls} value={f.licenseNumber} onChange={set('licenseNumber')} required /></Field>
        <Field label="License state"><StateSelect value={f.licenseState} onChange={set('licenseState')} required /></Field>
      </div>

      <div className="border-t pt-6 grid gap-4 sm:grid-cols-2">
        <h3 className="sm:col-span-2 font-semibold text-gray-900">Brokerage</h3>
        <Field label="Brokerage name"><input className={inputCls} value={f.brokerageName} onChange={set('brokerageName')} required /></Field>
        <Field label="Brokerage state"><StateSelect value={f.brokerageState} onChange={set('brokerageState')} required /></Field>
        <Field label="Firm license number" hint="If your state licenses firms separately."><input className={inputCls} value={f.firmLicenseNumber} onChange={set('firmLicenseNumber')} /></Field>
        <Field label="Broker-in-charge / managing broker"><input className={inputCls} value={f.brokerInCharge} onChange={set('brokerInCharge')} /></Field>
        <Field label="Brokerage email"><input className={inputCls} value={f.brokerageEmail} onChange={set('brokerageEmail')} type="email" /></Field>
        <Field label="Brokerage phone"><input className={inputCls} value={f.brokeragePhone} onChange={set('brokeragePhone')} type="tel" /></Field>
        <div className="sm:col-span-2"><Field label="Brokerage address"><input className={inputCls} value={f.brokerageAddress} onChange={set('brokerageAddress')} /></Field></div>
      </div>

      <label className="flex gap-2 text-sm text-gray-700">
        <input type="checkbox" className="mt-1" checked={f.terms} onChange={set('terms')} required />
        <span>
          I am a licensed real estate agent. I understand referral fees ({Math.round(REFERRAL_PCT * 100)}% of the commission {RECEIVING_BROKERAGE.name} receives,
          up to {money(REFERRAL_FEE_CAP)}) are paid only to my verified brokerage, only after a covered sale closes, and only under a signed referral agreement.
          See the <Link to="/refer-a-buyer" className="text-blue-600 underline">program rules</Link>.
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={saving} className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50">
        {saving ? 'Submitting…' : 'Submit for verification'}
      </button>
    </form>
  )
}

// ── Referral form ───────────────────────────────────────────────────────────
const EMPTY_REFERRAL = { firstName: '', lastName: '', email: '', phone: '', ncArea: '', relationship: '', notes: '', otherAgencyStatus: 'none', consent: false }

function ReferBuyerForm({ onSubmitted }) {
  const [f, setF] = useState(EMPTY_REFERRAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const set = (k) => (e) => setF(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!f.email.trim() && !f.phone.trim()) { setError('Enter the buyer\'s email or phone'); return }
    setSaving(true)
    setError(null)
    try {
      await submitBuyerReferral({ ...f, consentText: CONSENT_TEXT })
      setF(EMPTY_REFERRAL)
      setDone(true)
      onSubmitted()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Send className="h-5 w-5 text-blue-600" /> Refer a buyer</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Buyer first name"><input className={inputCls} value={f.firstName} onChange={set('firstName')} required /></Field>
        <Field label="Buyer last name"><input className={inputCls} value={f.lastName} onChange={set('lastName')} required /></Field>
        <Field label="Buyer email"><input className={inputCls} value={f.email} onChange={set('email')} type="email" /></Field>
        <Field label="Buyer phone"><input className={inputCls} value={f.phone} onChange={set('phone')} type="tel" /></Field>
        <Field label="Interested NC area"><input className={inputCls} value={f.ncArea} onChange={set('ncArea')} placeholder="City, county, or anywhere in NC" /></Field>
        <Field label="Relationship"><input className={inputCls} value={f.relationship} onChange={set('relationship')} placeholder="Family, friend, past client…" /></Field>
        <Field label="Has the buyer signed a buyer agency agreement with another agent?">
          <select className={inputCls} value={f.otherAgencyStatus} onChange={set('otherAgencyStatus')}>
            <option value="none">No</option>
            <option value="yes">Yes</option>
            <option value="unknown">Not sure</option>
          </select>
        </Field>
        <Field label="Notes for Lightkeeper (optional)"><input className={inputCls} value={f.notes} onChange={set('notes')} placeholder="Timeline, financing, what they're looking for" /></Field>
      </div>
      <label className="flex gap-2 text-sm text-gray-700">
        <input type="checkbox" className="mt-1" checked={f.consent} onChange={set('consent')} required />
        <span>{CONSENT_TEXT}</span>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && !error && <p className="text-sm text-green-700">Referral submitted. Lightkeeper Realty will review it and let you know.</p>}
      <button disabled={saving} className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50">
        {saving ? 'Submitting…' : 'Submit referral'}
      </button>
    </form>
  )
}

// ── Referral history ────────────────────────────────────────────────────────
function ReferralRow({ r, onOpenAgreement }) {
  const agreement = one(r.buyer_referral_agreements)
  const payments = r.buyer_referral_payments || []
  const paid = payments.find(p => p.status === 'paid')
  const latest = paid || payments.find(p => p.status !== 'void')

  return (
    <li className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-gray-900">{r.buyer_first_name} {r.buyer_last_name}</p>
        <p className="text-xs text-gray-500">
          Referred {shortDate(r.created_at)}{r.nc_area ? ` · ${r.nc_area}` : ''}
          {r.protection_ends_at && ` · protected through ${shortDate(r.protection_ends_at)}`}
        </p>
        {r.status === 'declined' && r.decline_reason && <p className="text-xs text-gray-600 mt-1">Reason: {r.decline_reason}</p>}
        {r.status === 'under_contract' && r.contract_price && (
          <p className="text-xs text-gray-700 mt-1">Under contract at {money(r.contract_price)} · estimated fee {money(estimatedFee(r.contract_price))} (assumes 3% commission)</p>
        )}
        {latest && <p className="text-xs text-gray-700 mt-1">Referral fee {money(latest.fee_amount, true)} · <Pill map={PAYMENT_STATUSES} value={latest.status} />{latest.paid_at && ` ${shortDate(latest.paid_at)}`}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Pill map={REFERRAL_STATUSES} value={r.status} />
        {agreement && (
          <button onClick={() => onOpenAgreement(agreement)}
            className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1 ${agreement.status === 'awaiting_referring' ? 'bg-orange-500 border-orange-500 text-white font-semibold' : 'text-gray-700'}`}>
            <FileSignature className="h-3.5 w-3.5" />
            {agreement.status === 'awaiting_referring' ? 'Sign agreement' : AGREEMENT_STATUSES[agreement.status]?.label}
          </button>
        )}
      </div>
    </li>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function AgentReferrals() {
  const { user, profile } = useAuth()
  const [reg, setReg] = useState(null)
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openAgreement, setOpenAgreement] = useState(null)

  const userId = user?.id
  const load = useCallback(async () => {
    if (!userId) return
    setError(null)
    try {
      const r = await fetchMyRegistration(userId)
      setReg(r)
      setReferrals(r.agent ? await fetchReferrals({ agentId: r.agent.id }) : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => ({
    submitted: referrals.length,
    underContract: referrals.filter(r => r.status === 'under_contract').length,
    paid: referrals.filter(r => (r.buyer_referral_payments || []).some(p => p.status === 'paid')).length,
  }), [referrals])

  const verified = reg?.agent?.status === 'verified' && reg?.brokerage?.verification_status === 'verified'

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Helmet><title>Agent Referrals | USAHUDhomes.com</title><meta name="robots" content="noindex" /></Helmet>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Agent Referrals</h1>
        <p className="text-gray-600">Refer buyers to {RECEIVING_BROKERAGE.name} for North Carolina HUD homes. <Link to="/refer-a-buyer" className="text-blue-600 underline">How the program works</Link></p>
      </div>

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && !reg?.agent && <RegistrationForm profile={profile} onRegistered={load} />}

      {reg?.agent && !verified && (
        <div className="bg-white rounded-xl shadow-sm p-6 flex gap-4">
          {reg.agent.status === 'rejected' ? <XCircle className="h-8 w-8 text-red-500 flex-shrink-0" /> : <Clock className="h-8 w-8 text-yellow-500 flex-shrink-0" />}
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {reg.agent.status === 'rejected' ? 'Registration not approved' : 'Verification in progress'}
            </h2>
            <p className="text-sm text-gray-600">
              {reg.agent.status === 'rejected'
                ? (reg.agent.rejection_reason || `Contact ${RECEIVING_BROKERAGE.name} at ${RECEIVING_BROKERAGE.phone} with questions.`)
                : `${RECEIVING_BROKERAGE.name} is verifying your license and brokerage. You can refer buyers once both are approved.`}
            </p>
            <p className="text-sm text-gray-700">Your license ({reg.agent.license_state} {reg.agent.license_number}): <Pill map={VERIFICATION_STATUSES} value={reg.agent.status} /></p>
            <p className="text-sm text-gray-700">{reg.brokerage?.name}: <Pill map={VERIFICATION_STATUSES} value={reg.brokerage?.verification_status} /></p>
          </div>
        </div>
      )}

      {reg?.agent && (verified || referrals.length > 0) && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Submitted', value: stats.submitted, icon: Send, cls: 'text-blue-600' },
            { label: 'Under contract', value: stats.underContract, icon: Home, cls: 'text-orange-500' },
            { label: 'Paid', value: stats.paid, icon: DollarSign, cls: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm p-4">
              <s.icon className={`h-5 w-5 ${s.cls}`} />
              <p className="mt-2 text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs sm:text-sm text-gray-600">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {verified && <ReferBuyerForm onSubmitted={load} />}

      {referrals.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm">
          <h2 className="px-4 pt-4 text-lg font-semibold text-gray-900 flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600" /> Referral history</h2>
          <ul className="divide-y">{referrals.map(r => <ReferralRow key={r.id} r={r} onOpenAgreement={setOpenAgreement} />)}</ul>
        </div>
      )}

      {openAgreement && (
        <AgreementSignDialog agreement={openAgreement} onClose={() => setOpenAgreement(null)}
          onSigned={() => { setOpenAgreement(null); load() }} />
      )}
    </div>
  )
}
