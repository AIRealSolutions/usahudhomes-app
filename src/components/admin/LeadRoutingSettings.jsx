/**
 * Lead routing settings (admin). Every website lead lands in Leads; when routing
 * is on, leads from the chosen states are also assigned to the chosen agent so
 * they show up in that agent's Broker Portal → Active Leads.
 * The server applies these settings (api/notifications.js → routeLeadToBroker).
 */

import React, { useEffect, useState } from 'react'
import { supabase } from '../../config/supabase'
import { US_STATES } from '../../utils/states'
import { GitBranch, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'

export default function LeadRoutingSettings() {
  const [settings, setSettings] = useState(null)
  const [agents, setAgents] = useState([])
  const [draft, setDraft] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null) // 'saved' | error message
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('lead_routing_settings').select('enabled, states, agent_id, updated_at').eq('id', 1).maybeSingle(),
      supabase.from('agents').select('id, first_name, last_name, is_active').eq('is_active', true).order('first_name'),
    ]).then(([s, a]) => {
      if (s.error) return setLoadError(s.error.message)
      const row = s.data || { enabled: false, states: [], agent_id: null }
      setSettings(row)
      setDraft(row)
      setAgents(a.data || [])
    })
  }, [])

  if (loadError) {
    return <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm text-red-600">Lead routing settings could not be loaded: {loadError}</div>
  }
  if (!draft) return null

  const agentName = (id) => {
    const a = agents.find(x => x.id === id)
    return a ? `${a.first_name || ''} ${a.last_name || ''}`.trim() : 'no one'
  }
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings)
  const toggleState = (code) => setDraft(d => ({
    ...d,
    states: d.states.includes(code) ? d.states.filter(s => s !== code) : [...d.states, code].sort(),
  }))

  // keepDraft: the switch saves on its own without discarding unsaved state/agent edits
  const save = async (next = draft, { keepDraft = false } = {}) => {
    setSaving(true)
    setStatus(null)
    const { data: { user } } = await supabase.auth.getUser()
    const row = { id: 1, enabled: next.enabled, states: next.states, agent_id: next.agent_id, updated_at: new Date().toISOString(), updated_by: user?.id || null }
    const { error } = await supabase.from('lead_routing_settings').upsert(row)
    setSaving(false)
    if (error) return setStatus(error.message)
    setSettings(next)
    setDraft(d => (keepDraft ? { ...d, enabled: next.enabled } : next))
    setStatus('saved')
    setTimeout(() => setStatus(s => (s === 'saved' ? null : s)), 2500)
  }

  // The on/off switch saves right away; state and agent changes use the Save button
  const toggleEnabled = () => {
    const next = { ...settings, enabled: !draft.enabled }
    setDraft(d => ({ ...d, enabled: next.enabled }))
    save(next, { keepDraft: true })
  }

  const summary = !draft.enabled
    ? 'Off. New leads only appear here until you assign them.'
    : !draft.agent_id || draft.states.length === 0
      ? 'On, but no states or agent chosen, so nothing is routed.'
      : `On. New leads from ${draft.states.join(', ')} also go to ${agentName(draft.agent_id)}'s Active Leads. They still appear here.`

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <GitBranch className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Auto-route leads by state</p>
            <p className="text-xs text-gray-600">{summary}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {status === 'saved' && <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-4 h-4" /> Saved</span>}
          {status && status !== 'saved' && <span className="text-xs text-red-600">{status}</span>}
          <button
            type="button"
            role="switch"
            aria-checked={draft.enabled}
            aria-label="Auto-route leads by state"
            onClick={toggleEnabled}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${draft.enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${draft.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <button
            type="button"
            onClick={() => setEditing(e => !e)}
            className="flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline"
          >
            Choose states {editing ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          <div>
            <label htmlFor="routing-agent" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Send matching leads to</label>
            <select
              id="routing-agent"
              value={draft.agent_id || ''}
              onChange={e => setDraft(d => ({ ...d, agent_id: e.target.value || null }))}
              className="w-full sm:w-72 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Choose an agent…</option>
              {agents.map(a => <option key={a.id} value={a.id}>{`${a.first_name || ''} ${a.last_name || ''}`.trim()}</option>)}
            </select>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              States ({draft.states.length} selected)
            </p>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(3rem, 1fr))' }}>
              {US_STATES.map(s => {
                const on = draft.states.includes(s.code)
                return (
                  <button
                    key={s.code}
                    type="button"
                    title={s.name}
                    aria-pressed={on}
                    onClick={() => toggleState(s.code)}
                    className={`px-1.5 py-1 text-xs font-semibold rounded border transition-colors ${on ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                  >
                    {s.code}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => save()}
              disabled={!dirty || saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save routing'}
            </button>
            {dirty && (
              <button type="button" onClick={() => setDraft(settings)} className="text-sm text-gray-600 hover:underline">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
