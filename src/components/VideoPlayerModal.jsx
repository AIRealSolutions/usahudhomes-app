import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Download, Home as HomeIcon } from 'lucide-react'

// Supabase public storage URLs accept ?download=<name>, which makes the server
// send the file as an attachment, so the browser saves it instead of playing it.
export function videoDownloadUrl(url, caseNumber) {
  if (!url) return url
  const name = `HUD-Home-${(caseNumber || 'video').replace(/[^\w-]/g, '_')}.mp4`
  if (!url.includes('/storage/v1/object/')) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}download=${encodeURIComponent(name)}`
}

// A small pop-up player for a listing video, with Download and View Listing buttons.
export default function VideoPlayerModal({ url, caseNumber, title, showListingLink = true, listingNewTab = false, canDownload = true, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
          <div className="text-sm font-semibold text-white truncate pr-2">{title || `Case #${caseNumber}`}</div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1" aria-label="Close video">
            <X className="w-5 h-5" />
          </button>
        </div>
        <video
          src={url}
          controls
          autoPlay
          playsInline
          className="w-full max-h-[70vh] bg-black"
        />
        <div className="flex flex-wrap gap-2 p-3">
          {canDownload && (
            <a
              href={videoDownloadUrl(url, caseNumber)}
              download
              className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-3 py-2 rounded-lg"
            >
              <Download className="w-4 h-4" /> Download
            </a>
          )}
          {showListingLink && caseNumber && (
            <Link
              to={`/property/${caseNumber}`}
              {...(listingNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : { onClick: onClose })}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-lg"
            >
              <HomeIcon className="w-4 h-4" /> View Listing
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
