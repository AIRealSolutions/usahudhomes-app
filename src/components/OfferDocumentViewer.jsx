/**
 * Full-screen viewer for an offer's documents. PDFs are drawn page by page with pdf.js
 * (self-hosted under /vendor, loaded on first use) because iPhone Safari shows only the
 * first page of a PDF in a frame. Photos show as images. Download saves the original file.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, X, ZoomIn, ZoomOut } from 'lucide-react'
import { docTypeLabel, documentUrl, downloadDocument } from '../services/offerDocuments'

const PDFJS = '/vendor/pdfjs-3.11.174'
let pdfjsPromise = null
function loadPdfjs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib)
  if (!pdfjsPromise) {
    pdfjsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `${PDFJS}/pdf.min.js`
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS}/pdf.worker.min.js`
        resolve(window.pdfjsLib)
      }
      script.onerror = () => { pdfjsPromise = null; reject(new Error('The PDF viewer could not load. Use Download instead.')) }
      document.head.appendChild(script)
    })
  }
  return pdfjsPromise
}

const isPdf = d => d.mime_type === 'application/pdf' || /\.pdf$/i.test(d.file_name)

export default function OfferDocumentViewer({ docs, index, onIndex, onClose }) {
  const doc = docs[index]
  const [url, setUrl] = useState(null)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pages, setPages] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const pagesRef = useRef(null)
  const pdf = isPdf(doc)

  const go = useCallback(step => {
    const next = index + step
    if (next >= 0 && next < docs.length) onIndex(next)
  }, [index, docs.length, onIndex])

  // Esc closes, arrows move between documents; the page behind doesn't scroll
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow }
  }, [go, onClose])

  useEffect(() => {
    let active = true
    setUrl(null); setError(''); setPages(0); setZoom(1)
    documentUrl(doc).then(u => { if (active) setUrl(u) }, e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [doc])

  // Draw each PDF page to a canvas at the viewer's width (times zoom), sharp on retina screens
  useEffect(() => {
    if (!pdf || !url || !pagesRef.current) return
    let cancelled = false
    let task = null
    const box = pagesRef.current
    box.replaceChildren()
    ;(async () => {
      try {
        const lib = await loadPdfjs()
        task = lib.getDocument(url)
        const file = await task.promise
        if (cancelled) return
        setPages(file.numPages)
        const width = Math.min(box.clientWidth - 16, 900) * zoom
        const ratio = window.devicePixelRatio || 1
        for (let n = 1; n <= file.numPages && !cancelled; n++) {
          const page = await file.getPage(n)
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: (width / base.width) * ratio })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.width = `${viewport.width / ratio}px`
          canvas.className = 'mx-auto mb-3 bg-white shadow'
          canvas.setAttribute('aria-label', `Page ${n} of ${file.numPages}`)
          box.appendChild(canvas)
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'This PDF could not be shown. Use Download instead.')
      }
    })()
    return () => { cancelled = true; task?.destroy() }
  }, [pdf, url, zoom])

  const download = async () => {
    setDownloading(true)
    try { await downloadDocument(doc) } catch (e) { setError(e.message) } finally { setDownloading(false) }
  }

  const iconButton = 'inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-40'

  return (
    <div role="dialog" aria-modal="true" aria-label={`Viewing ${doc.file_name}`} className="fixed inset-0 z-50 flex flex-col bg-gray-900 text-white">
      {/* Name and close on top; controls on their own row so a phone has room for both */}
      <div className="flex items-start gap-2 px-3 pt-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{doc.file_name}</p>
          <p className="text-xs text-gray-300">{docTypeLabel(doc.doc_type)}{pages ? ` · ${pages} page${pages === 1 ? '' : 's'}` : ''}{docs.length > 1 ? ` · ${index + 1} of ${docs.length}` : ''}</p>
        </div>
        <button type="button" aria-label="Close viewer" onClick={onClose} className={iconButton}><X className="h-5 w-5" /></button>
      </div>
      <div className="flex items-center gap-1 border-b border-white/10 px-3 pb-2 pt-1">
        {docs.length > 1 && <>
          <button type="button" aria-label="Previous document" disabled={index === 0} onClick={() => go(-1)} className={iconButton}><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" aria-label="Next document" disabled={index === docs.length - 1} onClick={() => go(1)} className={iconButton}><ChevronRight className="h-5 w-5" /></button>
        </>}
        {pdf && <>
          <button type="button" aria-label="Zoom out" disabled={zoom <= 0.5} onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className={iconButton}><ZoomOut className="h-5 w-5" /></button>
          <button type="button" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom(z => Math.min(3, z + 0.25))} className={iconButton}><ZoomIn className="h-5 w-5" /></button>
        </>}
        <button type="button" onClick={download} disabled={downloading} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">
          <Download className="h-4 w-4" /> {downloading ? 'Preparing…' : 'Download'}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-2 sm:p-4">
        {doc.notes && <p className="mx-auto mb-3 max-w-3xl rounded-lg bg-white/10 px-3 py-2 text-sm">{doc.notes}</p>}
        {error ? (
          <div className="mx-auto mt-16 max-w-md text-center">
            <p>{error}</p>
            <button type="button" onClick={download} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-semibold">Download the file</button>
          </div>
        ) : !url ? (
          <p className="mt-16 text-center text-gray-300">Loading…</p>
        ) : pdf ? (
          <>
            {!pages && <p className="mt-16 text-center text-gray-300">Loading PDF…</p>}
            {/* Filled with canvases outside React */}
            <div ref={pagesRef} className="overflow-x-auto" />
          </>
        ) : (
          <img src={url} alt={doc.file_name} onError={() => setError("This photo format can't be previewed in your browser. Download it to open it.")}
            className="mx-auto max-h-full max-w-full object-contain" />
        )}
      </div>
    </div>
  )
}
