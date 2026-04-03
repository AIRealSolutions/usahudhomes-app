import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Download, Youtube, Sparkles, RefreshCw, Film, CheckCircle2,
  XCircle, Clock, Loader2, ExternalLink, Trash2, AlertCircle,
  Search, Filter, Eye
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'

const STATUS_CONFIG = {
  queued:     { label: 'Queued',     color: 'bg-gray-100 text-gray-700',   icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700',   icon: Loader2 },
  done:       { label: 'Ready',      color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  error:      { label: 'Error',      color: 'bg-red-100 text-red-700',     icon: XCircle },
}

function VideoCard({ job, onDelete, onGenerateMeta, onUploadYouTube }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued
  const Icon = cfg.icon
  const prop = job.properties

  const formatBytes = (bytes) => {
    if (!bytes) return '—'
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDuration = (sec) => {
    if (!sec) return '—'
    return `${Math.floor(sec)}s`
  }

  return (
    <Card className={`overflow-hidden transition-shadow hover:shadow-md ${job.status === 'done' ? 'border-green-200' : job.status === 'error' ? 'border-red-200' : ''}`}>
      <CardContent className="p-0">
        {/* Thumbnail / status area */}
        <div className="relative bg-gray-900 h-36 flex items-center justify-center overflow-hidden">
          {job.thumbnail_url ? (
            <img src={job.thumbnail_url} alt="" className="w-full h-full object-cover opacity-80" />
          ) : (
            <Film className="w-10 h-10 text-gray-600" />
          )}
          {/* Status badge */}
          <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
            <Icon className={`w-3 h-3 ${job.status === 'processing' ? 'animate-spin' : ''}`} />
            {cfg.label}
          </div>
          {/* YouTube badge */}
          {job.uploaded_to_youtube && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">
              <Youtube className="w-3 h-3" /> Uploaded
            </div>
          )}
          {/* Progress bar for processing */}
          {job.status === 'processing' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${job.progress || 0}%` }} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 space-y-2">
          <div>
            <div className="text-sm font-semibold text-gray-800 truncate">
              {prop?.city || '—'}, {prop?.state || '—'}
            </div>
            <div className="text-xs text-gray-500">{job.case_number}</div>
          </div>

          {/* Stats row */}
          <div className="flex gap-3 text-xs text-gray-500">
            <span>{formatDuration(job.duration_sec)}</span>
            <span>{formatBytes(job.file_size_bytes)}</span>
            <span>{new Date(job.created_at).toLocaleDateString()}</span>
          </div>

          {/* Error message */}
          {job.status === 'error' && job.error_message && (
            <div className="text-xs text-red-600 bg-red-50 rounded p-2 flex items-start gap-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              {job.error_message}
            </div>
          )}

          {/* YouTube metadata preview */}
          {job.youtube_title && (
            <div className="bg-gray-50 rounded p-2 text-xs">
              <div className="font-medium text-gray-700 truncate">{job.youtube_title}</div>
              {expanded && job.youtube_description && (
                <div className="text-gray-500 mt-1 whitespace-pre-line line-clamp-4">{job.youtube_description}</div>
              )}
              <button onClick={() => setExpanded(!expanded)} className="text-blue-600 mt-1 hover:underline">
                {expanded ? 'Show less' : 'Show description'}
              </button>
            </div>
          )}

          {/* YouTube link */}
          {job.youtube_url && (
            <a href={job.youtube_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-red-600 hover:underline">
              <Youtube className="w-3 h-3" /> View on YouTube <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {/* Actions */}
          {job.status === 'done' && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {job.s3_url && (
                <a href={job.s3_url} target="_blank" rel="noopener noreferrer" download>
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    <Download className="w-3 h-3 mr-1" /> Download
                  </Button>
                </a>
              )}
              {!job.youtube_title && (
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => onGenerateMeta(job)}>
                  <Sparkles className="w-3 h-3 mr-1" /> AI Metadata
                </Button>
              )}
              {job.youtube_title && !job.uploaded_to_youtube && (
                <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => onUploadYouTube(job)}>
                  <Youtube className="w-3 h-3 mr-1" /> Upload to YouTube
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:text-red-700"
                onClick={() => onDelete(job)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function VideoLibrary() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [generatingMeta, setGeneratingMeta] = useState(null)
  const [uploadingYT, setUploadingYT] = useState(null)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState(null)

  useEffect(() => { loadJobs() }, [])

  const loadJobs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('video_jobs')
      .select('*, properties(city, state, address, price, county, beds, baths, status, bids_open, listing_period)')
      .order('created_at', { ascending: false })
    setJobs(data || [])
    setLoading(false)
  }

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const handleDelete = async (job) => {
    if (!window.confirm(`Delete video job for ${job.case_number}?`)) return
    await supabase.from('video_jobs').delete().eq('id', job.id)
    setJobs(prev => prev.filter(j => j.id !== job.id))
    notify('Job deleted.')
  }

  const handleGenerateMeta = async (job) => {
    setGeneratingMeta(job.id)
    setError(null)
    try {
      const prop = job.properties
      // Call the Supabase edge function (or fallback to client-side placeholder)
      const { data, error } = await supabase.functions.invoke('generate-video-metadata', {
        body: {
          job_id: job.id,
          city: prop?.city,
          state: prop?.state,
          county: prop?.county,
          price: prop?.price,
          beds: prop?.beds,
          baths: prop?.baths,
          status: prop?.status,
          bids_open: prop?.bids_open,
          listing_period: prop?.listing_period,
          case_number: job.case_number,
        }
      })
      if (error) throw error
      // Update local state
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, youtube_title: data.title, youtube_description: data.description } : j))
      notify('AI metadata generated!')
    } catch (e) {
      // Fallback: generate a basic title/description locally
      const prop = job.properties
      const title = `HUD Home ${prop?.city || ''}, ${prop?.state || ''} — $${prop?.price?.toLocaleString() || ''} | ${prop?.beds || ''}bd/${prop?.baths || ''}ba | USAHUDhomes.com`
      const description = `HUD Home for sale in ${prop?.county || ''} County, ${prop?.state || ''}.\n\nListing Price: $${prop?.price?.toLocaleString() || ''}\nBedrooms: ${prop?.beds || '—'} | Bathrooms: ${prop?.baths || '—'}\nStatus: ${prop?.status || '—'}\nBids Open: ${prop?.bids_open || '—'}\n\n✅ $100 Down FHA Loan available\n✅ HUD pays up to 3% closing costs\n✅ 203k repair escrow up to $35,000\n\nVisit USAHUDhomes.com to search all HUD homes.\nCall Lightkeeper Realty: 910.363.6147\n\n#HUDhomes #${prop?.state || ''}RealEstate #FHAloan #HUDhome #AffordableHousing #USAHUDhomes`

      await supabase.from('video_jobs').update({ youtube_title: title, youtube_description: description }).eq('id', job.id)
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, youtube_title: title, youtube_description: description } : j))
      notify('AI metadata generated (local fallback)!')
    }
    setGeneratingMeta(null)
  }

  const handleUploadYouTube = async (job) => {
    setUploadingYT(job.id)
    setError(null)
    try {
      const { data, error } = await supabase.functions.invoke('upload-to-youtube', {
        body: { job_id: job.id }
      })
      if (error) throw error
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, uploaded_to_youtube: true, youtube_url: data.youtube_url, youtube_video_id: data.video_id } : j))
      notify('Video uploaded to YouTube!')
    } catch (e) {
      setError(`YouTube upload failed: ${e.message}. Ensure YouTube API credentials are configured in Supabase secrets.`)
    }
    setUploadingYT(null)
  }

  // Filtering
  const filtered = jobs.filter(j => {
    const matchSearch = !search || [j.case_number, j.properties?.city, j.properties?.state].some(
      f => f?.toLowerCase().includes(search.toLowerCase())
    )
    const matchStatus = statusFilter === 'ALL' || j.status === statusFilter
    return matchSearch && matchStatus
  })

  const counts = {
    total: jobs.length,
    done: jobs.filter(j => j.status === 'done').length,
    processing: jobs.filter(j => j.status === 'processing').length,
    queued: jobs.filter(j => j.status === 'queued').length,
    uploaded: jobs.filter(j => j.uploaded_to_youtube).length,
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Film className="w-5 h-5 text-purple-600" />
            Video Library
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Download videos, generate AI metadata, and upload to YouTube.
          </p>
        </div>
        <Button onClick={loadJobs} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Jobs', value: counts.total, color: 'text-gray-700' },
          { label: 'Ready', value: counts.done, color: 'text-green-600' },
          { label: 'Processing', value: counts.processing, color: 'text-blue-600' },
          { label: 'Queued', value: counts.queued, color: 'text-gray-500' },
          { label: 'On YouTube', value: counts.uploaded, color: 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <div className={`text-2xl font-black ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`text-sm rounded-lg p-3 flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {notification.msg}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><XCircle className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search city, state, case #..." className="pl-8 h-8 text-sm w-52" />
        </div>
        <div className="flex gap-1">
          {['ALL', 'done', 'processing', 'queued', 'error'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s === 'ALL' ? 'All' : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading videos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <Film className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <div className="text-sm">No videos found. Use the Bulk Generator tab to create some.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(job => (
            <VideoCard
              key={job.id}
              job={{ ...job, ...(generatingMeta === job.id ? { status: 'processing' } : {}), ...(uploadingYT === job.id ? { status: 'processing' } : {}) }}
              onDelete={handleDelete}
              onGenerateMeta={handleGenerateMeta}
              onUploadYouTube={handleUploadYouTube}
            />
          ))}
        </div>
      )}
    </div>
  )
}
