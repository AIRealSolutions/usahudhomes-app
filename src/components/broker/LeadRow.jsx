import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { consultationService } from '../../services/database/consultationService'
import { Phone, MessageSquare, Mail, ChevronRight, Trash2, Home, CheckSquare, Square } from 'lucide-react'
import EmailComposer from './EmailComposer'
import SMSComposer from './SMSComposer'

// Compact one-line lead for the broker's Leads list; everything else is on /lead/:id
const STATUSES = [
  { value: 'accepted',  label: 'Accepted',  tone: 'bg-blue-100 text-blue-800' },
  { value: 'pending',   label: 'Pending',   tone: 'bg-yellow-100 text-yellow-800' },
  { value: 'scheduled', label: 'Scheduled', tone: 'bg-purple-100 text-purple-800' },
  { value: 'completed', label: 'Completed', tone: 'bg-green-100 text-green-800' },
]
// Set elsewhere (intake, admin); shown but not offered in the dropdown
const OTHER_STATUSES = [
  { value: 'new',      label: 'New',      tone: 'bg-yellow-100 text-yellow-800' },
  { value: 'referred', label: 'Referred', tone: 'bg-sky-100 text-sky-800' },
]

function timeAgo(ts) {
  if (!ts) return ''
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (mins < 60) return `${Math.max(mins, 1)}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return days < 60 ? `${days}d` : new Date(ts).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

const iconBtn = 'w-8 sm:w-9 h-9 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed'

export default function LeadRow({ consultation: c, onUpdate, onDelete, selectMode, selected, onToggleSelect }) {
  const { profile } = useAuth()
  const [composer, setComposer] = useState(null) // null | 'email' | 'sms'
  const [updating, setUpdating] = useState(false)

  // Older leads keep the contact in customer_* or on the customer record
  const nameParts = String(c.customer_name || '').split(' ')
  const customer = {
    first_name: c.customer?.first_name || c.first_name || nameParts[0] || '',
    last_name: c.customer?.last_name || c.last_name || nameParts.slice(1).join(' ') || '',
    email: c.customer?.email || c.email || c.customer_email || '',
    phone: c.customer?.phone || c.phone || c.customer_phone || '',
  }
  const property = c.property || {}
  const name = `${customer.first_name} ${customer.last_name}`.trim() || customer.email || 'Unnamed lead'
  const place = property.address ? [property.address, property.city].filter(Boolean).join(', ') : (property.city || c.state || '')
  const status = [...STATUSES, ...OTHER_STATUSES].find(s => s.value === c.status)
  const offered = STATUSES.some(s => s.value === c.status)
  const detailsPath = `/lead/${c.id}`

  const changeStatus = async (value) => {
    setUpdating(true)
    const result = await consultationService.updateStatus(c.id, value)
    setUpdating(false)
    if (!result.success) alert('Failed to update status: ' + (result.error || 'Unknown error'))
    else onUpdate()
  }

  const call = async () => {
    if (!customer.phone) return
    if (profile?.id) {
      consultationService.logCommunication(c.id, profile.id, 'call_made', { phone: customer.phone })
        .catch(err => console.error('Failed to log call:', err))
    }
    window.location.href = `tel:${customer.phone}`
  }

  const closeComposer = () => { setComposer(null); onUpdate() }

  return (
    <>
      <div className={`bg-white rounded-xl border px-3 py-2.5 flex items-center gap-3 ${selected ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200'}`}>
        {selectMode && (
          <button onClick={onToggleSelect} className="flex-shrink-0" aria-label={selected ? 'Deselect lead' : 'Select lead'}>
            {selected ? <CheckSquare className="w-5 h-5 text-red-500" /> : <Square className="w-5 h-5 text-gray-400" />}
          </button>
        )}

        {/* Who and where; links to the full lead page */}
        <Link to={detailsPath} className="min-w-0 flex-1 group">
          <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700">{name}</p>
          <p className="text-xs text-gray-500 truncate flex items-center gap-1">
            {status && <span className={`sm:hidden inline-flex px-1.5 rounded-full text-[10px] font-semibold ${status.tone}`}>{status.label}</span>}
            {place && <span className="hidden sm:flex items-center gap-1 min-w-0"><Home className="w-3 h-3 flex-shrink-0" /><span className="truncate">{place}</span></span>}
            {!place && customer.email && <span className="hidden sm:inline truncate">{customer.email}</span>}
            <span className="text-gray-400 flex-shrink-0"><span className="hidden sm:inline">· </span>{timeAgo(c.accepted_at || c.created_at)}</span>
          </p>
        </Link>

        {/* Status: dropdown on wider screens, badge (above) on phones */}
        <select
          value={c.status}
          onChange={e => changeStatus(e.target.value)}
          disabled={updating}
          className="hidden sm:block text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          aria-label="Lead status"
        >
          {!offered && <option value={c.status}>{status?.label || c.status}</option>}
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        {/* Quick actions */}
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          <button onClick={call} disabled={!customer.phone} className={`${iconBtn} text-purple-700 hover:bg-purple-50`} title={customer.phone ? `Call ${customer.phone}` : 'No phone number'} aria-label="Call">
            <Phone className="w-4 h-4" />
          </button>
          <button onClick={() => setComposer('sms')} disabled={!customer.phone} className={`${iconBtn} text-green-700 hover:bg-green-50`} title="Text" aria-label="Text">
            <MessageSquare className="w-4 h-4" />
          </button>
          <button onClick={() => setComposer('email')} disabled={!customer.email} className={`${iconBtn} text-blue-700 hover:bg-blue-50`} title="Email" aria-label="Email">
            <Mail className="w-4 h-4" />
          </button>
          {!selectMode && (
            <button onClick={onDelete} className={`${iconBtn} text-gray-400 hover:text-red-600 hover:bg-red-50`} title="Remove this lead" aria-label="Remove lead">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <Link to={detailsPath} className={`${iconBtn} sm:w-auto sm:px-3 sm:gap-1 text-white bg-blue-600 hover:bg-blue-700 text-xs font-semibold`} title="Open lead details" aria-label="Open lead details">
            <span className="hidden sm:inline">Details</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {composer === 'email' && (
        <EmailComposer consultation={c} customer={customer} property={property} onSend={closeComposer} onCancel={() => setComposer(null)} />
      )}
      {composer === 'sms' && (
        <SMSComposer consultation={c} customer={customer} property={property} onSend={closeComposer} onCancel={() => setComposer(null)} />
      )}
    </>
  )
}
