/**
 * License Check — cross-references HUD's broker list, state real estate license records
 * and partner agents.
 *
 * Sources (src/data/licenseLookupSources.js):
 *   NY, TX, IL, FL — state open data / weekly files, searched automatically
 *   state boards   — each state's own lookup (many search by city/county/ZIP)
 *   ARELLO         — national license verification for 39 states + DC (manual search)
 * Flags: not verified, license not active/expired, license firm differs from HUD's listing.
 *
 * Deep link: /admin?tab=license-check&agent=<id> or &broker=<id>
 */
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../config/supabase'
import { LICENSE_SOURCES, ARELLO_URL, SEARCH_LABELS } from '../../data/licenseLookupSources'
import { searchLicense, saveLicense, runLicenseAuto } from '../../services/brokerFinder'

const LICENSE_COLS = 'license_number,license_type,license_status,license_active,license_expires,license_firm,license_source,license_verified_at,license_checked_at'
const today = () => new Date().toISOString().slice(0, 10)
const FIRM_NOISE = /\b(LLC|L L C|INC|CORP|CORPORATION|CO|COMPANY|LTD|PLLC|LLP|PA|THE|REALTY|REAL|ESTATE|PROPERTIES|PROPERTY|GROUP|AND|OF|BROKERAGE|BROKERS?|ASSOCIATES)\b/g
const firmWords = s => new Set(String(s || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(FIRM_NOISE, ' ').split(/\s+/).filter(w => w.length > 2))

async function fetchAll(build) {
  const out = []
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await build().range(from, from + 999)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}

function issues(p) {
  const list = []
  if (!p.license_verified_at) list.push({ key: 'unverified', label: 'Not verified', cls: 'bg-gray-100 text-gray-700' })
  else {
    if (p.license_active === false || (p.license_expires && p.license_expires < today())) list.push({ key: 'inactive', label: 'License not active', cls: 'bg-red-100 text-red-800' })
    if (p.license_firm && p.company) {
      const a = firmWords(p.license_firm), b = firmWords(p.company)
      if (a.size && b.size && ![...a].some(w => b.has(w))) list.push({ key: 'firm', label: 'Firm differs from HUD listing', cls: 'bg-amber-100 text-amber-800' })
    }
  }
  if (!p.email) list.push({ key: 'email', label: 'No email', cls: 'bg-sky-50 text-sky-800' })
  return list
}

export default function LicenseCheckAdmin() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [kindFilter, setKindFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [issueFilter, setIssueFilter] = useState('')
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(null) // { kind, id }
  const [autoBusy, setAutoBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [agents, brokers] = await Promise.all([
        fetchAll(() => supabase.from('agents').select(`id,first_name,last_name,company,email,phone,license_state,states_covered,is_active,${LICENSE_COLS}`).order('last_name')),
        fetchAll(() => supabase.from('hud_brokers').select(`id,company_name,contact_name,city,state,email,phone,status,agent_id,license_name,${LICENSE_COLS}`).order('state').order('company_name')),
      ])
      const linked = new Set(brokers.map(b => b.agent_id).filter(Boolean))
      setPeople([
        ...agents.map(a => ({
          kind: 'agent', id: a.id, name: `${a.first_name || ''} ${a.last_name || ''}`.trim(), company: a.company,
          state: (a.license_state || (a.states_covered || [])[0] || '').toUpperCase(), email: a.email, phone: a.phone,
          inactive: !a.is_active, fromBrokerFinder: linked.has(a.id), ...a,
        })),
        ...brokers.filter(b => !b.agent_id).map(b => ({
          kind: 'broker', id: b.id, name: b.contact_name || '', company: b.company_name, state: (b.state || '').toUpperCase(),
          city: b.city, email: b.email, phone: b.phone, dnc: b.status === 'do_not_contact', ...b,
        })),
      ])
    } catch (e) { setNotice(e.message) } finally { setLoading(false) }
  }
  useEffect(() => {
    load().then(() => {
      const a = params.get('agent'), b = params.get('broker')
      if (a || b) { setOpen(a ? { kind: 'agent', id: a } : { kind: 'broker', id: b }); window.history.replaceState(null, '', '/admin?tab=license-check') }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const withIssues = useMemo(() => people.map(p => ({ ...p, issues: issues(p) })), [people])
  const shown = withIssues.filter(p => {
    if (kindFilter && p.kind !== kindFilter) return false
    if (stateFilter && p.state !== stateFilter) return false
    if (issueFilter === 'ok' && p.issues.some(i => i.key !== 'email')) return false
    if (issueFilter && issueFilter !== 'ok' && !p.issues.some(i => i.key === issueFilter)) return false
    const t = term.trim().toLowerCase()
    return !t || [p.name, p.company, p.license_number, p.license_firm, p.city].some(v => String(v || '').toLowerCase().includes(t))
  })
  const states = [...new Set(people.map(p => p.state).filter(Boolean))].sort()
  const count = key => withIssues.filter(p => p.issues.some(i => i.key === key)).length
  const autoCandidates = withIssues.filter(p => LICENSE_SOURCES[p.state]?.method === 'auto' && !p.license_verified_at).length

  const runAuto = async () => {
    setAutoBusy(true); setNotice('')
    try {
      let tot = { checked: 0, verified: 0, ambiguous: 0, none: 0 }
      for (let i = 0; i < 25; i++) {
        const r = await runLicenseAuto(30)
        for (const k of Object.keys(tot)) tot[k] += r[k] || 0
        setNotice(`Checked ${tot.checked} in NY/TX/IL/FL: ${tot.verified} verified automatically, ${tot.ambiguous} need you to pick, ${tot.none} not found.`)
        if (!r.checked || !r.remaining) break
      }
      await load()
    } catch (e) { setNotice(e.message) } finally { setAutoBusy(false) }
  }

  const onSaved = (kind, id, license) => setPeople(list => list.map(p => (p.kind === kind && p.id === id ? { ...p, ...license } : p)))

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-5 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">License Check</h1>
        <p className="text-sm text-gray-600">Cross-reference HUD's broker list and your partner agents with state real estate license records.</p>
      </header>
      {notice && <div role="status" className="border bg-blue-50 rounded p-3 text-sm">{notice}</div>}

      <section className="bg-white rounded shadow p-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        {[['Not verified', 'unverified'], ['License not active', 'inactive'], ['Firm differs', 'firm'], ['No email', 'email'], ['Verified OK', 'ok']].map(([label, key]) => (
          <button key={key} type="button" onClick={() => setIssueFilter(f => (f === key ? '' : key))}
            className={`text-left border rounded p-3 ${issueFilter === key ? 'border-blue-700 bg-blue-50' : ''}`}>
            <div className="text-2xl font-bold">{key === 'ok' ? withIssues.filter(p => p.license_verified_at && !p.issues.some(i => i.key !== 'email')).length : count(key)}</div>
            <div className="text-gray-600">{label}</div>
          </button>
        ))}
      </section>

      <section className="bg-white rounded shadow p-4 space-y-2">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h2 className="font-semibold">Automatic check — New York, Texas, Illinois, Florida</h2>
          <button type="button" disabled={autoBusy || !autoCandidates} onClick={runAuto} className="bg-blue-700 text-white rounded px-4 py-2 text-sm disabled:opacity-50">
            {autoBusy ? 'Checking state records…' : `Check ${autoCandidates} unverified`}
          </button>
        </div>
        <p className="text-xs text-gray-500">These states publish every licensee (Florida weekly, by county). Only an exact, single name match is saved automatically; anything else waits for you under Verify. Every other state opens its board's lookup or ARELLO's national search.</p>
      </section>

      <section className="bg-white rounded shadow p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <input className="border rounded p-2 flex-1 min-w-48 text-sm" placeholder="Name, company, license #, city" value={term} onChange={e => setTerm(e.target.value)} />
          <select aria-label="Who" className="border rounded p-2 text-sm" value={kindFilter} onChange={e => setKindFilter(e.target.value)}>
            <option value="">Partner agents + HUD brokers</option>
            <option value="agent">Partner agents</option>
            <option value="broker">HUD brokers (not partners yet)</option>
          </select>
          <select aria-label="State" className="border rounded p-2 text-sm" value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
            <option value="">All states</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {loading ? <p className="text-sm text-gray-500">Loading…</p> : (
          <div className="divide-y border rounded">
            {shown.slice(0, 300).map(p => (
              <div key={`${p.kind}:${p.id}`} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <div className="min-w-0 text-sm">
                  <div className="font-medium">
                    {p.name || '—'} <span className="text-gray-500 font-normal">· {p.company || '—'} · {p.state || '?'}</span>
                    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-semibold ${p.kind === 'agent' ? 'bg-green-100 text-green-800' : 'bg-teal-50 text-teal-800'}`}>{p.kind === 'agent' ? 'Partner agent' : 'HUD broker'}</span>
                    {p.inactive && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100">inactive</span>}
                    {p.dnc && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-800">do not contact</span>}
                  </div>
                  <div className="text-xs text-gray-600">
                    {p.license_verified_at
                      ? <>License #{p.license_number || '—'} · {p.license_type || ''} · <strong>{p.license_status || (p.license_active ? 'Active' : '')}</strong>{p.license_expires ? ` · expires ${p.license_expires}` : ''}{p.license_firm ? ` · firm: ${p.license_firm}` : ''} · {p.license_source}</>
                      : <>No license record yet · {LICENSE_SOURCES[p.state]?.method === 'auto' ? 'automatic check available' : LICENSE_SOURCES[p.state]?.method === 'board' ? 'look up on the state board' : 'look up on ARELLO'}</>}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">{p.issues.map(i => <span key={i.key} className={`text-[11px] px-1.5 py-0.5 rounded ${i.cls}`}>{i.label}</span>)}</div>
                </div>
                <button type="button" onClick={() => setOpen({ kind: p.kind, id: p.id })} className="border border-blue-700 text-blue-800 rounded px-3 py-1.5 text-sm shrink-0">Verify</button>
              </div>
            ))}
            {!shown.length && <p className="p-3 text-sm text-gray-500">Nothing matches these filters.</p>}
            {shown.length > 300 && <p className="p-3 text-xs text-gray-500">Showing the first 300 of {shown.length}. Narrow by state or search.</p>}
          </div>
        )}
      </section>

      <section className="bg-white rounded shadow p-4 text-xs text-gray-600 space-y-1">
        <p><strong>Where licenses are looked up:</strong> automatic for {Object.entries(LICENSE_SOURCES).filter(([, s]) => s.method === 'auto').map(([k]) => k).join(', ')} (state data); the state board's own lookup for {Object.entries(LICENSE_SOURCES).filter(([, s]) => s.method === 'board').map(([k]) => k).join(', ')}; ARELLO's national database for the rest ({Object.values(LICENSE_SOURCES).filter(s => s.arello).length} jurisdictions are in ARELLO).</p>
        <p>Boards that search by city, county or ZIP (no CAPTCHA): {Object.entries(LICENSE_SOURCES).filter(([, s]) => s.board && !s.board.captcha && s.board.searchBy.some(f => ['city', 'county', 'zip'].includes(f))).map(([k]) => k).join(', ')}. With a CAPTCHA: {Object.entries(LICENSE_SOURCES).filter(([, s]) => s.board?.captcha && s.board.searchBy.some(f => ['city', 'county', 'zip'].includes(f))).map(([k]) => k).join(', ')}.</p>
        <p>ARELLO also offers a paid Licensee Verification Web Service (API) that would make the ARELLO states automatic too.</p>
      </section>

      {open && <VerifyPanel target={open} onClose={() => setOpen(null)} onSaved={onSaved} />}
    </main>
  )
}

function VerifyPanel({ target, onClose, onSaved }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({ license_number: '', license_type: '', status: 'Active', expires: '', firm: '', name: '' })

  useEffect(() => {
    searchLicense(target.kind, target.id).then(d => {
      setData(d)
      const c = d.current || {}
      setForm({
        license_number: c.license_number || '', license_type: c.license_type || '', status: c.license_status || 'Active',
        expires: c.license_expires || '', firm: c.license_firm || '', name: c.license_name || d.name || '',
      })
    }).catch(e => setError(e.message))
  }, [target.kind, target.id])

  const save = async record => {
    setBusy(true); setError('')
    try {
      const r = await saveLicense(target.kind, target.id, record)
      onSaved(target.kind, target.id, r.license)
      onClose()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const saveManual = () => {
    if (!form.license_number.trim()) return setError('Enter the license number from the lookup.')
    const src = data?.source
    save({
      license_number: form.license_number, license_type: form.license_type, status: form.status,
      active: /^active/i.test(form.status), expires: form.expires || null, firm: form.firm, name: form.name,
      source: src ? `manual: ${src.board ? src.name : 'ARELLO'}` : 'manual',
    })
  }
  const copyName = async () => { try { await navigator.clipboard.writeText(data?.name || data?.company || ''); setCopied(true) } catch { /* copy by hand */ } }
  const src = data?.source

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-xl h-full bg-white shadow-xl overflow-y-auto p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start gap-3">
          <div>
            <h2 className="text-xl font-bold">{data?.name || 'License'}</h2>
            <p className="text-sm text-gray-600">{data?.company}{data?.state ? ` · ${data.state}` : ''}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-600 underline text-sm">Close</button>
        </div>
        {error && <div role="alert" className="border border-red-200 bg-red-50 text-red-800 rounded p-2 text-sm">{error}</div>}
        {!data && !error && <p className="text-sm text-gray-500">Searching state records…</p>}

        {data?.automatic && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">State records ({src?.dataset})</h3>
            {data.searchError && <p className="text-sm text-red-700">Search failed: {data.searchError}</p>}
            {!data.results.length && !data.searchError && <p className="text-sm text-gray-600">No match in the state's records for this name or firm. Check the spelling, or search the state lookup below.</p>}
            <div className="divide-y border rounded">
              {data.results.map(r => (
                <div key={r.license_number} className="p-2 text-sm flex justify-between gap-2 items-start">
                  <div>
                    <div className="font-medium">{r.name} {r.exact && <span className="text-[10px] bg-green-100 text-green-800 px-1 rounded">exact name</span>}</div>
                    <div className="text-xs text-gray-600">#{r.license_number} · {r.license_type} · <strong className={r.active ? 'text-green-700' : 'text-red-700'}>{r.status}</strong>{r.expires ? ` · expires ${r.expires}` : ''}{r.firm ? ` · ${r.firm}` : ''}{r.city ? ` · ${r.city}` : ''}</div>
                  </div>
                  <button type="button" disabled={busy} onClick={() => save(r)} className="bg-green-700 text-white rounded px-2 py-1 text-xs shrink-0 disabled:opacity-50">Use this</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {src && (
          <div className="border rounded p-3 space-y-2 bg-gray-50">
            <h3 className="font-semibold text-sm">Look it up by hand</h3>
            {src.board && (
              <div className="text-sm">
                <div className="font-medium">{src.name}</div>
                <div className="text-xs text-gray-600">
                  Searches by {src.board.searchBy.map(f => SEARCH_LABELS[f]).join(', ')}{src.board.captcha ? ' · has a CAPTCHA' : ''}
                  {!src.board.verified && ' · this link could not be checked; if it has moved, search the board name online'}
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  <a href={src.board.url} target="_blank" rel="noreferrer" onClick={copyName} className="bg-blue-700 text-white rounded px-3 py-1.5 text-sm">Open state board lookup</a>
                  {src.board.firmUrl && <a href={src.board.firmUrl} target="_blank" rel="noreferrer" className="border border-blue-700 text-blue-800 rounded px-3 py-1.5 text-sm bg-white">Firm search</a>}
                </div>
              </div>
            )}
            {src.arello && (
              <div className="text-sm">
                <div className="text-xs text-gray-600">{src.board ? 'Or ' : ''}ARELLO's national database: search by last name (and first name), choose {data.state}.</div>
                <a href={ARELLO_URL} target="_blank" rel="noreferrer" onClick={copyName} className="inline-block mt-1 border border-blue-700 text-blue-800 rounded px-3 py-1.5 text-sm bg-white">Open ARELLO</a>
              </div>
            )}
            <button type="button" onClick={copyName} className="border rounded px-3 py-1.5 text-sm bg-white">{copied ? 'Copied' : `Copy "${data?.name || data?.company}"`}</button>
            <p className="text-xs text-gray-500">Opening a lookup copies the name, ready to paste. Then record what it shows below.</p>
          </div>
        )}
        {data && !src && <p className="text-sm text-amber-700">No state on file for this person; add a license state to look them up.</p>}

        {data && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">License record</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="col-span-2">Name on license<input className="border rounded p-2 w-full" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
              <label>License #<input className="border rounded p-2 w-full" value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} /></label>
              <label>Type<input className="border rounded p-2 w-full" placeholder="Broker, Salesperson…" value={form.license_type} onChange={e => setForm({ ...form, license_type: e.target.value })} /></label>
              <label>Status
                <select className="border rounded p-2 w-full" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {['Active', 'Inactive', 'Expired', 'Suspended', 'Revoked', 'Other'].map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label>Expires<input type="date" className="border rounded p-2 w-full" value={form.expires} onChange={e => setForm({ ...form, expires: e.target.value })} /></label>
              <label className="col-span-2">Firm on license<input className="border rounded p-2 w-full" value={form.firm} onChange={e => setForm({ ...form, firm: e.target.value })} /></label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={saveManual} className="bg-green-700 text-white rounded px-4 py-2 text-sm disabled:opacity-50">{busy ? 'Saving…' : 'Save license record'}</button>
              {data.current?.license_verified_at && <button type="button" disabled={busy} onClick={() => save(null)} className="border rounded px-4 py-2 text-sm">Clear record</button>}
            </div>
            {data.current?.license_verified_at && <p className="text-xs text-gray-500">Last verified {new Date(data.current.license_verified_at).toLocaleDateString()} ({data.current.license_source}).</p>}
          </div>
        )}
      </div>
    </div>
  )
}
