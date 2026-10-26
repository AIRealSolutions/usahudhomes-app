/**
 * /join/:token — where an invitation email lands.
 * Name and email come from the invitation; the buyer picks a password and is signed
 * in immediately (the emailed link already proves the address, so there is no
 * confirmation step). Existing members get a sign-in form instead.
 */

import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { CheckCircle, Eye, EyeOff, Lock, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { US_STATES } from '../services/buyerProfile'
import { lookupInvite, acceptInvite } from '../services/clientInvites'

const BENEFITS = [
  'See what HUD actually accepted on homes like the one you want, before you bid',
  'A deal meter and step-by-step offer builder, so your offer is priced to win',
  'A calendar of HUD bid deadlines and expected price cuts',
  'Full property addresses, saved homes, and new-listing alerts',
]

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

export default function JoinInvite() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { initialized, isAuthenticated, signIn } = useAuth()
  const [invite, setInvite] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', state: '', password: '' })
  const [signInMode, setSignInMode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (initialized && isAuthenticated) navigate('/dashboard', { replace: true })
  }, [initialized, isAuthenticated])

  useEffect(() => {
    lookupInvite(token).then(r => {
      if (!r.success) { setLoadError(r.error || 'This invitation link is not valid.'); return }
      setInvite(r.invite)
      setSignInMode(r.invite.registered)
      setForm(f => ({ ...f, firstName: r.invite.firstName, lastName: r.invite.lastName, phone: r.invite.phone, state: r.invite.state }))
    }).catch(() => setLoadError('Could not load your invitation. Check your connection and try again.'))
  }, [token])

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const finishSignIn = async () => {
    const result = await signIn(invite.email, form.password)
    if (!result.success) throw new Error(/invalid login credentials/i.test(result.error || '')
      ? 'That password does not match. Use "Forgot password?" to set a new one.'
      : result.error || 'Sign in failed')
    navigate('/dashboard', { replace: true })
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (!signInMode) {
        if (form.password.length < 8) throw new Error('Use a password of at least 8 characters.')
        const r = await acceptInvite({ token, ...form })
        if (r.existingAccount) {
          setSignInMode(true)
          setForm(f => ({ ...f, password: '' }))
          setError('You already have an account with this email. Sign in with your password.')
          return
        }
        if (!r.success) throw new Error(r.error || 'Could not create your account.')
      }
      await finishSignIn()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Invitation not found</h1>
        <p className="mt-3 text-gray-700">{loadError}</p>
        <Link to="/login?signup=1" className="mt-6 inline-block rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">Create a free account</Link>
      </div>
    )
  }

  if (!invite) {
    return <div className="flex justify-center py-24"><RefreshCw className="h-8 w-8 animate-spin text-blue-700" /></div>
  }

  const inviter = invite.inviter || {}
  const firstName = invite.firstName || form.firstName

  if (invite.expired && !signInMode) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">This invitation has expired</h1>
        <p className="mt-3 text-gray-700">You can still create a free account, or ask {inviter.name || 'your agent'} to send a new invitation.</p>
        <Link to="/login?signup=1" className="mt-6 inline-block rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">Create a free account</Link>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 px-4 py-10 sm:py-16">
      <Helmet>
        <title>You're invited | USAHUDhomes.com</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 md:items-start">
        <section>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Personal invitation</p>
          <h1 className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {firstName ? `${firstName}, ` : ''}{inviter.name || 'Your agent'} invited you to USAHUDhomes.com
          </h1>
          <p className="mt-4 text-lg text-gray-700">
            {invite.byBroker
              ? 'A tool built to give HUD home buyers an advantage when making offers.'
              : 'A tool I am building to give HUD home buyers an advantage when making offers.'}
          </p>
          <ul className="mt-6 space-y-3">
            {BENEFITS.map(b => (
              <li key={b} className="flex items-start gap-3 text-gray-800">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden="true" /> <span>{b}</span>
              </li>
            ))}
          </ul>
          {(inviter.company || inviter.phone) && (
            <p className="mt-6 text-sm text-gray-600">
              Questions? {inviter.name}{inviter.company ? `, ${inviter.company}` : ''}
              {inviter.phone && <> · <a href={`tel:${inviter.phone.replace(/[^\d+]/g, '')}`} className="font-medium text-blue-700">{inviter.phone}</a></>}
            </p>
          )}
        </section>

        <section className="rounded-xl bg-white p-6 shadow-lg sm:p-8">
          <h2 className="text-xl font-bold text-gray-900">{signInMode ? 'Welcome back — sign in' : 'Create your free account'}</h2>
          <p className="mt-1 text-sm text-gray-600">{signInMode ? 'You already have an account.' : 'Takes about a minute. No credit card.'}</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {!signInMode && (
              <div className="grid grid-cols-2 gap-3">
                <input className={inputClass} placeholder="First name" autoComplete="given-name" required value={form.firstName} onChange={set('firstName')} />
                <input className={inputClass} placeholder="Last name" autoComplete="family-name" value={form.lastName} onChange={set('lastName')} />
              </div>
            )}
            <div>
              <input className={`${inputClass} bg-gray-100 text-gray-700`} value={invite.email} readOnly aria-label="Email" />
              {!signInMode && (
                <p className="mt-1 text-xs text-gray-500">
                  Want to use a different email? <Link to="/login?signup=1" className="text-blue-700 hover:underline">Sign up here</Link>
                </p>
              )}
            </div>
            {!signInMode && (
              <div className="grid grid-cols-2 gap-3">
                <input className={inputClass} type="tel" placeholder="Phone (optional)" autoComplete="tel" value={form.phone} onChange={set('phone')} />
                <select className={inputClass} value={form.state} onChange={set('state')} aria-label="State">
                  <option value="">State</option>
                  {Object.entries(US_STATES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                </select>
              </div>
            )}
            <div className="relative">
              <input
                className={`${inputClass} pr-10`}
                type={showPassword ? 'text' : 'password'}
                placeholder={signInMode ? 'Password' : 'Choose a password (8+ characters)'}
                autoComplete={signInMode ? 'current-password' : 'new-password'}
                minLength={signInMode ? undefined : 8}
                required
                value={form.password}
                onChange={set('password')}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-2.5 text-gray-500" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
              {busy ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
              {signInMode ? 'Sign in' : 'Create my free account'}
            </button>
            {signInMode && (
              <p className="text-center text-sm"><Link to="/login?reset=1" className="text-blue-700 hover:underline">Forgot password?</Link></p>
            )}
          </form>
        </section>
      </div>
    </div>
  )
}
