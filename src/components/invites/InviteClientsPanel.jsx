/**
 * InviteClientsPanel — admins and brokers email buyers an invitation to join.
 * One person at a time, or a pasted / uploaded list for bulk invites, plus the
 * history of who was invited, opened the link and joined.
 *
 * mode="broker": people who join are assigned to this broker.
 * mode="admin":  people who join go to the admin Leads list first, then get assigned.
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Send, Upload, UserPlus, Users, RefreshCw, CheckCircle, AlertCircle, Mail, Search, Eye,
} from 'lucide-react'
import { US_STATES } from '../../services/buyerProfile'
import {
  sendInvites, resendInvites, listInvites, parseInviteList, RESULT_LABELS,
} from '../../services/clientInvites'

const STATUS_STYLES = {
  sent:         { label: 'Sent',         className: 'bg-blue-100 text-blue-800' },
  opened:       { label: 'Opened',       className: 'bg-amber-100 text-amber-800' },
  registered:   { label: 'Joined',       className: 'bg-green-100 text-green-800' },
  failed:       { label: 'Failed',       className: 'bg-red-100 text-red-800' },
  unsubscribed: { label: 'Opted out',    className: 'bg-gray-200 text-gray-700' },
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—')
const EMPTY_PERSON = { firstName: '', lastName: '', email: '', phone: '', state: '' }
const OK_STATUSES = ['sent', 'resent']

function ResultSummary({ results }) {
  if (!results?.length) return null
  const counts = results.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {})
  const problems = results.filter(r => !OK_STATUSES.includes(r.status))
  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
      <div className="flex flex-wrap gap-2">
        {Object.entries(counts).map(([status, n]) => (
          <span key={status} className={`rounded-full px-2.5 py-0.5 font-medium ${OK_STATUSES.includes(status) ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
            {RESULT_LABELS[status] || status}: {n}
          </span>
        ))}
      </div>
      {problems.length > 0 && (
        <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-gray-700">
          {problems.map((r, i) => (
            <li key={`${r.email}-${i}`}>
              <span className="font-medium">{r.email || '(blank)'}</span> — {RESULT_LABELS[r.status] || r.status}{r.error ? `: ${r.error}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EmailPreview({ mode, note }) {
  const pitch = mode === 'broker'
    ? 'I use USAHUDhomes.com with my buyers. It is a tool built to give HUD home buyers an advantage when making offers, and I would like you to have it too.'
    : 'USAHUDhomes.com is a tool I am building to give HUD home buyers an advantage when making offers, and I would like you to be one of the first to use it.'
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
      <p className="font-semibold text-gray-900">Subject: [Your name] invited you to USAHUDhomes.com</p>
      <p className="mt-3">Hi [first name],</p>
      <p className="mt-2">{pitch}</p>
      {note && <blockquote className="mt-2 whitespace-pre-wrap border-l-4 border-blue-700 bg-gray-50 px-3 py-2">{note}</blockquote>}
      <ul className="mt-2 list-disc pl-5">
        <li>See what HUD actually accepted on homes like the one you want, before you bid</li>
        <li>A deal meter and step-by-step offer builder, so your offer is priced to win</li>
        <li>A calendar of HUD bid deadlines and expected price cuts</li>
        <li>Full property addresses, saved homes, and alerts for new listings</li>
      </ul>
      <p className="mt-3"><span className="inline-block rounded bg-blue-700 px-3 py-1.5 font-semibold text-white">Create my free account</span></p>
      <p className="mt-2 text-gray-500">The button opens a page with their name and email filled in. They choose a password and are signed in right away.</p>
    </div>
  )
}

export default function InviteClientsPanel({ mode = 'broker' }) {
  const isAdmin = mode === 'admin'
  const [tab, setTab] = useState('one')
  const [person, setPerson] = useState(EMPTY_PERSON)
  const [listText, setListText] = useState('')
  const [note, setNote] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState(null)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const [invites, setInvites] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(() => new Set())

  const parsed = useMemo(() => parseInviteList(listText), [listText])

  const loadHistory = useCallback(async () => {
    setLoadingList(true)
    const r = await listInvites()
    setInvites(r.data)
    setListError(r.success ? null : r.error)
    setLoadingList(false)
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const runSend = async (rows) => {
    setSending(true)
    setError(null)
    setResults(null)
    setProgress({ done: 0, total: rows.length })
    try {
      const out = await sendInvites(rows, { note: note.trim() || undefined, onProgress: setProgress })
      setResults(out)
      return out
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setSending(false)
      setProgress(null)
      loadHistory()
    }
  }

  const sendOne = async (e) => {
    e.preventDefault()
    const out = await runSend([{ ...person, email: person.email.trim() }])
    if (out?.every(r => OK_STATUSES.includes(r.status))) setPerson(EMPTY_PERSON)
  }

  const sendList = async () => {
    if (!parsed.length) return
    if (parsed.length > 25 && !window.confirm(`Send ${parsed.length} invitation emails now?`)) return
    const out = await runSend(parsed)
    if (out) setListText('')
  }

  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setListText(String(reader.result || ''))
    reader.readAsText(file)
    e.target.value = ''
  }

  const resend = async (ids) => {
    if (!ids.length) return
    setSending(true)
    setError(null)
    const out = await resendInvites(ids)
    setResults(out)
    setSelected(new Set())
    setSending(false)
    loadHistory()
  }

  const stats = useMemo(() => {
    const total = invites.length
    const opened = invites.filter(i => i.opened_at || i.status === 'registered').length
    const joined = invites.filter(i => i.status === 'registered').length
    return { total, opened, joined, rate: total ? Math.round((joined / total) * 100) : 0 }
  }, [invites])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return invites.filter(i =>
      (statusFilter === 'all' || i.status === statusFilter) &&
      (!q || [i.email, i.first_name, i.last_name, i.phone].some(v => String(v || '').toLowerCase().includes(q)))
    )
  }, [invites, statusFilter, query])

  const resendable = (i) => !['registered', 'unsubscribed'].includes(i.status)
  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <UserPlus className="h-5 w-5 text-blue-700" /> Invite buyers to USAHUDhomes.com
        </h2>
        <p className="mt-1 text-sm text-gray-700">
          Each person gets a personal link to a free account with the offer tools.{' '}
          {isAdmin
            ? 'People who join show up in Leads first, then are assigned to a broker (automatically if lead routing covers their state).'
            : 'Anyone who joins from your invitation goes straight into your Active Leads.'}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex gap-2 border-b border-gray-200">
          {[{ id: 'one', label: 'Invite one person', icon: UserPlus }, { id: 'list', label: 'Invite a list', icon: Users }].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${tab === t.id ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'one' ? (
          <form onSubmit={sendOne} className="grid gap-3 sm:grid-cols-2">
            <input className={input} placeholder="First name" value={person.firstName} onChange={e => setPerson({ ...person, firstName: e.target.value })} />
            <input className={input} placeholder="Last name" value={person.lastName} onChange={e => setPerson({ ...person, lastName: e.target.value })} />
            <input className={input} type="email" required placeholder="Email address *" value={person.email} onChange={e => setPerson({ ...person, email: e.target.value })} />
            <input className={input} type="tel" placeholder="Phone (optional)" value={person.phone} onChange={e => setPerson({ ...person, phone: e.target.value })} />
            <select className={input} value={person.state} onChange={e => setPerson({ ...person, state: e.target.value })}>
              <option value="">State (optional)</option>
              {Object.entries(US_STATES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
            <button type="submit" disabled={sending || !person.email.trim()} className="flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
              {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send invitation
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Paste one person per line (for example <code className="rounded bg-gray-100 px-1">Jane Doe, jane@email.com, 910-555-1234, NC</code>),
              or upload a CSV exported from your phone, CRM or spreadsheet with columns like Email, First Name, Last Name, Phone, State.
            </p>
            <textarea
              className={`${input} h-40 font-mono`}
              placeholder={'Jane Doe, jane@email.com, 910-555-1234, NC\nJohn Smith <john@email.com>'}
              value={listText}
              onChange={e => setListText(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Upload className="h-4 w-4" /> Upload CSV
                <input type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={onFile} />
              </label>
              <span className="text-sm text-gray-600">{parsed.length} {parsed.length === 1 ? 'person' : 'people'} found</span>
              <button type="button" onClick={sendList} disabled={sending || !parsed.length} className="ml-auto flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
                {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send {parsed.length || ''} invitation{parsed.length === 1 ? '' : 's'}
              </button>
            </div>
            {parsed.length > 0 && (
              <div className="max-h-56 overflow-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500">
                    <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Phone</th><th className="px-3 py-2">State</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsed.slice(0, 200).map((r, i) => (
                      <tr key={`${r.email}-${i}`}>
                        <td className="px-3 py-1.5">{`${r.firstName} ${r.lastName}`.trim() || '—'}</td>
                        <td className="px-3 py-1.5">{r.email}</td>
                        <td className="px-3 py-1.5">{r.phone || '—'}</td>
                        <td className="px-3 py-1.5">{r.state || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.length > 200 && <p className="px-3 py-2 text-xs text-gray-500">…and {parsed.length - 200} more</p>}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-gray-700" htmlFor="invite-note">Personal note (optional, added to every email)</label>
          <textarea
            id="invite-note"
            className={`${input} h-20`}
            maxLength={600}
            placeholder="Great talking with you today! Here's the HUD tool I mentioned."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <button type="button" onClick={() => setShowPreview(v => !v)} className="flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline">
            <Eye className="h-4 w-4" /> {showPreview ? 'Hide' : 'Preview'} the email
          </button>
          {showPreview && <EmailPreview mode={mode} note={note.trim()} />}
        </div>

        {progress && (
          <div className="mt-4">
            <div className="mb-1 text-sm text-gray-600">Sending {progress.done} of {progress.total}…</div>
            <div className="h-2 rounded-full bg-gray-200"><div className="h-2 rounded-full bg-blue-700 transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
          </div>
        )}
        {error && <p className="mt-4 flex items-center gap-2 text-sm text-red-700"><AlertCircle className="h-4 w-4" /> {error}</p>}
        <ResultSummary results={results} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Invited', value: stats.total },
            { label: 'Opened', value: stats.opened },
            { label: 'Joined', value: stats.joined },
            { label: 'Join rate', value: `${stats.rate}%` },
          ].map(s => (
            <div key={s.label} className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs font-medium uppercase text-gray-500">{s.label}</div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input className={`${input} pl-9`} placeholder="Search invitations" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {Object.entries(STATUS_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button type="button" onClick={() => resend([...selected])} disabled={sending || !selected.size} className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <Mail className="h-4 w-4" /> Resend selected{selected.size ? ` (${selected.size})` : ''}
          </button>
          <button type="button" onClick={loadHistory} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Refresh invitations">
            <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {listError && <p className="mb-3 text-sm text-red-700">Could not load invitations: {listError}</p>}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="w-8 px-3 py-2" />
                <th className="px-3 py-2">Person</th>
                <th className="px-3 py-2">Status</th>
                {isAdmin && <th className="px-3 py-2">Invited by</th>}
                <th className="px-3 py-2">Sent</th>
                <th className="px-3 py-2">Joined</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!loadingList && !visible.length && (
                <tr><td colSpan={isAdmin ? 7 : 6} className="px-3 py-8 text-center text-gray-500">No invitations yet.</td></tr>
              )}
              {visible.map(i => {
                const style = STATUS_STYLES[i.status] || STATUS_STYLES.sent
                const inviter = i.agent ? `${i.agent.first_name || ''} ${i.agent.last_name || ''}`.trim() : (i.invited_by_role === 'admin' ? 'Admin' : 'Broker')
                return (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      {resendable(i) && <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} aria-label={`Select ${i.email}`} />}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{`${i.first_name || ''} ${i.last_name || ''}`.trim() || i.email}</div>
                      <div className="text-xs text-gray-500">{i.email}{i.state ? ` · ${i.state}` : ''}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`} title={i.last_error || ''}>
                        {i.status === 'registered' && <CheckCircle className="h-3 w-3" />}{style.label}
                      </span>
                      {i.send_count > 1 && <span className="ml-1 text-xs text-gray-500">×{i.send_count}</span>}
                    </td>
                    {isAdmin && <td className="px-3 py-2 text-gray-700">{inviter}</td>}
                    <td className="px-3 py-2 text-gray-700">{fmtDate(i.sent_at)}</td>
                    <td className="px-3 py-2 text-gray-700">{fmtDate(i.registered_at)}</td>
                    <td className="px-3 py-2 text-right">
                      {resendable(i) && (
                        <button type="button" onClick={() => resend([i.id])} disabled={sending} className="text-sm font-medium text-blue-700 hover:underline disabled:opacity-50">Resend</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
