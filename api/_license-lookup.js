/**
 * Real estate license searches against state open data (Socrata, public, no key):
 *   NY  data.ny.gov       yg7h-zjbf  Active Real Estate Salespersons and Brokers (active only)
 *   TX  data.texas.gov    s7ft-44qi  Broker and Sales Agent License Holder Information (TREC)
 *   IL  data.illinois.gov pzzh-kp68  Professional Licensing (IDFPR; license_type 'REAL ESTATE')
 *   FL  DBPR weekly CSV files of every current/active/inactive licensee, one file per group of
 *       counties (www2.myfloridalicense.com/real-estate-commission/public-records/), so a
 *       Florida search needs the county.
 * searchLicenses() verifies a person; searchArea() lists licensees in a city or county.
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

// ─── Florida: weekly DBPR licensee files, one per group of counties ─────────
const FL_BASE = 'https://www2.myfloridalicense.com/sto/file_download/extracts/'
const FL_REGIONS = {
  RE_rgn1: ['Bay', 'Escambia', 'Holmes', 'Okaloosa', 'Santa Rosa', 'Walton', 'Washington'],
  RE_rgn2: ['Calhoun', 'Dixie', 'Franklin', 'Gadsden', 'Gulf', 'Hamilton', 'Jackson', 'Jefferson', 'Lafayette', 'Leon', 'Liberty', 'Madison', 'Suwannee', 'Taylor', 'Wakulla'],
  RE_rgn3: ['Baker', 'Clay', 'Duval', 'Flagler', 'Nassau', 'St. Johns'],
  RE_rgn4: ['Alachua', 'Bradford', 'Citrus', 'Columbia', 'Gilchrist', 'Levy', 'Marion', 'Putnam', 'Sumter', 'Union'],
  RE_rgn5: ['Brevard', 'Lake', 'Osceola', 'Seminole', 'Volusia'],
  RE_rgn6: ['Hardee', 'Hernando', 'Manatee', 'Pasco', 'Pinellas', 'Polk'],
  RE_rgn7: ['Charlotte', 'Collier', 'DeSoto', 'Glades', 'Hendry', 'Highlands', 'Lee', 'Sarasota'],
  RE_rgn8: ['Indian River', 'Martin', 'Okeechobee', 'Palm Beach', 'St. Lucie'],
  RE_rgn9: ['Broward'],
  RE_rgn10: ['Dade', 'Miami-Dade', 'Monroe'],
  RE_rgn12: ['Orange'],
  RE_rgn13: ['Hillsborough'],
}
const countyKey = c => up(c).replace(/\s+COUNTY$/, '').replace(/^ST\.?\s+/, 'SAINT ').replace(/[^A-Z]/g, '')
const flFileFor = county => {
  const k = countyKey(county)
  return k ? Object.keys(FL_REGIONS).find(f => FL_REGIONS[f].some(c => countyKey(c) === k)) || null : null
}

// Minimal CSV line parser (DBPR quotes every field)
function csvLine(line) {
  const out = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++ } else inQ = false } else cur += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { out.push(cur); cur = '' } else cur += ch
  }
  out.push(cur)
  return out
}

const flCache = new Map() // file → { at, rows } for the life of a warm function
async function flRows(file) {
  const hit = flCache.get(file)
  if (hit && Date.now() - hit.at < 6 * 3600000) return hit.rows
  const r = await fetch(`${FL_BASE}${file}.csv`, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'USAHUDhomes license check' } })
  if (!r.ok) throw new Error(`Florida DBPR file returned HTTP ${r.status}`)
  const text = new TextDecoder('latin1').decode(await r.arrayBuffer())
  const rows = []
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue
    const c = csvLine(line)
    if (!/^250[12]/.test(c[1] || '')) continue // brokers/sales associates and real estate corporations
    rows.push(c)
  }
  flCache.set(file, { at: Date.now(), rows })
  return rows
}
const flMap = c => ({
  // [2] "LAST, FIRST M" · [3] DBA · [4] rank · [8] city · [12] county · [13] license · [14]/[15] status · [18] expires · [21] employer
  name: clean(c[2]).includes(',') ? clean(`${c[2].split(',').slice(1).join(' ')} ${c[2].split(',')[0]}`) : clean(c[2]),
  license_number: clean(c[19]) || clean(c[13]), license_type: clean(c[4]) || clean(c[1]).replace(/^\d+\s*/, ''),
  status: [clean(c[14]), clean(c[15])].filter(Boolean).join(' / '), active: clean(c[14]) === 'Current' && clean(c[15]) === 'Active',
  expires: day(c[18]), firm: clean(c[21]) || clean(c[3]), city: clean(c[8]), county: clean(c[12]), state: 'FL',
  source: 'Florida DBPR licensee file',
})

async function searchFlorida({ contactName, company, county }) {
  const file = flFileFor(county)
  if (!file) return { supported: true, needsCounty: true, source: 'Florida DBPR licensee file', results: [] }
  const rows = await flRows(file)
  const { first, last } = splitName(contactName)
  const firm = up(company).replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  let hits = []
  if (first && last) {
    hits = rows.filter(c => {
      const [l, f = ''] = up(c[2]).split(',').map(x => x.trim())
      return l === last && f.startsWith(first)
    }).map(c => ({ ...flMap(c), matched: 'name', exact: up(c[2]).split(',')[1]?.trim().split(' ')[0] === first }))
  }
  if (!hits.length && firm.length >= 4) {
    const word = firm.split(' ').find(w => w.length > 3) || firm
    hits = rows.filter(c => /^2502/.test(c[1]) && up(c[2] + ' ' + c[3]).includes(word)).slice(0, 25).map(c => ({ ...flMap(c), matched: 'firm', exact: false }))
  }
  hits.sort((a, b) => Number(b.exact) - Number(a.exact) || Number(b.active) - Number(a.active))
  return { supported: true, source: 'Florida DBPR licensee file', results: hits.slice(0, 25) }
}

/**
 * Licensees in an area, from state records (NY, TX, IL by city; TX and FL by county).
 * Active brokers first, then sales agents; companies separately. Returns { supported, results[] }.
 */
export async function searchArea(state, { city, county, limit = 150 } = {}) {
  const st = up(state)
  const c = q(city), k = q(county).replace(/\s+COUNTY$/, '')
  if (st === 'FL') {
    const file = flFileFor(county)
    if (!file) return { supported: true, needsCounty: true, results: [] }
    const rows = await flRows(file)
    const ck = countyKey(county)
    const results = rows.filter(r => countyKey(r[12]) === ck && clean(r[15]) === 'Active' && (!city || up(r[8]) === up(city)))
      .map(flMap).slice(0, 2000)
    return { supported: true, source: 'Florida DBPR licensee file', results: rank(results).slice(0, limit), total: results.length }
  }
  let rows = []
  if (st === 'NY' && c) rows = (await soql(SOURCES.NY.url, `SELECT * WHERE upper(business_city) = '${c}' LIMIT 1000`)).map(SOURCES.NY.map)
  else if (st === 'TX' && k) rows = (await soql(SOURCES.TX.url, `SELECT * WHERE upper(county) = '${k}' AND status = 'Active' LIMIT 1000`)).map(SOURCES.TX.map)
  else if (st === 'IL' && c) rows = (await soql(SOURCES.IL.url, `SELECT * WHERE license_type = 'REAL ESTATE' AND upper(city) = '${c}' AND upper(license_status) = 'ACTIVE' LIMIT 1000`)).map(SOURCES.IL.map)
  else return { supported: ['NY', 'TX', 'IL'].includes(st), results: [], needsCity: st === 'NY' || st === 'IL', needsCounty: st === 'TX' }
  const results = rows.filter(r => r.active)
  return { supported: true, source: SOURCES[st].label, results: rank(results).slice(0, limit), total: results.length }
}

// Brokers before sales agents, then by name
function rank(list) {
  const w = r => (/corp|company|partnership|branch|association|llc|firm/i.test(r.license_type) ? 2 : /broker|^BK|^BL/i.test(r.license_type) ? 0 : 1)
  return [...list].sort((a, b) => w(a) - w(b) || a.name.localeCompare(b.name))
}

export const AUTO_LICENSE_STATES = [...Object.keys(SOURCES), 'FL']

/**
 * Search a state's licensees by person (contactName) and/or firm (company).
 * Returns { supported, source, results[] }, best matches first.
 */
export async function searchLicenses(state, { contactName, company, county } = {}) {
  if (up(state) === 'FL') return searchFlorida({ contactName, company, county })
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
