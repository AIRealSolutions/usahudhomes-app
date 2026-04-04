import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Play, Square, CheckSquare, Filter, Search, RefreshCw,
  Film, Loader2, CheckCircle2, XCircle, Clock, AlertCircle,
  ChevronDown, ChevronUp, Zap, ListChecks, Download, Terminal, Info, Trash2
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'

const STATUS_COLORS = {
  queued: 'bg-gray-100 text-gray-700',
  processing: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
}

const STATUS_ICONS = {
  queued: Clock,
  processing: Loader2,
  done: CheckCircle2,
  error: XCircle,
}

function JobRow({ job, property, onDelete }) {
  const Icon = STATUS_ICONS[job.status] || Clock
  const isDone = job.status === 'done'
  const isProcessing = job.status === 'processing'

  const handleDelete = (e) => {
    e.stopPropagation()
    if (window.confirm(`Remove "${property?.city || job.case_number}" from the queue?`)) {
      onDelete(job.id)
    }
  }

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${isDone ? 'border-green-200 bg-green-50' : job.status === 'error' ? 'border-red-100 bg-red-50' : 'border-gray-100 bg-white'}`}>
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isProcessing ? 'animate-spin text-blue-600' : isDone ? 'text-green-600' : job.status === 'error' ? 'text-red-500' : 'text-gray-400'}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800 truncate">
          {property?.city || '—'}, {property?.state || '—'} — {job.case_number}
        </div>
        {isDone && job.youtube_title && (
          <div className="text-xs text-gray-600 italic truncate mt-0.5">"{job.youtube_title}"</div>
        )}
        <div className="text-xs text-gray-500 mt-0.5">
          {isProcessing && job.progress > 0
            ? `${job.progress}% complete`
            : job.status === 'error'
            ? <span className="text-red-600">{job.error_message}</span>
            : isDone
            ? <span className="text-green-700 font-medium">✓ Video ready</span>
            : 'Waiting in queue — run worker script to process'}
        </div>
        {isProcessing && (
          <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${job.progress || 0}%` }} />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {isDone && job.s3_url && (
          <a href={job.s3_url} target="_blank" rel="noopener noreferrer" download
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
            onClick={e => e.stopPropagation()}>
            <Download className="w-3 h-3" /> Download
          </a>
        )}
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status]}`}>
          {job.status}
        </span>
        {!isProcessing && (
          <button
            onClick={handleDelete}
            title="Remove from queue"
            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function VideoBulkGenerator() {
  const [properties, setProperties] = useState([])
  const [templates, setTemplates] = useState([])
  const [jobs, setJobs] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [queueing, setQueueing] = useState(false)
  const [error, setError] = useState(null)
  const [showJobs, setShowJobs] = useState(true)
  const pollRef = useRef(null)

  useEffect(() => {
    loadAll()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // Poll active jobs every 4 seconds
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    const hasActive = jobs.some(j => j.status === 'queued' || j.status === 'processing')
    if (hasActive) {
      pollRef.current = setInterval(loadJobs, 4000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [jobs])

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadProperties(), loadTemplates(), loadJobs()])
    setLoading(false)
  }

  const loadProperties = async () => {
    const { data } = await supabase
      .from('properties')
      .select('id, case_number, address, city, state, county, price, beds, baths, status, main_image, bids_open, listing_period, image_url')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    setProperties(data || [])
  }

  const loadTemplates = async () => {
    const { data } = await supabase
      .from('video_templates')
      .select('id, name, is_default, color_primary, color_accent, video_format')
      .order('is_default', { ascending: false })
    setTemplates(data || [])
    if (data?.length > 0 && !selectedTemplate) {
      setSelectedTemplate(data.find(t => t.is_default) || data[0])
    }
  }

  const loadJobs = async () => {
    const { data } = await supabase
      .from('video_jobs')
      .select('*, properties(city, state, address)')
      .order('created_at', { ascending: false })
      .limit(50)
    setJobs(data || [])
  }

  // ── Clear entire queue (queued jobs only) ────────────────────────────────────
  const clearQueue = async () => {
    const queuedCount = jobs.filter(j => j.status === 'queued').length
    if (queuedCount === 0) return
    if (!window.confirm(`Remove all ${queuedCount} queued jobs? Processing and done jobs will not be affected.`)) return
    setJobs(prev => prev.filter(j => j.status !== 'queued'))
    const { error } = await supabase.from('video_jobs').delete().eq('status', 'queued')
    if (error) {
      setError(`Failed to clear queue: ${error.message}`)
      await loadJobs()
    }
  }

  // ── Delete job ──────────────────────────────────────────────────────────────
  const deleteJob = async (jobId) => {
    // Optimistic remove from UI immediately
    setJobs(prev => prev.filter(j => j.id !== jobId))
    const { error } = await supabase.from('video_jobs').delete().eq('id', jobId)
    if (error) {
      setError(`Failed to delete job: ${error.message}`)
      await loadJobs() // re-sync if delete failed
    }
  }

  // ── Filtering ──────────────────────────────────────────────────────────────
  const states = [...new Set(properties.map(p => p.state))].sort()
  const statuses = [...new Set(properties.map(p => p.status))].sort()

  const filtered = properties.filter(p => {
    const matchSearch = !search || [p.address, p.city, p.case_number, p.county].some(
      f => f?.toLowerCase().includes(search.toLowerCase())
    )
    const matchState = stateFilter === 'ALL' || p.state === stateFilter
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter
    return matchSearch && matchState && matchStatus
  })

  // ── Selection ──────────────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)))
    }
  }

  const selectByState = (state) => {
    const ids = filtered.filter(p => p.state === state).map(p => p.id)
    setSelectedIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })
  }

  // ── Queue jobs ─────────────────────────────────────────────────────────────
  const handleQueue = async () => {
    if (!selectedTemplate) { setError('Please select a template first.'); return }
    if (selectedIds.size === 0) { setError('Please select at least one property.'); return }
    setQueueing(true)
    setError(null)
    try {
      const selectedProps = properties.filter(p => selectedIds.has(p.id))
      const rows = selectedProps.map(p => ({
        property_id: p.id,
        template_id: selectedTemplate.id,
        case_number: p.case_number,
        status: 'queued',
        progress: 0,
      }))
      const { error } = await supabase.from('video_jobs').insert(rows)
      if (error) throw error
      setSelectedIds(new Set())
      setShowJobs(true)
      await loadJobs()
    } catch (e) {
      setError(e.message)
    }
    setQueueing(false)
  }

  const jobsByStatus = {
    queued: jobs.filter(j => j.status === 'queued').length,
    processing: jobs.filter(j => j.status === 'processing').length,
    done: jobs.filter(j => j.status === 'done').length,
    error: jobs.filter(j => j.status === 'error').length,
  }

  const getImageUrl = (p) => {
    if (p.main_image) return p.main_image
    if (p.image_url) return p.image_url
    if (p.case_number) return `https://lpqjndfjbenolhneqzec.supabase.co/storage/v1/object/public/property-images/${p.case_number.replace('-', '_')}.jpg`
    return null
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Bulk Video Generator
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Select a template, pick properties, and queue AI video generation.
          </p>
        </div>
        <Button onClick={loadAll} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><XCircle className="w-4 h-4" /></button>
        </div>
      )}

      {/* Template selector */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <Film className="w-4 h-4" /> Step 1 — Choose a Video Template
        </div>
        <div className="flex flex-wrap gap-2">
          {templates.map(tmpl => (
            <button key={tmpl.id} onClick={() => setSelectedTemplate(tmpl)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${selectedTemplate?.id === tmpl.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'}`}>
              <div className="flex gap-1">
                {['color_primary', 'color_accent'].map(k => (
                  <div key={k} className="w-3 h-3 rounded-full border border-white/50" style={{ background: tmpl[k] }} />
                ))}
              </div>
              {tmpl.name}
              {tmpl.is_default && <span className="text-xs opacity-70">(default)</span>}
              <span className="text-xs opacity-60">{tmpl.video_format === 'reels' ? '9:16' : '16:9'}</span>
            </button>
          ))}
          {templates.length === 0 && (
            <div className="text-sm text-blue-600">No templates yet — create one in the Template Builder tab first.</div>
          )}
        </div>
      </div>

      {/* Property selection */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-blue-600" />
            Step 2 — Select Properties
            {selectedIds.size > 0 && (
              <Badge className="bg-blue-600 text-white">{selectedIds.size} selected</Badge>
            )}
          </div>
          <div className="flex-1 flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search address, city, case #..." className="pl-8 h-8 text-sm w-52" />
            </div>
            <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm h-8">
              <option value="ALL">All States</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm h-8">
              <option value="ALL">All Statuses</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* Quick state selectors */}
          {states.slice(0, 6).map(s => (
            <button key={s} onClick={() => selectByState(s)}
              className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-100 text-gray-600">
              +{s}
            </button>
          ))}
        </div>

        {/* Table header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
          <div className="col-span-1 flex items-center">
            <button onClick={toggleAll} className="p-0.5 rounded hover:bg-gray-200">
              {selectedIds.size === filtered.length && filtered.length > 0
                ? <CheckSquare className="w-4 h-4 text-blue-600" />
                : <Square className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
          <div className="col-span-1">Photo</div>
          <div className="col-span-4">Address</div>
          <div className="col-span-2">Price</div>
          <div className="col-span-2">Beds/Baths</div>
          <div className="col-span-2">Status</div>
        </div>

        {/* Property rows */}
        <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
          {loading ? (
            <div className="py-12 text-center text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading properties...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400">No properties match the current filters.</div>
          ) : (
            filtered.map(p => {
              const isSelected = selectedIds.has(p.id)
              const imgUrl = getImageUrl(p)
              return (
                <div key={p.id} onClick={() => toggleSelect(p.id)}
                  className={`grid grid-cols-12 gap-2 px-4 py-2.5 cursor-pointer transition-colors items-center ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <div className="col-span-1">
                    {isSelected
                      ? <CheckSquare className="w-4 h-4 text-blue-600" />
                      : <Square className="w-4 h-4 text-gray-300" />}
                  </div>
                  <div className="col-span-1">
                    <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                      {imgUrl
                        ? <img src={imgUrl} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display = 'none'} />
                        : <Film className="w-5 h-5 text-gray-300 m-auto mt-2.5" />}
                    </div>
                  </div>
                  <div className="col-span-4 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{p.address}</div>
                    <div className="text-xs text-gray-500">{p.city}, {p.state} · {p.county}</div>
                    <div className="text-xs text-gray-400">{p.case_number}</div>
                  </div>
                  <div className="col-span-2 text-sm font-bold text-green-700">
                    ${p.price?.toLocaleString()}
                  </div>
                  <div className="col-span-2 text-sm text-gray-600">
                    {p.beds} / {p.baths}
                  </div>
                  <div className="col-span-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === 'BIDS OPEN' ? 'bg-green-100 text-green-700' : p.status === 'NEW LISTING' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer action bar */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
          <div className="text-sm text-gray-500">
            {filtered.length} properties shown · {selectedIds.size} selected
          </div>
          <Button onClick={handleQueue} disabled={queueing || selectedIds.size === 0 || !selectedTemplate}
            className="bg-blue-600 hover:bg-blue-700">
            {queueing
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Queuing...</>
              : <><Play className="w-4 h-4 mr-2" /> Queue {selectedIds.size > 0 ? selectedIds.size : ''} Video{selectedIds.size !== 1 ? 's' : ''}</>}
          </Button>
        </div>
      </div>

      {/* Worker Instructions Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Terminal className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-amber-800 mb-1">Step 3 — Run the Local Worker to Process Videos</div>
            <p className="text-xs text-amber-700 mb-2">
              Videos are queued above but require the local Python worker to generate and upload them.
              Run this command on your machine (in the <code className="bg-amber-100 px-1 rounded">hud-pipeline/</code> folder):
            </p>
            <div className="bg-amber-900 text-amber-100 text-xs rounded-lg px-3 py-2 font-mono">
              python3 scripts/4_video_worker.py --watch
            </div>
            <p className="text-xs text-amber-600 mt-2">
              <Info className="w-3 h-3 inline mr-1" />
              First-time setup: add <code className="bg-amber-100 px-1 rounded">SUPABASE_SERVICE_KEY=...</code> to <code className="bg-amber-100 px-1 rounded">hud-pipeline/.env</code>.
              Get the key from: Supabase Dashboard → Project Settings → API → service_role.
            </p>
          </div>
        </div>
      </div>

      {/* Job Queue */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => setShowJobs(!showJobs)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Film className="w-4 h-4 text-blue-600" /> Generation Queue
            </span>
            <div className="flex gap-2">
              {jobsByStatus.processing > 0 && <Badge className="bg-blue-100 text-blue-700">{jobsByStatus.processing} processing</Badge>}
              {jobsByStatus.queued > 0 && <Badge className="bg-gray-100 text-gray-700">{jobsByStatus.queued} queued</Badge>}
              {jobsByStatus.done > 0 && <Badge className="bg-green-100 text-green-700">{jobsByStatus.done} done</Badge>}
              {jobsByStatus.error > 0 && <Badge className="bg-red-100 text-red-700">{jobsByStatus.error} error</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {jobsByStatus.queued > 0 && (
              <button
                onClick={e => { e.stopPropagation(); clearQueue() }}
                title="Remove all queued jobs"
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors font-medium"
              >
                <Trash2 className="w-3 h-3" /> Clear Queue
              </button>
            )}
            {showJobs ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </button>
        {showJobs && (
          <div className="p-4 pt-0 space-y-2 max-h-80 overflow-y-auto">
            {jobs.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">
                No jobs yet. Select properties above and click "Queue Videos" to start.
              </div>
            ) : (
              jobs.map(job => (
                <JobRow key={job.id} job={job} property={job.properties} onDelete={deleteJob} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
