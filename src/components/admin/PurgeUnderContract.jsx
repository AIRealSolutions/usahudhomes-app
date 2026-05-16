/**
 * PurgeUnderContract — Admin tool to remove stale "UNDER CONTRACT" properties.
 *
 * Workflow:
 *  1. Admin chooses a threshold (default 60 days) and clicks "Preview"
 *  2. A dry-run shows exactly which properties will be removed
 *  3. Admin confirms and clicks "Purge N Properties"
 *  4. Hard-delete runs and a success summary is shown
 */

import React, { useState } from 'react'
import {
  Trash2, Search, AlertTriangle, CheckCircle, RefreshCw,
  Home, Calendar, DollarSign, MapPin, Info,
} from 'lucide-react'

const API = (body) =>
  fetch('/api/leads?action=purge-under-contract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json())

function fmt(n) {
  return n != null ? `$${Number(n).toLocaleString()}` : '—'
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function daysAgo(d) {
  if (!d) return '?'
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24))
}

export default function PurgeUnderContract() {
  const [days, setDays]           = useState(60)
  const [preview, setPreview]     = useState(null)   // dry-run result
  const [loading, setLoading]     = useState(false)
  const [confirm, setConfirm]     = useState(false)
  const [result, setResult]       = useState(null)   // final purge result
  const [error, setError]         = useState(null)

  const handlePreview = async () => {
    setLoading(true)
    setError(null)
    setPreview(null)
    setResult(null)
    setConfirm(false)
    try {
      const data = await API({ dry_run: true, days: Number(days) })
      if (!data.success) throw new Error(data.error || 'Preview failed')
      setPreview(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePurge = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await API({ dry_run: false, days: Number(days) })
      if (!data.success) throw new Error(data.error || 'Purge failed')
      setResult(data)
      setPreview(null)
      setConfirm(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Purge Stale Under Contract</h2>
          <p className="text-sm text-gray-500">
            Remove properties that have been marked <strong>UNDER CONTRACT</strong> for longer than the chosen threshold.
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-500" />
        <div>
          <p className="font-semibold mb-1">How this works</p>
          <p>
            When the HUD scraper runs, any property no longer listed on HUD is automatically marked
            <strong> UNDER CONTRACT</strong>. Properties that remain in that status beyond the threshold
            are considered sold/closed and can be safely removed from the database.
            Always run a <strong>Preview</strong> first to see exactly what will be deleted.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Days Threshold
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={365}
                value={days}
                onChange={e => { setDays(e.target.value); setPreview(null); setResult(null) }}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-500">days</span>
            </div>
          </div>

          {/* Preset buttons */}
          <div className="flex gap-2">
            {[30, 60, 90].map(d => (
              <button
                key={d}
                onClick={() => { setDays(d); setPreview(null); setResult(null) }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  Number(days) === d
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-red-400 hover:text-red-600'
                }`}
              >
                {d} days
              </button>
            ))}
          </div>

          <button
            onClick={handlePreview}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-gray-800 text-white text-sm font-semibold rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
          >
            {loading && !confirm ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Preview
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Success result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <p className="font-semibold text-green-800">Purge Complete</p>
          </div>
          <p className="text-sm text-green-700">{result.message}</p>
          <p className="text-xs text-green-600 mt-1">
            Threshold: {result.days_threshold} days · Cutoff date: {fmtDate(result.cutoff_date)}
          </p>
        </div>
      )}

      {/* Dry-run preview */}
      {preview && !result && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className={`rounded-xl border p-4 flex flex-wrap items-center justify-between gap-4 ${
            preview.count === 0
              ? 'bg-green-50 border-green-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div>
              {preview.count === 0 ? (
                <p className="font-semibold text-green-800">
                  ✓ No properties qualify — nothing to purge.
                </p>
              ) : (
                <>
                  <p className="font-semibold text-amber-800">
                    {preview.count} {preview.count === 1 ? 'property' : 'properties'} will be permanently removed
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    UNDER CONTRACT for more than {preview.days_threshold} days
                    (last updated before {fmtDate(preview.cutoff_date)})
                  </p>
                </>
              )}
            </div>

            {preview.count > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirm(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                {!confirm ? (
                  <button
                    onClick={() => setConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Purge {preview.count} {preview.count === 1 ? 'Property' : 'Properties'}
                  </button>
                ) : (
                  <button
                    onClick={handlePurge}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white text-sm font-bold rounded-lg hover:bg-red-800 disabled:opacity-50 transition-colors animate-pulse"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    Confirm — Delete {preview.count} Forever
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Property list */}
          {preview.count > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Properties to be removed ({preview.count})
                </p>
              </div>
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {preview.properties.map(p => (
                  <div key={p.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Home className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {p.address || 'Unknown address'}
                        </span>
                        <span className="text-xs text-gray-400">#{p.case_number}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />
                          {[p.city, p.state].filter(Boolean).join(', ') || '—'}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <DollarSign className="w-3 h-3" />
                          {fmt(p.price)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <Calendar className="w-3 h-3" />
                          Under contract {daysAgo(p.updated_at)} days ago
                        </span>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium flex-shrink-0">
                      Will delete
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
