/**
 * BrokerShell — Broker back office with persistent sidebar navigation.
 * Mirrors the AdminShell layout for consistency.
 *
 * Sidebar sections:
 *  Overview       → BrokerControlPanel
 *  My Leads       → Active consultations, pending referrals, referral inbox
 *  Properties     → AI property search, share analytics
 *  Communications → Email composer, SMS composer
 *  AI Tools       → AI agent assistant, AI properties
 *  Settings       → Profile
 */

import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabase'
import { consultationService } from '../services/database/consultationService'
import { agentService } from '../services/database'
import {
  LayoutDashboard, Users, Home, MessageSquare, Bot, Settings,
  ChevronLeft, ChevronRight, Menu, X, LogOut, Bell, RefreshCw,
  Phone, Mail, CheckCircle, Clock, TrendingUp, AlertCircle,
  ArrowRight, Inbox, Share2, Sparkles, User, MapPin,
  DollarSign, Calendar, BarChart2, Shield
} from 'lucide-react'

// ── Lazy-loaded panels ────────────────────────────────────────────────────────
const BrokerDashboardComp = lazy(() => import('./broker/BrokerDashboard'))
const BrokerReferralInbox  = lazy(() => import('./broker/BrokerReferralInbox'))
const ConsultationCard     = lazy(() => import('./broker/ConsultationCard'))
const AIAgentAssistant     = lazy(() => import('./broker/AIAgentAssistant'))
const AIPropertiesTab      = lazy(() => import('./broker/AIPropertiesTab'))
const PropertyShareAnalytics = lazy(() => import('./broker/PropertyShareAnalytics'))
const EmailComposer        = lazy(() => import('./broker/EmailComposer'))
const SMSComposer          = lazy(() => import('./broker/SMSComposer'))

// ── Navigation config ─────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { id: 'overview',      label: 'Overview',         icon: LayoutDashboard, color: 'text-blue-500' },
    ]
  },
  {
    label: 'My Leads',
    items: [
      { id: 'active-leads',  label: 'Active Leads',     icon: Users,           color: 'text-green-500',  alertKey: 'activeLeads' },
      { id: 'referrals',     label: 'Referral Inbox',   icon: Inbox,           color: 'text-orange-500', alertKey: 'pendingReferrals' },
    ]
  },
  {
    label: 'Properties',
    items: [
      { id: 'ai-properties', label: 'Find Properties',  icon: Home,            color: 'text-purple-500' },
      { id: 'share-analytics', label: 'Share Analytics', icon: Share2,         color: 'text-pink-500' },
    ]
  },
  {
    label: 'Communications',
    items: [
      { id: 'email',         label: 'Email Composer',   icon: Mail,            color: 'text-blue-400' },
      { id: 'sms',           label: 'SMS Composer',     icon: MessageSquare,   color: 'text-teal-500' },
    ]
  },
  {
    label: 'AI Tools',
    items: [
      { id: 'ai-assistant',  label: 'AI Assistant',     icon: Bot,             color: 'text-violet-500' },
    ]
  },
  {
    label: 'Account',
    items: [
      { id: 'settings',      label: 'My Profile',       icon: Settings,        color: 'text-gray-500' },
    ]
  },
]

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color, onClick }) => (
  <button
    onClick={onClick}
    className={`bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-all group w-full ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
  >
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color} bg-opacity-10`}
           style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      {onClick && <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />}
    </div>
    <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
    <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </button>
)

// ── Broker Control Panel (Overview) ──────────────────────────────────────────
function BrokerControlPanel({ agentId, agentName, onNavigate }) {
  const [stats, setStats]           = useState(null)
  const [consultations, setConsultations] = useState([])
  const [pendingReferrals, setPendingReferrals] = useState([])
  const [loading, setLoading]       = useState(true)

  const load = useCallback(async () => {
    if (!agentId) return
    setLoading(true)
    try {
      const [consultRes, referralRes] = await Promise.all([
        consultationService.getBrokerConsultations(agentId),
        consultationService.getPendingReferrals(agentId),
      ])
      const consults = consultRes.data || []
      const referrals = referralRes.data || []
      setConsultations(consults)
      setPendingReferrals(referrals)
      setStats({
        total:     consults.length,
        active:    consults.filter(c => ['new','accepted','scheduled'].includes(c.status)).length,
        pending:   referrals.length,
        completed: consults.filter(c => c.status === 'completed').length,
        acceptance: consults.length > 0
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  const recentConsults = consultations.slice(0, 5)

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
        <StatCard icon={Users}       label="Active Leads"       value={stats?.active}     color="text-green-600"  onClick={() => onNavigate('active-leads')} />
        <StatCard icon={Inbox}       label="Pending Referrals"  value={stats?.pending}    color="text-orange-600" onClick={() => onNavigate('referrals')} />
        <StatCard icon={CheckCircle} label="Completed"          value={stats?.completed}  color="text-blue-600" />
        <StatCard icon={BarChart2}   label="Total Assigned"     value={stats?.total}      color="text-purple-600" />
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'View Active Leads',    icon: Users,       panel: 'active-leads',    color: 'bg-green-50 text-green-700 hover:bg-green-100' },
            { label: 'Referral Inbox',       icon: Inbox,       panel: 'referrals',       color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
            { label: 'Find Properties',      icon: Home,        panel: 'ai-properties',   color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
            { label: 'Send Email',           icon: Mail,        panel: 'email',           color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
            { label: 'Send SMS',             icon: MessageSquare, panel: 'sms',           color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
            { label: 'AI Assistant',         icon: Bot,         panel: 'ai-assistant',    color: 'bg-violet-50 text-violet-700 hover:bg-violet-100' },
          ].map(({ label, icon: Icon, panel, color }) => (
            <button
              key={panel}
              onClick={() => onNavigate(panel)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${color}`}
            >
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
            <p className="text-xs mt-1">New referrals will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentConsults.map(c => {
              const customer = c.customer || { first_name: c.first_name, last_name: c.last_name, email: c.email, phone: c.phone }
              const statusColors = {
                new: 'bg-yellow-100 text-yellow-700',
                accepted: 'bg-green-100 text-green-700',
                referred: 'bg-blue-100 text-blue-700',
                scheduled: 'bg-purple-100 text-purple-700',
                completed: 'bg-emerald-100 text-emerald-700',
              }
              return (
                <Link
                  key={c.id}
                  to={`/lead/${c.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{customer.first_name} {customer.last_name}</p>
                      <p className="text-xs text-gray-400">{customer.email || customer.phone || 'No contact info'}</p>
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

// ── Active Leads Panel ────────────────────────────────────────────────────────
function ActiveLeadsPanel({ agentId }) {
  const [consultations, setConsultations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      if (!agentId) return
      setLoading(true)
      const result = await consultationService.getBrokerConsultations(agentId)
      setConsultations(result.data || [])
      setLoading(false)
    }
    load()
  }, [agentId])

  const filtered = consultations.filter(c => {
    const name = c.customer ? `${c.customer.first_name} ${c.customer.last_name}` : `${c.first_name || ''} ${c.last_name || ''}`
    const q = search.toLowerCase()
    const matchSearch = !search || name.toLowerCase().includes(q) ||
      (c.customer?.email || c.email || '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">My Active Leads</h2>
        <span className="text-sm text-gray-500">{consultations.length} total</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 text-gray-400">
          <CheckCircle className="w-12 h-12 mb-3" />
          <p className="text-sm font-medium">No leads match your filters</p>
        </div>
      ) : (
        <Suspense fallback={<div className="text-center py-8 text-gray-400">Loading…</div>}>
          <div className="space-y-4">
            {filtered.map(c => (
              <ConsultationCard key={c.id} consultation={c} onUpdate={() => {}} />
            ))}
          </div>
        </Suspense>
      )}
    </div>
  )
}

// ── Settings Panel ────────────────────────────────────────────────────────────
function SettingsPanel({ user, profile }) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">My Profile</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{profile?.first_name} {profile?.last_name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 mt-1">
              Broker
            </span>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Email', value: user?.email },
            { label: 'Phone', value: profile?.phone || '—' },
            { label: 'State', value: profile?.state || '—' },
            { label: 'License', value: profile?.license_number || '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-sm text-gray-700 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-700">To update your profile information, please contact your administrator.</p>
      </div>
    </div>
  )
}

// ── Loading fallback ──────────────────────────────────────────────────────────
const PanelFallback = () => (
  <div className="flex items-center justify-center h-64">
    <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
  </div>
)

// ── Main BrokerShell ──────────────────────────────────────────────────────────
export default function BrokerShell({ user, showAdminAccess }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [activePanel, setActivePanel] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [agentId, setAgentId] = useState(null)
  const [agentName, setAgentName] = useState('')
  const [alerts, setAlerts] = useState({ activeLeads: 0, pendingReferrals: 0 })
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

  // Load alert counts
  useEffect(() => {
    if (!agentId) return
    const loadAlerts = async () => {
      const [consultRes, referralRes] = await Promise.all([
        consultationService.getBrokerConsultations(agentId),
        consultationService.getPendingReferrals(agentId),
      ])
      setAlerts({
        activeLeads:      (consultRes.data || []).filter(c => ['new','accepted'].includes(c.status)).length,
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
        return (
          <Suspense fallback={<PanelFallback />}>
            <AIPropertiesTab />
          </Suspense>
        )
      case 'share-analytics':
        return (
          <Suspense fallback={<PanelFallback />}>
            <PropertyShareAnalytics agentId={agentId} />
          </Suspense>
        )
      case 'email':
        return (
          <Suspense fallback={<PanelFallback />}>
            <EmailComposer agentId={agentId} />
          </Suspense>
        )
      case 'sms':
        return (
          <Suspense fallback={<PanelFallback />}>
            <SMSComposer agentId={agentId} />
          </Suspense>
        )
      case 'ai-assistant':
        return (
          <Suspense fallback={<PanelFallback />}>
            <AIAgentAssistant agentId={agentId} />
          </Suspense>
        )
      case 'settings':
        return <SettingsPanel user={user} profile={profile} />
      default:
        return <BrokerControlPanel agentId={agentId} agentName={agentName} onNavigate={setActivePanel} />
    }
  }

  const panelTitle = NAV_SECTIONS.flatMap(s => s.items).find(i => i.id === activePanel)?.label || 'Overview'

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Mobile overlay ─────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className={`
        fixed lg:relative z-30 flex flex-col h-full bg-white border-r border-gray-200
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${collapsed ? 'w-16' : 'w-64'}
      `}>
        {/* Logo / header */}
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
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors hidden lg:flex"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 lg:hidden"
          >
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
                    <button
                      key={item.id}
                      onClick={() => { setActivePanel(item.id); setSidebarOpen(false) }}
                      title={collapsed ? item.label : undefined}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                        transition-all duration-150
                        ${isActive
                          ? 'bg-blue-50 text-blue-700 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
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
                      {collapsed && alertCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500" />
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
            <Link
              to="/admin"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? 'Admin Panel' : undefined}
            >
              <Shield className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>Admin Panel</span>}
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Sign Out' : undefined}
          >
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
            <button
              onClick={() => setSidebarOpen(s => !s)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{panelTitle}</h1>
              <p className="text-xs text-gray-400 hidden sm:block">Broker Back Office</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {alerts.pendingReferrals > 0 && (
              <button
                onClick={() => setActivePanel('referrals')}
                className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-400"
              >
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
