/**
 * Share a property: native share sheet on phones, plus Facebook, X, LinkedIn,
 * WhatsApp, text, email, copy link and a downloadable card image.
 * Shared text and the preview image never include the street address —
 * the address stays behind the login.
 */

import React, { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Share2, Link as LinkIcon, Mail, MessageSquare, Download, Check, X, UserCheck } from 'lucide-react'
import { useActiveClient } from '../contexts/ActiveClientContext'
import { markPicks } from '../services/propertyPicks'

const EmailComposer = lazy(() => import('./broker/EmailComposer'))
const SMSComposer = lazy(() => import('./broker/SMSComposer'))

const SITE = 'https://www.usahudhomes.com'

export function propertyShareText(property) {
  const place = [property.city, property.state].filter(Boolean).join(', ')
  const facts = [
    property.price ? `$${Number(property.price).toLocaleString()}` : null,
    property.beds != null ? `${property.beds} bd` : null,
    property.baths != null ? `${property.baths} ba` : null,
    property.sq_ft ? `${Number(property.sq_ft).toLocaleString()} sq ft` : null,
  ].filter(Boolean).join(' · ')
  const status = String(property.status || '').toUpperCase() === 'UNDER CONTRACT' ? ' (under contract)' : ''
  return `HUD home in ${place}${status}: ${facts}`
}

export default function ShareProperty({ property, className = '' }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [composer, setComposer] = useState(null) // 'email' | 'sms' while sending to the active client
  const ref = useRef(null)
  const { client, clientFirstName, ensurePick } = useActiveClient()

  const url = `${SITE}/property/${property.case_number}`
  const text = propertyShareText(property)
  const imageUrl = `/api/og-image?caseNumber=${encodeURIComponent(property.case_number)}`
  const e = encodeURIComponent

  useEffect(() => {
    if (!open) return
    const onDoc = (ev) => { if (ref.current && !ref.current.contains(ev.target)) setOpen(false) }
    const onKey = (ev) => { if (ev.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const nativeShare = async () => {
    try {
      await navigator.share({ title: 'HUD Home | USAHUDhomes.com', text, url })
      setOpen(false)
    } catch { /* cancelled */ }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Copy this link:', url)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const targets = [
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`, color: 'bg-[#1877F2]', letter: 'f' },
    { label: 'X', href: `https://twitter.com/intent/tweet?url=${e(url)}&text=${e(text)}`, color: 'bg-black', letter: '𝕏' },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`, color: 'bg-[#0A66C2]', letter: 'in' },
    { label: 'WhatsApp', href: `https://wa.me/?text=${e(`${text} ${url}`)}`, color: 'bg-[#25D366]', letter: 'W' },
  ]

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm border bg-white border-gray-300 text-gray-700 hover:bg-gray-50">
        <Share2 className="h-4 w-4" /> Share
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-900">Share this home</p>
            <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 rounded hover:bg-gray-100"><X className="h-4 w-4" /></button>
          </div>

          {/* Working for a client: send it to them (and add it to their picks) */}
          {client && (
            <div className="mb-4 rounded-lg bg-indigo-50 border border-indigo-200 p-3">
              <p className="text-sm font-semibold text-indigo-900 flex items-center gap-1.5 mb-2"><UserCheck className="h-4 w-4" /> Send to {clientFirstName}</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setComposer('email'); setOpen(false) }} disabled={!client.email}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40">
                  <Mail className="h-4 w-4" /> Email
                </button>
                <button onClick={() => { setComposer('sms'); setOpen(false) }} disabled={!client.phone}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40">
                  <MessageSquare className="h-4 w-4" /> Text
                </button>
              </div>
              <p className="text-[11px] text-indigo-800 mt-2">Sending also adds this home to {clientFirstName}'s picks.</p>
            </div>
          )}

          {/* What people will see in the post */}
          <img src={imageUrl} alt="Share preview" loading="lazy" className="w-full aspect-[1200/630] object-cover rounded-lg border bg-gray-100 mb-3" />
          <p className="text-xs text-gray-500 mb-3">{text}. The street address is only shown to signed-in buyers.</p>

          {typeof navigator !== 'undefined' && navigator.share && (
            <button onClick={nativeShare} className="w-full mb-3 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
              <Share2 className="h-4 w-4" /> Share…
            </button>
          )}

          <div className="grid grid-cols-4 gap-2 mb-3">
            {targets.map(t => (
              <a key={t.label} href={t.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
                className="flex flex-col items-center gap-1 text-xs text-gray-700 hover:text-blue-600">
                <span className={`h-10 w-10 rounded-full ${t.color} text-white font-bold flex items-center justify-center`}>{t.letter}</span>
                {t.label}
              </a>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a href={`sms:?&body=${e(`${text} ${url}`)}`} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
              <MessageSquare className="h-4 w-4" /> Text
            </a>
            <a href={`mailto:?subject=${e('HUD home you might like')}&body=${e(`${text}\n\n${url}`)}`} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
              <Mail className="h-4 w-4" /> Email
            </a>
            <button onClick={copy} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <LinkIcon className="h-4 w-4" />} {copied ? 'Copied' : 'Copy link'}
            </button>
            <a href={imageUrl} download={`hud-home-${property.case_number}.jpg`} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
              title="For Instagram or anywhere you post a picture">
              <Download className="h-4 w-4" /> Image
            </a>
          </div>
        </div>
      )}

      {composer && client && (
        <Suspense fallback={null}>
          {composer === 'email' ? (
            <EmailComposer
              consultation={client}
              customer={client}
              property={property}
              initialSubject={`A HUD home in ${property.city || 'your area'} for you`}
              initialBody={`Hi ${client.first_name || 'there'},\n\nHere's a HUD home I think you'll like:\n${text}\n${url}\n\nSign in (or create a free account) on that page to see the full address and your estimated payment. Want to go see it?`}
              onSend={async () => {
                setComposer(null)
                const pickId = await ensurePick(property).catch(() => null)
                if (pickId) markPicks([pickId], 'sent').catch(() => {})
              }}
              onCancel={() => setComposer(null)}
            />
          ) : (
            <SMSComposer
              consultation={client}
              customer={client}
              property={property}
              initialMessage={`Hi ${client.first_name || 'there'}, here's a HUD home I think you'll like: ${text} ${url}`}
              onSend={async () => {
                setComposer(null)
                const pickId = await ensurePick(property).catch(() => null)
                if (pickId) markPicks([pickId], 'sent').catch(() => {})
              }}
              onCancel={() => setComposer(null)}
            />
          )}
        </Suspense>
      )}
    </div>
  )
}
