/**
 * Shared loan math for the payment breakdown and the offer wizard's budget step.
 */

// Annual FHA MIP (HUD Mortgagee Letter 2023-05), loans at or under the standard limit
export function fhaAnnualMipRate(ltv, termYears) {
  if (termYears > 15) return ltv > 95 ? 0.0055 : 0.005
  return ltv > 90 ? 0.004 : 0.0015
}

export function monthlyPI(principal, annualRatePct, termYears) {
  const n = termYears * 12
  const r = annualRatePct / 100 / 12
  if (r === 0) return principal / n
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

export const FHA_UPFRONT_MIP = 0.0175
// Same starting figures the payment breakdown uses
export const DEFAULT_TAX_RATE = 0.008
export const DEFAULT_ANNUAL_INSURANCE = 1800

/**
 * Monthly payment (P&I, mortgage insurance, taxes, insurance) for a price.
 * loan: 'hud100' (owner-occupant $100 down FHA) or { downPercent } for an investor loan.
 */
export function monthlyPayment(price, { loan, rate, termYears = 30 }) {
  const escrow = (price * DEFAULT_TAX_RATE + DEFAULT_ANNUAL_INSURANCE) / 12
  if (loan === 'hud100') {
    const base = Math.max(0, price - 100)
    const ltv = price > 0 ? (base / price) * 100 : 0
    return monthlyPI(base * (1 + FHA_UPFRONT_MIP), rate, termYears) + (base * fhaAnnualMipRate(ltv, termYears)) / 12 + escrow
  }
  return monthlyPI(price * (1 - loan.downPercent / 100), rate, termYears) + escrow
}

/** Highest price whose monthly payment fits a target (payment is linear in price) */
export function maxPriceForPayment(target, opts) {
  const a = monthlyPayment(200000, opts) - monthlyPayment(100000, opts)
  const b = monthlyPayment(100000, opts) - a
  return a > 0 && target > b ? Math.floor(((target - b) / a) * 100000 / 500) * 500 : 0
}
