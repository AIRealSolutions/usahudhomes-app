/**
 * RemindersPanel — personal to-dos at the top of the Market News feed.
 * Due and overdue reminders stay on top until marked Done or pushed to Tomorrow.
 * Takes the object from useReminders() so the calendar on the page stays in sync.
 */

import React, { useState } from 'react'
import { Bell, Check, ChevronDown, ChevronUp, CalendarClock, Plus, X } from 'lucide-react'
import { dayKey } from '../../services/marketActivity'
import { dateFromKey } from '../../services/reminders'

const shortDate = (key) => dateFromKey(key).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

function ReminderRow({ r, today, reminders }) {
  const overdue = r.due_date < today
  return (
    <li className="flex items-start gap-3 px-5 py-2.5">
      <button onClick={() => reminders.complete(r.id)} title="Mark done"
        className="mt-0.5 w-5 h-5 rounded-md border-2 border-gray-300 hover:border-green-600 hover:bg-green-50 flex items-center justify-center flex-shrink-0 group">
        <Check className="w-3 h-3 text-green-600 opacity-0 group-hover:opacity-100" />
      </button>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-gray-900 break-words">{r.title}</span>
        <span className="block text-xs text-gray-500">
          {overdue
            ? <span className="font-semibold text-red-600">Overdue · was due {shortDate(r.due_date)}</span>
            : r.due_date === today ? 'Due today' : `Due ${shortDate(r.due_date)}`}
          {r.notes ? <> · {r.notes}</> : null}
        </span>
      </span>
      <span className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => reminders.push(r)} title="Push to the next day"
          className="text-xs font-medium px-2 py-1 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center gap-1">
          <CalendarClock className="w-3.5 h-3.5" /> Tomorrow
        </button>
        <button onClick={() => { if (window.confirm(`Delete reminder "${r.title}"?`)) reminders.remove(r.id) }} title="Delete"
          className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
          <X className="w-3.5 h-3.5" />
        </button>
      </span>
    </li>
  )
}

export default function RemindersPanel({ reminders }) {
  const today = dayKey(new Date())
  const [adding, setAdding] = useState(false)
  const [showUpcoming, setShowUpcoming] = useState(false)
  const [form, setForm] = useState({ title: '', dueDate: today, notes: '' })
  const [saving, setSaving] = useState(false)

  const due = reminders.items.filter(r => r.due_date <= today)
  const upcoming = reminders.items.filter(r => r.due_date > today)
  const overdue = due.filter(r => r.due_date < today).length

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    const ok = await reminders.add(form)
    setSaving(false)
    if (ok) {
      setForm({ title: '', dueDate: today, notes: '' })
      setAdding(false)
    }
  }

  return (
    <div className="border-b border-gray-100">
      <div className="px-5 py-2.5 flex items-center justify-between gap-2 bg-amber-50/60">
        <p className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
          <Bell className="w-3.5 h-3.5 text-amber-600" />
          Reminders
          <span className="normal-case tracking-normal font-medium text-gray-500">
            {due.length ? `${due.length} due${overdue ? ` · ${overdue} overdue` : ''}` : 'nothing due'}
          </span>
        </p>
        <button onClick={() => setAdding(a => !a)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {adding && (
        <form onSubmit={submit} className="px-5 py-3 space-y-2 bg-white border-b border-gray-100">
          <input autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="What do you need to do?" maxLength={200}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500" />
          <div className="flex flex-wrap gap-2">
            <input type="date" value={form.dueDate} min={today} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value || today }))}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500" />
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Note (optional)" maxLength={300}
              className="flex-1 min-w-[8rem] text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="text-xs font-medium px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button>
            <button type="submit" disabled={saving || !form.title.trim()}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Add reminder'}
            </button>
          </div>
        </form>
      )}

      {reminders.error && <p className="px-5 py-2 text-xs text-red-600">{reminders.error}</p>}

      {reminders.loading && !reminders.items.length ? (
        <p className="px-5 py-3 text-xs text-gray-400">Loading reminders…</p>
      ) : (
        <>
          {due.length > 0 && (
            <ul className="divide-y divide-gray-50">
              {due.map(r => <ReminderRow key={r.id} r={r} today={today} reminders={reminders} />)}
            </ul>
          )}
          {upcoming.length > 0 && (
            <>
              <button onClick={() => setShowUpcoming(s => !s)}
                className="w-full px-5 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 flex items-center gap-1">
                {showUpcoming ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {upcoming.length} upcoming
              </button>
              {showUpcoming && (
                <ul className="divide-y divide-gray-50">
                  {upcoming.map(r => <ReminderRow key={r.id} r={r} today={today} reminders={reminders} />)}
                </ul>
              )}
            </>
          )}
          {!due.length && !upcoming.length && !adding && (
            <p className="px-5 py-3 text-xs text-gray-400">No reminders. Use Add to note a follow-up, call or deadline.</p>
          )}
        </>
      )}
    </div>
  )
}
