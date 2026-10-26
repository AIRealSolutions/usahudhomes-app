/**
 * Deal meter: compares an offer's net to HUD with accepted offers HUD has already taken.
 * Comparables share the buyer type and, where enough exist, the state and days-on-market band.
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
export function dealMeter({ offers, occupancy, state, days, netRatio, excludeCase }) {
  if (!Number.isFinite(netRatio) || !['owner', 'investor'].includes(occupancy)) return null
  const st = String(state || '').toUpperCase()
  const band = ageBand(days)
  const rows = (offers || [])
    .filter(o => o.case_number !== excludeCase && buyerKey(o.purchaser_type) === occupancy)
    .map(o => ({ ratio: ratioOf(o), state: String(o.state || '').toUpperCase(), band: ageBand(o.days_on_market) }))
    .filter(o => o.ratio !== null)
  const who = occupancy === 'owner' ? 'owner-occupant' : 'investor'
  const bandLabel = band >= 0 ? AGE_BANDS[band].label : null
  const cohorts = [
    band >= 0 && st && { rows: rows.filter(o => o.state === st && o.band === band), basis: `${st} ${who} offers accepted at ${bandLabel}` },
    st && { rows: rows.filter(o => o.state === st), basis: `${st} ${who} offers, any days on market` },
    band >= 0 && { rows: rows.filter(o => o.band === band), basis: `nationwide ${who} offers accepted at ${bandLabel}` },
    { rows, basis: `nationwide ${who} offers` },
  ].filter(Boolean)
  const pick = cohorts.find(c => c.rows.length >= MIN_SAMPLE) || cohorts.find(c => c.rows.length)
  if (!pick) return null
  const sorted = pick.rows.map(o => o.ratio).sort((a, b) => a - b)
  const atOrBelow = sorted.filter(r => r <= netRatio).length
  return {
    score: Math.round((100 * atOrBelow) / sorted.length),
    sample: sorted.length,
    basis: pick.basis,
    p25: quantile(sorted, 0.25), p50: quantile(sorted, 0.5), p75: quantile(sorted, 0.75),
    band: bandLabel,
  }
}

export const meterLabel = s => (s >= 75 ? 'Strong' : s >= 50 ? 'Competitive' : s >= 25 ? 'Below typical' : 'Long shot')
export const meterTone = s => (s >= 75 ? 'green' : s >= 50 ? 'lime' : s >= 25 ? 'amber' : 'red')

/** Offer price whose net to HUD reaches a given net-to-list ratio, after % deductions */
export const offerForRatio = (ratio, asking, deductionPercent) =>
  ratio && asking > 0 && deductionPercent < 100 ? (ratio * asking) / (1 - deductionPercent / 100) : null
