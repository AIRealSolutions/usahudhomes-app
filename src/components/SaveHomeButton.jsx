/**
 * Heart button that saves a home to the buyer's profile.
 * Visitors without an account are sent to sign up and brought back to the home.
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useSavedHomes } from '../contexts/SavedHomesContext'

export default function SaveHomeButton({ property, variant = 'icon', className = '' }) {
  const { savedIds, toggleSaved, signedIn } = useSavedHomes()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const saved = savedIds.has(property?.id)

  const onClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!signedIn) {
      navigate(`/login?signup=1&next=${encodeURIComponent(`/property/${property.case_number}`)}`)
      return
    }
    setBusy(true)
    await toggleSaved(property)
    setBusy(false)
  }

  const label = saved ? 'Saved' : 'Save home'
  if (variant === 'button') {
    return (
      <button onClick={onClick} disabled={busy} aria-pressed={saved}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm border transition-colors disabled:opacity-60 ${
          saved ? 'bg-rose-50 border-rose-300 text-rose-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        } ${className}`}>
        <Heart className={`h-4 w-4 ${saved ? 'fill-rose-500 text-rose-500' : ''}`} />
        {label}
      </button>
    )
  }
  return (
    <button onClick={onClick} disabled={busy} aria-pressed={saved} aria-label={label} title={label}
      className={`h-9 w-9 flex items-center justify-center rounded-full bg-white/90 shadow hover:bg-white disabled:opacity-60 ${className}`}>
      <Heart className={`h-5 w-5 ${saved ? 'fill-rose-500 text-rose-500' : 'text-gray-600'}`} />
    </button>
  )
}
