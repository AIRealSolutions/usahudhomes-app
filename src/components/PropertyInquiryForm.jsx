/**
 * Property Inquiry Form
 * Short "Ask about this home" form for signed-out visitors on a property page.
 * Saves a lead (no account needed) and alerts the admins. The street address
 * stays behind the login.
 */

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { notifyLeadSubmitted } from '../services/leadMessaging'
import { CheckCircle, AlertCircle, Loader } from 'lucide-react'

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function PropertyInquiryForm({ property, onSubmitted }) {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const name = formData.name.trim()
    const phone = formData.phone.trim()
    const email = formData.email.trim()
    if (!name) return setError('Please enter your name.')
    if (phone.replace(/\D/g, '').length < 10) return setError('Please enter a phone number we can reach you at.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Please enter a valid email address.')

    setSubmitting(true)
    setError(null)
    try {
      const [firstName, ...rest] = name.split(/\s+/)
      const propertyAddress = [property.address, property.city, property.state].filter(Boolean).join(', ')
      const price = property.price ?? property.list_price ?? null

      // Signed-out visitors can insert leads but not read them back, so the id is generated here.
      const leadId = crypto.randomUUID()
      const { error: leadError } = await supabase.from('leads').insert({
        id: leadId,
        first_name: firstName,
        last_name: rest.join(' '),
        email,
        phone,
        state: property.state || null,
        message: formData.message.trim() || null,
        property_id: property.id || null,
        property_case_number: property.case_number,
        property_address: propertyAddress,
        property_price: price,
        source: 'property_inquiry',
        status: 'new_lead',
      })
      if (leadError) throw leadError

      const { error: eventError } = await supabase.from('lead_events').insert({
        lead_id: leadId,
        event_type: 'lead_received',
        event_data: {
          source: 'property_inquiry',
          form_type: 'property_inquiry',
          property_case_number: property.case_number,
          property_address: propertyAddress,
          property_price: price,
        },
      })
      if (eventError) console.error('Error creating lead event:', eventError)

      notifyLeadSubmitted(leadId)
      setSubmitted(true)
      onSubmitted?.()
    } catch (err) {
      console.error('Error submitting inquiry:', err)
      setError('Sorry, that didn\'t go through. Please try again or call 910-363-6147.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-4">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <h4 className="text-lg font-semibold mb-1">Thanks, {formData.name.trim().split(/\s+/)[0]}!</h4>
        <p className="text-sm text-gray-600">
          Marc Spencer with Lightkeeper Realty will reach out shortly.
        </p>
        <p className="text-sm text-gray-600 mt-3">
          Want the full address now?{' '}
          <Link to={`/login?signup=1&next=${encodeURIComponent(`/property/${property.case_number}`)}`} className="text-blue-600 hover:underline font-medium">
            Create a free account
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div>
        <label htmlFor="inquiry-name" className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input id="inquiry-name" name="name" type="text" autoComplete="name" value={formData.name} onChange={handleChange} className={inputClass} disabled={submitting} />
      </div>
      <div>
        <label htmlFor="inquiry-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
        <input id="inquiry-phone" name="phone" type="tel" autoComplete="tel" value={formData.phone} onChange={handleChange} className={inputClass} disabled={submitting} />
      </div>
      <div>
        <label htmlFor="inquiry-email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
        <input id="inquiry-email" name="email" type="email" autoComplete="email" value={formData.email} onChange={handleChange} className={inputClass} disabled={submitting} />
      </div>
      <div>
        <label htmlFor="inquiry-message" className="block text-sm font-medium text-gray-700 mb-1">Question (optional)</label>
        <textarea
          id="inquiry-message"
          name="message"
          rows="3"
          placeholder="When can I see it? What would my payment be?"
          value={formData.message}
          onChange={handleChange}
          className={inputClass}
          disabled={submitting}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center"
      >
        {submitting ? <><Loader className="h-4 w-4 mr-2 animate-spin" />Sending...</> : 'Send Question'}
      </button>
      <p className="text-xs text-gray-500 text-center">No account needed. We only use this to answer you.</p>
    </form>
  )
}
