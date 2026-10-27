import React, { useState } from 'react'
import { DealMeterGauge } from './DealMeter'
import { meterLabel, waitLabel, PRICE_CUT } from '../lib/dealMeter'
import { maxPriceForPayment, monthlyPayment } from '../lib/payments'
import { watchStatus } from '../services/investorWatches'

const money = n => (n == null || !Number.isFinite(Number(n)) ? '—' : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }))
const pct = n => (Number.isFinite(n) ? (n * 100).toFixed(1) + '%' : '—')
const STEPS = ['Who is buying', 'Budget', 'Price the offer', 'Costs & net to HUD', 'Review & send']
const INVESTOR_DOWN = [10, 20, 25]

function Num({ id, label, value, onChange, prefix, suffix, step = 1, min = 0, max, hint }) {
  return (
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">
      {label}
      <div className="mt-1 flex items-center rounded-lg border bg-white focus-within:ring-2 focus-within:ring-blue-500">
        {prefix && <span className="pl-3 text-gray-500">{prefix}</span>}
        <input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value}
          onChange={e => onChange(e.target.value)} className="w-full min-w-0 rounded-lg px-3 py-2 focus:outline-none" />
        {suffix && <span className="pr-3 text-gray-500">{suffix}</span>}
      </div>
      {hint && <span className="text-xs font-normal text-gray-500">{hint}</span>}
    </label>
  )
}

/**
 * Guided offer builder: buyer type, budget, price (with deal meter and wait time),
 * costs and net to HUD, then review. All values live in the offer form it wraps.
 */
export default function OfferWizard({
  form, change, chooseBuyerType, commission, setCommission, property, asking, dom, reduced, originalList,
  hudNet, netRatio, assistance, listingCommission, buyerCommission, meter, timeline, estimate,
  statsLoading, statsError, message, busy, save, loanRate, setLoanRate, onShowFullForm,
  brokerFor, // client's first name when a broker is building this offer for them
}) {
  const [step, setStep] = useState(form.occupancy ? 2 : 0)
  const [target, setTarget] = useState(1500)
  const [investorDown, setInvestorDown] = useState(20)
  const isOwner = form.occupancy === 'owner'
  const isInvestor = form.occupancy === 'investor'
  const offer = Number(form.offer_price) || 0
  const investorAccess = watchStatus(property)
  const loan = isOwner ? 'hud100' : { downPercent: investorDown }
  const maxPrice = form.occupancy ? maxPriceForPayment(Number(target) || 0, { loan, rate: Number(loanRate) || 0 }) : 0
  const sliderMin = Math.round((asking * 0.6) / 500) * 500
  const sliderMax = Math.round((asking * 1.1) / 500) * 500
  const go = n => setStep(Math.max(0, Math.min(STEPS.length - 1, n)))
  const canNext = step !== 0 || !!form.occupancy

  return (
    <div className="space-y-5">
      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Offer steps">
        {STEPS.map((name, i) => (
          <li key={name}>
            <button type="button" onClick={() => (i === 0 || form.occupancy) && go(i)} aria-current={i === step ? 'step' : undefined}
              className={`rounded-full border px-3 py-1 ${i === step ? 'border-blue-700 bg-blue-700 text-white' : i < step ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-600'}`}>
              {i + 1}. {name}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold">Are you buying this HUD home to live in or as an investment?</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {[['owner', 'Owner Occupant', 'I will live in it as my primary residence. FHA $100-down financing and up to 3% closing help may be available.'],
              ['investor', 'Investor', 'I am buying to rent, flip or hold. No HUD closing help or FHA, and investors bid only after the owner-occupant period.']].map(([type, title, text]) => (
              <button key={type} type="button" aria-pressed={form.occupancy === type} onClick={() => chooseBuyerType(type)}
                className={`rounded-xl border-2 p-4 text-left ${form.occupancy === type ? 'border-blue-700 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                <strong className="block">{title}</strong><span className="text-sm text-gray-600">{text}</span>
              </button>
            ))}
          </div>
          {isInvestor && investorAccess.kind === 'waiting' && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              This home is open to owner-occupant bids only right now.
              {investorAccess.expected ? <> Investors can bid if no owner-occupant offer is accepted after bids open {investorAccess.expected.toLocaleDateString()}.</> : null}{' '}
              You can still prepare your offer, and your broker can add you to the investor watch list.
            </p>
          )}
          {isInvestor && investorAccess.kind === 'contract' && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">This home is under contract or no longer listed.</p>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">What monthly payment fits your budget?</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <Num id="wz-target" label="Target monthly payment" prefix="$" step={50} value={target} onChange={setTarget} hint="Including taxes and insurance" />
            <Num id="wz-rate" label={isOwner ? 'FHA rate' : 'Investor loan rate'} suffix="%" step={0.125} value={loanRate} onChange={setLoanRate} hint="Sample rate; ask your lender" />
            {isOwner ? (
              <label className="block text-sm font-medium text-gray-700">Financing
                <select className="mt-1 block w-full rounded-lg border p-2" value={form.financing} onChange={e => change('financing', e.target.value)}>
                  <option value="fha">FHA ($100 down on eligible homes)</option><option value="203k">FHA 203(k)</option><option value="conventional">Conventional</option><option value="cash">Cash</option>
                </select>
              </label>
            ) : (
              <label className="block text-sm font-medium text-gray-700">Down payment
                <select className="mt-1 block w-full rounded-lg border p-2" value={investorDown} onChange={e => setInvestorDown(Number(e.target.value))}>
                  {INVESTOR_DOWN.map(d => <option key={d} value={d}>{d}% down investor loan</option>)}
                </select>
              </label>
            )}
          </div>
          {isInvestor && (
            <label className="block text-sm font-medium text-gray-700 max-w-xs">Financing
              <select className="mt-1 block w-full rounded-lg border p-2" value={form.financing} onChange={e => change('financing', e.target.value)}>
                <option value="conventional">Investment loan</option><option value="cash">Cash</option>
              </select>
            </label>
          )}
          <div className="rounded-lg bg-blue-50 p-4">
            <p>With {money(target)}/mo at {loanRate}%, {isOwner ? "HUD's $100-down FHA" : `a ${investorDown}%-down investor loan`} fits a price up to about <strong>{money(maxPrice)}</strong>.</p>
            <p className="text-sm text-gray-700 mt-1">This home is listed at {money(asking)}{maxPrice && asking ? <>, which would be about {money(monthlyPayment(asking, { loan, rate: Number(loanRate) || 0 }))}/mo</> : null}.
              {isInvestor ? <> Cash to close at list: about {money(asking * investorDown / 100 + asking * 0.03)} (down payment plus about 3% closing costs).</> : null}</p>
            {maxPrice > 0 && (
              <button type="button" className="mt-2 text-blue-700 underline font-semibold" onClick={() => { change('offer_price', String(Math.min(maxPrice, asking))); go(2) }}>
                Start my offer at {money(Math.min(maxPrice, asking))}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500">Rough estimate with taxes at 0.8% of price and $1,800/yr insurance. The payment breakdown further down the page shows every line, and you can adjust taxes, insurance and HOA dues there. A lender's prequalification sets your real limit; you can upload it after saving a draft.</p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Price your offer</h3>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
            <div className="space-y-2">
              <Num id="wz-offer" label="Your offer" prefix="$" step={500} value={form.offer_price} onChange={v => change('offer_price', v)} />
              {asking > 0 && (
                <input type="range" aria-label="Offer amount" className="w-full accent-blue-700" min={sliderMin} max={sliderMax} step={500}
                  value={Math.min(sliderMax, Math.max(sliderMin, offer))} onChange={e => change('offer_price', e.target.value)} />
              )}
              <p className="text-sm text-gray-600">Asking {money(asking)}{dom !== null ? <> · on the market {dom} days</> : null}{reduced && originalList > asking ? <> · cut from {money(originalList)}</> : null}</p>
              <p className="text-sm">Net to HUD: <strong>{money(hudNet)}</strong> ({pct(netRatio)} of asking)</p>
              {estimate?.scenarios?.length > 0 && (
                <div className="rounded-lg border p-3 text-sm">
                  <p className="font-semibold mb-1">Monthly payment at this offer</p>
                  {estimate.scenarios.map(s => <p key={s.label} className="flex justify-between gap-2"><span>{s.label}</span><span>{money(s.monthly_total)}/mo · {money(s.cash_to_close)} to close</span></p>)}
                </div>
              )}
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              {statsLoading ? <p>Loading accepted offers…</p> : statsError ? <p>Deal meter unavailable: {statsError}</p> : meter ? (
                <>
                  <DealMeterGauge score={meter.score} size={200} />
                  <p className="font-bold -mt-1">{meterLabel(meter.score)}</p>
                  <p className="text-xs text-gray-600">Your net is at or above {meter.score}% of {meter.sample} {meter.basis}.</p>
                </>
              ) : <p className="text-sm">No accepted offers to compare yet.</p>}
            </div>
          </div>

          {timeline && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
              <p className="font-semibold">How long this offer may wait</p>
              <p className="text-sm">
                HUD cuts the price about {PRICE_CUT.percent}% every {PRICE_CUT.day} days a home goes unsold, and the net it accepts drops with it.
                At {money(hudNet)} net, this offer reaches the low end of accepted nets <strong>{waitLabel(timeline.possible?.wait)}</strong> and
                a typical accepted net <strong>{waitLabel(timeline.likely?.wait)}</strong>{!timeline.daysKnown ? ' (listing date unknown, so counted from today)' : ''}.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead><tr className="text-left text-gray-600"><th className="py-1">When</th><th>Likely price</th><th>Typical accepted net</th><th>Offer for typical net</th></tr></thead>
                  <tbody>
                    {timeline.schedule.map(r => (
                      <tr key={r.day} className="border-t border-amber-200">
                        <td className="py-1">{r.wait === 0 ? 'Today' : `Day ${r.day} (${waitLabel(r.wait).replace('in ', '')})`}</td>
                        <td>{money(r.list)}{r.cuts > 0 ? <span className="text-xs text-gray-600"> after {r.cuts} cut{r.cuts > 1 ? 's' : ''}</span> : null}</td>
                        <td>{money(r.typicalNet)}</td>
                        <td className={offer >= r.offerForTypical ? 'font-semibold text-green-800' : ''}>{money(r.offerForTypical)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-600">Based on offers HUD accepted at each stage. Waiting saves money but risks another buyer winning first, and HUD may not cut on schedule.</p>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Closing costs, commissions and net to HUD</h3>
          <p className="text-sm text-gray-600">HUD compares offers by what it keeps after paying these costs, called the net to HUD. A higher net wins, even when the offer price is the same.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {isOwner ? (
              <Num id="wz-closing" label="Closing help you ask HUD to pay" suffix="%" step={0.25} max={3} value={form.closing_cost_percent}
                onChange={v => change('closing_cost_percent', v)} hint="Up to 3% of the price. It lowers your cash to close and lowers HUD's net by the same amount." />
            ) : (
              <div className="rounded-lg border bg-gray-50 p-3 text-sm">HUD does not pay closing costs for investors, so the full offer less commissions counts toward the net.</div>
            )}
            <Num id="wz-earnest" label="Earnest money" prefix="$" step={100} value={form.earnest_money} onChange={v => change('earnest_money', v)}
              hint="HUD's required deposit depends on the price and region, often $500 to $2,000. Your broker confirms the amount." />
            <Num id="wz-listcomm" label="Listing broker commission" suffix="%" step={0.1} value={commission.listing} onChange={v => setCommission(c => ({ ...c, listing: v }))} />
            <Num id="wz-buycomm" label="Buyer's broker commission" suffix="%" step={0.1} value={commission.buyer} onChange={v => setCommission(c => ({ ...c, buyer: v }))} />
          </div>
          <div className="rounded-lg bg-blue-50 p-4 space-y-1 text-sm">
            <p className="flex justify-between"><span>Offer</span><span>{money(offer)}</span></p>
            {isOwner && <p className="flex justify-between"><span>Closing help ({form.closing_cost_percent || 0}%)</span><span>−{money(assistance)}</span></p>}
            <p className="flex justify-between"><span>Listing commission ({commission.listing}%)</span><span>−{money(listingCommission)}</span></p>
            <p className="flex justify-between"><span>Buyer's broker commission ({commission.buyer}%)</span><span>−{money(buyerCommission)}</span></p>
            <p className="flex justify-between border-t border-blue-200 pt-1 font-bold"><span>Net to HUD</span><span>{money(hudNet)}</span></p>
            {meter && <p className="text-gray-700">Deal meter: {meter.score} ({meterLabel(meter.score)}). {isOwner && Number(form.closing_cost_percent) > 0 ? 'Asking for less closing help raises your net without raising your price.' : ''}</p>}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Review your offer</h3>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {[['Buyer type', isOwner ? 'Owner occupant' : 'Investor'], ['Offer', money(offer)], ['Financing', form.financing], ['Earnest money', money(form.earnest_money)],
              ['Net to HUD', `${money(hudNet)} (${pct(netRatio)} of asking)`], ['Deal meter', meter ? `${meter.score} · ${meterLabel(meter.score)}` : '—'],
              ['Typical acceptance', timeline ? waitLabel(timeline.likely?.wait) : '—'],
              ['Payment', estimate?.scenarios?.length ? estimate.scenarios.map(s => `${s.label}: ${money(s.monthly_total)}/mo`).join('; ') : 'See payment breakdown']]
              .map(([k, v]) => <div key={k} className="flex justify-between gap-3 border-b py-1"><dt className="text-gray-600">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
          </dl>
          <label className="block text-sm font-medium">{brokerFor ? `Message to ${brokerFor}` : 'Notes for broker'}
            <textarea className="mt-1 block w-full rounded-lg border p-2" value={form.notes} onChange={e => change('notes', e.target.value)} placeholder={brokerFor ? 'Why this price? Comps, repairs to plan for, bid strategy…' : undefined} />
          </label>
          {brokerFor ? (
            <p className="text-sm text-gray-600">{brokerFor} gets a link to review this offer, then can accept it (authorizing you to submit the bid), ask for changes, decline, or save it to their favorites. The net to HUD, deal meter, wait and payment estimates go with it.</p>
          ) : <>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={!!form.referral_consent} onChange={e => change('referral_consent', e.target.checked)} />
            If no broker is assigned, I authorize USAHUDhomes to share a limited, non-identifying offer summary with eligible brokers for referral matching. Buyer contact information stays private until assignment.
          </label>
          <p className="text-sm text-gray-600">Your net to HUD, deal meter, wait estimate and payment estimate are saved with the offer for your broker. After saving, open the offer from "Your saved proposals" to add deed details and upload your prequalification letter.</p>
          </>}
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={() => save('draft')} className="rounded-lg bg-gray-800 px-4 py-2 text-white disabled:opacity-50">{form.id ? 'Update draft' : 'Save draft'}</button>
            <button type="button" disabled={busy} onClick={() => save('submitted')} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">{brokerFor ? `Send offer to ${brokerFor}` : 'Send proposal for review'}</button>
          </div>
        </div>
      )}

      {message && <p role="status" className="text-blue-800">{message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <button type="button" className="text-sm text-blue-700 underline" onClick={onShowFullForm}>Show the full form instead</button>
        <div className="flex gap-3">
          {step > 0 && <button type="button" onClick={() => go(step - 1)} className="rounded-lg border px-4 py-2">Back</button>}
          {step < STEPS.length - 1 && <button type="button" disabled={!canNext} onClick={() => go(step + 1)} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">Next: {STEPS[step + 1]}</button>}
        </div>
      </div>
    </div>
  )
}
