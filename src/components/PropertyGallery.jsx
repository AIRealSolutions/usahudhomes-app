/**
 * Photo gallery for one property. The photo list loads from HUD only when the
 * gallery opens; photos are downloaded only when someone asks (all, selected, or one).
 */

import React, { useCallback, useEffect, useState } from 'react'
import { fetchGallery, downloadPhoto, downloadPhotosZip, photoFileStem } from '../services/propertyGallery'
import { X, Download, ChevronLeft, ChevronRight, CheckSquare, Square, Loader, RefreshCw, Images } from 'lucide-react'

export default function PropertyGallery({ property, title, canDownload = false, startIndex = null, onClose }) {
  const [photos, setPhotos] = useState(null)
  const [error, setError] = useState(null)
  const [viewing, setViewing] = useState(startIndex) // index in photos, or null for the grid
  const [selected, setSelected] = useState(() => new Set())
  const [progress, setProgress] = useState(null) // { done, total }
  const [note, setNote] = useState(null)

  const load = useCallback(async (refresh = false) => {
    setPhotos(null)
    setError(null)
    try {
      setPhotos(await fetchGallery(property.case_number, { refresh }))
    } catch (e) {
      setError(e.message)
      setPhotos(property.main_image ? [property.main_image] : [])
    }
  }, [property.case_number, property.main_image])

  useEffect(() => { load() }, [load])

  // Arrow keys and Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') (viewing !== null ? setViewing(null) : onClose())
      if (viewing === null || !photos?.length) return
      if (e.key === 'ArrowRight') setViewing(v => (v + 1) % photos.length)
      if (e.key === 'ArrowLeft') setViewing(v => (v - 1 + photos.length) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewing, photos, onClose])

  const stem = photoFileStem(property)
  const busy = progress !== null

  const toggle = (i) => setSelected(prev => {
    const next = new Set(prev)
    next.has(i) ? next.delete(i) : next.add(i)
    return next
  })

  const downloadZip = async (indexes) => {
    const urls = indexes.map(i => photos[i])
    setNote(null)
    setProgress({ done: 0, total: urls.length })
    try {
      const { saved, failed } = await downloadPhotosZip(urls, stem, (done, total) => setProgress({ done, total }))
      setNote(`Saved ${saved} ${saved === 1 ? 'photo' : 'photos'} to ${stem}-photos.zip${failed ? ` (${failed} could not be downloaded)` : ''}.`)
    } catch (e) {
      setNote(e.message)
    } finally {
      setProgress(null)
    }
  }

  const downloadOne = async (i) => {
    setNote(null)
    try {
      await downloadPhoto(photos[i], `${stem}-${String(i + 1).padStart(2, '0')}`)
    } catch (e) {
      setNote(e.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Property photos">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Images className="w-5 h-5 text-blue-600" /> Photos</h2>
            <p className="text-xs text-gray-500 truncate">{title || `Case #${property.case_number}`}{photos ? ` · ${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}` : ''}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canDownload && photos?.length > 0 && (
              <>
                {selected.size > 0 && (
                  <button
                    onClick={() => downloadZip([...selected].sort((a, b) => a - b))}
                    disabled={busy}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" /> Download selected ({selected.size})
                  </button>
                )}
                <button
                  onClick={() => downloadZip(photos.map((_, i) => i))}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {busy ? `Downloading ${progress.done}/${progress.total}…` : `Download all (${photos.length})`}
                </button>
              </>
            )}
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {note && <p className="px-5 py-2 text-sm text-gray-700 bg-gray-50 border-b border-gray-100">{note}</p>}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {!photos ? (
            <p className="py-16 text-center text-gray-500 flex items-center justify-center gap-2"><Loader className="w-5 h-5 animate-spin" /> Getting this home's photos from HUD…</p>
          ) : photos.length === 0 ? (
            <p className="py-16 text-center text-gray-500">HUD hasn't posted photos for this home yet.</p>
          ) : (
            <>
              {error && <p className="mb-3 text-sm text-amber-700">Showing the main photo only: {error}</p>}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {photos.map((url, i) => (
                  <div key={url} className={`relative group rounded-lg overflow-hidden bg-gray-100 aspect-[4/3] ${selected.has(i) ? 'ring-2 ring-blue-500' : ''}`}>
                    <button type="button" onClick={() => setViewing(i)} className="block w-full h-full" aria-label={`View photo ${i + 1}`}>
                      <img src={url} alt={`Photo ${i + 1}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </button>
                    {canDownload && (
                      <button
                        type="button"
                        onClick={() => toggle(i)}
                        aria-label={selected.has(i) ? 'Deselect photo' : 'Select photo'}
                        className="absolute top-1.5 left-1.5 bg-white/90 rounded p-0.5 shadow"
                      >
                        {selected.has(i) ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-500" />}
                      </button>
                    )}
                    <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[11px] px-1.5 py-0.5 rounded">{i + 1}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-2.5 border-t border-gray-100 text-xs text-gray-500">
          <span>Photos come from HUD HomeStore and load only when you open the gallery.</span>
          {canDownload && (
            <button onClick={() => load(true)} disabled={!photos || busy} className="flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50">
              <RefreshCw className="w-3.5 h-3.5" /> Re-check HUD for new photos
            </button>
          )}
        </div>
      </div>

      {/* Full-size view */}
      {viewing !== null && photos?.[viewing] && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col" onClick={() => setViewing(null)}>
          <div className="flex items-center justify-between px-4 py-3 text-white" onClick={e => e.stopPropagation()}>
            <span className="text-sm">{viewing + 1} of {photos.length}</span>
            <div className="flex items-center gap-2">
              {canDownload && (
                <button onClick={() => downloadOne(viewing)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white/10 rounded-lg hover:bg-white/20">
                  <Download className="w-4 h-4" /> Download this photo
                </button>
              )}
              <button onClick={() => setViewing(null)} aria-label="Close photo" className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center relative px-12" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewing(v => (v - 1 + photos.length) % photos.length)} aria-label="Previous photo" className="absolute left-2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronLeft className="w-6 h-6" /></button>
            <img src={photos[viewing]} alt={`Photo ${viewing + 1}`} className="max-h-[80vh] max-w-full object-contain" />
            <button onClick={() => setViewing(v => (v + 1) % photos.length)} aria-label="Next photo" className="absolute right-2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronRight className="w-6 h-6" /></button>
          </div>
        </div>
      )}
    </div>
  )
}
