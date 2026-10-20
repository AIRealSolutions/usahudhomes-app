/**
 * Personal reminders (public.reminders) for the dashboard feed and calendar.
 * Row-level security limits every query to the signed-in user's own rows.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { dayKey } from './marketActivity'

/** 'yyyy-mm-dd' → local Date (new Date('yyyy-mm-dd') would be UTC midnight, a day early in the US) */
export const dateFromKey = (key) => {
  const [y, m, d] = String(key).split('-').map(Number)
  return new Date(y, m - 1, d)
}

const addDays = (key, n) => {
  const d = dateFromKey(key)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}

export async function listOpenReminders() {
  const { data, error } = await supabase
    .from('reminders')
    .select('id, title, notes, due_date, case_number, consultation_id, created_at')
    .is('completed_at', null)
    .order('due_date')
    .order('created_at')
  if (error) throw error
  return data || []
}

export async function addReminder({ title, notes, dueDate, caseNumber, consultationId }) {
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      title: title.trim(),
      notes: notes?.trim() || null,
      due_date: dueDate || dayKey(new Date()),
      case_number: caseNumber || null,
      consultation_id: consultationId || null,
    })
    .select('id, title, notes, due_date, case_number, consultation_id, created_at')
    .single()
  if (error) throw error
  return data
}

const update = async (id, fields) => {
  const { error } = await supabase.from('reminders').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export const completeReminder = (id) => update(id, { completed_at: new Date().toISOString() })

/** Move to the day after today, or one day later if it's already in the future */
export const nextDueDate = (dueDate) => {
  const today = dayKey(new Date())
  return addDays(dueDate > today ? dueDate : today, 1)
}

export const pushReminder = (id, dueDate) => update(id, { due_date: nextDueDate(dueDate) })

export async function deleteReminder(id) {
  const { error } = await supabase.from('reminders').delete().eq('id', id)
  if (error) throw error
}

/**
 * Reminders state for a dashboard: open reminders plus actions that update the list
 * optimistically. Shared by the Market News feed and the calendar on the same page.
 */
export function useReminders() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await listOpenReminders())
    } catch (e) {
      console.error('Reminders load:', e)
      setError('Reminders could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  const run = useCallback(async (optimistic, action) => {
    const before = items
    setItems(optimistic(items))
    try {
      await action()
    } catch (e) {
      console.error('Reminder update:', e)
      setItems(before)
      setError('That change could not be saved. Please try again.')
    }
  }, [items])

  const sortByDue = (list) => [...list].sort((a, b) => a.due_date.localeCompare(b.due_date) || a.created_at.localeCompare(b.created_at))

  return {
    items,
    loading,
    error,
    reload,
    add: async (fields) => {
      setError(null)
      try {
        const row = await addReminder(fields)
        setItems(list => sortByDue([...list, row]))
        return true
      } catch (e) {
        console.error('Reminder add:', e)
        setError('The reminder could not be saved. Please try again.')
        return false
      }
    },
    complete: (id) => run(list => list.filter(r => r.id !== id), () => completeReminder(id)),
    push: (r) => run(list => sortByDue(list.map(x => x.id === r.id ? { ...x, due_date: nextDueDate(r.due_date) } : x)), () => pushReminder(r.id, r.due_date)),
    remove: (id) => run(list => list.filter(r => r.id !== id), () => deleteReminder(id)),
  }
}

/** Reminders as calendar tasks for BidCalendar's extraEvents */
export const remindersAsEvents = (items) =>
  items.map(r => ({ date: dateFromKey(r.due_date), label: `Reminder: ${r.title}`, detail: r.notes || undefined }))
