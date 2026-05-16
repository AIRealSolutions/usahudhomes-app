/**
 * LeadsHub — Unified lead & consultation management.
 *
 * Fixes the root bug: the old LeadAdmin queried `consultations` with
 * `agent_id.is.null`, but ALL consultations have agent_id set, so nothing
 * ever showed. Real new leads live in the `leads` table with status `new_lead`.
 *
 * This component:
 *  - Tab 1 "New Leads"    → queries `leads` table (status = new_lead, etc.)
 *  - Tab 2 "Consultations"→ queries `consultations` table (assigned to brokers)
 *  - Tab 3 "Customers"    → queries `customers` table (linked from leads)
 *  Clicking a lead row navigates to /admin/leads/:id (LeadDetailsPage).
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import {
  Search, Filter, Eye, Calendar, MapPin, DollarSign, Home,
  AlertCircle, Phone, Mail, User, Clock, CheckCircle,
  RefreshCw, Download, UserPlus, ArrowRight, MessageSquare,
  Users, Inbox, ChevronDown, X
} from 'lucide-react'

// ── Status helpers ────────────────────────────────────────────────────────────
const LEAD_STATUSES = [
  { value: 'all',          label: 'All Statuses' },
  { value: 'new_lead',     label: 'New Lead',     color: 'bg-yellow-100 text-yellow-800' },
  { value: 'under_review', label: 'Under Review', color: 'bg-blue-100 text-blue-800' },
  { value: 'contacted',    label: 'Contacted',    color: 'bg-purple-100 text-purple-800' },
  { value: 'opt_in_sent',  label: 'Opt-In Sent',  color: 'bg-orange-100 text-orange-800' },
  { value: 'opted_in',     label: 'Opted In',     color: 'bg-green-100 text-green-800' },
  { value: 'onboarding',   label: 'Onboarding',   color: 'bg-indigo-100 text-indigo-800' },
  { value: 'onboarded',    label: 'Onboarded',    color: 'bg-emerald-100 text-emerald-800' },
  { value: 'archived',     label: 'Archived',     color: 'bg-gray-100 text-gray-700' },
]

const CONSULT_STATUSES = [
  { value: 'all',       label: 'All Statuses' },
  { value: 'new',       label: 'New',       color: 'bg-yellow-100 text-yellow-800' },
  { value: 'referred',  label: 'Referred',  color: 'bg-blue-100 text-blue-800' },
  { value: 'accepted',  label: 'Accepted',  color: 'bg-green-100 text-green-800' },
  { value: 'scheduled', label: 'Scheduled', color: 'bg-purple-100 text-purple-800' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
]

function statusBadge(status, list) {
  const found = list.find(s => s.value === status)
  const color = found?.color || 'bg-gray-100 text-gray-700'
  const label = found?.label || status
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {label}
    </span>
  )
}

function timeAgo(ts) {
  if (!ts) return '—'
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color, onClick }) => (
  <button
    onClick={onClick}
    className={`bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md transition-all group`}
  >
    <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
  </button>
)

// ── New Leads Tab ─────────────────────────────────────────────────────────────
function NewLeadsTab({ onNavigate }) {
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const [agents, setAgents] = useState([])
  const [assigning, setAssigning] = useState(null)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setLeads(data || [])
    } catch (e) {
      console.error('LeadsHub fetchLeads:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAgents = useCallback(async () => {
    const { data } = await supabase
      .from('agents')
      .select('id, first_name, last_name, email')
      .eq('status', 'approved')
      .eq('is_active', true)
    setAgents(data || [])
  }, [])

  useEffect(() => { fetchLeads(); fetchAgents() }, [])

  const assignAgent = async (leadId, agentId) => {
    if (!agentId) return
    setAssigning(leadId)
    try {
      const lead = leads.find(l => l.id === leadId)
      if (!lead) return

      // Find or create customer
      let customerId = lead.customer_id
      if (!customerId) {
        // Try to find existing customer by email
        if (lead.email) {
          const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('email', lead.email)
            .eq('is_active', true)
            .limit(1)
          if (existing?.length) {
            customerId = existing[0].id
          }
        }
        // Create customer if not found
        if (!customerId) {
          const { data: newCust } = await supabase
            .from('customers')
            .insert([{
              first_name: lead.first_name,
              last_name: lead.last_name,
              email: lead.email,
              phone: lead.phone,
              state: lead.state,
              lead_source: lead.source || 'website',
              status: 'active',
              is_active: true,
            }])
            .select('id')
            .single()
          if (newCust) customerId = newCust.id
        }
      }

      // Update lead
      await supabase
        .from('leads')
        .update({
          customer_id: customerId,
          status: 'under_review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)

      // Create consultation for the broker
      await supabase
        .from('consultations')
        .insert([{
          customer_id: customerId,
          agent_id: agentId,
          first_name: lead.first_name,
          last_name: lead.last_name,
          email: lead.email,
          phone: lead.phone,
          state: lead.state,
          message: lead.message,
          source: lead.source,
          status: 'new',
          is_deleted: false,
        }])

      await fetchLeads()
    } catch (e) {
      console.error('Assign agent error:', e)
      alert('Failed to assign agent: ' + e.message)
    } finally {
      setAssigning(null)
    }
  }

  const updateStatus = async (leadId, newStatus) => {
    await supabase.from('leads').update({ status: newStatus }).eq('id', leadId)
    await fetchLeads()
  }

  const filtered = leads.filter(l => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.phone?.includes(q) ||
      l.property_address?.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    const matchSource = sourceFilter === 'all' || l.source === sourceFilter
    const matchState  = stateFilter  === 'all' || l.state  === stateFilter
    return matchSearch && matchStatus && matchSource && matchState
  })

  const stats = {
    total:     leads.length,
    new:       leads.filter(l => l.status === 'new_lead').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    optedIn:   leads.filter(l => l.status === 'opted_in').length,
    onboarded: leads.filter(l => l.status === 'onboarded').length,
  }

  const uniqueStates = [...new Set(leads.map(l => l.state).filter(Boolean))].sort()
  const uniqueSources = [...new Set(leads.map(l => l.source).filter(Boolean))].sort()

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total Leads"  value={stats.total}     color="text-gray-900" />
        <StatCard label="New"          value={stats.new}       color="text-yellow-600" onClick={() => setStatusFilter('new_lead')} />
        <StatCard label="Contacted"    value={stats.contacted} color="text-purple-600" onClick={() => setStatusFilter('contacted')} />
        <StatCard label="Opted In"     value={stats.optedIn}   color="text-green-600" onClick={() => setStatusFilter('opted_in')} />
        <StatCard label="Onboarded"    value={stats.onboarded} color="text-emerald-600" onClick={() => setStatusFilter('onboarded')} />
      </div>

      {/* Alert */}
      {stats.new > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm font-medium text-yellow-900">
            {stats.new} new lead{stats.new !== 1 ? 's' : ''} awaiting review — assign to a broker to begin onboarding
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Name, email, phone, address…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500">
            {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500">
            <option value="all">All Sources</option>
            {uniqueSources.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500">
            <option value="all">All States</option>
            {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <MessageSquare className="w-10 h-10 mb-2" />
            <p className="text-sm">No leads match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Lead', 'Contact', 'Property Interest', 'Source', 'Status', 'Received', 'Assign / Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{lead.first_name} {lead.last_name}</p>
                      {lead.state && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{lead.state}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {lead.email && <p className="text-xs text-gray-700 flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" />{lead.email}</p>}
                      {lead.phone && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3 text-gray-400" />{lead.phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {lead.property_address ? (
                        <div>
                          <p className="text-xs text-gray-700 flex items-center gap-1"><Home className="w-3 h-3 text-gray-400" />{lead.property_address}</p>
                          {lead.property_price && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><DollarSign className="w-3 h-3 text-gray-400" />{Number(lead.property_price).toLocaleString()}</p>}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">General inquiry</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                        {(lead.source || 'website').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {statusBadge(lead.status, LEAD_STATUSES)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-500">{timeAgo(lead.created_at)}</p>
                      <p className="text-xs text-gray-400">{new Date(lead.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Assign broker dropdown */}
                        {agents.length > 0 && !lead.customer_id && (
                          <select
                            disabled={assigning === lead.id}
                            onChange={e => assignAgent(lead.id, e.target.value)}
                            defaultValue=""
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            <option value="" disabled>Assign broker…</option>
                            {agents.map(a => (
                              <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>
                            ))}
                          </select>
                        )}
                        {lead.customer_id && (
                          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Assigned
                          </span>
                        )}
                        {/* Status quick-update */}
                        {lead.status === 'new_lead' && (
                          <button
                            onClick={() => updateStatus(lead.id, 'under_review')}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium"
                          >
                            Mark Reviewing
                          </button>
                        )}
                        {/* View details */}
                        <button
                          onClick={() => navigate(`/admin/leads/${lead.id}`)}
                          className="text-xs px-2 py-1 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 font-medium flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
          Showing {filtered.length} of {leads.length} leads
        </div>
      </div>
    </div>
  )
}

// ── Consultations Tab ─────────────────────────────────────────────────────────
function ConsultationsTab() {
  const navigate = useNavigate()
  const [consultations, setConsultations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const fetchConsultations = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('consultations')
          .select('*, customer:customers(first_name,last_name,email,phone), agent:agents!agent_id(first_name,last_name)')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
        if (error) throw error
        setConsultations(data || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchConsultations()
  }, [])

  const filtered = consultations.filter(c => {
    const name = c.customer ? `${c.customer.first_name} ${c.customer.last_name}` : `${c.first_name || ''} ${c.last_name || ''}`
    const q = search.toLowerCase()
    const matchSearch = !search || name.toLowerCase().includes(q) ||
      (c.customer?.email || c.email || '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const stats = {
    total:     consultations.length,
    new:       consultations.filter(c => c.status === 'new').length,
    referred:  consultations.filter(c => c.status === 'referred').length,
    accepted:  consultations.filter(c => c.status === 'accepted').length,
    completed: consultations.filter(c => c.status === 'completed').length,
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total"     value={stats.total}     color="text-gray-900" />
        <StatCard label="New"       value={stats.new}       color="text-yellow-600" onClick={() => setStatusFilter('new')} />
        <StatCard label="Referred"  value={stats.referred}  color="text-blue-600"   onClick={() => setStatusFilter('referred')} />
        <StatCard label="Accepted"  value={stats.accepted}  color="text-green-600"  onClick={() => setStatusFilter('accepted')} />
        <StatCard label="Completed" value={stats.completed} color="text-emerald-600" onClick={() => setStatusFilter('completed')} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500">
          {CONSULT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Inbox className="w-10 h-10 mb-2" />
            <p className="text-sm">No consultations match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Customer', 'Contact', 'Assigned Broker', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => {
                  const customer = c.customer || { first_name: c.first_name, last_name: c.last_name, email: c.email, phone: c.phone }
                  const agent = c.agent
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">{customer.first_name} {customer.last_name}</p>
                        {c.state && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{c.state}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {customer.email && <p className="text-xs text-gray-700 flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" />{customer.email}</p>}
                        {customer.phone && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3 text-gray-400" />{customer.phone}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {agent ? (
                          <p className="text-sm text-gray-700">{agent.first_name} {agent.last_name}</p>
                        ) : (
                          <p className="text-xs text-gray-400">Unassigned</p>
                        )}
                      </td>
                      <td className="px-4 py-3">{statusBadge(c.status, CONSULT_STATUSES)}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-500">{timeAgo(c.created_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/lead/${c.id}`)}
                          className="text-xs px-2 py-1 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 font-medium flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
          Showing {filtered.length} of {consultations.length} consultations
        </div>
      </div>
    </div>
  )
}

// ── Customers Tab ─────────────────────────────────────────────────────────────
function CustomersTab() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
        setCustomers(data || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchCustomers()
  }, [])

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return !search ||
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
  })

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Customers" value={customers.length} color="text-gray-900" />
        <StatCard label="Active"          value={customers.filter(c => c.status === 'active').length} color="text-green-600" />
        <StatCard label="Onboarded"       value={customers.filter(c => c.status === 'onboarded').length} color="text-emerald-600" />
        <StatCard label="With Leads"      value={customers.filter(c => c.lead_source).length} color="text-blue-600" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Customer', 'Contact', 'Source', 'Status', 'Added'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No customers found</td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{c.first_name} {c.last_name}</p>
                      {c.state && <p className="text-xs text-gray-400">{c.state}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {c.email && <p className="text-xs text-gray-700">{c.email}</p>}
                      {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {(c.lead_source || 'unknown').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.status === 'active' ? 'bg-green-100 text-green-700' :
                        c.status === 'onboarded' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {c.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-500">{timeAgo(c.created_at)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
          Showing {filtered.length} of {customers.length} customers
        </div>
      </div>
    </div>
  )
}

// ── Main LeadsHub ─────────────────────────────────────────────────────────────
export default function LeadsHub({ onNavigate }) {
  const [tab, setTab] = useState('leads')

  const TABS = [
    { id: 'leads',         label: 'New Leads',      icon: MessageSquare },
    { id: 'consultations', label: 'Consultations',  icon: Inbox },
    { id: 'customers',     label: 'Customers',      icon: Users },
  ]

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {tab === 'leads'         && <NewLeadsTab onNavigate={onNavigate} />}
      {tab === 'consultations' && <ConsultationsTab />}
      {tab === 'customers'     && <CustomersTab />}
    </div>
  )
}
