/**
 * Alert Sign-ups — people who created a HUD home alert at /alerts.
 * A daily job emails each active subscriber new listings matching their
 * state, areas, budget and bedrooms (api/notifications?action=send-alerts).
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, RefreshCw, Send, Pause, Play, ExternalLink } from 'lucide-react'
import { supabase } from '../../config/supabase'
import { postNotification } from '../../services/leadMessaging'

const money = (v) => (v ? `$${Number(v).toLocaleString()}` : null)
const when = (ts) => (ts ? new Date(ts).toLocaleDateString() : '—')

export default function AlertSignupsTab() {
  const navigate = useNavigate()
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('property_alert_subscriptions')
      .select('*, property_alert_sends(count)')
      .order('created_at', { ascending: false })
    if (error) setError(`Could not load alert sign-ups: ${error.message}`)
    else setSubs(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const sendNow = async (sub) => {
    setBusy(sub.id)
    setNotice(null)
    setError(null)
    const result = await postNotification('send-alerts', { subscriptionId: sub.id })
    if (!result.success) setError(`Send failed: ${result.error || 'Unknown error'}`)
    else if (result.errors?.length) setError(`Send failed: ${result.errors[0].error}`)
    else setNotice(result.emailed
      ? `Emailed ${sub.email} ${result.homes} matching home${result.homes === 1 ? '' : 's'}.`
      : `No new matching homes for ${sub.email} right now — nothing was sent.`)
    setBusy(null)
    load()
  }

  const toggleActive = async (sub) => {
    setBusy(sub.id)
    const { error } = await supabase
      .from('property_alert_subscriptions')
      .update({ is_active: !sub.is_active, unsubscribed_at: sub.is_active ? new Date().toISOString() : null })
      .eq('id', sub.id)
    if (error) setError(`Update failed: ${error.message}`)
    setBusy(null)
    load()
  }

  const active = subs.filter(s => s.is_active).length

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900">
          Every morning each active subscriber is emailed up to 10 new HUD listings matching their alert
          (state, cities/counties, budget, bedrooms). A home is never sent to the same person twice, and every
          email has an unsubscribe link. Each sign-up is also a lead in New Leads.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">{subs.length} sign-up{subs.length === 1 ? '' : 's'} · {active} active</p>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-green-700">{notice}</p>}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && subs.length === 0 ? (
          <div className="flex items-center justify-center h-32"><RefreshCw className="w-6 h-6 text-blue-600 animate-spin" /></div>
        ) : subs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Bell className="w-10 h-10 mb-2" />
            <p className="text-sm">No alert sign-ups yet. They come from the Create a Free Alert page (/alerts).</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Subscriber', 'Looking for', 'Status', 'Signed up', 'Last emailed', 'Homes sent', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subs.map(sub => {
                  const budget = sub.budget_min || sub.budget_max
                    ? `${money(sub.budget_min) || 'Any'} – ${money(sub.budget_max) || 'Any'}` : 'Any price'
                  return (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">{sub.first_name || '—'}</p>
                        <p className="text-xs text-gray-500">{sub.email}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        <p><span className="font-semibold">{sub.state}</span>{sub.areas?.length ? `: ${sub.areas.join(', ')}` : ' (whole state)'}</p>
                        <p className="text-gray-500">{budget}{sub.bedrooms_min ? ` · ${sub.bedrooms_min}+ bed` : ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${sub.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {sub.is_active ? 'Active' : sub.unsubscribed_at ? 'Unsubscribed' : 'Paused'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{when(sub.created_at)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{when(sub.last_sent_at)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{sub.property_alert_sends?.[0]?.count ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {sub.is_active && (
                            <button onClick={() => sendNow(sub)} disabled={busy === sub.id}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                              <Send className="w-3 h-3" /> {busy === sub.id ? 'Sending…' : 'Send now'}
                            </button>
                          )}
                          <button onClick={() => toggleActive(sub)} disabled={busy === sub.id}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                            {sub.is_active ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Resume</>}
                          </button>
                          {sub.lead_id && (
                            <button onClick={() => navigate(`/admin/leads/${sub.lead_id}`)} title="Open lead"
                              className="p-1 text-gray-400 hover:text-blue-600">
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
