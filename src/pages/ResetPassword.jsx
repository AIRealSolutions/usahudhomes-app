import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'

/**
 * Landing page for password-reset emails and agent invitations.
 * Supabase signs the visitor in from the link, then they choose a password.
 */
export default function ResetPassword() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('checking') // checking | ready | invalid | done
  const [linkError, setLinkError] = useState(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Expired or already-used links come back with an error in the URL
    const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search)
    const urlError = params.get('error_description')
    if (urlError) {
      setLinkError(urlError.replace(/\+/g, ' '))
      setStatus('invalid')
      return
    }

    let settled = false
    const markReady = () => { settled = true; setStatus('ready') }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && ['PASSWORD_RECOVERY', 'SIGNED_IN', 'INITIAL_SESSION'].includes(event)) markReady()
    })
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) markReady() })
    // Give the link a moment to be processed before calling it invalid
    const timer = setTimeout(() => { if (!settled) setStatus('invalid') }, 4000)
    return () => { subscription.unsubscribe(); clearTimeout(timer) }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('The two passwords do not match.')
    setSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (updateError) return setError(updateError.message)
    setStatus('done')
    setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
  }

  const input = 'mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">USAHUDhomes</h1>
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Set a new password</h2>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {status === 'checking' && <p className="text-center text-gray-600">Checking your link…</p>}

          {status === 'invalid' && (
            <div className="space-y-4 text-center">
              <p className="text-gray-700">
                {linkError || 'This link is invalid or has expired.'}
              </p>
              <p className="text-sm text-gray-600">Links work once and expire after a while. Request a new one:</p>
              <Link to="/login?reset=1" className="inline-block px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                Send a new reset link
              </Link>
            </div>
          )}

          {status === 'ready' && (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">New password</span>
                <input type="password" autoComplete="new-password" required value={password}
                  onChange={(e) => setPassword(e.target.value)} className={input} />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">Confirm new password</span>
                <input type="password" autoComplete="new-password" required value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} className={input} />
              </label>
              <p className="text-xs text-gray-500">At least 8 characters.</p>
              {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}
              <button type="submit" disabled={saving}
                className="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save password'}
              </button>
            </form>
          )}

          {status === 'done' && (
            <p className="text-center text-green-700 font-medium">Password saved. Taking you to your dashboard…</p>
          )}
        </div>
      </div>
    </div>
  )
}
