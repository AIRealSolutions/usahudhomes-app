/**
 * Licensed agents near a property, from state license records — for when the town
 * has no HUD-registered broker.
 *   NY, TX, IL, FL: listed here from state data (NY/IL by city, TX/FL by county)
 *   other states:   opens the state board's search (city/county/ZIP where it has one) or ARELLO
 */
import React, { useState } from 'react'
import { LICENSE_SOURCES, ARELLO_URL, SEARCH_LABELS, searchesByArea } from '../../data/licenseLookupSources'
import { licenseArea } from '../../services/brokerFinder'

export default function AreaLicenseesPanel({ property }) {
  const state = String(property?.state || '').toUpperCase()
  const src = LICENSE_SOURCES[state]
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [brokersOnly, setBrokersOnly] = useState(true)
  const [copied, setCopied] = useState('')

  if (!src) return null
  const county = String(property.county || '').replace(/\s+county$/i, '')
  const where = state === 'TX' || state === 'FL' ? `${county} County` : property.city

  const load = async () => {
    setBusy(true); setError('')
    try { setData(await licenseArea({ propertyId: property.id })) } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const copy = async (text, what) => { try { await navigator.clipboard.writeText(text); setCopied(what) } catch { /* copy by hand */ } }

  const isBroker = r => /broker|^BK|^BL/i.test(r.license_type || '') && !/corp|company|partnership|branch/i.test(r.license_type || '')
  const list = (data?.results || []).filter(r => !brokersOnly || isBroker(r) || /corp|company|partnership|branch|llc/i.test(r.license_type || ''))
  const shown = showAll ? list : list.slice(0, 25)

  return (
    <section className="bg-white rounded shadow p-4 sm:p-5 space-y-3">
      <h2 className="font-semibold">Licensed agents near this property (state records)</h2>
      {error && <p className="text-sm text-red-700">{error}</p>}

      {src.method === 'auto' ? (
        <>
          <p className="text-xs text-gray-500">Every active real estate licensee in {where || 'this area'} from the {src.dataset}. Use it when no HUD-registered broker is close: these agents can register with HUD or co-broker.</p>
          {!data && (
            <button type="button" disabled={busy || !where} onClick={load} className="bg-teal-700 text-white rounded px-4 py-2 text-sm disabled:opacity-50">
              {busy ? 'Searching state records…' : `Show licensed agents in ${where || '…'}`}
            </button>
          )}
          {data?.needsCounty && <p className="text-sm text-amber-700">This property has no county on file, which {state} records need.</p>}
          {data && !data.needsCounty && (
            <>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span>{data.total >= 1000 ? `${data.total}+` : data.total} active licensees{data.total > (data.results || []).length ? ` (showing ${data.results.length})` : ''}</span>
                <label className="flex items-center gap-1"><input type="checkbox" checked={brokersOnly} onChange={e => setBrokersOnly(e.target.checked)} /> Brokers and firms only</label>
              </div>
              <div className="divide-y border rounded max-h-[28rem] overflow-auto">
                {shown.map(r => (
                  <div key={r.license_number} className="p-2 text-sm flex flex-col sm:flex-row sm:justify-between gap-1">
                    <div className="min-w-0">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-gray-600">{r.license_type} · #{r.license_number}{r.firm ? ` · ${r.firm}` : ''}{r.city ? ` · ${r.city}` : ''}{r.expires ? ` · expires ${r.expires}` : ''}</div>
                    </div>
                    <a className="text-blue-700 underline text-xs shrink-0" target="_blank" rel="noreferrer"
                      href={`https://www.google.com/search?q=${encodeURIComponent(`${r.name} ${r.firm || ''} real estate ${r.city || ''} ${state} phone`)}`}>Find phone</a>
                  </div>
                ))}
                {!list.length && <p className="p-3 text-sm text-gray-500">No active licensees found here in state records.</p>}
              </div>
              {list.length > 25 && !showAll && <button type="button" className="text-blue-700 underline text-sm" onClick={() => setShowAll(true)}>Show all {list.length}</button>}
            </>
          )}
        </>
      ) : (
        <div className="space-y-2 text-sm">
          {src.board && searchesByArea(src) ? (
            <p>The {src.name} lookup searches by {src.board.searchBy.map(f => SEARCH_LABELS[f]).join(', ')}{src.board.captcha ? ' (with a CAPTCHA)' : ''}. Search {property.city}{county ? ` or ${county} County` : ''} to see every licensed agent there.</p>
          ) : (
            <p>{state} doesn't offer a search by town{src.arello ? '; ARELLO searches by name only' : ''}. Use it to check agents you find.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {src.board && (
              <a href={src.board.url} target="_blank" rel="noreferrer" onClick={() => copy(property.city || '', 'city')} className="bg-teal-700 text-white rounded px-3 py-1.5">
                Open {state} board lookup{searchesByArea(src) ? ' (copies the town)' : ''}
              </a>
            )}
            {src.board?.firmUrl && <a href={src.board.firmUrl} target="_blank" rel="noreferrer" className="border border-teal-700 text-teal-800 rounded px-3 py-1.5">Firm search</a>}
            {src.arello && <a href={ARELLO_URL} target="_blank" rel="noreferrer" className="border rounded px-3 py-1.5">ARELLO</a>}
            {searchesByArea(src) && county && <button type="button" className="border rounded px-3 py-1.5" onClick={() => copy(county, 'county')}>{copied === 'county' ? 'Copied' : `Copy "${county}"`}</button>}
          </div>
          {copied === 'city' && <p className="text-xs text-gray-500">"{property.city}" copied — paste it into the City field.</p>}
        </div>
      )}
    </section>
  )
}
