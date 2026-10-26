/**
 * Deal meter: compares an offer's net to HUD with accepted offers HUD has already taken.
 * Comparables share the buyer type and, where enough exist, the state, days-on-market band and
 * price stage (before or after a HUD price cut), since nets run higher against a reduced price.
 * Accepted offers only, so the score is a percentile of winners, not a true acceptance probability.
 */

export const AGE_BANDS = [
  { max: 14, label: '0–14 days' },
  { max: 30, label: '15–30 days' },
  { max: 60, label: '31–60 days' },
  { max: Infinity, label: '61+ days' },
]
export const ageBand = days => (Number.isFinite(days) && days >= 0 ? AGE_BANDS.findIndex(b => days <= b.max) : -1)

export const daysOnMarket = (listedAt, at = new Date()) => {
  if (!listedAt) return null
  const d = Math.floor((at - new Date(`${String(listedAt).slice(0, 10)}T12:00:00`)) / 86400000)
  return Number.isFinite(d) && d >= 0 ? d : null
}

const buyerKey = t => {
  const k = String(t || '').toLowerCase().replace(/[^a-z]/g, '')
  if (['owner', 'owneroccupant', 'owneroccupied'].includes(k)) return 'owner'
  if (['investor', 'nonowneroccupant'].includes(k)) return 'investor'
  return null
}
const listPrice = o => Number(o.list_price_used || o.list_price_at_acceptance || o.original_list_price)
const ratioOf = o => { const r = Number(o.net_to_hud) / listPrice(o); return Number.isFinite(r) && r > 0.2 && r < 2 ? r : null }
const quantile = (sorted, q) => {
  if (!sorted.length) return null
  const i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo)
}
const MIN_SAMPLE = 5

/**
 * offers: accepted_offers rows; returns null when there is nothing to compare against.
 * { score, sample, basis, p25, p50, p75, band }
 */
const comparableRows = (offers, occupancy, excludeCase) => (offers || [])
  .filter(o => o.case_number !== excludeCase && buyerKey(o.purchaser_type) === occupancy)
  .map(o => ({ ratio: ratioOf(o), state: String(o.state || '').toUpperCase(), band: ageBand(o.days_on_market), reduced: o.price_reduced }))
  .filter(o => o.ratio !== null)

const summarize = (cohorts) => {
  const pick = cohorts.filter(Boolean).find(c => c.rows.length >= MIN_SAMPLE) || cohorts.filter(Boolean).find(c => c.rows.length)
  if (!pick) return null
  const sorted = pick.rows.map(o => o.ratio).sort((a, b) => a - b)
  return { sorted, sample: sorted.length, basis: pick.basis, p25: quantile(sorted, 0.25), p50: quantile(sorted, 0.5), p75: quantile(sorted, 0.75) }
}
const whoLabel = occupancy => (occupancy === 'owner' ? 'owner-occupant' : 'investor')

export function dealMeter({ offers, occupancy, state, days, reduced = false, netRatio, excludeCase }) {
  if (!Number.isFinite(netRatio) || !['owner', 'investor'].includes(occupancy)) return null
  const st = String(state || '').toUpperCase()
  const band = ageBand(days)
  const rows = comparableRows(offers, occupancy, excludeCase)
  const stage = rows.filter(o => !!o.reduced === !!reduced)
  const who = whoLabel(occupancy)
  const bandLabel = band >= 0 ? AGE_BANDS[band].label : null
  const stageLabel = reduced ? ' after a price cut' : ' before any price cut'
  const stats = summarize([
    band >= 0 && st && { rows: stage.filter(o => o.state === st && o.band === band), basis: `${st} ${who} offers accepted at ${bandLabel}${stageLabel}` },
    st && { rows: stage.filter(o => o.state === st), basis: `${st} ${who} offers accepted${stageLabel}` },
    band >= 0 && { rows: stage.filter(o => o.band === band), basis: `nationwide ${who} offers accepted at ${bandLabel}${stageLabel}` },
    { rows: stage, basis: `nationwide ${who} offers accepted${stageLabel}` },
    { rows, basis: `nationwide ${who} offers` },
  ])
  if (!stats) return null
  const { sorted, ...rest } = stats
  return { score: Math.round((100 * sorted.filter(r => r <= netRatio).length) / sorted.length), ...rest, band: bandLabel }
}

// HUD's usual cut: about 10% of the list price around 30 days on market
export const PRICE_CUT = { percent: 10, day: 30 }

/**
 * What waiting for HUD's price cut would likely mean for a home that hasn't been cut yet:
 * the expected new price and the offer that would match a typical accepted net after the cut.
 */
export function priceCutOutlook({ offers, occupancy, state, days, asking, deductionPercent, excludeCase }) {
  if (!(asking > 0) || !['owner', 'investor'].includes(occupancy)) return null
  const st = String(state || '').toUpperCase()
  const cut = comparableRows(offers, occupancy, excludeCase).filter(o => o.reduced)
  const stats = summarize([
    st && { rows: cut.filter(o => o.state === st), basis: `${st} ${whoLabel(occupancy)} offers accepted after a price cut` },
    { rows: cut, basis: `nationwide ${whoLabel(occupancy)} offers accepted after a price cut` },
  ])
  const newList = asking * (1 - PRICE_CUT.percent / 100)
  return {
    newList,
    daysUntil: Number.isFinite(days) ? Math.max(0, PRICE_CUT.day - days) : null,
    median: stats?.p50 ?? null,
    sample: stats?.sample ?? 0,
    basis: stats?.basis ?? null,
    expectedNet: stats ? stats.p50 * newList : null,
    offerAfter: stats ? offerForRatio(stats.p50, newList, deductionPercent) : null,
  }
}

/** Whether HUD has already cut this listing's price */
export const isPriceReduced = p =>
  (Number(p?.original_list_price) > 0 && Number(p?.price) > 0 && Number(p.price) < Number(p.original_list_price)) ||
  /reduced/i.test(String(p?.status || ''))

export const meterLabel = s => (s >= 75 ? 'Strong' : s >= 50 ? 'Competitive' : s >= 25 ? 'Below typical' : 'Long shot')
export const meterTone = s => (s >= 75 ? 'green' : s >= 50 ? 'lime' : s >= 25 ? 'amber' : 'red')

/** Offer price whose net to HUD reaches a given net-to-list ratio, after % deductions */
export const offerForRatio = (ratio, asking, deductionPercent) =>
  ratio && asking > 0 && deductionPercent < 100 ? (ratio * asking) / (1 - deductionPercent / 100) : null
