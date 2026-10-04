import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabase'

export default function Login() {
  const [searchParams] = useSearchParams()
  const [isSignUp, setIsSignUp] = useState(searchParams.get('signup') === '1')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resetMode, setResetMode] = useState(searchParams.get('reset') === '1')
  const [resetSent, setResetSent] = useState(false)
  const navigate = useNavigate()
  const { initialized, isAuthenticated, signIn, signUp } = useAuth()

  useEffect(() => {
    // If user is already authenticated, return to the page that sent them here (?next=), else the dashboard
    if (isAuthenticated && initialized) {
      const next = searchParams.get('next') || ''
      navigate(next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard', { replace: true })
    }
  }, [isAuthenticated, initialized])

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        // Sign up new user using AuthContext
        const result = await signUp({
          email,
          password,
          firstName: fullName.split(' ')[0],
          lastName: fullName.split(' ').slice(1).join(' '),
          role: 'end_user'
        })

        if (!result.success) {
          throw new Error(result.error || 'Sign up failed')
        }

        alert('Account created! Please check your email to verify your account.')
        setIsSignUp(false)
      } else {
        // Sign in existing user using AuthContext
        const result = await signIn(email, password)

        if (!result.success) {
          const errorMsg = result.error || 'Sign in failed'
          console.error('Sign in failed:', errorMsg)
          throw new Error(errorMsg)
        }

        // Don't navigate here - let the useEffect handle it after state updates
        // This avoids race conditions with async state updates
      }
    } catch (error) {
      const raw = error.message || 'An unexpected error occurred'
      const errorMsg = /invalid login credentials/i.test(raw)
        ? 'That email and password do not match. Check for typos, or use "Forgot password?" to set a new one.'
        : raw
      console.error('Login error:', errorMsg)
      setError(errorMsg)

      // Keep error visible for at least 5 seconds
      setTimeout(() => {
        setError(current => current === errorMsg ? null : current)
      }, 5000)
    } finally {
      setLoading(false)
    }
  }

  // Emails a link to /reset-password where a new password is chosen
  const handleSendReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`
    })
    setLoading(false)
    if (resetError) setError(resetError.message)
    else setResetSent(true)
  }

  if (resetMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">USAHUDhomes</h1>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Reset your password</h2>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {resetSent ? (
              <div className="space-y-4 text-center">
                <p className="text-gray-700">
                  If an account exists for <strong>{email.trim()}</strong>, a link to set a new password is on its way.
                  Check your inbox (and spam folder) and open the link on this device.
                </p>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSendReset}>
                <p className="text-sm text-gray-600">Enter the email you sign in with and we will send you a link to choose a new password.</p>
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">Email address</label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            )}
            <button
              type="button"
              onClick={() => { setResetMode(false); setResetSent(false); setError(null) }}
              className="mt-6 w-full text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">USAHUDhomes</h1>
          <p className="text-gray-600">Broker & Admin Portal</p>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isSignUp ? 'Create your account' : 'Sign in to your account'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleAuth}>
            {isSignUp && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-1">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              {!isSignUp && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => { setResetMode(true); setError(null) }}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Loading...' : isSignUp ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp)
                      setError(null)
                    }}
                    className="ml-2 font-medium text-blue-600 hover:text-blue-500"
                  >
                    {isSignUp ? 'Sign in' : 'Sign up'}
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
