import React, { useState } from 'react'
import { Calculator, Phone, Info } from 'lucide-react'

// Annual FHA MIP (HUD Mortgagee Letter 2023-05), loans at or under the standard limit
function fhaAnnualMipRate(ltv, termYears) {
  if (termYears > 15) return ltv > 95 ? 0.0055 : 0.005
  return ltv > 90 ? 0.004 : 0.0015
}

// Rough conventional PMI by LTV; real quotes depend on credit score and the insurer
function conventionalPmiRate(ltv) {
  if (ltv > 90) return 0.0058
  if (ltv > 85) return 0.004
  if (ltv > 80) return 0.0026
  return 0
}

function monthlyPI(principal, annualRatePct, termYears) {
  const n = termYears * 12
  const r = annualRatePct / 100 / 12
  if (r === 0) return principal / n
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

const FHA_UPFRONT_MIP = 0.0175
const HUD_CLOSING_CREDIT = 0.03

/**
 * Build the three owner-occupant scenarios shown on a property page.
 * `escrow` is the shared monthly housing cost: taxes, insurance, HOA, other.
 */
function buildScenarios({ price, fhaRate, convRate, termYears, convDownPct, closingPct, escrow }) {
  const closingCosts = price * (closingPct / 100)

  const fha = (label, down, hudCredit) => {
    const baseLoan = price - down
    const ltv = (baseLoan / price) * 100
    const upfrontMip = baseLoan * FHA_UPFRONT_MIP
    const totalLoan = baseLoan + upfrontMip
    const credit = hudCredit ? Math.min(closingCosts, price * HUD_CLOSING_CREDIT) : 0
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

  return [
    { ...fha('HUD $100 Down FHA', 100, true), highlight: true },
    fha('Standard FHA 3.5% Down', price * 0.035, false),
    conventional,
  ].map((s) => {
    const total = s.pi + s.mi + escrow.tax + escrow.insurance + escrow.hoa + escrow.other
    return { ...s, total, cashToClose: s.down + s.closingCosts - s.credit }
  })
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

export default function PaymentBreakdown({ property }) {
  const price = Number(property?.price) || 0
  // NC average effective property tax is roughly 0.8% of value; buyers should check the county rate
  const [annualTax, setAnnualTax] = useState(Math.round(price * 0.008))
  const [annualInsurance, setAnnualInsurance] = useState(1800)
  const [hoa, setHoa] = useState(0)
  const [otherFees, setOtherFees] = useState(0)
  const [fhaRate, setFhaRate] = useState(6.25)
  const [convRate, setConvRate] = useState(6.5)
  const [termYears, setTermYears] = useState(30)
  const [convDownPct, setConvDownPct] = useState(5)
  const [closingPct, setClosingPct] = useState(3)

  if (!price) return null

  const escrow = {
    tax: (Number(annualTax) || 0) / 12,
    insurance: (Number(annualInsurance) || 0) / 12,
    hoa: Number(hoa) || 0,
    other: Number(otherFees) || 0,
  }
  const scenarios = buildScenarios({
    price,
    fhaRate: Number(fhaRate) || 0,
    convRate: Number(convRate) || 0,
    termYears,
    convDownPct,
    closingPct: Number(closingPct) || 0,
    escrow,
  })
  const [hud, standardFha] = scenarios

  const rows = [
    { section: 'Loan' },
    { label: 'Down payment', get: (s) => (s.downLabel ? `${usd(s.down)} (${s.downLabel})` : usd(s.down)) },
    { label: 'Base loan amount', get: (s) => usd(s.baseLoan) },
    { label: 'Upfront MIP (1.75%, financed)', get: (s) => (s.upfrontMip ? usd(s.upfrontMip) : '—') },
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
    { label: 'HUD pays closing costs (up to 3%)', get: (s) => (s.credit ? `−${usd(s.credit)}` : '—'), credit: true },
    { label: 'Estimated cash to close', get: (s) => usd(s.cashToClose), strong: true },
  ]

  return (
    <div className="bg-white border rounded-lg p-6 mb-8">
      <h2 className="text-2xl font-bold mb-1 flex items-center">
        <Calculator className="h-6 w-6 mr-2 text-blue-600" />
        Owner-Occupant Payment Breakdown
      </h2>
      <p className="text-gray-600 mb-6">
        Compare HUD's $100 down FHA program against a standard FHA or conventional purchase at {usd(price)}.
      </p>

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

      <p className="mb-6 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
        With HUD's $100 down and up to 3% toward closing costs, an owner-occupant could bring about{' '}
        <strong>{usd(Math.max(0, standardFha.cashToClose - hud.cashToClose))} less</strong> to closing than a
        standard 3.5% down FHA purchase.
      </p>

      {/* Inputs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <NumberField label="Property taxes / yr" prefix="$" value={annualTax} onChange={setAnnualTax} step={50} hint="Est. 0.8% — check county rate" />
        <NumberField label="Insurance / yr" prefix="$" value={annualInsurance} onChange={setAnnualInsurance} step={50} hint="Coastal homes run higher" />
        <NumberField label="HOA dues / mo" prefix="$" value={hoa} onChange={setHoa} step={5} hint="If applicable" />
        <NumberField label="Other fees / mo" prefix="$" value={otherFees} onChange={setOtherFees} step={5} hint="Flood ins., special assessments" />
        <NumberField label="FHA rate" suffix="%" value={fhaRate} onChange={setFhaRate} step={0.125} />
        <NumberField label="Conventional rate" suffix="%" value={convRate} onChange={setConvRate} step={0.125} />
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
          <label className="block">
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
          </label>
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
