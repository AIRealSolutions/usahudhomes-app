import React from 'react'
import { DEAL_STATUS } from '../services/offerDocuments'

const day = d => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '')

/** "Under contract · Oct 30, 2026" pill; nothing when the offer has no HUD outcome yet. */
export default function DealStatusBadge({ offer, withDate = false, className = '' }) {
  const s = DEAL_STATUS[offer?.deal_status]
  if (!s) return null
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.tone} ${className}`}>
      {s.label}{withDate && offer.deal_status_date ? ` · ${day(offer.deal_status_date)}` : ''}
    </span>
  )
}
