/**
 * ActivityFeed — market news for dashboards: new listings, homes opened to investors, price drops,
 * price cuts coming due (25+ days at the same price),
 * homes back on market and accepted offers, newest first, grouped by day.
 * Used on the admin Control Panel, broker Overview and buyer dashboard.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, TrendingDown, RotateCcw, Gavel, RefreshCw, Newspaper, Briefcase, Timer } from 'lucide-react'
import { fetchActivityFeed, fetchActivityCounts, FEED_TYPES, dayKey } from '../../services/marketActivity'
import RemindersPanel from './RemindersPanel'

const TYPE_STYLE = {
  new_listing:    { icon: Sparkles,     chip: 'bg-blue-50 text-blue-700',     dot: 'bg-blue-600' },
  investor_eligible: { icon: Briefcase, chip: 'bg-violet-50 text-violet-700', dot: 'bg-violet-600' },
  price_drop:     { icon: TrendingDown, chip: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  price_cut_due:  { icon: Timer,        chip: 'bg-amber-50 text-amber-800',   dot: 'bg-amber-500' },
  back_on_market: { icon: RotateCcw,    chip: 'bg-teal-50 text-teal-700',     dot: 'bg-teal-600' },
  offer_accepted: { icon: Gavel,        chip: 'bg-gray-100 text-gray-700',    dot: 'bg-gray-500' },
}

function dayLabel(key) {
  const today = dayKey(new Date())
  const yesterday = dayKey(new Date(Date.now() - 86400000))
  if (key === today) return 'Today'
  if (key === yesterday) return 'Yesterday'
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function ActivityFeed({
  title = 'Market News',
  subtitle,
  states,
  caseNumbers,
  days = 7,
  limit = 60,
  highlightCases,
  maxHeight = 'max-h-[560px]',
  reminders, // optional useReminders() object: shows the Reminders panel on top
}) {
  const [items, setItems] = useState([])
  const [counts, setCounts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')

  const statesKey = (states || []).join(',')
  const casesKey = caseNumbers ? caseNumbers.join(',') : null

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const scope = { states: statesKey ? statesKey.split(',') : undefined, days }
      const [feed, c] = await Promise.all([
        fetchActivityFeed({ ...scope, caseNumbers: casesKey == null ? undefined : (casesKey ? casesKey.split(',') : []), limit }),
        casesKey == null ? fetchActivityCounts(scope) : Promise.resolve(null),
      ])
      setItems(feed)
      setCounts(c)
    } catch (e) {
      console.error('ActivityFeed load:', e)
      setError('Market news could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [statesKey, casesKey, days, limit])

  useEffect(() => { load() }, [load])

  const visible = filter === 'all' ? items : items.filter(i => i.type === filter)
  const groups = []
  for (const item of visible) {
    const key = dayKey(item.date)
    if (!groups.length || groups[groups.length - 1].key !== key) groups.push({ key, items: [] })
    groups[groups.length - 1].items.push(item)
  }
  const highlight = new Set(highlightCases || [])

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Newspaper className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500 line-clamp-2">{subtitle || `Last ${days} days${statesKey ? ` · ${statesKey.replace(/,/g, ', ')}` : ' · all states'}`}</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} title="Refresh"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {reminders && <RemindersPanel reminders={reminders} />}

      {/* Summary counts double as filters */}
      <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')}
          className={`text-xs px-2.5 py-1 rounded-full font-medium ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          All
        </button>
        {Object.entries(FEED_TYPES).map(([type, { label }]) => {
          const n = counts ? counts[type] : items.filter(i => i.type === type).length
          if (n === null) return null // accepted offers need a signed-in viewer
          return (
            <button key={type} onClick={() => setFilter(filter === type ? 'all' : type)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${
                filter === type ? 'bg-gray-900 text-white' : `${TYPE_STYLE[type].chip} hover:brightness-95`}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${TYPE_STYLE[type].dot}`} />
              {label} <span className="tabular-nums opacity-80">{n.toLocaleString()}</span>
            </button>
          )
        })}
      </div>

      <div className={`${maxHeight} overflow-y-auto`}>
        {loading && !items.length ? (
          <div className="flex items-center justify-center py-12"><RefreshCw className="w-6 h-6 text-blue-600 animate-spin" /></div>
        ) : error ? (
          <p className="px-5 py-10 text-center text-sm text-red-600">{error}</p>
        ) : groups.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">No market activity in this window.</p>
        ) : groups.map(g => (
          <div key={g.key}>
            <p className="sticky top-0 bg-gray-50/95 backdrop-blur px-5 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-y border-gray-100">
              {dayLabel(g.key)}
            </p>
            <ul className="divide-y divide-gray-50">
              {g.items.map(item => {
                const { icon: Icon, chip } = TYPE_STYLE[item.type]
                return (
                  <li key={item.id}>
                    <Link to={`/property/${item.caseNumber}`}
                      className={`flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors ${highlight.has(item.caseNumber) ? 'bg-yellow-50/60' : ''}`}>
                      <span className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${chip}`}><Icon className="w-3.5 h-3.5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{item.title}</span>
                          {item.state && <span className="text-[11px] text-gray-400 flex-shrink-0">{item.state}</span>}
                          {highlight.has(item.caseNumber) && <span className="text-[11px] font-semibold text-yellow-700 flex-shrink-0">Saved</span>}
                        </span>
                        <span className="block text-xs text-gray-500 line-clamp-2">
                          <span className="font-medium text-gray-600">{FEED_TYPES[item.type].label}</span> · {item.detail}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
