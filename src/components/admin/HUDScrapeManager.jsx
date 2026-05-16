import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase as supabaseClient } from '../../lib/supabase'
import {
  Download, Upload, RefreshCw, CheckCircle, AlertCircle, Loader2,
  Home, DollarSign, MapPin, Calendar, Clock, Play, Pause, Trash2,
  ChevronDown, ChevronUp, Film, Settings, History, Zap, Plus, X,
  ToggleLeft, ToggleRight, Info
} from 'lucide-react'

// ─── API base ────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
function ts(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}
function StatusBadge({ status }) {
  const map = {
    pending:   'bg-gray-100 text-gray-700',
    scraping:  'bg-blue-100 text-blue-700 animate-pulse',
    scraped:   'bg-yellow-100 text-yellow-800',
    importing: 'bg-indigo-100 text-indigo-700 animate-pulse',
    done:      'bg-green-100 text-green-800',
    error:     'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {(status === 'scraping' || status === 'importing') && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === 'done'    && <CheckCircle className="w-3 h-3" />}
      {status === 'error'   && <AlertCircle className="w-3 h-3" />}
      {status}
    </span>
  )
}

// ─── Cron presets ─────────────────────────────────────────────────────────────
const CRON_PRESETS = [
  { label: 'Daily at 6 AM',        value: '0 6 * * *' },
  { label: 'Daily at midnight',    value: '0 0 * * *' },
  { label: 'Every Mon at 7 AM',    value: '0 7 * * 1' },
  { label: 'Mon + Thu at 6 AM',    value: '0 6 * * 1,4' },
  { label: 'Every 12 hours',       value: '0 */12 * * *' },
  { label: 'Custom…',              value: 'custom' },
]

// ─── US States ────────────────────────────────────────────────────────────────
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

// ─── Main component ───────────────────────────────────────────────────────────
export default function HUDScrapeManager() {
  const [activeTab, setActiveTab] = useState('scrape')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-5 text-white">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">HUD Scrape Manager</h2>
            <p className="text-blue-200 text-sm">Scrape hudhomestore.gov • Import to database • Queue for media generation</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { id: 'scrape',    label: 'Scrape & Import', icon: Download },
          { id: 'schedule',  label: 'Schedules',       icon: Clock },
          { id: 'history',   label: 'Run History',     icon: History },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'scrape'   && <ScrapeTab />}
      {activeTab === 'schedule' && <ScheduleTab />}
      {activeTab === 'history'  && <HistoryTab />}
    </div>
  )
}

// ─── Scrape & Import Tab ──────────────────────────────────────────────────────
function ScrapeTab() {
  const [selectedStates, setSelectedStates] = useState(['NC'])
  const [jobs, setJobs]                     = useState([])        // { jobId, state, ... }
  const [globalError, setGlobalError]       = useState(null)
  const [templates, setTemplates]           = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const pollRef = useRef(null)

  // Load video templates for media queue
  useEffect(() => {
    fetch(`${API_BASE}/api/hud/states`)   // warm up API
      .catch(() => {})
    // Load templates from Supabase
    supabaseClient.from('video_templates').select('id,name,is_default').then(({ data }) => {
      if (data) {
        setTemplates(data)
        const def = data.find(t => t.is_default)
        if (def) setSelectedTemplate(def.id)
      }
    })
  }, [])

  // Poll active jobs
  useEffect(() => {
    const poll = async () => {
      const activeJobs = jobs.filter(j =>
        j.status === 'pending' || j.status === 'scraping' ||
        j.importStatus === 'importing'
      )
      if (activeJobs.length === 0) return

      for (const job of activeJobs) {
        try {
          const res  = await fetch(`${API_BASE}/api/hud/jobs/${job.jobId}`)
          const data = await res.json()
          if (data.success) {
            const j = data.job
            setJobs(prev => prev.map(p =>
              p.jobId === job.jobId
                ? {
                    ...p,
                    status:        j.status,
                    stats:         j.stats || p.stats,
                    error:         j.error,
                    startedAt:     j.started_at,
                    finishedAt:    j.finished_at,
                    importStatus:  j.import_status,
                    importStats:   j.import_stats,
                    importError:   j.import_error,
                    propertyCount: j.property_count,
                  }
                : p
            ))
          }
        } catch (_) {}
      }
    }
    pollRef.current = setInterval(poll, 2500)
    return () => clearInterval(pollRef.current)
  }, [jobs])

  const toggleState = (code) => {
    setSelectedStates(prev =>
      prev.includes(code) ? prev.filter(s => s !== code) : [...prev, code]
    )
  }

  const startScrape = async () => {
    if (selectedStates.length === 0) {
      setGlobalError('Select at least one state')
      return
    }
    setGlobalError(null)

    for (const state of selectedStates) {
      try {
        const res  = await fetch(`${API_BASE}/api/hud/scrape`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ state }),
        })
        const data = await res.json()
        if (data.success) {
          setJobs(prev => [
            {
              jobId:        data.job_id,
              state,
              status:       'scraping',
              stats:        null,
              error:        null,
              startedAt:    new Date().toISOString(),
              finishedAt:   null,
              importStatus: null,
              importStats:  null,
              importError:  null,
              propertyCount: 0,
              expanded:     false,
            },
            ...prev,
          ])
        } else {
          setGlobalError(`${state}: ${data.error}`)
        }
      } catch (e) {
        setGlobalError(`${state}: Network error — ${e.message}`)
      }
    }
  }

  const startImport = async (jobId, dryRun = false) => {
    setJobs(prev => prev.map(j =>
      j.jobId === jobId ? { ...j, importStatus: 'importing', importError: null } : j
    ))
    try {
      const res  = await fetch(`${API_BASE}/api/hud/import`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ job_id: jobId, dry_run: dryRun }),
      })
      const data = await res.json()
      if (!data.success) {
        setJobs(prev => prev.map(j =>
          j.jobId === jobId ? { ...j, importStatus: 'error', importError: data.error } : j
        ))
      }
    } catch (e) {
      setJobs(prev => prev.map(j =>
        j.jobId === jobId ? { ...j, importStatus: 'error', importError: e.message } : j
      ))
    }
  }

  const queueMedia = async (jobId) => {
    try {
      const res  = await fetch(`${API_BASE}/api/hud/queue-media`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ job_id: jobId, template_id: selectedTemplate }),
      })
      const data = await res.json()
      if (data.success) {
        alert(`✅ Queued ${data.queued} properties for media generation!`)
      } else {
        alert(`❌ ${data.error}`)
      }
    } catch (e) {
      alert(`❌ Network error: ${e.message}`)
    }
  }

  const removeJob = (jobId) => setJobs(prev => prev.filter(j => j.jobId !== jobId))

  const toggleExpand = (jobId) =>
    setJobs(prev => prev.map(j => j.jobId === jobId ? { ...j, expanded: !j.expanded } : j))

  return (
    <div className="space-y-6">
      {/* State selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          Select States to Scrape
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {US_STATES.map(code => (
            <button
              key={code}
              onClick={() => toggleState(code)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                selectedStates.includes(code)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {code}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={startScrape}
            disabled={selectedStates.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            Scrape {selectedStates.length > 0 ? `${selectedStates.length} State${selectedStates.length > 1 ? 's' : ''}` : 'Selected States'}
          </button>
          <button
            onClick={() => setSelectedStates([])}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
          <button
            onClick={() => setSelectedStates([...US_STATES])}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Select all
          </button>
          {selectedStates.length > 0 && (
            <span className="text-sm text-gray-500">
              Selected: {selectedStates.join(', ')}
            </span>
          )}
        </div>
        {globalError && (
          <div className="mt-3 flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {globalError}
          </div>
        )}
      </div>

      {/* Media template selector */}
      {templates.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Film className="w-4 h-4 text-purple-600" />
            Video Template for Media Queue
          </label>
          <select
            value={selectedTemplate || ''}
            onChange={e => setSelectedTemplate(e.target.value)}
            className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">— None —</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}{t.is_default ? ' (default)' : ''}</option>
            ))}
          </select>
        </div>
      )}

      {/* Job cards */}
      {jobs.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700">Active & Recent Jobs</h3>
          {jobs.map(job => (
            <JobCard
              key={job.jobId}
              job={job}
              onImport={startImport}
              onQueueMedia={queueMedia}
              onRemove={removeJob}
              onToggleExpand={toggleExpand}
              selectedTemplate={selectedTemplate}
            />
          ))}
        </div>
      )}

      {jobs.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Download className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Select states above and click Scrape to begin</p>
        </div>
      )}
    </div>
  )
}

// ─── Job Card ─────────────────────────────────────────────────────────────────
function JobCard({ job, onImport, onQueueMedia, onRemove, onToggleExpand, selectedTemplate }) {
  const isActive = job.status === 'scraping' || job.importStatus === 'importing'
  const importDone = job.importStatus === 'done'
  const importReady = job.status === 'scraped' && !job.importStatus

  // Derive overall display status
  let displayStatus = job.status
  if (job.importStatus === 'importing') displayStatus = 'importing'
  if (job.importStatus === 'done')      displayStatus = 'done'
  if (job.importStatus === 'error')     displayStatus = 'error'

  return (
    <div className={`bg-white rounded-xl border-2 transition-all ${
      displayStatus === 'done'  ? 'border-green-200' :
      displayStatus === 'error' ? 'border-red-200'   :
      isActive                  ? 'border-blue-200'  : 'border-gray-200'
    }`}>
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white ${
            displayStatus === 'done'  ? 'bg-green-600' :
            displayStatus === 'error' ? 'bg-red-500'   :
            isActive                  ? 'bg-blue-600'  : 'bg-gray-400'
          }`}>
            {job.state}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800">{job.state} — HUD Scrape</span>
              <StatusBadge status={displayStatus} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {job.jobId} · Started {ts(job.startedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {job.stats && (
            <button
              onClick={() => onToggleExpand(job.jobId)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              {job.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          {!isActive && (
            <button
              onClick={() => onRemove(job.jobId)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrape stats bar */}
      {job.stats && (
        <div className="px-5 pb-3 flex gap-6 text-sm">
          <span className="text-gray-600"><strong className="text-gray-900">{job.stats.total}</strong> total</span>
          <span className="text-green-700"><strong>{job.stats.new_listings}</strong> new</span>
          <span className="text-blue-700"><strong>{job.stats.price_reduced}</strong> reduced</span>
          {job.finishedAt && (
            <span className="text-gray-400 ml-auto">Scraped {ts(job.finishedAt)}</span>
          )}
        </div>
      )}

      {/* Error messages */}
      {job.error && (
        <div className="mx-5 mb-3 flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {job.error}
        </div>
      )}
      {job.importError && (
        <div className="mx-5 mb-3 flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Import error: {job.importError}
        </div>
      )}

      {/* Import stats */}
      {job.importStats && (
        <div className="mx-5 mb-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'New',          value: job.importStats.new_properties,          color: 'text-green-700' },
            { label: 'Updated',      value: job.importStats.updated_properties,      color: 'text-blue-700' },
            { label: 'Restored',     value: job.importStats.restored_properties,     color: 'text-purple-700' },
            { label: 'Under Contract', value: job.importStats.marked_under_contract, color: 'text-orange-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-50 rounded-lg px-3 py-2 text-center">
              <div className={`text-xl font-bold ${color}`}>{value ?? 0}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="px-5 pb-4 flex flex-wrap gap-2">
        {importReady && (
          <>
            <button
              onClick={() => onImport(job.jobId, true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Dry Run
            </button>
            <button
              onClick={() => onImport(job.jobId, false)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import to Database
            </button>
          </>
        )}
        {importDone && (
          <button
            onClick={() => onQueueMedia(job.jobId)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
          >
            <Film className="w-4 h-4" />
            Send to Bulk Media Generator
          </button>
        )}
        {isActive && (
          <span className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            {job.status === 'scraping' ? 'Scraping hudhomestore.gov…' : 'Importing to database…'}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────
function ScheduleTab() {
  const [schedules, setSchedules]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [formStates, setFormStates]     = useState(['NC'])
  const [formCron, setFormCron]         = useState('0 6 * * *')
  const [formCronPreset, setFormCronPreset] = useState('0 6 * * *')
  const [formLabel, setFormLabel]       = useState('')
  const [formDryRun, setFormDryRun]     = useState(false)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API_BASE}/api/hud/schedules`)
      const data = await res.json()
      if (data.success) setSchedules(data.schedules)
    } catch (_) {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggleEnabled = async (id, current) => {
    await fetch(`${API_BASE}/api/hud/schedules/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ enabled: !current }),
    })
    load()
  }

  const deleteSchedule = async (id) => {
    if (!confirm('Delete this schedule?')) return
    await fetch(`${API_BASE}/api/hud/schedules/${id}`, { method: 'DELETE' })
    load()
  }

  const saveSchedule = async () => {
    if (formStates.length === 0) { setError('Select at least one state'); return }
    setSaving(true)
    setError(null)
    try {
      const cron = formCronPreset === 'custom' ? formCron : formCronPreset
      const res  = await fetch(`${API_BASE}/api/hud/schedules`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          states:          formStates,
          cron_expression: cron,
          label:           formLabel || `HUD Sync ${formStates.join(',')}`,
          dry_run:         formDryRun,
          enabled:         true,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShowForm(false)
        load()
      } else {
        setError(data.error)
      }
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  const toggleFormState = (code) =>
    setFormStates(prev => prev.includes(code) ? prev.filter(s => s !== code) : [...prev, code])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">Recurring Sync Schedules</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure automated HUD scrape + import runs. Schedules are stored in the database and executed by the backend cron runner.
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Schedule
        </button>
      </div>

      {/* New schedule form */}
      {showForm && (
        <div className="bg-white rounded-xl border-2 border-blue-200 p-5 space-y-4">
          <h4 className="font-semibold text-gray-800">New Schedule</h4>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
            <input
              value={formLabel}
              onChange={e => setFormLabel(e.target.value)}
              placeholder="e.g. Daily NC+SC sync"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">States</label>
            <div className="flex flex-wrap gap-2">
              {US_STATES.map(code => (
                <button
                  key={code}
                  onClick={() => toggleFormState(code)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                    formStates.includes(code)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <select
              value={formCronPreset}
              onChange={e => setFormCronPreset(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CRON_PRESETS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            {formCronPreset === 'custom' && (
              <input
                value={formCron}
                onChange={e => setFormCron(e.target.value)}
                placeholder="5-field cron: min hour dom month dow"
                className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formDryRun}
                onChange={e => setFormDryRun(e.target.checked)}
                className="rounded"
              />
              Dry run only (no database changes)
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={saveSchedule}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Save Schedule
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Schedule list */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-8 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading schedules…
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No schedules yet — create one above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map(s => (
            <div key={s.id} className={`bg-white rounded-xl border-2 p-4 ${s.enabled ? 'border-green-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800">{s.label}</span>
                    {s.enabled
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Active</span>
                      : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">Paused</span>
                    }
                    {s.dry_run && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Dry Run</span>}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(s.states || []).map(code => (
                      <span key={code} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{code}</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 font-mono">{s.cron_expression}</p>
                  {s.last_run_at && (
                    <p className="text-xs text-gray-400 mt-1">Last run: {ts(s.last_run_at)}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleEnabled(s.id, s.enabled)}
                    className={`p-2 rounded-lg transition-colors ${s.enabled ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                    title={s.enabled ? 'Pause schedule' : 'Enable schedule'}
                  >
                    {s.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => deleteSchedule(s.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">How scheduling works</p>
          <p>Schedules are stored in the <code className="bg-blue-100 px-1 rounded">hud_sync_schedules</code> table. The backend cron runner (start with <code className="bg-blue-100 px-1 rounded">python3 api/hud_cron_runner.py</code>) reads enabled schedules and triggers <code className="bg-blue-100 px-1 rounded">POST /api/hud/sync</code> at the configured times. You can also use Manus scheduling to trigger the sync endpoint on a recurring basis.</p>
        </div>
      </div>
    </div>
  )
}

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab() {
  const [runs, setRuns]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res  = await fetch(`${API_BASE}/api/hud/history?limit=50`)
        const data = await res.json()
        if (data.success) setRuns(data.runs)
      } catch (_) {}
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-800">Sync Run History</h3>
        <p className="text-sm text-gray-500 mt-0.5">Last 50 completed scrape + import runs</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-8 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading history…
        </div>
      ) : runs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <History className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No runs recorded yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['State','Ran At','Scraped','New','Updated','Restored','Under Contract','Errors','Dry Run'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {runs.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-blue-700">{r.state}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{ts(r.ran_at)}</td>
                  <td className="px-4 py-3 text-gray-800">{r.total_scraped}</td>
                  <td className="px-4 py-3 text-green-700 font-semibold">{r.new_properties}</td>
                  <td className="px-4 py-3 text-blue-700">{r.updated_properties}</td>
                  <td className="px-4 py-3 text-purple-700">{r.restored_properties}</td>
                  <td className="px-4 py-3 text-orange-700">{r.marked_under_contract}</td>
                  <td className="px-4 py-3 text-red-600">{r.errors}</td>
                  <td className="px-4 py-3">
                    {r.dry_run
                      ? <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Yes</span>
                      : <span className="text-xs text-gray-400">No</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
