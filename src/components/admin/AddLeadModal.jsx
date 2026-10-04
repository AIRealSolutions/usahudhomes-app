import React, { useState } from 'react'
import { X, UserPlus } from 'lucide-react'
import { createLead } from '../../services/database/leadService'
import { US_STATES } from '../../utils/states'

const SOURCES = [
  { value: 'manual',    label: 'Added by admin' },
  { value: 'phone',     label: 'Phone call' },
  { value: 'referral',  label: 'Referral' },
  { value: 'walk_in',   label: 'Walk-in / in person' },
  { value: 'email',     label: 'Email' },
  { value: 'social',    label: 'Social media' },
  { value: 'website',   label: 'Website' },
]

const EMPTY = {
  firstName: '', lastName: '', email: '', phone: '', state: 'NC',
  propertyCaseNumber: '', source: 'manual', message: '',
}

/**
 * Add a person by hand. Everyone enters as a lead (New Leads); assigning the
 * lead to a broker creates their customer record.
 */
export default function AddLeadModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const lead = await createLead(form)
      onCreated?.(lead)
    } catch (err) {
      setError(err.message || 'Could not add the lead.')
    } finally {
      setSaving(false)
    }
  }

  const input = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" /> Add Lead
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Saved to New Leads. Assigning a broker creates the customer record.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-gray-700 mb-1">First name *</span>
              <input className={input} value={form.firstName} onChange={set('firstName')} required autoFocus />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-700 mb-1">Last name</span>
              <input className={input} value={form.lastName} onChange={set('lastName')} />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-700 mb-1">Email</span>
              <input type="email" className={input} value={form.email} onChange={set('email')} />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-700 mb-1">Phone</span>
              <input type="tel" className={input} value={form.phone} onChange={set('phone')} />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-700 mb-1">State</span>
              <select className={input} value={form.state} onChange={set('state')}>
                <option value="">—</option>
                {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-700 mb-1">Source</span>
              <select className={input} value={form.source} onChange={set('source')}>
                {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="block text-xs font-medium text-gray-700 mb-1">Property interest (HUD case #)</span>
            <input className={input} value={form.propertyCaseNumber} onChange={set('propertyCaseNumber')} placeholder="387-111612" />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-700 mb-1">Notes</span>
            <textarea className={input} rows={3} value={form.message} onChange={set('message')} placeholder="What are they looking for?" />
          </label>
          <p className="text-xs text-gray-500">An email or a phone number is required.</p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
