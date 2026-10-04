/**
 * Broker Leads — companies that have had a HUD home under contract (hud_broker_companies).
 * Warm prospects for broker partners: who is winning HUD bids, where, and how often,
 * with contact details and outreach status tracked here.
 * The list fills itself from the daily accepted-offer sync (database triggers).
 */

import React, { useEffect, useMemo, useState } from 'react'
import { Briefcase, Download, Search, X, Phone, Mail, Globe, ExternalLink, Save, CheckCircle } from 'lucide-react'
import { supabase } from '../../config/supabase'
import { formatMoney, formatDate, OUTCOME_LABELS } from '../../services/acceptedOffers'

const STATUSES = [
  { value: 'new',            label: 'New',            cls: 'bg-blue-100 text-blue-800' },
  { value: 'researching',    label: 'Researching',    cls: 'bg-sky-100 text-sky-800' },
  { value: 'contacted',      label: 'Contacted',      cls: 'bg-yellow-100 text-yellow-800' },
  { value: 'interested',     label: 'Interested',     cls: 'bg-orange-100 text-orange-800' },
  { value: 'partner',        label: 'Partner',        cls: 'bg-green-100 text-green-800' },
  { value: 'not_interested', label: 'Not interested', cls: 'bg-gray-100 text-gray-700' },
  { value: 'do_not_contact', label: 'Do not contact', cls: 'bg-red-100 text-red-800' },
]
const STATUS = Object.fromEntries(STATUSES.map(s => [s.value, s]))

const SORTS = {
  contracts: { label: 'Most contracts', col: 'total_contracts' },
  recent:    { label: 'Most recent',    col: 'last_contract_at' },
  volume:    { label: 'Most volume',    col: 'total_net_to_hud' },
  follow_up: { label: 'Follow-up date', col: 'next_follow_up', asc: true },
}

const EDIT_FIELDS = ['lead_status', 'contact_name', 'email', 'phone', 'website', 'office_city', 'office_state', 'next_follow_up', 'notes']

function StatusPill({ value }) {
  const s = STATUS[value] || STATUS.new
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${s.cls}`}>{s.label}</span>
}

export default function BrokerLeadsAdmin() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [state, setState] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('contracts')
  const [selected, setSelected] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const s = SORTS[sort]
    let q = supabase.from('hud_broker_companies').select('*')
      .order(s.col, { ascending: !!s.asc, nullsFirst: false })
      .order('last_contract_at', { ascending: false, nullsFirst: false })
      .limit(2000)
    if (state) q = q.contains('states', [state])
    if (status) q = q.eq('lead_status', status)
    const { data, error: err } = await q
    if (err) setError(err.message)
    else setCompanies(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [state, status, sort]) // eslint-disable-line react-hooks/exhaustive-deps

  const term = search.trim().toLowerCase()
  const shown = useMemo(() => !term ? companies : companies.filter(c =>
    [c.name, c.contact_name, c.email, c.office_city, ...(c.cities || [])].some(v => String(v || '').toLowerCase().includes(term))
  ), [companies, term])

  const allStates = useMemo(() => [...new Set(['NC', 'SC', ...companies.flatMap(c => c.states || [])])].sort(), [companies])
  const stats = {
    total: companies.length,
    repeat: companies.filter(c => c.total_contracts > 1).length,
    contacted: companies.filter(c => ['contacted', 'interested'].includes(c.lead_status)).length,
    partners: companies.filter(c => c.lead_status === 'partner').length,
  }

  const onSaved = (row) => {
    setCompanies(list => list.map(c => (c.id === row.id ? row : c)))
    setSelected(row)
  }

  const exportCsv = () => {
    const cols = ['name', 'total_contracts', 'owner_occupant_deals', 'investor_deals', 'total_net_to_hud', 'states', 'last_contract_at',
      'lead_status', 'contact_name', 'email', 'phone', 'website', 'office_city', 'office_state', 'next_follow_up', 'notes']
    const esc = v => `"${String(Array.isArray(v) ? v.join(' ') : v ?? '').replace(/"/g, '""')}"`
    const csv = [cols.join(','), ...shown.map(c => cols.map(k => esc(c[k])).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `hud-broker-leads${state ? `-${state}` : ''}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="h-6 w-6 text-indigo-600" /> Broker Leads</h2>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            Every company that has had a HUD home under contract, from HUD's published accepted bids. New companies are added
            automatically by the daily accepted-offer sync.
          </p>
        </div>
        <button onClick={exportCsv} disabled={!shown.length} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[['Companies', stats.total], ['Repeat HUD buyers’ brokers', stats.repeat], ['In conversation', stats.contacted], ['Partners', stats.partners]].map(([label, n]) => (
          <div key={label} className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-2xl font-bold">{n}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Company, contact, city"
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
        </div>
        <select value={state} onChange={e => setState(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All states</option>
          {allStates.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Contracts</th>
              <th className="px-4 py-3 font-medium">States</th>
              <th className="px-4 py-3 font-medium">Last contract</th>
              <th className="px-4 py-3 font-medium">Net to HUD</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Contact</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>
            ) : shown.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No companies match.</td></tr>
            ) : shown.map(c => (
              <tr key={c.id} onClick={() => setSelected(c)} className="border-t hover:bg-blue-50 cursor-pointer">
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900">{c.name}</div>
                  {c.contact_name && <div className="text-xs text-gray-500">{c.contact_name}</div>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-semibold">{c.total_contracts}</span>
                  <span className="text-xs text-gray-500"> ({c.owner_occupant_deals} OO · {c.investor_deals} Inv)</span>
                </td>
                <td className="px-4 py-3 text-xs">{(c.states || []).join(', ')}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(c.last_contract_at)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatMoney(c.total_net_to_hud)}</td>
                <td className="px-4 py-3"><StatusPill value={c.lead_status} /></td>
                <td className="px-4 py-3 text-gray-500">
                  <span className="flex gap-2">
                    {c.phone && <Phone className="h-4 w-4" />}
                    {c.email && <Mail className="h-4 w-4" />}
                    {c.website && <Globe className="h-4 w-4" />}
                    {!c.phone && !c.email && !c.website && <span className="text-xs">—</span>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <CompanyDrawer company={selected} onClose={() => setSelected(null)} onSaved={onSaved} />}
    </div>
  )
}

function CompanyDrawer({ company, onClose, onSaved }) {
  const [form, setForm] = useState(() => Object.fromEntries(EDIT_FIELDS.map(k => [k, company[k] ?? ''])))
  const [offers, setOffers] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setForm(Object.fromEntries(EDIT_FIELDS.map(k => [k, company[k] ?? ''])))
    setMessage(null)
    setError(null)
    let cancelled = false
    setOffers(null)
    supabase.from('accepted_offers')
      .select('id, case_number, address, city, state, net_to_hud, purchaser_type, accepted_at, outcome')
      .eq('company_id', company.id).order('accepted_at', { ascending: false })
      .then(({ data }) => { if (!cancelled) setOffers(data || []) })
    return () => { cancelled = true }
  }, [company.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); setMessage(null) }

  const save = async (extra = {}) => {
    setSaving(true)
    setError(null)
    const row = { ...Object.fromEntries(EDIT_FIELDS.map(k => [k, String(form[k] ?? '').trim() || null])), ...extra }
    row.lead_status = row.lead_status || 'new'
    if (row.office_state) row.office_state = row.office_state.toUpperCase().slice(0, 2)
    const { data, error: err } = await supabase.from('hud_broker_companies')
      .update({ ...row, updated_at: new Date().toISOString() }).eq('id', company.id).select().single()
    setSaving(false)
    if (err) return setError(err.message)
    onSaved(data)
    setMessage('Saved')
  }

  const markContacted = () => {
    const lead_status = ['new', 'researching'].includes(form.lead_status) ? 'contacted' : form.lead_status
    setForm(f => ({ ...f, lead_status }))
    save({ lead_status, last_contacted_at: new Date().toISOString() })
  }

  const where = (company.cities || [])[0] || (company.states || [])[0] || ''
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(`${company.name} real estate ${where}`)}`

  const input = (k, label, props = {}) => (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-600 mb-1">{label}</span>
      <input value={form[k]} onChange={e => update(k, e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" {...props} />
    </label>
  )

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="w-full max-w-xl h-full bg-white shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">{company.name}</h3>
            <p className="text-sm text-gray-600">
              {company.total_contracts} HUD {company.total_contracts === 1 ? 'contract' : 'contracts'} · {formatMoney(company.total_net_to_hud)} net to HUD
              {company.first_contract_at && <> · since {formatDate(company.first_contract_at)}</>}
            </p>
            {company.last_contacted_at && <p className="text-xs text-gray-500 mt-1">Last contacted {formatDate(company.last_contacted_at)}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-wrap gap-2">
            <a href={googleUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50">
              <ExternalLink className="h-4 w-4" /> Find contact info
            </a>
            {form.phone && <a href={`tel:${form.phone}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"><Phone className="h-4 w-4" /> Call</a>}
            {form.email && <a href={`mailto:${form.email}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"><Mail className="h-4 w-4" /> Email</a>}
            <button onClick={markContacted} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-green-600 text-green-700 rounded-lg text-sm hover:bg-green-50 disabled:opacity-50">
              <CheckCircle className="h-4 w-4" /> Mark contacted today
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block col-span-2 sm:col-span-1">
              <span className="block text-xs font-semibold text-gray-600 mb-1">Lead status</span>
              <select value={form.lead_status || 'new'} onChange={e => update('lead_status', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            <div className="col-span-2 sm:col-span-1">{input('next_follow_up', 'Next follow-up', { type: 'date' })}</div>
            <div className="col-span-2">{input('contact_name', 'Contact name (broker in charge or agent)')}</div>
            {input('phone', 'Phone', { type: 'tel' })}
            {input('email', 'Email', { type: 'email' })}
            <div className="col-span-2">{input('website', 'Website')}</div>
            {input('office_city', 'Office city')}
            {input('office_state', 'Office state', { maxLength: 2 })}
            <label className="block col-span-2">
              <span className="block text-xs font-semibold text-gray-600 mb-1">Notes</span>
              <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={4} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => save()} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
            </button>
            {message && <span className="text-sm text-green-700">{message}</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>

          <div>
            <h4 className="font-semibold mb-2">HUD contracts</h4>
            {!offers ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <ul className="divide-y border rounded-lg">
                {offers.map(o => (
                  <li key={o.id} className="px-4 py-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <a href={`/property/${o.case_number}`} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline">
                        {o.address || o.case_number}
                      </a>
                      <span className="font-semibold whitespace-nowrap">{formatMoney(o.net_to_hud)}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {[o.city, o.state].filter(Boolean).join(', ')} · {formatDate(o.accepted_at)} · {o.purchaser_type || '—'}
                      {o.outcome !== 'pending' && <> · {OUTCOME_LABELS[o.outcome]}</>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
