/**
 * Bar shown to brokers while they're working for a client (see ActiveClientContext):
 * every save and share goes to that client until they exit.
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { UserCheck, X } from 'lucide-react'
import { useActiveClient } from '../contexts/ActiveClientContext'

export default function ClientModeBanner() {
  const { client, clientName, clientFirstName, stop } = useActiveClient()
  if (!client) return null
  return (
    <div className="bg-indigo-600 text-white text-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 min-w-0">
          <UserCheck className="h-4 w-4 shrink-0" />
          <span className="truncate">Working for <strong>{clientName}</strong>: homes you save or share go to {clientFirstName}.</span>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Link to={`/lead/${client.id}`} className="px-3 py-1 rounded-md bg-white/15 hover:bg-white/25 font-medium">Back to {clientFirstName}'s lead</Link>
          <button onClick={stop} className="flex items-center gap-1 px-3 py-1 rounded-md hover:bg-white/15 font-medium">
            <X className="h-4 w-4" /> Exit
          </button>
        </div>
      </div>
    </div>
  )
}
