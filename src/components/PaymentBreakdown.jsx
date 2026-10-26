import React, { useEffect, useState } from 'react'
import { Calculator, Phone, Info } from 'lucide-react'
import { fhaAnnualMipRate, monthlyPI, FHA_UPFRONT_MIP } from '../lib/payments'

// Rough conventional PMI by LTV; real quotes depend on credit score and the insurer
function conventionalPmiRate(ltv) {
  if (ltv > 90) return 0.0058
  if (ltv > 85) return 0.004
  if (ltv > 80) return 0.0026
  return 0
}

const HUD_CLOSING_CREDIT = 0.03

/**
 * Build the three owner-occupant scenarios shown on a property page.
 * `escrow` is the shared monthly housing cost: taxes, insurance, HOA, other.
 */
function buildScenarios({ price, fhaRate, convRate, termYears, convDownPct, closingPct, hudCreditPct, escrow }) {
  const closingCosts = price * (closingPct / 100)

  const fha = (label, down, hudCredit) => {
    const baseLoan = price - down
    const ltv = (baseLoan / price) * 100
    const upfrontMip = baseLoan * FHA_UPFRONT_MIP
    const totalLoan = baseLoan + upfrontMip
    const credit = hudCredit ? Math.min(closingCosts, price * Math.min(hudCreditPct, HUD_CLOSING_CREDIT * 100) / 100) : 0
    return {
      label,
      down,
      downLabel: hudCredit ? '' : '3.5%',
      baseLoan,
      upfrontMip,
      totalLoan,
      pi: monthlyPI(totalLoan, fhaRate, termYears),
      mi: (baseLoan * fhaAnnualMipRate(ltv, termYears)) / 12,
      miLabel: 'FHA MIP',
      closingCosts,
      credit,
    }
  }

  const convDown = price * (convDownPct / 100)
  const convLoan = price - convDown
  const conventional = {
    label: `Conventional ${convDownPct}% Down`,
    down: convDown,
    downLabel: `${convDownPct}%`,
    baseLoan: convLoan,
    upfrontMip: 0,
    totalLoan: convLoan,
    pi: monthlyPI(convLoan, convRate, termYears),
    mi: (convLoan * conventionalPmiRate((convLoan / price) * 100)) / 12,
    miLabel: 'PMI',
    closingCosts,
    credit: 0,
  }

  return withTotals([
    { ...fha('HUD $100 Down FHA', 100, true), rate: fhaRate, highlight: true },
    { ...fha('Standard FHA 3.5% Down', price * 0.035, false), rate: fhaRate },
    { ...conventional, rate: convRate },
  ], escrow)
}

const withTotals = (scenarios, escrow) => scenarios.map((s) => {
  const total = s.pi + s.mi + escrow.tax + escrow.insurance + escrow.hoa + escrow.other
  return { ...s, total, cashToClose: s.down + s.closingCosts - s.credit }
})

/** Investor purchase: no HUD closing help or FHA; investment-property loans at 10%, 20% and 25% down */
const INVESTOR_DOWN = [10, 20, 25]
function buildInvestorScenarios({ price, investorRate, termYears, closingPct, escrow }) {
  const closingCosts = price * (closingPct / 100)
  return withTotals(INVESTOR_DOWN.map((pct, i) => {
    const down = price * (pct / 100)
    const loan = price - down
    return {
      label: `Investor Loan ${pct}% Down`,
      down,
      downLabel: `${pct}%`,
      baseLoan: loan,
      upfrontMip: 0,
      totalLoan: loan,
      rate: investorRate,
      pi: monthlyPI(loan, investorRate, termYears),
      mi: 0,
      miLabel: '',
      closingCosts,
      credit: 0,
      highlight: i === 1,
    }
  }), escrow)
}

const usd = (n) => `$${Math.round(n).toLocaleString()}`

function NumberField({ label, value, onChange, prefix, suffix, step = 1, hint }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500">
        {prefix && <span className="pl-3 text-gray-500">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full min-w-0 rounded-lg px-3 py-2 focus:outline-none"
        />
        {suffix && <span className="pr-3 text-gray-500">{suffix}</span>}
      </div>
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </label>
  )
}

export default function PaymentBreakdown({ property, offerTerms, onEstimate }) {
  const listPrice = Number(property?.price) || 0
  // Buyers can try a different offer; HUD homes often sell above or below list
  const [offer, setOffer] = useState(listPrice)
  // null = follow the price at the NC average effective rate (~0.8%); buyers should check the county rate
  const [taxOverride, setTaxOverride] = useState(null)
  const [annualInsurance, setAnnualInsurance] = useState(1800)
  const [hoa, setHoa] = useState(0)
  const [otherFees, setOtherFees] = useState(0)
  const [fhaRate, setFhaRate] = useState(6.25)
  const [convRate, setConvRate] = useState(6.5)
  const [termYears, setTermYears] = useState(30)
  const [convDownPct, setConvDownPct] = useState(5)
  const [closingPct, setClosingPct] = useState(3)
  const [investorRate, setInvestorRate] = useState(7.25)

  // Follow the offer being prepared above, so the payment matches the deal numbers
  const termsOffer = Number(offerTerms?.offerPrice) || 0
  useEffect(() => { if (termsOffer > 0) setOffer(termsOffer) }, [termsOffer])
  const investor = offerTerms?.occupancy === 'investor'
  // The rate the buyer set in the offer builder's budget step
  const termsRate = Number(offerTerms?.loanRate) || 0
  useEffect(() => { if (termsRate > 0) (investor ? setInvestorRate : setFhaRate)(termsRate) }, [termsRate, investor])
  // HUD pays the closing help the owner-occupant asks for in the offer (up to 3%)
  const hudCreditPct = offerTerms?.occupancy === 'owner' ? Number(offerTerms.closingAssistPercent) || 0 : HUD_CLOSING_CREDIT * 100

  const price = Number(offer) || 0
  const annualTax = taxOverride ?? Math.round(price * 0.008)
  const sliderMin = Math.round((listPrice * 0.7) / 500) * 500
  const sliderMax = Math.round((listPrice * 1.15) / 500) * 500
  const diffPct = ((price - listPrice) / listPrice) * 100

  const escrow = {
    tax: (Number(annualTax) || 0) / 12,
    insurance: (Number(annualInsurance) || 0) / 12,
    hoa: Number(hoa) || 0,
    other: Number(otherFees) || 0,
  }
  const scenarios = investor
    ? buildInvestorScenarios({ price, investorRate: Number(investorRate) || 0, termYears, closingPct: Number(closingPct) || 0, escrow })
    : buildScenarios({
      price,
      fhaRate: Number(fhaRate) || 0,
      convRate: Number(convRate) || 0,
      termYears,
      convDownPct,
      closingPct: Number(closingPct) || 0,
      hudCreditPct,
      escrow,
    })
  const [hud, standardFha] = scenarios

  // Summary saved with the buyer's offer so the broker sees the same payment picture
  const estimate = price > 0 ? {
    price,
    occupancy: investor ? 'investor' : 'owner',
    term_years: termYears,
    closing_cost_percent: Number(closingPct) || 0,
    annual_tax: Number(annualTax) || 0,
    annual_insurance: Number(annualInsurance) || 0,
    hoa_monthly: escrow.hoa,
    other_monthly: escrow.other,
    scenarios: scenarios.map((s) => ({
      label: s.label,
      rate: s.rate,
      down: Math.round(s.down),
      loan: Math.round(s.totalLoan),
      principal_interest: Math.round(s.pi),
      mortgage_insurance: Math.round(s.mi),
      monthly_total: Math.round(s.total),
      cash_to_close: Math.round(s.cashToClose),
    })),
  } : null
  const estimateKey = JSON.stringify(estimate)
  useEffect(() => { onEstimate?.(estimateKey === 'null' ? null : JSON.parse(estimateKey)) }, [estimateKey, onEstimate])

  const rows = [
    { section: 'Loan' },
    { label: 'Down payment', get: (s) => (s.downLabel ? `${usd(s.down)} (${s.downLabel})` : usd(s.down)) },
    { label: 'Interest rate', get: (s) => `${s.rate}%` },
    { label: 'Base loan amount', get: (s) => usd(s.baseLoan) },
    !investor && { label: 'Upfront MIP (1.75%, financed)', get: (s) => (s.upfrontMip ? usd(s.upfrontMip) : '—') },
    { label: 'Total loan amount', get: (s) => usd(s.totalLoan) },
    { section: 'Monthly payment' },
    { label: 'Principal & interest', get: (s) => usd(s.pi) },
    { label: 'Mortgage insurance', get: (s) => (s.mi ? `${usd(s.mi)} ${s.miLabel}` : 'None') },
    { label: 'Property taxes', get: () => usd(escrow.tax) },
    { label: "Homeowner's insurance", get: () => usd(escrow.insurance) },
    { label: 'HOA dues', get: () => (escrow.hoa ? usd(escrow.hoa) : '—') },
    { label: 'Other fees', get: () => (escrow.other ? usd(escrow.other) : '—') },
    { label: 'Total monthly payment', get: (s) => usd(s.total), strong: true },
    { section: 'Cash to close' },
    { label: 'Down payment', get: (s) => usd(s.down) },
    { label: `Est. closing costs (${closingPct || 0}%)`, get: (s) => usd(s.closingCosts) },
    !investor && { label: `HUD pays closing costs (${Math.min(hudCreditPct, 3)}% requested)`, get: (s) => (s.credit ? `−${usd(s.credit)}` : '—'), credit: true },
    { label: 'Estimated cash to close', get: (s) => usd(s.cashToClose), strong: true },
  ].filter(Boolean)

  if (!listPrice) return null

  return (
    <div className="bg-white border rounded-lg p-6 mb-8">
      <h2 className="text-2xl font-bold mb-1 flex items-center">
        <Calculator className="h-6 w-6 mr-2 text-blue-600" />
        {investor ? 'Investor Payment Breakdown' : 'Owner-Occupant Payment Breakdown'}
      </h2>
      <p className="text-gray-600 mb-6">
        {investor
          ? `Investment-property loans at 10%, 20% and 25% down on a ${usd(price)} purchase. Investors pay their own closing costs.`
          : `Compare HUD's $100 down FHA program against a standard FHA or conventional purchase at ${usd(price)}.`}
        {termsOffer > 0 && price === termsOffer && <span className="block text-sm text-blue-700 mt-1">Following the offer you're preparing above.</span>}
      </p>

      {/* Offer price */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full sm:w-56">
            <NumberField label="Your offer price" prefix="$" value={offer} onChange={setOffer} step={500} />
          </div>
          <div className="flex-1 min-w-0 text-sm text-gray-700 pb-2">
            List price {usd(listPrice)}
            {price > 0 && Math.abs(diffPct) >= 0.05 && (
              <span className={`ml-2 font-semibold ${diffPct < 0 ? 'text-green-700' : 'text-amber-700'}`}>
                {Math.abs(diffPct).toFixed(1)}% {diffPct < 0 ? 'below' : 'above'} list
              </span>
            )}
            {price !== listPrice && (
              <button
                type="button"
                onClick={() => setOffer(listPrice)}
                className="ml-3 text-blue-600 hover:underline"
              >
                Reset to list
              </button>
            )}
          </div>
        </div>
        <input
          type="range"
          aria-label="Offer price"
          min={sliderMin}
          max={sliderMax}
          step={500}
          value={Math.min(sliderMax, Math.max(sliderMin, price))}
          onChange={(e) => setOffer(Number(e.target.value))}
          className="mt-3 w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>{usd(sliderMin)}</span>
          <span>{usd(sliderMax)}</span>
        </div>
      </div>

      {price > 0 && (
        <>

          {/* Headline comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {scenarios.map((s) => (
              <div
                key={s.label}
                className={`rounded-lg p-4 text-center ${s.highlight ? 'bg-blue-600 text-white' : 'bg-gray-50'}`}
              >
                <p className={`text-sm font-semibold ${s.highlight ? 'text-blue-100' : 'text-gray-600'}`}>{s.label}</p>
                <p className="text-3xl font-bold my-1">{usd(s.total)}<span className="text-base font-normal">/mo</span></p>
                <p className={`text-sm ${s.highlight ? 'text-blue-100' : 'text-gray-600'}`}>
                  {usd(s.cashToClose)} cash to close
                </p>
              </div>
            ))}
          </div>

          {investor ? (
            <p className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
              Each step from 10% to 25% down adds about <strong>{usd(scenarios[2].cashToClose - scenarios[0].cashToClose)}</strong> to
              cash to close and lowers the payment by about <strong>{usd(scenarios[0].total - scenarios[2].total)}/mo</strong>. 10% down
              investor loans are usually portfolio or non-QM loans priced above the rate shown; ask your lender for each tier.
            </p>
          ) : (
          <p className="mb-6 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
            With HUD's $100 down and up to 3% toward closing costs, an owner-occupant could bring about{' '}
            <strong>{usd(Math.max(0, standardFha.cashToClose - hud.cashToClose))} less</strong> to closing than a
            standard 3.5% down FHA purchase.
          </p>
          )}

          {/* Inputs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <NumberField
              label="Property taxes / yr"
              prefix="$"
              value={annualTax}
              onChange={setTaxOverride}
              step={50}
              hint={taxOverride === null ? 'Est. 0.8% of price — check county rate' : 'Your figure'}
            />
            <NumberField label="Insurance / yr" prefix="$" value={annualInsurance} onChange={setAnnualInsurance} step={50} hint="Coastal homes run higher" />
            <NumberField label="HOA dues / mo" prefix="$" value={hoa} onChange={setHoa} step={5} hint="If applicable" />
            <NumberField label="Other fees / mo" prefix="$" value={otherFees} onChange={setOtherFees} step={5} hint="Flood ins., special assessments" />
            {investor ? (
              <NumberField label="Investor loan rate" suffix="%" value={investorRate} onChange={setInvestorRate} step={0.125} hint="Investment property" />
            ) : (
              <>
                <NumberField label="FHA rate" suffix="%" value={fhaRate} onChange={setFhaRate} step={0.125} />
                <NumberField label="Conventional rate" suffix="%" value={convRate} onChange={setConvRate} step={0.125} />
              </>
            )}
            <NumberField label="Closing costs" suffix="%" value={closingPct} onChange={setClosingPct} step={0.25} hint="Of purchase price" />
            <div className="col-span-2 lg:col-span-1 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-sm text-gray-600">Term</span>
                <select
                  value={termYears}
                  onChange={(e) => setTermYears(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={30}>30 yr</option>
                  <option value={15}>15 yr</option>
                </select>
              </label>
              {!investor && <label className="block">
                <span className="text-sm text-gray-600">Conv. down</span>
                <select
                  value={convDownPct}
                  onChange={(e) => setConvDownPct(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[5, 10, 15, 20].map((p) => (
                    <option key={p} value={p}>{p}%</option>
                  ))}
                </select>
              </label>}
            </div>
          </div>

          {/* Detailed table */}
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-2 text-left font-semibold text-gray-600"></th>
                  {scenarios.map((s) => (
                    <th
                      key={s.label}
                      className={`py-2 px-2 text-right font-semibold ${s.highlight ? 'text-blue-700' : 'text-gray-900'}`}
                    >
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) =>
                  row.section ? (
                    <tr key={i}>
                      <td colSpan={4} className="pt-4 pb-1 text-xs font-bold uppercase tracking-wide text-gray-500">
                        {row.section}
                      </td>
                    </tr>
                  ) : (
                    <tr key={i} className={row.strong ? 'border-t font-bold' : 'border-b border-gray-100'}>
                      <td className="py-2 pr-2 text-gray-700">{row.label}</td>
                      {scenarios.map((s) => (
                        <td
                          key={s.label}
                          className={`py-2 px-2 text-right whitespace-nowrap ${
                            row.credit && s.credit ? 'text-green-700 font-semibold' : ''
                          } ${s.highlight ? 'bg-blue-50' : ''}`}
                        >
                          {row.get(s)}
                        </td>
                      ))}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <p className="flex-1 text-xs text-gray-500 flex items-start">
          <Info className="h-4 w-4 mr-1 flex-shrink-0" />
          Estimates only, not a loan offer. Rates are sample figures you can edit. The $100 down program is for
          owner-occupant buyers using FHA financing on eligible HUD homes; HUD's closing cost help is requested in
          the bid and capped at 3% of the purchase price. Standard FHA and conventional columns assume the buyer pays
          their own closing costs. PMI varies with credit score. Taxes, insurance and HOA dues vary by property.
        </p>
        <a
          href="tel:9103636147"
          className="bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center whitespace-nowrap"
        >
          <Phone className="h-4 w-4 mr-2" />
          Talk to Lightkeeper Realty
        </a>
      </div>
    </div>
  )
}
