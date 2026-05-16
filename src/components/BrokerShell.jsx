/**
 * BrokerShell — Broker back office with persistent sidebar navigation.
 * All tools are fully wired: Email/SMS Composer, AI Assistant, Find Properties,
 * Share Analytics, Referral Inbox, Active Leads, and Profile.
 */

import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { consultationService } from '../services/database/consultationService'
import { agentService } from '../services/database'
import {
  LayoutDashboard, Users, Home, MessageSquare, Bot, Settings,
  ChevronLeft, ChevronRight, Menu, X, LogOut, Bell, RefreshCw,
  Phone, Mail, CheckCircle, Clock, AlertCircle,
  ArrowRight, Inbox, Share2, User, BarChart2, Shield,
  ChevronDown, Search, Trash2, AlertTriangle, CheckSquare, Square
} from 'lucide-react'

// ── Lazy-loaded leaf components ───────────────────────────────────────────────
const BrokerReferralInbox    = lazy(() => import('./broker/BrokerReferralInbox'))
const ConsultationCard       = lazy(() => import('./broker/ConsultationCard'))
const AIAgentAssistant       = lazy(() => import('./broker/AIAgentAssistant'))
const AIPropertiesTab        = lazy(() => import('./broker/AIPropertiesTab'))
const PropertyShareAnalytics = lazy(() => import('./broker/PropertyShareAnalytics'))
const EmailComposer          = lazy(() => import('./broker/EmailComposer'))
const SMSComposer            = lazy(() => import('./broker/SMSComposer'))

// ── Navigation config ─────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { id: 'overview',        label: 'Overview',          icon: LayoutDashboard, color: 'text-blue-500' },
    ]
  },
  {
    label: 'My Leads',
    items: [
      { id: 'active-leads',    label: 'Active Leads',      icon: Users,           color: 'text-green-500',  alertKey: 'activeLeads' },
      { id: 'referrals',       label: 'Referral Inbox',    icon: Inbox,           color: 'text-orange-500', alertKey: 'pendingReferrals' },
    ]
  },
  {
    label: 'Properties',
    items: [
      { id: 'ai-properties',   label: 'Find Properties',   icon: Home,            color: 'text-purple-500' },
      { id: 'share-analytics', label: 'Share Analytics',   icon: Share2,          color: 'text-pink-500' },
    ]
  },
  {
    label: 'Communications',
    items: [
      { id: 'email',           label: 'Email Composer',    icon: Mail,            color: 'text-blue-400' },
      { id: 'sms',             label: 'SMS Composer',      icon: MessageSquare,   color: 'text-teal-500' },
    ]
  },
  {
    label: 'AI Tools',
    items: [
      { id: 'ai-assistant',    label: 'AI Assistant',      icon: Bot,             color: 'text-violet-500' },
    ]
  },
  {
    label: 'Account',
    items: [
      { id: 'settings',        label: 'My Profile',        icon: Settings,        color: 'text-gray-500' },
    ]
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
const PanelFallback = () => (
  <div className="flex items-center justify-center h-64">
    <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
  </div>
)

/** Normalise a consultation row into the shape that AI tools expect as 'lead' */
function consultationToLead(c) {
  if (!c) return null
  const customer = c.customer || {}
  const property = c.property || {}
  return {
    id:               c.id,
    name:             `${customer.first_name || c.first_name || ''} ${customer.last_name || c.last_name || ''}`.trim(),
    firstName:        customer.first_name || c.first_name || '',
    lastName:         customer.last_name  || c.last_name  || '',
    email:            customer.email      || c.email      || '',
    phone:            customer.phone      || c.phone      || '',
    customer_id:      c.customer_id,
    customer_email:   customer.email      || c.email      || '',
    customer_phone:   customer.phone      || c.phone      || '',
    customer_name:    `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
    customer:         customer,
    message:          c.message           || '',
    status:           c.status            || 'accepted',
    city:             customer.city       || property.city || '',
    state:            customer.state      || property.state || '',
    bedrooms:         c.bedrooms          || '',
    propertyType:     c.property_type     || '',
    timeline:         c.timeline          || '',
    createdAt:        c.created_at,
    created_at:       c.created_at,
    email_count:      c.email_count       || 0,
    sms_count:        c.sms_count         || 0,
    call_count:       c.call_count        || 0,
    propertiesShared: c.properties_shared || 0,
    property:         property,
    // property fields normalised for EmailComposer/SMSComposer
    case_number:      property.case_number || '',
    address:          property.address     || '',
    list_price:       property.price       || property.list_price || 0,
    bid_open_date:    property.bid_deadline|| property.bid_open_date || '',
    bedrooms_prop:    property.beds        || property.bedrooms || '',
    bathrooms:        property.baths       || property.bathrooms || '',
    sq_ft:            property.sq_ft       || property.square_footage || '',
    year_built:       property.year_built  || '',
  }
}

// ── Lead Picker — shared by Email, SMS, AI panels ────────────────────────────
function LeadPicker({ agentId, onSelect, selectedId }) {
  const [consultations, setConsultations] = useState([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [open, setOpen]                   = useState(false)

  useEffect(() => {
    if (!agentId) return
    consultationService.getBrokerConsultations(agentId).then(r => {
      setConsultations(r.data || [])
      setLoading(false)
    })
  }, [agentId])

  const filtered = consultations.filter(c => {
    const name = `${c.customer?.first_name || c.first_name || ''} ${c.customer?.last_name || c.last_name || ''}`.toLowerCase()
    const email = (c.customer?.email || c.email || '').toLowerCase()
    const q = search.toLowerCase()
    return !q || name.includes(q) || email.includes(q)
  })

  const selected = consultations.find(c => c.id === selectedId)
  const selectedName = selected
    ? `${selected.customer?.first_name || selected.first_name || ''} ${selected.customer?.last_name || selected.last_name || ''}`.trim()
    : null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-blue-400 transition-colors text-sm"
      >
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className={selectedName ? 'text-gray-900 font-medium' : 'text-gray-400'}>
            {selectedName || 'Select a lead to work with…'}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search leads…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400">No leads found</div>
            ) : (
              filtered.map(c => {
                const name = `${c.customer?.first_name || c.first_name || ''} ${c.customer?.last_name || c.last_name || ''}`.trim()
                const email = c.customer?.email || c.email || ''
                const statusColors = {
                  accepted: 'bg-green-100 text-green-700',
                  new: 'bg-yellow-100 text-yellow-700',
                  referred: 'bg-blue-100 text-blue-700',
                  scheduled: 'bg-purple-100 text-purple-700',
                  completed: 'bg-emerald-100 text-emerald-700',
                }
                return (
                  <button
                    key={c.id}
                    onClick={() => { onSelect(c); setOpen(false); setSearch('') }}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left ${c.id === selectedId ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{email || 'No email'}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[c.status] || 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Email Composer Panel ──────────────────────────────────────────────────────
function EmailComposerPanel({ agentId }) {
  const [selectedConsultation, setSelectedConsultation] = useState(null)
  const [sent, setSent] = useState(false)

  const lead = selectedConsultation ? consultationToLead(selectedConsultation) : null
  const customer = lead ? {
    first_name: lead.firstName,
    last_name:  lead.lastName,
    email:      lead.email,
    phone:      lead.phone,
  } : null
  const property = lead ? {
    case_number:  lead.case_number,
    address:      lead.address,
    list_price:   lead.list_price,
    bid_open_date:lead.bid_open_date,
    bedrooms:     lead.bedrooms_prop,
    bathrooms:    lead.bathrooms,
    sq_ft:        lead.sq_ft,
    year_built:   lead.year_built,
  } : null

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Email Composer</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Select Lead
          </label>
          <LeadPicker agentId={agentId} onSelect={c => { setSelectedConsultation(c); setSent(false) }} selectedId={selectedConsultation?.id} />
        </div>

        {!selectedConsultation && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 border-t border-gray-100">
            <Mail className="w-10 h-10 mb-2" />
            <p className="text-sm">Select a lead above to compose an email</p>
          </div>
        )}
      </div>

      {selectedConsultation && !sent && (
        <Suspense fallback={<PanelFallback />}>
          <EmailComposer
            consultation={selectedConsultation}
            customer={customer}
            property={property}
            onSend={() => setSent(true)}
            onCancel={() => setSelectedConsultation(null)}
          />
        </Suspense>
      )}

      {sent && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex flex-col items-center gap-3">
          <CheckCircle className="w-10 h-10 text-green-500" />
          <p className="text-sm font-semibold text-green-800">Email opened in your mail client!</p>
          <p className="text-xs text-green-600">The communication has been logged to this lead's record.</p>
          <button
            onClick={() => { setSelectedConsultation(null); setSent(false) }}
            className="mt-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
          >
            Compose Another
          </button>
        </div>
      )}
    </div>
  )
}

// ── SMS Composer Panel ────────────────────────────────────────────────────────
function SMSComposerPanel({ agentId }) {
  const [selectedConsultation, setSelectedConsultation] = useState(null)
  const [sent, setSent] = useState(false)

  const lead = selectedConsultation ? consultationToLead(selectedConsultation) : null
  const customer = lead ? {
    first_name: lead.firstName,
    last_name:  lead.lastName,
    email:      lead.email,
    phone:      lead.phone,
  } : null
  const property = lead ? {
    case_number:  lead.case_number,
    address:      lead.address,
  } : null

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">SMS Composer</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Select Lead
          </label>
          <LeadPicker agentId={agentId} onSelect={c => { setSelectedConsultation(c); setSent(false) }} selectedId={selectedConsultation?.id} />
        </div>

        {!selectedConsultation && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 border-t border-gray-100">
            <MessageSquare className="w-10 h-10 mb-2" />
            <p className="text-sm">Select a lead above to compose an SMS</p>
          </div>
        )}
      </div>

      {selectedConsultation && !sent && (
        <Suspense fallback={<PanelFallback />}>
          <SMSComposer
            consultation={selectedConsultation}
            customer={customer}
            property={property}
            onSend={() => setSent(true)}
            onCancel={() => setSelectedConsultation(null)}
          />
        </Suspense>
      )}

      {sent && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex flex-col items-center gap-3">
          <CheckCircle className="w-10 h-10 text-green-500" />
          <p className="text-sm font-semibold text-green-800">SMS opened in your messaging app!</p>
          <p className="text-xs text-green-600">The communication has been logged to this lead's record.</p>
          <button
            onClick={() => { setSelectedConsultation(null); setSent(false) }}
            className="mt-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
          >
            Compose Another
          </button>
        </div>
      )}
    </div>
  )
}

// ── AI Assistant Panel ────────────────────────────────────────────────────────
function AIAssistantPanel({ agentId }) {
  const [selectedConsultation, setSelectedConsultation] = useState(null)
  const lead = selectedConsultation ? consultationToLead(selectedConsultation) : null

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">AI Assistant</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Select Lead (optional — AI works better with a lead selected)
          </label>
          <LeadPicker agentId={agentId} onSelect={setSelectedConsultation} selectedId={selectedConsultation?.id} />
        </div>
      </div>

      <Suspense fallback={<PanelFallback />}>
        <AIAgentAssistant lead={lead} onAction={() => {}} />
      </Suspense>
    </div>
  )
}

// ── Find Properties Panel ─────────────────────────────────────────────────────
function FindPropertiesPanel({ agentId }) {
  const [selectedConsultation, setSelectedConsultation] = useState(null)
  const lead = selectedConsultation ? consultationToLead(selectedConsultation) : null

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Find Properties</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Select Lead (optional — AI matches properties to lead preferences)
          </label>
          <LeadPicker agentId={agentId} onSelect={setSelectedConsultation} selectedId={selectedConsultation?.id} />
        </div>
      </div>

      <Suspense fallback={<PanelFallback />}>
        <AIPropertiesTab lead={lead} />
      </Suspense>
    </div>
  )
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────
function DeleteConfirmModal({ count, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Remove {count > 1 ? `${count} leads` : 'this lead'}?</h3>
            <p className="text-xs text-gray-500">This will soft-delete the record. Admins can restore it.</p>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} disabled={deleting}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting}
            className="flex-1 px-4 py-2 bg-red-600 rounded-xl text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {deleting ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Active Leads Panel ────────────────────────────────────────────────────────
function ActiveLeadsPanel({ agentId }) {
  const [consultations, setConsultations] = useState([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [refreshKey, setRefreshKey]       = useState(0)
  const [selectMode, setSelectMode]       = useState(false)
  const [selected, setSelected]           = useState(new Set())
  const [confirmDelete, setConfirmDelete] = useState(null) // null | 'single' | 'bulk'
  const [deletingId, setDeletingId]       = useState(null)
  const [deleting, setDeleting]           = useState(false)

  useEffect(() => {
    if (!agentId) return
    setLoading(true)
    consultationService.getBrokerConsultations(agentId).then(r => {
      setConsultations(r.data || [])
      setLoading(false)
    })
  }, [agentId, refreshKey])

  const filtered = consultations.filter(c => {
    const name = `${c.customer?.first_name || c.first_name || ''} ${c.customer?.last_name || c.last_name || ''}`.toLowerCase()
    const email = (c.customer?.email || c.email || '').toLowerCase()
    const q = search.toLowerCase()
    const matchSearch = !q || name.includes(q) || email.includes(q)
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  // Leads that look empty (no customer record and no meaningful name)
  const emptyLeads = consultations.filter(c => {
    const name = `${c.first_name || ''} ${c.last_name || ''}`.trim()
    return !c.customer_id && !name
  })

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(c => c.id)))
    }
  }

  const handleDeleteSingle = async (id) => {
    setDeleting(true)
    try {
      await consultationService.deleteConsultation(id)
      setConsultations(prev => prev.filter(c => c.id !== id))
    } catch (e) {
      console.error('Delete failed:', e)
      alert('Failed to remove lead. Please try again.')
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
      setDeletingId(null)
    }
  }

  const handleDeleteSelected = async () => {
    setDeleting(true)
    try {
      const ids = Array.from(selected)
      await Promise.all(ids.map(id => consultationService.deleteConsultation(id)))
      setConsultations(prev => prev.filter(c => !selected.has(c.id)))
      setSelected(new Set())
      setSelectMode(false)
    } catch (e) {
      console.error('Bulk delete failed:', e)
      alert('Some leads could not be removed. Please try again.')
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  const handleCleanupEmpty = async () => {
    setDeleting(true)
    try {
      await Promise.all(emptyLeads.map(c => consultationService.deleteConsultation(c.id)))
      setConsultations(prev => prev.filter(c => {
        const name = `${c.first_name || ''} ${c.last_name || ''}`.trim()
        return c.customer_id || name
      }))
    } catch (e) {
      console.error('Cleanup failed:', e)
      alert('Cleanup failed. Please try again.')
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Confirm modal */}
      {confirmDelete && (
        <DeleteConfirmModal
          count={confirmDelete === 'single' ? 1 : confirmDelete === 'bulk' ? selected.size : emptyLeads.length}
          deleting={deleting}
          onCancel={() => { setConfirmDelete(null); setDeletingId(null) }}
          onConfirm={() => {
            if (confirmDelete === 'single') handleDeleteSingle(deletingId)
            else if (confirmDelete === 'bulk') handleDeleteSelected()
            else handleCleanupEmpty()
          }}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-900">My Active Leads</h2>
        <div className="flex items-center gap-2">
          {emptyLeads.length > 0 && !selectMode && (
            <button
              onClick={() => setConfirmDelete('cleanup')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clean up {emptyLeads.length} empty
            </button>
          )}
          <button
            onClick={() => { setSelectMode(s => !s); setSelected(new Set()) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              selectMode
                ? 'bg-blue-600 text-white border-blue-600'
                : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            {selectMode ? 'Cancel' : 'Select'}
          </button>
          <span className="text-sm text-gray-500">{consultations.length} total</span>
          <button onClick={() => setRefreshKey(k => k + 1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectMode && selected.size > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between">
          <p className="text-sm font-medium text-red-800">{selected.size} lead{selected.size !== 1 ? 's' : ''} selected</p>
          <button
            onClick={() => setConfirmDelete('bulk')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Remove Selected
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
        {selectMode && (
          <button onClick={toggleAll}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex-shrink-0">
            {selected.size === filtered.length
              ? <CheckSquare className="w-4 h-4 text-blue-600" />
              : <Square className="w-4 h-4" />}
            {selected.size === filtered.length ? 'Deselect all' : 'Select all'}
          </button>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500">
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="accepted">Accepted</option>
          <option value="referred">Referred</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <PanelFallback />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 text-gray-400">
          <CheckCircle className="w-12 h-12 mb-3" />
          <p className="text-sm font-medium">No leads match your filters</p>
        </div>
      ) : (
        <Suspense fallback={<PanelFallback />}>
          <div className="space-y-4">
            {filtered.map(c => {
              const isSelected = selected.has(c.id)
              return (
                <div key={c.id} className={`relative group rounded-xl transition-all ${
                  isSelected ? 'ring-2 ring-red-400' : ''
                }`}>
                  {/* Select checkbox overlay */}
                  {selectMode && (
                    <button
                      onClick={() => toggleSelect(c.id)}
                      className="absolute top-3 left-3 z-10 w-6 h-6 flex items-center justify-center"
                    >
                      {isSelected
                        ? <CheckSquare className="w-5 h-5 text-red-500" />
                        : <Square className="w-5 h-5 text-gray-400" />}
                    </button>
                  )}
                  {/* Delete button (shown on hover when not in select mode) */}
                  {!selectMode && (
                    <button
                      onClick={() => { setDeletingId(c.id); setConfirmDelete('single') }}
                      className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-300 transition-all opacity-0 group-hover:opacity-100"
                      title="Remove this lead"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <ConsultationCard
                    consultation={c}
                    onUpdate={() => setRefreshKey(k => k + 1)}
                  />
                </div>
              )
            })}
          </div>
        </Suspense>
      )}
    </div>
  )
}

// ── Settings Panel ────────────────────────────────────────────────────────────
const CARRIER_OPTIONS = [
  { value: 'verizon',      label: 'Verizon' },
  { value: 'att',          label: 'AT&T' },
  { value: 'tmobile',      label: 'T-Mobile' },
  { value: 'boost',        label: 'Boost Mobile' },
  { value: 'cricket',      label: 'Cricket Wireless' },
  { value: 'metro',        label: 'Metro by T-Mobile' },
  { value: 'sprint',       label: 'Sprint' },
  { value: 'uscellular',   label: 'US Cellular' },
  { value: 'virgin',       label: 'Virgin Mobile' },
  { value: 'tracfone',     label: 'Tracfone' },
  { value: 'straighttalk', label: 'Straight Talk' },
  { value: 'consumer',     label: 'Consumer Cellular' },
  { value: 'other',        label: 'Other / Unknown' },
]

function SettingsPanel({ user, profile }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lpqjndfjbenolhneqzec.supabase.co'
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  // SMS notification state
  const [smsEnabled,  setSmsEnabled]  = useState(profile?.sms_notifications_enabled || false)
  const [smsPhone,    setSmsPhone]    = useState(profile?.notification_phone || profile?.phone || '')
  const [smsCarrier,  setSmsCarrier]  = useState(profile?.sms_carrier || 'verizon')
  const [saving,      setSaving]      = useState(false)
  const [saveStatus,  setSaveStatus]  = useState(null) // null | 'saved' | 'error'
  const [testStatus,  setTestStatus]  = useState(null) // null | 'sending' | 'sent' | 'error'

  const handleSaveSms = async () => {
    if (!profile?.id) return
    setSaving(true)
    setSaveStatus(null)
    try {
      const r = await fetch(
        `${supabaseUrl}/rest/v1/agents?id=eq.${profile.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            notification_phone:        smsPhone.replace(/\D/g, '').slice(-10) || null,
            sms_carrier:               smsCarrier,
            sms_notifications_enabled: smsEnabled,
            updated_at:                new Date().toISOString(),
          }),
        }
      )
      if (r.ok) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus(null), 3000)
      } else {
        const err = await r.json()
        console.error('Save SMS settings error:', err)
        setSaveStatus('error')
      }
    } catch (e) {
      console.error('Save SMS settings:', e)
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const handleTestSms = async () => {
    const digits = smsPhone.replace(/\D/g, '').slice(-10)
    if (digits.length !== 10) {
      alert('Please enter a valid 10-digit US phone number first.')
      return
    }
    setTestStatus('sending')
    try {
      const r = await fetch('/api/notifications?action=sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits, carrier: smsCarrier, type: 'test' }),
      })
      const data = await r.json()
      if (r.ok && data.success) {
        setTestStatus('sent')
        setTimeout(() => setTestStatus(null), 4000)
      } else if (data.skipped) {
        alert('SMS skipped: carrier gateway not available for "Other". Please select your actual carrier.')
        setTestStatus(null)
      } else {
        console.error('Test SMS error:', data)
        setTestStatus('error')
        setTimeout(() => setTestStatus(null), 4000)
      }
    } catch (e) {
      console.error('Test SMS:', e)
      setTestStatus('error')
      setTimeout(() => setTestStatus(null), 4000)
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">My Profile & Notifications</h2>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 mt-1">
              Broker
            </span>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Email',   value: user?.email },
            { label: 'Phone',   value: profile?.phone || '—' },
            { label: 'State',   value: profile?.license_state || profile?.state || '—' },
            { label: 'License', value: profile?.license_number || '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-sm text-gray-700 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-400">To update your name, email, or license info, contact your administrator.</p>
        </div>
      </div>

      {/* SMS Notifications card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">SMS Lead Notifications</h3>
            <p className="text-xs text-gray-500 mt-0.5">Receive a text message whenever a new lead is assigned to you</p>
          </div>
          {/* Toggle */}
          <button
            onClick={() => setSmsEnabled(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              smsEnabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              smsEnabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Phone number */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Notification Phone Number
          </label>
          <input
            type="tel"
            value={smsPhone}
            onChange={e => setSmsPhone(e.target.value)}
            placeholder="(910) 363-6147"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">Enter the 10-digit US number where you want to receive texts</p>
        </div>

        {/* Carrier selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Mobile Carrier
          </label>
          <select
            value={smsCarrier}
            onChange={e => setSmsCarrier(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
          >
            {CARRIER_OPTIONS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Select your carrier so we can route the text correctly</p>
        </div>

        {/* What you'll receive */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
          <p className="text-xs font-semibold text-gray-600">You will receive a text when:</p>
          <ul className="text-xs text-gray-500 space-y-0.5 list-disc list-inside">
            <li>A new lead is assigned to you by an admin</li>
            <li>A new consultation request comes in with your name</li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSaveSms}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Saving…' : 'Save Settings'}
          </button>

          <button
            onClick={handleTestSms}
            disabled={testStatus === 'sending'}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {testStatus === 'sending' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
            {testStatus === 'sending' ? 'Sending…' : 'Send Test Text'}
          </button>

          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle className="w-4 h-4" /> Saved!
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-500 font-medium">Save failed — try again</span>
          )}
          {testStatus === 'sent' && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle className="w-4 h-4" /> Test text sent!
            </span>
          )}
          {testStatus === 'error' && (
            <span className="text-xs text-red-500 font-medium">Test failed — check phone &amp; carrier</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Broker Control Panel (Overview) ──────────────────────────────────────────
function BrokerControlPanel({ agentId, agentName, onNavigate }) {
  const [stats, setStats]               = useState(null)
  const [consultations, setConsultations] = useState([])
  const [pendingReferrals, setPendingReferrals] = useState([])
  const [loading, setLoading]           = useState(true)

  const load = useCallback(async () => {
    if (!agentId) return
    setLoading(true)
    try {
      const [consultRes, referralRes] = await Promise.all([
        consultationService.getBrokerConsultations(agentId),
        consultationService.getPendingReferrals(agentId),
      ])
      const consults  = consultRes.data  || []
      const referrals = referralRes.data || []
      setConsultations(consults)
      setPendingReferrals(referrals)
      setStats({
        total:       consults.length,
        active:      consults.filter(c => ['new','accepted','scheduled'].includes(c.status)).length,
        pending:     referrals.length,
        completed:   consults.filter(c => c.status === 'completed').length,
        acceptance:  consults.length > 0
          ? Math.round((consults.filter(c => c.status !== 'declined').length / consults.length) * 100)
          : 0,
      })
    } catch (e) {
      console.error('BrokerControlPanel load:', e)
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { load() }, [load])

  if (loading) return <PanelFallback />

  const recentConsults = consultations.slice(0, 5)

  const StatCard = ({ icon: Icon, label, value, color, panel }) => (
    <button
      onClick={() => panel && onNavigate(panel)}
      className={`bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-all group w-full ${panel ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {panel && <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
    </button>
  )

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Welcome back, {agentName?.split(' ')[0] || 'Broker'}</h2>
            <p className="text-blue-100 mt-1">Here's your performance overview</p>
          </div>
          <div className="hidden sm:flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
            <Shield className="w-6 h-6 text-blue-200" />
            <div>
              <p className="text-xs text-blue-200">Acceptance Rate</p>
              <p className="text-xl font-bold">{stats?.acceptance ?? 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending referrals alert */}
      {pendingReferrals.length > 0 && (
        <button
          onClick={() => onNavigate('referrals')}
          className="w-full bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between hover:bg-orange-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-semibold text-orange-900">
                {pendingReferrals.length} pending referral{pendingReferrals.length !== 1 ? 's' : ''} require your action
              </p>
              <p className="text-xs text-orange-700">Accept or decline within 24 hours to maintain your rating</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-orange-500 flex-shrink-0" />
        </button>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}       label="Active Leads"      value={stats?.active}    color="text-green-600"  panel="active-leads" />
        <StatCard icon={Inbox}       label="Pending Referrals" value={stats?.pending}   color="text-orange-600" panel="referrals" />
        <StatCard icon={CheckCircle} label="Completed"         value={stats?.completed} color="text-blue-600" />
        <StatCard icon={BarChart2}   label="Total Assigned"    value={stats?.total}     color="text-purple-600" />
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'View Active Leads',  icon: Users,         panel: 'active-leads',    color: 'bg-green-50 text-green-700 hover:bg-green-100' },
            { label: 'Referral Inbox',     icon: Inbox,         panel: 'referrals',       color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
            { label: 'Find Properties',    icon: Home,          panel: 'ai-properties',   color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
            { label: 'Send Email',         icon: Mail,          panel: 'email',           color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
            { label: 'Send SMS',           icon: MessageSquare, panel: 'sms',             color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
            { label: 'AI Assistant',       icon: Bot,           panel: 'ai-assistant',    color: 'bg-violet-50 text-violet-700 hover:bg-violet-100' },
          ].map(({ label, icon: Icon, panel, color }) => (
            <button key={panel} onClick={() => onNavigate(panel)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${color}`}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-left leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent leads */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Recent Leads</h3>
          <button onClick={() => onNavigate('active-leads')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {recentConsults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <Users className="w-10 h-10 mb-2" />
            <p className="text-sm">No active leads yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentConsults.map(c => {
              const customer = c.customer || {}
              const name = `${customer.first_name || c.first_name || ''} ${customer.last_name || c.last_name || ''}`.trim()
              const email = customer.email || c.email || ''
              const statusColors = {
                new: 'bg-yellow-100 text-yellow-700',
                accepted: 'bg-green-100 text-green-700',
                referred: 'bg-blue-100 text-blue-700',
                scheduled: 'bg-purple-100 text-purple-700',
                completed: 'bg-emerald-100 text-emerald-700',
              }
              return (
                <Link key={c.id} to={`/lead/${c.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{email || 'No email'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[c.status] || 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main BrokerShell ──────────────────────────────────────────────────────────
export default function BrokerShell({ user, showAdminAccess }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [activePanel, setActivePanel]   = useState('overview')
  const [sidebarOpen, setSidebarOpen]   = useState(true)
  const [collapsed, setCollapsed]       = useState(false)
  const [agentId, setAgentId]           = useState(null)
  const [agentName, setAgentName]       = useState('')
  const [alerts, setAlerts]             = useState({ activeLeads: 0, pendingReferrals: 0 })
  const [loadingAgent, setLoadingAgent] = useState(true)

  // Resolve agent from user email
  useEffect(() => {
    const resolveAgent = async () => {
      const email = user?.email || profile?.email
      if (!email) { setLoadingAgent(false); return }
      try {
        const result = await agentService.getAgentByEmail(email)
        if (result.success && result.data) {
          setAgentId(result.data.id)
          setAgentName(`${result.data.first_name || ''} ${result.data.last_name || ''}`.trim())
        }
      } catch (e) {
        console.error('BrokerShell resolveAgent:', e)
      } finally {
        setLoadingAgent(false)
      }
    }
    resolveAgent()
  }, [user, profile])

  // Load alert badge counts
  useEffect(() => {
    if (!agentId) return
    const loadAlerts = async () => {
      const [consultRes, referralRes] = await Promise.all([
        consultationService.getBrokerConsultations(agentId),
        consultationService.getPendingReferrals(agentId),
      ])
      setAlerts({
        activeLeads:      (consultRes.data  || []).filter(c => ['new','accepted'].includes(c.status)).length,
        pendingReferrals: (referralRes.data || []).length,
      })
    }
    loadAlerts()
  }, [agentId])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // ── Render active panel ───────────────────────────────────────────────────
  const renderPanel = () => {
    if (loadingAgent) return <PanelFallback />
    switch (activePanel) {
      case 'overview':
        return <BrokerControlPanel agentId={agentId} agentName={agentName} onNavigate={setActivePanel} />
      case 'active-leads':
        return <ActiveLeadsPanel agentId={agentId} />
      case 'referrals':
        return (
          <Suspense fallback={<PanelFallback />}>
            <BrokerReferralInbox />
          </Suspense>
        )
      case 'ai-properties':
        return <FindPropertiesPanel agentId={agentId} />
      case 'share-analytics':
        return (
          <Suspense fallback={<PanelFallback />}>
            <PropertyShareAnalytics agentId={agentId} />
          </Suspense>
        )
      case 'email':
        return <EmailComposerPanel agentId={agentId} />
      case 'sms':
        return <SMSComposerPanel agentId={agentId} />
      case 'ai-assistant':
        return <AIAssistantPanel agentId={agentId} />
      case 'settings':
        return <SettingsPanel user={user} profile={profile} />
      default:
        return <BrokerControlPanel agentId={agentId} agentName={agentName} onNavigate={setActivePanel} />
    }
  }

  const panelTitle = NAV_SECTIONS.flatMap(s => s.items).find(i => i.id === activePanel)?.label || 'Overview'

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className={`
        fixed lg:relative z-30 flex flex-col h-full bg-white border-r border-gray-200
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${collapsed ? 'w-16' : 'w-64'}
      `}>
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-gray-200 flex-shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Home className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">Broker Portal</p>
                <p className="text-xs text-gray-400 leading-tight truncate max-w-[130px]">{agentName || user?.email}</p>
              </div>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors hidden lg:flex">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 lg:hidden">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              {!collapsed && (
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = item.icon
                  const isActive = activePanel === item.id
                  const alertCount = item.alertKey ? alerts[item.alertKey] : 0
                  return (
                    <button key={item.id}
                      onClick={() => { setActivePanel(item.id); setSidebarOpen(false) }}
                      title={collapsed ? item.label : undefined}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                        transition-all duration-150
                        ${isActive ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                        ${collapsed ? 'justify-center' : ''}
                      `}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : item.color}`} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          {alertCount > 0 && (
                            <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                              {alertCount > 99 ? '99+' : alertCount}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={`border-t border-gray-200 p-3 flex-shrink-0 space-y-1 ${collapsed ? 'items-center' : ''}`}>
          {showAdminAccess && (
            <Link to="/admin"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? 'Admin Panel' : undefined}>
              <Shield className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>Admin Panel</span>}
            </Link>
          )}
          <button onClick={handleSignOut}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Sign Out' : undefined}>
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(s => !s)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 lg:hidden">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{panelTitle}</h1>
              <p className="text-xs text-gray-400 hidden sm:block">Broker Back Office</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {alerts.pendingReferrals > 0 && (
              <button onClick={() => setActivePanel('referrals')}
                className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                  {alerts.pendingReferrals}
                </span>
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </header>

        {/* Panel content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Suspense fallback={<PanelFallback />}>
            {renderPanel()}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
