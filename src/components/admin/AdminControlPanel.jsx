import React, { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import {
  Home, Users, MessageSquare, UserCog, DollarSign, Film,
  Database, TrendingUp, AlertCircle, CheckCircle, Clock,
  RefreshCw, ArrowRight, Activity, Zap, BarChart2,
  FileText, Upload, Star, Eye
} from 'lucide-react'

const StatCard = ({ icon: Icon, label, value, sub, color, onClick }) => {
  const colors = {
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100',   text: 'text-blue-600',   val: 'text-blue-700'   },
    green:  { bg: 'bg-green-50',  icon: 'bg-green-100',  text: 'text-green-600',  val: 'text-green-700'  },
    orange: { bg: 'bg-orange-50', icon: 'bg-orange-100', text: 'text-orange-600', val: 'text-orange-700' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100', text: 'text-purple-600', val: 'text-purple-700' },
    red:    { bg: 'bg-red-50',    icon: 'bg-red-100',    text: 'text-red-600',    val: 'text-red-700'    },
    teal:   { bg: 'bg-teal-50',   icon: 'bg-teal-100',   text: 'text-teal-600',   val: 'text-teal-700'   },
  }
  const c = colors[color] || colors.blue
  return (
    <button
      onClick={onClick}
      className={`${c.bg} rounded-xl p-5 text-left w-full hover:shadow-md transition-all group border border-transparent hover:border-${color}-200`}
    >
      <div className="flex items-start justify-between">
        <div className={`${c.icon} rounded-lg p-2.5`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        <ArrowRight className={`w-4 h-4 ${c.text} opacity-0 group-hover:opacity-100 transition-opacity mt-1`} />
      </div>
      <div className="mt-3">
        <p className={`text-3xl font-bold ${c.val}`}>
          {value === null ? <span className="text-lg animate-pulse">…</span> : value?.toLocaleString()}
        </p>
        <p className="text-sm font-semibold text-gray-700 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </button>
  )
}

const QuickAction = ({ icon: Icon, label, desc, color, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-left w-full group"
  >
    <div className={`p-2 rounded-lg ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      <p className="text-xs text-gray-500 truncate">{desc}</p>
    </div>
    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
  </button>
)

export default function AdminControlPanel({ onNavigate }) {
  const [stats, setStats] = useState({
    properties: null,
    availableProperties: null,
    underContract: null,
    leads: null,
    newLeads: null,
    agents: null,
    consultations: null,
    bidResults: null,
    videoJobs: null,
    videoQueued: null,
  })
  const [recentLeads, setRecentLeads] = useState([])
  const [recentProperties, setRecentProperties] = useState([])
  const [lastHudSync, setLastHudSync] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setRefreshing(true)
    try {
      const [
        propsRes, availRes, ucRes,
        leadsRes, newLeadsRes,
        agentsRes, consultRes,
        bidRes, videoRes, videoQRes,
        recentLeadsRes, recentPropsRes
      ] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase.from('properties').select('id', { count: 'exact', head: true }).neq('status', 'UNDER CONTRACT').eq('is_active', true),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'UNDER CONTRACT'),
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new_lead'),
        supabase.from('agents').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('consultations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('bid_results').select('id', { count: 'exact', head: true }),
        supabase.from('video_jobs').select('id', { count: 'exact', head: true }),
        supabase.from('video_jobs').select('id', { count: 'exact', head: true }).eq('status', 'queued'),
        supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(4),
        supabase.from('properties').select('case_number,address,city,state,price,status,main_image').order('updated_at', { ascending: false }).limit(5),
      ])

      setStats({
        properties:          propsRes.count ?? 0,
        availableProperties: availRes.count ?? 0,
        underContract:       ucRes.count ?? 0,
        leads:               leadsRes.count ?? 0,
        newLeads:            newLeadsRes.count ?? 0,
        agents:              agentsRes.count ?? 0,
        consultations:       consultRes.count ?? 0,
        bidResults:          bidRes.count ?? 0,
        videoJobs:           videoRes.count ?? 0,
        videoQueued:         videoQRes.count ?? 0,
      })

      setRecentLeads(recentLeadsRes.data || [])
      setRecentProperties(recentPropsRes.data || [])

      // Try to get last HUD sync (table may not exist yet)
      try {
        const { data: syncData } = await supabase
          .from('hud_sync_runs')
          .select('ran_at, state, new_properties, updated_properties')
          .order('ran_at', { ascending: false })
          .limit(1)
          .single()
        setLastHudSync(syncData)
      } catch (_) {}

      setLastRefreshed(new Date())
    } catch (err) {
      console.error('Control panel fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const statusColor = (status) => {
    const s = (status || '').toLowerCase()
    if (s.includes('new')) return 'bg-green-100 text-green-800'
    if (s.includes('price') || s.includes('reduced')) return 'bg-yellow-100 text-yellow-800'
    if (s.includes('exclusive')) return 'bg-blue-100 text-blue-800'
    if (s.includes('extended')) return 'bg-purple-100 text-purple-800'
    if (s.includes('contract')) return 'bg-red-100 text-red-800'
    if (s.includes('pending')) return 'bg-orange-100 text-orange-800'
    return 'bg-gray-100 text-gray-700'
  }

  const timeAgo = (ts) => {
    if (!ts) return 'Never'
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control Panel</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {lastRefreshed ? `Updated ${timeAgo(lastRefreshed)}` : 'Loading live data…'}
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Attention Banner ───────────────────────────────────────────────── */}
      {(stats.newLeads > 0) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-900">
                {stats.newLeads} new lead{stats.newLeads !== 1 ? 's' : ''} awaiting assignment
              </p>
              <p className="text-xs text-orange-700">Review and assign to brokers</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('leads')}
            className="flex items-center gap-1 text-sm font-semibold text-orange-700 hover:text-orange-900"
          >
            Review <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Primary Stats ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Properties</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard
            icon={Home} label="Total Listings" color="blue"
            value={stats.properties}
            sub="All states in database"
            onClick={() => onNavigate('property-manage')}
          />
          <StatCard
            icon={CheckCircle} label="Active / Available" color="green"
            value={stats.availableProperties}
            sub="Excluding under contract"
            onClick={() => onNavigate('property-manage')}
          />
          <StatCard
            icon={Clock} label="Under Contract" color="orange"
            value={stats.underContract}
            sub="No longer on HUD site"
            onClick={() => onNavigate('property-manage')}
          />
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Leads & Agents</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={AlertCircle} label="New Leads" color="red"
            value={stats.newLeads}
            sub="Need assignment"
            onClick={() => onNavigate('leads')}
          />
          <StatCard
            icon={MessageSquare} label="Total Leads" color="teal"
            value={stats.leads}
            sub="All time"
            onClick={() => onNavigate('leads')}
          />
          <StatCard
            icon={Activity} label="Active Consults" color="purple"
            value={stats.consultations}
            sub="Being worked"
            onClick={() => onNavigate('leads')}
          />
          <StatCard
            icon={UserCog} label="Active Agents" color="blue"
            value={stats.agents}
            sub="Approved brokers"
            onClick={() => onNavigate('agents')}
          />
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Media & Results</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard
            icon={Film} label="Video Jobs" color="purple"
            value={stats.videoJobs}
            sub={`${stats.videoQueued ?? 0} queued`}
            onClick={() => onNavigate('video-studio')}
          />
          <StatCard
            icon={DollarSign} label="Bid Results" color="green"
            value={stats.bidResults}
            sub="Tracked outcomes"
            onClick={() => onNavigate('bid-results')}
          />
          <StatCard
            icon={Database} label="HUD Sync" color="blue"
            value={lastHudSync ? '✓' : '—'}
            sub={lastHudSync ? `Last: ${timeAgo(lastHudSync.ran_at)} · ${lastHudSync.state}` : 'No runs yet'}
            onClick={() => onNavigate('hud-scraper')}
          />
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickAction
            icon={Database} label="Run HUD Scraper" color="bg-blue-600"
            desc="Scrape & import new listings"
            onClick={() => onNavigate('hud-scraper')}
          />
          <QuickAction
            icon={Film} label="Bulk Media Generator" color="bg-purple-600"
            desc="Generate videos for properties"
            onClick={() => onNavigate('video-studio')}
          />
          <QuickAction
            icon={MessageSquare} label="Review New Leads" color="bg-orange-500"
            desc={`${stats.newLeads ?? 0} leads need attention`}
            onClick={() => onNavigate('leads')}
          />
          <QuickAction
            icon={Upload} label="Import Facebook Leads" color="bg-blue-500"
            desc="Upload CSV from Facebook Ads"
            onClick={() => onNavigate('facebook-import')}
          />
          <QuickAction
            icon={TrendingUp} label="Bid Results" color="bg-green-600"
            desc="Log and track bid outcomes"
            onClick={() => onNavigate('bid-results')}
          />
          <QuickAction
            icon={Zap} label="AI Marketing Assistant" color="bg-indigo-600"
            desc="Generate marketing copy"
            onClick={() => onNavigate('ai-assistant')}
          />
        </div>
      </div>

      {/* ── Recent Activity ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Leads */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">Recent Leads</h3>
            </div>
            <button
              onClick={() => onNavigate('leads')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {recentLeads.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No leads yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentLeads.map(lead => (
                <div key={lead.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {lead.first_name} {lead.last_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{lead.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          lead.status === 'new_lead' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {lead.status === 'new_lead' ? 'New' : lead.status}
                        </span>
                        {lead.state && (
                          <span className="text-xs text-gray-400">{lead.state}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                      {timeAgo(lead.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Properties */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">Recently Updated Properties</h3>
            </div>
            <button
              onClick={() => onNavigate('property-manage')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {recentProperties.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No properties yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentProperties.map(prop => (
                <div key={prop.case_number} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    {prop.main_image ? (
                      <img
                        src={prop.main_image}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-gray-100"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Home className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{prop.address}</p>
                      <p className="text-xs text-gray-500">{prop.city}, {prop.state} · ${prop.price?.toLocaleString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor(prop.status)}`}>
                      {prop.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── HUD Sync Status ────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold">HUD Scraper</p>
              <p className="text-sm text-blue-100">
                {lastHudSync
                  ? `Last sync: ${timeAgo(lastHudSync.ran_at)} · ${lastHudSync.new_properties ?? 0} new · ${lastHudSync.updated_properties ?? 0} updated`
                  : 'No sync runs recorded yet — run the migration SQL first'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('hud-scraper')}
            className="flex items-center gap-2 bg-white text-blue-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors"
          >
            <Database className="w-4 h-4" />
            Open Scraper
          </button>
        </div>
      </div>

    </div>
  )
}
