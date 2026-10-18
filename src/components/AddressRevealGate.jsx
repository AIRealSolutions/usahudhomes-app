/**
 * Address Reveal Gate Component
 * Sign in / create a free account from a property page.
 * New accounts may need to confirm their email first; that case gets a
 * "check your email" screen instead of silently staying signed out.
 */

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Mail, X, Eye, EyeOff } from 'lucide-react'

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'

function friendlyAuthError(message = '') {
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first. Check your inbox (and spam folder) for the link we sent.'
  if (/invalid login credentials/i.test(message)) return 'That email and password don\'t match. Try again or reset your password.'
  return message || 'Something went wrong. Please try again.'
}

export default function AddressRevealGate({ property, isOpen, onClose, onSuccess }) {
  const { signUp, signIn } = useAuth()
  const [mode, setMode] = useState('signup') // 'signup' | 'signin' | 'check-email'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const switchMode = (next) => {
    setMode(next)
    setError(null)
  }

  const handleSignUp = async () => {
    if (!formData.firstName.trim()) throw new Error('First name is required')
    if (!formData.lastName.trim()) throw new Error('Last name is required')
    if (!formData.email.trim()) throw new Error('Email is required')
    if (formData.password.length < 6) throw new Error('Password must be at least 6 characters')

    const result = await signUp({
      email: formData.email.trim(),
      password: formData.password,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      phone: formData.phone.trim() || null,
      state: property?.state || null,
      property
    })
    if (!result.success) {
      if (result.existingAccount) setMode('signin')
      throw new Error(result.error || 'Registration failed')
    }
    if (result.data?.session) {
      onSuccess?.()
      onClose()
    } else {
      setMode('check-email')
    }
  }

  const handleSignIn = async () => {
    if (!formData.email.trim() || !formData.password) throw new Error('Enter your email and password')
    const result = await signIn(formData.email.trim(), formData.password)
    if (!result?.success) throw new Error(friendlyAuthError(result?.error))
    onSuccess?.()
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await (mode === 'signin' ? handleSignIn() : handleSignUp())
    } catch (err) {
      setError(friendlyAuthError(err.message))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const isSignUp = mode === 'signup'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {mode === 'signin' ? 'Welcome back' : mode === 'check-email' ? 'Check your email' : 'Create a free account'}
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {mode === 'check-email' ? 'One more step to finish signing up' : 'See every address and save the homes you like'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-white hover:bg-blue-700 p-1 rounded transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {mode === 'check-email' ? (
            <div className="text-center">
              <Mail className="h-14 w-14 text-blue-600 mx-auto mb-4" />
              <p className="text-gray-800 mb-2">
                We sent a confirmation link to <strong>{formData.email.trim()}</strong>.
              </p>
              <p className="text-sm text-gray-600 mb-6">
                Open it on this device to finish. If you don't see it in a minute, check your spam folder.
                We've also passed your details to our team, so you'll hear from us either way.
              </p>
              <button
                onClick={() => switchMode('signin')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                I've confirmed — sign in
              </button>
            </div>
          ) : (
            <>
              {/* Property Preview */}
              {property && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                  {property.main_image && (
                    <img
                      src={property.main_image}
                      alt=""
                      className="w-16 h-16 rounded object-cover"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{property.city}, {property.state}</p>
                    <p className="text-sm text-gray-600">${property.price?.toLocaleString() || 'Price TBD'}</p>
                    <p className="text-sm text-gray-600">{property.beds || 0} bed • {property.baths || 0} bath</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="gate-first" className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                      <input id="gate-first" type="text" name="firstName" autoComplete="given-name" value={formData.firstName} onChange={handleInputChange} className={inputClass} disabled={loading} />
                    </div>
                    <div>
                      <label htmlFor="gate-last" className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                      <input id="gate-last" type="text" name="lastName" autoComplete="family-name" value={formData.lastName} onChange={handleInputChange} className={inputClass} disabled={loading} />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="gate-email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input id="gate-email" type="email" name="email" autoComplete="email" value={formData.email} onChange={handleInputChange} className={inputClass} disabled={loading} />
                </div>

                {isSignUp && (
                  <div>
                    <label htmlFor="gate-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                    <input id="gate-phone" type="tel" name="phone" autoComplete="tel" value={formData.phone} onChange={handleInputChange} className={inputClass} disabled={loading} />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="gate-password" className="block text-sm font-medium text-gray-700">Password *</label>
                    {!isSignUp && (
                      <Link to="/login?reset=1" onClick={onClose} className="text-xs text-blue-600 hover:underline">Forgot password?</Link>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="gate-password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      placeholder={isSignUp ? 'At least 6 characters' : ''}
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`${inputClass} pr-10`}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  {loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign In')}
                </button>

                <p className="text-sm text-center text-gray-600">
                  {isSignUp ? 'Already have an account?' : 'New here?'}{' '}
                  <button type="button" onClick={() => switchMode(isSignUp ? 'signin' : 'signup')} className="text-blue-600 hover:underline font-medium">
                    {isSignUp ? 'Sign in' : 'Create a free account'}
                  </button>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
