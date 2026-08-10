import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  Bell,
  CheckCircle,
  DollarSign,
  Home,
  Mail,
  MapPin,
  Phone,
  ShieldCheck
} from 'lucide-react'
import { supabase } from '../config/supabase'

const states = [
  'North Carolina', 'South Carolina', 'Virginia', 'Georgia', 'Florida', 'Alabama',
  'Mississippi', 'Tennessee', 'Kentucky', 'West Virginia', 'Maryland', 'Delaware',
  'Pennsylvania', 'New Jersey', 'New York', 'Connecticut', 'Rhode Island',
  'Massachusetts', 'Vermont', 'New Hampshire', 'Maine', 'Ohio', 'Michigan',
  'Indiana', 'Illinois', 'Wisconsin', 'Minnesota', 'Iowa', 'Missouri', 'Arkansas',
  'Louisiana', 'Texas', 'Oklahoma', 'Kansas', 'Nebraska', 'South Dakota',
  'North Dakota', 'Montana', 'Wyoming', 'Colorado', 'New Mexico', 'Arizona',
  'Utah', 'Idaho', 'Nevada', 'California', 'Oregon', 'Washington', 'Alaska',
  'Hawaii', 'District of Columbia', 'Puerto Rico'
]

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  state: 'North Carolina',
  areas: '',
  budgetMin: '',
  budgetMax: '',
  buyerType: 'owner_occupant',
  financingStatus: '',
  bedrooms: '',
  timeline: '',
  contactConsent: false,
  website: ''
}

const fieldClass =
  'mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200'

export default function BuyerAlerts() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const update = event => {
    const { name, value, type, checked } = event.target
    setForm(current => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setErrors(current => ({ ...current, [name]: '', submit: '' }))
  }

  const validate = () => {
    const next = {}
    if (!form.firstName.trim()) next.firstName = 'First name is required.'
    if (!form.lastName.trim()) next.lastName = 'Last name is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address.'
    }
    if (form.phone && !/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(form.phone.trim())) {
      next.phone = 'Enter a 10-digit phone number.'
    }
    if (!form.state) next.state = 'Select a state.'
    if (!form.areas.trim()) next.areas = 'Enter at least one city or county.'
    if (form.budgetMin && form.budgetMax && Number(form.budgetMin) > Number(form.budgetMax)) {
      next.budgetMax = 'Maximum budget must be greater than minimum budget.'
    }
    if (!form.contactConsent) next.contactConsent = 'Please confirm that we may contact you about matching properties.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async event => {
    event.preventDefault()
    if (form.website || !validate()) return

    setSubmitting(true)
    try {
      const preferenceSummary = [
        'HUD HOME ALERT REQUEST',
        `Areas: ${form.areas.trim()}, ${form.state}`,
        `Buyer type: ${form.buyerType === 'owner_occupant' ? 'Owner-occupant' : 'Investor'}`,
        `Financing: ${form.financingStatus || 'Not provided'}`,
        `Bedrooms: ${form.bedrooms || 'Any'}`,
        `Timeline: ${form.timeline || 'Not provided'}`,
        'Consent: Buyer requested property alerts and agreed to be contacted about matching homes.'
      ].join('\n')

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          state: form.state,
          budget_min: form.budgetMin ? Number(form.budgetMin) : null,
          budget_max: form.budgetMax ? Number(form.budgetMax) : null,
          timeline: form.timeline || null,
          message: preferenceSummary,
          source: 'hud_home_alerts',
          status: 'new_lead'
        })
        .select()
        .single()

      if (leadError) throw leadError

      const { error: eventError } = await supabase.from('lead_events').insert({
        lead_id: lead.id,
        event_type: 'alert_signup',
        event_data: {
          form_type: 'hud_home_alerts',
          state: form.state,
          areas: form.areas.trim(),
          buyer_type: form.buyerType,
          financing_status: form.financingStatus || null,
          bedrooms: form.bedrooms || null,
          budget_min: form.budgetMin ? Number(form.budgetMin) : null,
          budget_max: form.budgetMax ? Number(form.budgetMax) : null,
          consent: true
        }
      })

      if (eventError) console.error('Could not record alert event:', eventError)

      setSuccess(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error('Alert signup failed:', error)
      setErrors({ submit: 'We could not save your alert. Please try again or call 910-363-6147.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-[70vh] bg-blue-50 px-4 py-16">
        <Helmet>
          <title>HUD Home Alert Confirmed | USAHUDhomes.com</title>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-center shadow-xl sm:p-12">
          <CheckCircle className="mx-auto h-16 w-16 text-green-600" aria-hidden="true" />
          <h1 className="mt-6 text-3xl font-bold text-gray-900">Your HUD home alert is active</h1>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            Thank you, {form.firstName}. We saved your search for {form.areas}, {form.state}.
            We will contact you when we identify a HUD home that may fit your request.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/search" className="rounded-lg bg-blue-700 px-6 py-3 font-bold text-white hover:bg-blue-800">
              Search Current Homes
            </Link>
            <Link to="/how-it-works" className="rounded-lg border border-blue-700 px-6 py-3 font-bold text-blue-700 hover:bg-blue-50">
              Learn How HUD Bidding Works
            </Link>
          </div>
          <p className="mt-8 text-sm text-gray-500">
            Questions? Call <a className="font-semibold text-blue-700" href="tel:9103636147">910-363-6147</a>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50">
      <Helmet>
        <title>Free HUD Home Alerts by City, County & Price | USAHUDhomes.com</title>
        <meta
          name="description"
          content="Create a free HUD home alert for your preferred cities, counties, price range, buyer type, and financing status. Get help from a HUD-registered real estate broker."
        />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <link rel="canonical" href="https://www.usahudhomes.com/alerts" />
        <meta property="og:title" content="Get Free HUD Home Alerts" />
        <meta property="og:description" content="Tell us where and what you want to buy. We will help you watch for matching HUD homes." />
        <meta property="og:url" content="https://www.usahudhomes.com/alerts" />
      </Helmet>

      <section className="bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-20">
          <div>
            <p className="font-semibold uppercase tracking-wider text-orange-300">Free buyer alert</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">Hear about HUD homes that fit you</h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-blue-100">
              Tell us your preferred location, budget, and buying plan. We will keep your request
              on file and contact you when a possible match is identified.
            </p>
            <ul className="mt-8 space-y-4 text-blue-50">
              <li className="flex gap-3"><CheckCircle className="h-6 w-6 flex-none text-orange-300" />Choose cities or counties</li>
              <li className="flex gap-3"><CheckCircle className="h-6 w-6 flex-none text-orange-300" />Set your price range and bedroom needs</li>
              <li className="flex gap-3"><CheckCircle className="h-6 w-6 flex-none text-orange-300" />Identify owner-occupant or investor interest</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur sm:p-8">
            <Bell className="h-11 w-11 text-orange-300" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-bold">Why alerts matter</h2>
            <p className="mt-3 leading-7 text-blue-100">
              HUD inventory changes and bid periods can be short. Having your financing or proof of
              funds ready can help you evaluate a property promptly when an opportunity appears.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[2fr_1fr] lg:px-8">
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-lg sm:p-10" noValidate>
          <div>
            <p className="font-semibold uppercase tracking-wider text-blue-700">Your search</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">Create my HUD home alert</h2>
            <p className="mt-3 text-gray-600">Fields marked with an asterisk are required.</p>
          </div>

          {errors.submit && (
            <div className="mt-6 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800" role="alert">
              <AlertCircle className="h-5 w-5 flex-none" />
              <p>{errors.submit}</p>
            </div>
          )}

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <Field label="First name *" error={errors.firstName}>
              <input className={fieldClass} name="firstName" value={form.firstName} onChange={update} autoComplete="given-name" />
            </Field>
            <Field label="Last name *" error={errors.lastName}>
              <input className={fieldClass} name="lastName" value={form.lastName} onChange={update} autoComplete="family-name" />
            </Field>
            <Field label="Email *" error={errors.email}>
              <input className={fieldClass} type="email" name="email" value={form.email} onChange={update} autoComplete="email" />
            </Field>
            <Field label="Phone (recommended)" error={errors.phone}>
              <input className={fieldClass} type="tel" name="phone" value={form.phone} onChange={update} autoComplete="tel" placeholder="910-555-1234" />
            </Field>
            <Field label="Preferred state *" error={errors.state}>
              <select className={fieldClass} name="state" value={form.state} onChange={update}>
                {states.map(state => <option key={state}>{state}</option>)}
              </select>
            </Field>
            <Field label="Cities or counties *" error={errors.areas}>
              <input className={fieldClass} name="areas" value={form.areas} onChange={update} placeholder="Brunswick, Columbus, Wilmington" />
            </Field>
            <Field label="Minimum price">
              <div className="relative">
                <DollarSign className="pointer-events-none absolute left-3 top-1/2 mt-1 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input className={fieldClass + ' pl-10'} type="number" min="0" step="1000" name="budgetMin" value={form.budgetMin} onChange={update} placeholder="50,000" />
              </div>
            </Field>
            <Field label="Maximum price" error={errors.budgetMax}>
              <div className="relative">
                <DollarSign className="pointer-events-none absolute left-3 top-1/2 mt-1 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input className={fieldClass + ' pl-10'} type="number" min="0" step="1000" name="budgetMax" value={form.budgetMax} onChange={update} placeholder="250,000" />
              </div>
            </Field>
            <Field label="I plan to buy as">
              <select className={fieldClass} name="buyerType" value={form.buyerType} onChange={update}>
                <option value="owner_occupant">Owner-occupant</option>
                <option value="investor">Investor</option>
              </select>
            </Field>
            <Field label="Financing status">
              <select className={fieldClass} name="financingStatus" value={form.financingStatus} onChange={update}>
                <option value="">Select one</option>
                <option value="prequalified">Prequalified by a lender</option>
                <option value="cash">Cash / proof of funds ready</option>
                <option value="need_lender">Need help finding financing</option>
                <option value="not_started">Have not started yet</option>
              </select>
            </Field>
            <Field label="Minimum bedrooms">
              <select className={fieldClass} name="bedrooms" value={form.bedrooms} onChange={update}>
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
                <option value="5">5+</option>
              </select>
            </Field>
            <Field label="Buying timeline">
              <select className={fieldClass} name="timeline" value={form.timeline} onChange={update}>
                <option value="">Select one</option>
                <option value="immediate">Ready now</option>
                <option value="1-3 months">Within 1–3 months</option>
                <option value="3-6 months">Within 3–6 months</option>
                <option value="6-12 months">Within 6–12 months</option>
                <option value="just browsing">Just researching</option>
              </select>
            </Field>
          </div>

          <div className="sr-only" aria-hidden="true">
            <label>Website<input name="website" value={form.website} onChange={update} tabIndex="-1" autoComplete="off" /></label>
          </div>

          <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-700" type="checkbox" name="contactConsent" checked={form.contactConsent} onChange={update} />
              <span className="text-sm leading-6 text-gray-700">
                I request HUD home alerts and agree that USAHUDhomes.com, Lightkeeper Realty, or a
                participating broker may contact me by email, telephone, or text about matching
                properties. Consent is not required to purchase real estate. Message and data rates may apply.
              </span>
            </label>
            {errors.contactConsent && <p className="mt-2 text-sm font-medium text-red-700">{errors.contactConsent}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-7 inline-flex w-full items-center justify-center rounded-lg bg-orange-500 px-6 py-4 text-lg font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Bell className="mr-2 h-5 w-5" />
            {submitting ? 'Saving your alert…' : 'Start My Free HUD Home Alert'}
          </button>
          <p className="mt-4 text-center text-sm text-gray-500">
            We do not promise that a matching property will become available. You can ask us to stop contacting you at any time.
          </p>
        </form>

        <aside className="space-y-6">
          <InfoCard icon={Home} title="Owner-occupants">
            Owner-occupants may receive priority during designated listing periods and may qualify
            for certain FHA programs when property and borrower requirements are met.
          </InfoCard>
          <InfoCard icon={ShieldCheck} title="Your information">
            Your alert becomes a buyer lead in our secure customer-management system. We use it to
            help identify and discuss potential property matches.
          </InfoCard>
          <InfoCard icon={Phone} title="Prefer to talk?">
            Call Marc Spencer at <a className="font-bold text-blue-700" href="tel:9103636147">910-363-6147</a> or
            email <a className="font-bold text-blue-700" href="mailto:info@usahudhomes.com">info@usahudhomes.com</a>.
          </InfoCard>
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm leading-6 text-gray-500">
            USAHUDhomes.com is an independent real estate resource and is not affiliated with the
            U.S. Department of Housing and Urban Development. Listing availability, bidder
            eligibility, financing, and deadlines are property-specific and subject to current rules.
          </div>
        </aside>
      </main>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <label className="block text-sm font-semibold text-gray-800">
      {label}
      {children}
      {error && <span className="mt-2 block font-medium text-red-700">{error}</span>}
    </label>
  )
}

function InfoCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <Icon className="h-8 w-8 text-blue-700" aria-hidden="true" />
      <h2 className="mt-4 text-xl font-bold text-gray-900">{title}</h2>
      <p className="mt-3 leading-7 text-gray-600">{children}</p>
    </div>
  )
}
