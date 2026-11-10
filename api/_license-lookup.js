/**
 * Real estate license searches against state open data (Socrata, public, no key):
 *   NY  data.ny.gov       yg7h-zjbf  Active Real Estate Salespersons and Brokers (active only)
 *   TX  data.texas.gov    s7ft-44qi  Broker and Sales Agent License Holder Information (TREC)
 *   IL  data.illinois.gov pzzh-kp68  Professional Licensing (IDFPR; license_type 'REAL ESTATE')
 * Every result is normalized to:
 *   { source, name, license_number, license_type, status, active, expires, firm, city, state }
 * Underscore prefix: Vercel does not turn this file into an endpoint.
 */

const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim()
const up = v => clean(v).toUpperCase()
const q = v => up(v).replace(/'/g, "''") // SoQL string literal
// "2028-02-24T00:00:00.000" or "09/30/2028" → "2028-09-30"
const day = v => {
  const t = clean(v)
  const us = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : null
}
const notExpired = d => !d || d >= new Date().toISOString().slice(0, 10)

async function soql(url, query) {
  const r = await fetch(`${url}?$query=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'USAHUDhomes license check' },
    signal: AbortSignal.timeout(15000),
  })
  if (!r.ok) throw new Error(`${new URL(url).host} returned HTTP ${r.status}`)
  const rows = await r.json()
  return Array.isArray(rows) ? rows : []
}

// "Gordon M Burroughs" → { first: 'GORDON', last: 'BURROUGHS' }
export function splitName(name) {
  const parts = up(name).replace(/[.,]/g, ' ').split(' ').filter(Boolean)
    .filter(p => !['JR', 'SR', 'II', 'III', 'IV'].includes(p))
  if (!parts.length) return { first: '', last: '' }
  return { first: parts[0], last: parts.length > 1 ? parts[parts.length - 1] : '' }
}

const SOURCES = {
  NY: {
    url: 'https://data.ny.gov/resource/yg7h-zjbf.json',
    label: 'NY Department of State open data',
    byName: ({ first, last }) => `SELECT * WHERE upper(license_holder_name) like '${q(last)} ${q(first)}%' LIMIT 25`,
    byFirm: firm => `SELECT * WHERE upper(business_name) like '%${q(firm)}%' LIMIT 25`,
    map: r => ({
      name: clean(r.license_holder_name), license_number: r.license_number, license_type: r.license_type,
      status: 'Active', active: notExpired(day(r.license_expiration_date)), expires: day(r.license_expiration_date),
      firm: clean(r.business_name), city: clean(r.business_city), state: r.business_state || 'NY',
    }),
  },
  TX: {
    url: 'https://data.texas.gov/resource/s7ft-44qi.json',
    label: 'Texas Real Estate Commission open data',
    byName: ({ first, last }) => `SELECT * WHERE upper(last_name) = '${q(last)}' AND upper(first_name) like '${q(first)}%' LIMIT 25`,
    byFirm: firm => `SELECT * WHERE license_type = 'Broker Company' AND upper(full_name) like '%${q(firm)}%' LIMIT 25`,
    map: r => ({
      name: clean(r.full_name), license_number: r.license_number, license_type: r.license_type,
      status: r.status, active: /^active$/i.test(r.status || ''), expires: day(r.license_expiration_date),
      firm: clean(r.related_license_full_name), city: clean(r.county) ? `${clean(r.county)} County` : '', state: 'TX',
    }),
  },
  IL: {
    url: 'https://data.illinois.gov/resource/pzzh-kp68.json',
    label: 'Illinois IDFPR open data',
    byName: ({ first, last }) => `SELECT * WHERE license_type = 'REAL ESTATE' AND upper(last_name) = '${q(last)}' AND upper(first_name) like '${q(first)}%' LIMIT 25`,
    byFirm: firm => `SELECT * WHERE license_type = 'REAL ESTATE' AND (upper(business_name) like '%${q(firm)}%' OR upper(businessdba) like '%${q(firm)}%') LIMIT 25`,
    map: r => ({
      name: clean([r.first_name, r.middle, r.last_name].filter(Boolean).join(' ')) || clean(r.business_name),
      license_number: r.license_number, license_type: r.description || r.license_type,
      status: r.license_status, active: /active/i.test(r.license_status || '') && notExpired(day(r.expiration_date)),
      expires: day(r.expiration_date), firm: clean(r.businessdba || r.business_name), city: clean(r.city), state: r.state || 'IL',
    }),
  },
}

export const AUTO_LICENSE_STATES = Object.keys(SOURCES)

/**
 * Search a state's licensees by person (contactName) and/or firm (company).
 * Returns { supported, source, results[] }, best matches first.
 */
export async function searchLicenses(state, { contactName, company } = {}) {
  const s = SOURCES[up(state)]
  if (!s) return { supported: false, results: [] }
  const name = splitName(contactName)
  const firmKey = up(company).replace(/\b(LLC|INC|CORP|CORPORATION|CO|COMPANY|LTD|PLLC|LLP|PA|THE)\b|[.,&']/g, ' ').replace(/\s+/g, ' ').trim()
    .split(' ').slice(0, 3).join(' ')
  const rows = []
  if (name.first && name.last) rows.push(...(await soql(s.url, s.byName(name))).map(s.map).map(r => ({ ...r, matched: 'name' })))
  if (!rows.length && firmKey.length >= 3) rows.push(...(await soql(s.url, s.byFirm(firmKey))).map(s.map).map(r => ({ ...r, matched: 'firm' })))
  const seen = new Set()
  // Best first: exact first + last name, then active licenses, then latest expiration
  const score = r => {
    const n = splitName(r.name.includes(' ') && s === SOURCES.NY ? r.name.split(' ').slice(1).concat(r.name.split(' ')[0]).join(' ') : r.name)
    return (n.first === name.first ? 2 : 0) + (n.last === name.last ? 1 : 0)
  }
  const results = rows.filter(r => r.license_number && !seen.has(r.license_number) && seen.add(r.license_number))
    .sort((a, b) => score(b) - score(a) || Number(b.active) - Number(a.active) || String(b.expires || '').localeCompare(String(a.expires || '')))
  // exact: same first and last name — safe for automatic matching
  return { supported: true, source: s.label, results: results.map(r => ({ ...r, exact: r.matched === 'name' && score(r) === 3, source: s.label })) }
}
