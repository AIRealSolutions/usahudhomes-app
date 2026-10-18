/**
 * Client activity on a lead card: the buyer's account, saved homes,
 * "this property" requests and other inquiries, as a reference for finding
 * them homes. Loaded on demand from /api/leads?action=client-activity.
 */

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { removePick } from '../../services/propertyPicks'
import { Heart, FileText, MessageSquare, User, ChevronDown, ChevronUp, Loader, Star, X } from 'lucide-react'

const money = (v) => (v || v === 0 ? `$${Number(v).toLocaleString()}` : null)
const date = (v) => (v ? new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '')

const INQUIRY_LABELS = {
  property_inquiry: 'Asked about a home',
  account_signup: 'Created an account',
  hud_home_alerts: 'Signed up for HUD home alerts',
  website: 'Contact form',
  agent_callback_request: 'Requested an agent callback',
  registered_buyer: 'Registered buyer',
}

async function fetchActivity(consultationId) {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch(`/api/leads?action=client-activity&consultationId=${encodeURIComponent(consultationId)}`, {
    headers: { Authorization: `Bearer ${session?.access_token || ''}` },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.success) throw new Error(result.error || `Server error (${response.status})`)
  return result.data
}

function Section({ icon, title, count, children }) {
  const SectionIcon = icon
  return (
    <div>
      <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5">
        <SectionIcon className="w-3.5 h-3.5" /> {title} <span className="text-gray-400">({count})</span>
      </h5>
      {count === 0 ? <p className="text-sm text-gray-400">None yet</p> : children}
    </div>
  )
}

function PropertyLine({ caseNumber, address, city, state, price, status, note, at, action }) {
  const where = [address, [city, state].filter(Boolean).join(', ')].filter(Boolean).join(', ')
  return (
    <li className="text-sm border border-gray-100 rounded-lg p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {caseNumber ? (
            <Link to={`/property/${caseNumber}`} target="_blank" className="font-medium text-blue-700 hover:underline">
              {where || `Case #${caseNumber}`}
            </Link>
          ) : (
            <span className="font-medium text-gray-900">{where || 'General inquiry'}</span>
          )}
          <p className="text-xs text-gray-500">
            {[caseNumber && `Case #${caseNumber}`, money(price), status].filter(Boolean).join(' · ')}
          </p>
          {note && <p className="text-xs text-gray-700 mt-1 italic">"{note}"</p>}
        </div>
        <span className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">{date(at)}{action}</span>
      </div>
    </li>
  )
}

export default function ClientActivity({ consultationId, defaultOpen = false }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next && !data && !loading) {
      setLoading(true)
      setError(null)
      try {
        setData(await fetchActivity(consultationId))
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
  }

  // Pages that are all about one lead show the activity without an extra tap
  useEffect(() => {
    if (defaultOpen && consultationId) toggle()
  }, [defaultOpen, consultationId]) // eslint-disable-line react-hooks/exhaustive-deps

  const account = data?.account
  const budget = account && (account.price_range_min || account.price_range_max)
    ? `${money(account.price_range_min) || 'Any'} – ${money(account.price_range_max) || 'Any'}`
    : null

  return (
    <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/40">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-900"
      >
        <span className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-pink-500" />
          Client activity: picks, saved homes, requests &amp; inquiries
          {data && (
            <span className="text-xs font-normal text-gray-500">
              {data.picks?.length || 0} picked · {data.saved.length} saved · {data.requests.length} requests · {data.inquiries.length} inquiries
            </span>
          )}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-4">
          {loading && (
            <p className="text-sm text-gray-500 flex items-center gap-2"><Loader className="w-4 h-4 animate-spin" /> Loading…</p>
          )}
          {error && <p className="text-sm text-red-600">Could not load activity: {error}</p>}

          {data && (
            <>
              <div className="text-sm text-gray-700 flex items-start gap-2">
                <User className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
                {account ? (
                  <span>
                    Registered {date(account.created_at)}
                    {account.last_signed_in && ` · last signed in ${date(account.last_signed_in)}`}
                    {budget && ` · budget ${budget}`}
                    {account.bedrooms && ` · ${account.bedrooms}+ beds`}
                    {account.location_preferences && ` · wants ${account.location_preferences}`}
                    {account.timeline && ` · timeline ${account.timeline.replace(/_/g, ' ')}`}
                    {account.pre_approved && ' · pre-approved'}
                  </span>
                ) : (
                  <span className="text-gray-500">No website account for this email yet.</span>
                )}
              </div>

              <Section icon={Star} title="Homes you picked" count={data.picks?.length || 0}>
                <ul className="space-y-2">
                  {(data.picks || []).map(pick => (
                    <PropertyLine
                        key={pick.id}
                        caseNumber={pick.case_number}
                        address={pick.property?.address}
                        city={pick.property?.city}
                        state={pick.property?.state}
                        price={pick.property?.price}
                        status={pick.status === 'sent' ? `sent ${date(pick.sent_at)}` : pick.property?.status || 'not yet sent'}
                        note={pick.note}
                        at={pick.created_at}
                        action={<button
                        type="button"
                        title="Remove from this client's picks"
                        onClick={async () => {
                          try {
                            await removePick(pick.id)
                            setData(d => ({ ...d, picks: d.picks.filter(x => x.id !== pick.id) }))
                          } catch (e) {
                            setError(e.message)
                          }
                        }}
                        className="p-0.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>}
                    />
                  ))}
                </ul>
                <p className="text-xs text-gray-500 mt-1">Add more from Find Properties. Insert them into an email or text from the composer.</p>
              </Section>

              <Section icon={Heart} title="Saved homes" count={data.saved.length}>
                <ul className="space-y-2">
                  {data.saved.map(s => (
                    <PropertyLine
                      key={s.id}
                      caseNumber={s.property?.case_number || s.case_number}
                      address={s.property?.address}
                      city={s.property?.city}
                      state={s.property?.state}
                      price={s.property?.price ?? s.price_at_save}
                      status={s.property?.status || (s.property ? null : 'no longer listed')}
                      note={s.notes}
                      at={s.created_at}
                    />
                  ))}
                </ul>
              </Section>

              <Section icon={FileText} title="Property info requests" count={data.requests.length}>
                <ul className="space-y-2">
                  {data.requests.map(r => (
                    <PropertyLine
                      key={r.id}
                      caseNumber={r.case_number}
                      address={r.address}
                      city={r.city}
                      state={r.state}
                      price={r.list_price}
                      status={r.status}
                      at={r.requested_at}
                    />
                  ))}
                </ul>
              </Section>

              <Section icon={MessageSquare} title="Inquiries & sign-ups" count={data.inquiries.length}>
                <ul className="space-y-2">
                  {data.inquiries.map(i => (
                    <PropertyLine
                      key={i.id}
                      caseNumber={i.case_number}
                      address={i.address || INQUIRY_LABELS[i.kind] || i.kind.replace(/_/g, ' ')}
                      price={i.price}
                      note={i.message}
                      at={i.at}
                    />
                  ))}
                </ul>
              </Section>
            </>
          )}
        </div>
      )}
    </div>
  )
}
