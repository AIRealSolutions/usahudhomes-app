/**
 * AdminShell — Full admin layout with persistent sidebar + content area.
 * Replaces the old horizontal-tab AdminDashboard.
 *
 * Navigation map:
 *   overview          → AdminControlPanel
 *   property-manage   → PropertyAdmin
 *   hud-scraper       → HUDScrapeManager
 *   property-import   → PropertyImportWizard
 *   property-search   → PropertySearchTab
 *   leads             → LeadAdmin
 *   customers         → CustomerAdmin
 *   referrals         → ReferralManagement
 *   consultations     → ConsultationAdmin
 *   agents            → AgentAdmin
 *   applications      → AgentApplicationsAdmin
 *   bid-results       → BidResultsAdmin
 *   video-studio      → VideoStudio
 *   bulk-generator    → VideoBulkGenerator
 *   video-library     → VideoLibrary
 *   template-builder  → VideoTemplateBuilder
 *   facebook-import   → FacebookLeadsImport
 *   ai-assistant      → AIMarketingAssistant
 *   database          → DatabaseReset
 */

import React, { useState, useEffect, lazy, Suspense } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Home, Database, Upload as UploadIcon, Search,
  MessageSquare, Users, GitMerge, PhoneCall,
  UserCog, FileText, DollarSign,
  Film, Zap, BookOpen, Layout,
  Facebook, Bot, HardDrive,
  LogOut, ChevronLeft, ChevronRight, Menu, X,
  ChevronDown, ChevronUp, Bell
} from 'lucide-react'

// Lazy-load all admin panels
const AdminControlPanel   = lazy(() => import('./admin/AdminControlPanel'))
const PropertyAdmin       = lazy(() => import('./admin/PropertyAdmin'))
const HUDScrapeManager    = lazy(() => import('./admin/HUDScrapeManager'))
const PropertyImportWizard= lazy(() => import('./admin/PropertyImportWizard'))
const PropertySearchTab   = lazy(() => import('./admin/PropertySearchTab'))
const LeadAdmin           = lazy(() => import('./admin/LeadsHub'))
const CustomerAdmin       = lazy(() => import('./admin/CustomerAdmin'))
const ReferralManagement  = lazy(() => import('./admin/ReferralManagement'))
const ConsultationAdmin   = lazy(() => import('./admin/ConsultationAdmin'))
const AgentAdmin          = lazy(() => import('./admin/AgentAdmin'))
const AgentApplicationsAdmin = lazy(() => import('./admin/AgentApplicationsAdmin'))
const BidResultsAdmin     = lazy(() => import('./admin/BidResultsAdmin'))
const VideoStudio         = lazy(() => import('./admin/VideoStudio'))
const VideoBulkGenerator  = lazy(() => import('./admin/VideoBulkGenerator'))
const VideoLibrary        = lazy(() => import('./admin/VideoLibrary'))
const VideoTemplateBuilder= lazy(() => import('./admin/VideoTemplateBuilder'))
const FacebookLeadsImport = lazy(() => import('./admin/FacebookLeadsImport'))
const AIMarketingAssistant= lazy(() => import('./admin/AIMarketingAssistant'))
const DatabaseReset       = lazy(() => import('./admin/DatabaseReset'))

// ── Navigation structure ────────────────────────────────────────────────────
const NAV = [
  {
    id: 'overview',
    label: 'Control Panel',
    icon: LayoutDashboard,
    color: 'text-blue-600',
    badge: null,
  },
  {
    group: 'Properties',
    items: [
      { id: 'property-manage',  label: 'Manage Listings',   icon: Home,          color: 'text-blue-500' },
      { id: 'hud-scraper',      label: 'HUD Scraper',       icon: Database,      color: 'text-blue-700', badge: 'LIVE' },
      { id: 'property-import',  label: 'Import Wizard',     icon: UploadIcon,    color: 'text-teal-600' },
      { id: 'property-search',  label: 'Property Search',   icon: Search,        color: 'text-gray-500' },
    ]
  },
  {
    group: 'Leads & Customers',
    items: [
      { id: 'leads',            label: 'Leads',             icon: MessageSquare, color: 'text-orange-500', alertKey: 'newLeads' },
      { id: 'customers',        label: 'Customers',         icon: Users,         color: 'text-blue-500' },
      { id: 'referrals',        label: 'Referrals',         icon: GitMerge,      color: 'text-purple-500' },
      { id: 'consultations',    label: 'Consultations',     icon: PhoneCall,     color: 'text-green-500' },
    ]
  },
  {
    group: 'Agents',
    items: [
      { id: 'agents',           label: 'Manage Agents',     icon: UserCog,       color: 'text-indigo-500' },
      { id: 'applications',     label: 'Applications',      icon: FileText,      color: 'text-yellow-600' },
      { id: 'bid-results',      label: 'Bid Results',       icon: DollarSign,    color: 'text-green-600' },
    ]
  },
  {
    group: 'Media Studio',
    items: [
      { id: 'video-studio',     label: 'Video Studio',      icon: Film,          color: 'text-purple-600', badge: 'NEW' },
      { id: 'bulk-generator',   label: 'Bulk Generator',    icon: Zap,           color: 'text-yellow-500' },
      { id: 'video-library',    label: 'Video Library',     icon: BookOpen,      color: 'text-pink-500' },
      { id: 'template-builder', label: 'Templates',         icon: Layout,        color: 'text-rose-500' },
    ]
  },
  {
    group: 'Tools',
    items: [
      { id: 'facebook-import',  label: 'Facebook Leads',    icon: Facebook,      color: 'text-blue-600' },
      { id: 'ai-assistant',     label: 'AI Assistant',      icon: Bot,           color: 'text-indigo-600' },
      { id: 'database',         label: 'Database Tools',    icon: HardDrive,     color: 'text-red-500' },
    ]
  },
]

const COMPONENT_MAP = {
  'overview':          AdminControlPanel,
  'property-manage':   PropertyAdmin,
  'hud-scraper':       HUDScrapeManager,
  'property-import':   PropertyImportWizard,
  'property-search':   PropertySearchTab,
  'leads':             LeadAdmin, // LeadManagement — queries leads table
  'customers':         CustomerAdmin,
  'referrals':         ReferralManagement,
  'consultations':     ConsultationAdmin,
  'agents':            AgentAdmin,
  'applications':      AgentApplicationsAdmin,
  'bid-results':       BidResultsAdmin,
  'video-studio':      VideoStudio,
  'bulk-generator':    VideoBulkGenerator,
  'video-library':     VideoLibrary,
  'template-builder':  VideoTemplateBuilder,
  'facebook-import':   FacebookLeadsImport,
  'ai-assistant':      AIMarketingAssistant,
  'database':          DatabaseReset,
}

// ── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ active, onNavigate, collapsed, onToggle, alerts }) {
  const [openGroups, setOpenGroups] = useState({
    'Properties': true,
    'Leads & Customers': true,
    'Agents': false,
    'Media Studio': false,
    'Tools': false,
  })

  const toggleGroup = (group) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }))
  }

  const NavItem = ({ item }) => {
    const Icon = item.icon
    const isActive = active === item.id
    const alertCount = item.alertKey ? (alerts[item.alertKey] || 0) : 0
    return (
      <button
        onClick={() => onNavigate(item.id)}
        title={collapsed ? item.label : undefined}
        className={`
          w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
          ${isActive
            ? 'bg-blue-50 text-blue-700 shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }
          ${collapsed ? 'justify-center' : ''}
        `}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : item.color}`} />
        {!collapsed && (
          <>
            <span className="flex-1 text-left truncate">{item.label}</span>
            {item.badge && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                item.badge === 'NEW' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {item.badge}
              </span>
            )}
            {alertCount > 0 && (
              <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">
                {alertCount}
              </span>
            )}
          </>
        )}
        {collapsed && alertCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
        )}
      </button>
    )
  }

  return (
    <aside className={`
      relative flex flex-col bg-white border-r border-gray-200 transition-all duration-200
      ${collapsed ? 'w-16' : 'w-60'}
    `}>
      {/* Logo / Brand */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-gray-100 ${collapsed ? 'justify-center px-2' : ''}`}>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">USA HUD Homes</p>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Home className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {/* Overview — top-level */}
        <NavItem item={{ id: 'overview', label: 'Control Panel', icon: LayoutDashboard, color: 'text-blue-600' }} />

        <div className="my-2 border-t border-gray-100" />

        {NAV.filter(n => n.group).map(section => (
          <div key={section.group}>
            {!collapsed ? (
              <>
                <button
                  onClick={() => toggleGroup(section.group)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                >
                  <span>{section.group}</span>
                  {openGroups[section.group]
                    ? <ChevronUp className="w-3 h-3" />
                    : <ChevronDown className="w-3 h-3" />
                  }
                </button>
                {openGroups[section.group] && (
                  <div className="space-y-0.5 mb-1">
                    {section.items.map(item => <NavItem key={item.id} item={item} />)}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-0.5 mb-2">
                {section.items.map(item => (
                  <div key={item.id} className="relative">
                    <NavItem item={item} />
                  </div>
                ))}
                <div className="my-1 border-t border-gray-100" />
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow z-10"
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3 text-gray-500" />
          : <ChevronLeft className="w-3 h-3 text-gray-500" />
        }
      </button>
    </aside>
  )
}

// ── Main Shell ───────────────────────────────────────────────────────────────
export default function AdminShell({ initialTab = 'overview' }) {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab]     = useState(initialTab)
  const [collapsed, setCollapsed]     = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [alerts, setAlerts]           = useState({ newLeads: 0 })

  // Fetch alert counts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const { count } = await supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new_lead')
        setAlerts({ newLeads: count || 0 })
      } catch (_) {}
    }
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 60000)
    return () => clearInterval(interval)
  }, [])

  const navigate = (tab) => {
    setActiveTab(tab)
    setMobileOpen(false)
  }

  // Find active label for breadcrumb
  const allItems = NAV.flatMap(n => n.items || [n]).filter(n => n.id)
  const activeItem = allItems.find(i => i.id === activeTab)
  const activeLabel = activeItem?.label || 'Control Panel'

  const ActiveComponent = COMPONENT_MAP[activeTab] || AdminControlPanel

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop */}
      <div className="hidden lg:flex flex-col flex-shrink-0">
        <Sidebar
          active={activeTab}
          onNavigate={navigate}
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
          alerts={alerts}
        />
      </div>

      {/* Sidebar — mobile drawer */}
      <div className={`
        fixed inset-y-0 left-0 z-30 lg:hidden transition-transform duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="w-64 h-full">
          <Sidebar
            active={activeTab}
            onNavigate={navigate}
            collapsed={false}
            onToggle={() => setMobileOpen(false)}
            alerts={alerts}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>

            {/* Breadcrumb */}
            <div className="min-w-0">
              <p className="text-xs text-gray-400 hidden sm:block">Admin</p>
              <h1 className="text-base font-semibold text-gray-900 truncate">{activeLabel}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Alert bell */}
            {alerts.newLeads > 0 && (
              <button
                onClick={() => navigate('leads')}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title={`${alerts.newLeads} new leads`}
              >
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
              </button>
            )}

            {/* User info */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {user?.email?.[0]?.toUpperCase() || 'A'}
                </span>
              </div>
              <span className="text-xs font-medium text-gray-700 max-w-[120px] truncate">
                {user?.email?.split('@')[0] || 'Admin'}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Loading…</p>
                </div>
              </div>
            }>
              <ActiveComponent onNavigate={navigate} />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
