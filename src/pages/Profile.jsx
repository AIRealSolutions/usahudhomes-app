/**
 * My Profile — every detail the site's forms ask for, editable in one place.
 * Forms across the site pre-fill from these fields.
 */

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Save, User, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { PROFILE_SECTIONS, OPTIONS, profileToForm, saveProfile } from '../services/buyerProfile'

export default function Profile() {
  const { user, profile, applyProfile } = useAuth()
  const [form, setForm] = useState(() => profileToForm(profile))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  // Profile can load after the page; don't clobber edits in progress
  useEffect(() => {
    if (!dirty) setForm(profileToForm(profile))
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (key, value) => {
    setForm(f => ({ ...f, [key]: value }))
    setDirty(true)
    setMessage(null)
    setError(null)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required.')
      return
    }
    const min = Number(form.price_range_min), max = Number(form.price_range_max)
    if (form.price_range_min && form.price_range_max && min > max) {
      setError('Min price is higher than max price.')
      return
    }
    setSaving(true)
    try {
      const row = await saveProfile(user.id, form)
      applyProfile(row)
      setForm(profileToForm(row))
      setDirty(false)
      setMessage('Your profile is saved. Forms on the site will use these details.')
    } catch (err) {
      setError(err.message || 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  const field = (f) => {
    const common = {
      id: `profile-${f.key}`,
      value: form[f.key] ?? '',
      onChange: e => update(f.key, e.target.value),
      className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
    }
    let input
    if (f.type === 'select') {
      input = (
        <select {...common}>
          <option value="">— Select —</option>
          {OPTIONS[f.key].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )
    } else if (f.type === 'textarea') {
      input = <textarea {...common} rows={3} placeholder="Cities, counties or ZIP codes" />
    } else {
      input = <input {...common} type={f.type || 'text'} min={f.type === 'number' ? 0 : undefined}
        step={f.type === 'number' ? 1000 : undefined} />
    }
    return (
      <div key={f.key} className={f.wide ? 'sm:col-span-2' : ''}>
        <label htmlFor={`profile-${f.key}`} className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
        {input}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2"><User className="h-7 w-7 text-blue-600" /> My Profile</h1>
          <p className="mt-1 text-gray-600">Keep this up to date and we'll fill it in for you on every form.</p>
        </div>
        <Link to="/dashboard" className="text-sm font-medium text-blue-600 hover:text-blue-700">← Back to my dashboard</Link>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input value={profile?.email || user?.email || ''} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600" />
          <p className="text-xs text-gray-500 mt-1">
            Your sign-in email. To change your password, use <Link to="/login?reset=1" className="text-blue-600 hover:underline">Forgot password</Link>.
          </p>
        </div>

        {PROFILE_SECTIONS.map(section => (
          <div key={section.title} className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{section.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{section.fields.map(field)}</div>
          </div>
        ))}

        <div className="sticky bottom-0 bg-gray-100/95 backdrop-blur py-4 flex flex-wrap items-center gap-4">
          <button type="submit" disabled={saving || !dirty}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
            <Save className="h-5 w-5" /> {saving ? 'Saving…' : 'Save profile'}
          </button>
          {message && <span className="flex items-center gap-1 text-green-700 text-sm"><CheckCircle className="h-4 w-4" /> {message}</span>}
          {error && <span className="flex items-center gap-1 text-red-600 text-sm"><AlertCircle className="h-4 w-4" /> {error}</span>}
          {dirty && !saving && !error && <span className="text-sm text-gray-500">You have unsaved changes.</span>}
        </div>
      </form>
    </div>
  )
}
