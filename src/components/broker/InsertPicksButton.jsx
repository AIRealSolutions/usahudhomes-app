/**
 * "Insert picked homes" for the email and SMS composers: lists the homes the
 * broker picked for this client in Find Properties and inserts the chosen ones
 * as message text. The composer marks them sent once the message goes out.
 */

import React, { useEffect, useState } from 'react'
import { listPicks, picksMessage } from '../../services/propertyPicks'
import { Star, CheckSquare, Square } from 'lucide-react'

export default function InsertPicksButton({ consultationId, sms = false, onInsert }) {
  const [picks, setPicks] = useState(null)
  const [open, setOpen] = useState(false)
  const [chosen, setChosen] = useState(() => new Set())

  useEffect(() => {
    if (!consultationId) return
    let cancelled = false
    listPicks(consultationId)
      .then(data => {
        if (cancelled) return
        setPicks(data)
        // Default to the homes not sent yet (or all of them if every one was sent)
        const unsent = data.filter(p => p.status !== 'sent')
        setChosen(new Set((unsent.length ? unsent : data).map(p => p.id)))
      })
      .catch(err => console.error('Could not load picked homes:', err))
    return () => { cancelled = true }
  }, [consultationId])

  if (!picks?.length) return null

  const toggle = (id) => setChosen(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const insert = () => {
    const selected = picks.filter(p => chosen.has(p.id))
    if (!selected.length) return
    onInsert(picksMessage(selected, { sms }), selected.map(p => p.id))
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
      >
        <Star className="w-3.5 h-3.5" /> Insert picked homes ({picks.length})
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-80 max-w-[85vw] bg-white border border-gray-200 rounded-xl shadow-xl p-3 space-y-2">
          <ul className="max-h-56 overflow-y-auto divide-y divide-gray-100">
            {picks.map(p => {
              const prop = p.property || {}
              return (
                <li key={p.id}>
                  <button type="button" onClick={() => toggle(p.id)} className="w-full flex items-start gap-2 py-2 text-left">
                    {chosen.has(p.id) ? <CheckSquare className="w-4 h-4 mt-0.5 text-indigo-600 shrink-0" /> : <Square className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />}
                    <span className="min-w-0 text-sm">
                      <span className="block font-medium text-gray-900 truncate">{prop.address || `Case #${p.case_number}`}</span>
                      <span className="block text-xs text-gray-500">
                        {[prop.city, prop.price && `$${Number(prop.price).toLocaleString()}`, p.status === 'sent' ? 'already sent' : null].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="text-[11px] text-gray-500">Links go to each listing; the street address stays behind the client's login.</p>
          <button
            type="button"
            onClick={insert}
            disabled={!chosen.size}
            className="w-full px-3 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            Insert {chosen.size} {chosen.size === 1 ? 'home' : 'homes'}
          </button>
        </div>
      )}
    </div>
  )
}
