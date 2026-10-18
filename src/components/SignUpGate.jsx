/**
 * Sign-up gate for members-only tools and statistics.
 * Shows what the visitor gets with a free account, with links that bring them
 * back to this page after signing up or signing in.
 */

import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Lock, CheckCircle } from 'lucide-react'

export default function SignUpGate({ icon = Lock, title, description, benefits = [], cta = 'Create a free account', className = '' }) {
  const Icon = icon
  const { pathname, search } = useLocation()
  const next = encodeURIComponent(pathname + search)

  return (
    <section className={`relative overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {title}
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-700 px-2 py-0.5 text-xs font-semibold text-white">
              <Lock className="h-3 w-3" aria-hidden="true" /> Members
            </span>
          </h2>
          {description && <p className="mt-2 text-gray-700">{description}</p>}
        </div>
      </div>

      {benefits.length > 0 && (
        <ul className="mt-4 space-y-2">
          {benefits.map(b => (
            <li key={b} className="flex items-start gap-2 text-sm text-gray-700">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          to={`/login?signup=1&next=${next}`}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
        >
          <Lock className="h-4 w-4" aria-hidden="true" /> {cta}
        </Link>
        <p className="text-sm text-gray-600">
          Free, takes a minute. Already a member?{' '}
          <Link to={`/login?next=${next}`} className="font-medium text-blue-700 hover:underline">Sign in</Link>
        </p>
      </div>
    </section>
  )
}
