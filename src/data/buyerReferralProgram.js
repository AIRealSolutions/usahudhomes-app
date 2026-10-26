/**
 * Nationwide Agent Referral Program — licensed agents anywhere in the U.S. refer a
 * buyer to Lightkeeper Realty for a North Carolina HUD home purchase.
 *
 * The database (supabase/migrations/20261028120000_agent_buyer_referral_program.sql)
 * enforces the same terms; these constants drive the copy, the estimate and the
 * agreement text that is snapshotted when a referral is accepted.
 */

export const REFERRAL_PCT = 0.15
export const REFERRAL_FEE_CAP = 2500
export const ASSUMED_COMMISSION_RATE = 0.03 // only for estimates before the actual commission is known
export const PROTECTION_MONTHS = 12

export const PROGRAM_TERMS_VERSION = '2026-10-v1'
export const AGREEMENT_VERSION = '2026-10-v1'

export const RECEIVING_BROKERAGE = {
  name: 'Lightkeeper Realty',
  state: 'NC',
  phone: '910-363-6147',
}

export const CONSENT_TEXT =
  'The buyer has agreed to be contacted by Lightkeeper Realty about buying a HUD home in North Carolina, ' +
  'and agreed that I may share their contact information for that purpose.'

/** Referral Fee = MIN(Actual Commission × 15%, $2,500) */
export const referralFee = (commission, pct = REFERRAL_PCT, cap = REFERRAL_FEE_CAP) =>
  Math.min(Math.round(Number(commission || 0) * pct * 100) / 100, cap)

/** Estimate from a contract price, assuming a 3% buyer-side commission. */
export const estimatedFee = (price) => referralFee(Number(price || 0) * ASSUMED_COMMISSION_RATE)

export const FEE_EXAMPLES = [50000, 100000, 150000, 200000, 300000, 400000, 500000, 750000, 1000000]
  .map(price => ({ price, commission: price * ASSUMED_COMMISSION_RATE, fee: estimatedFee(price) }))

export const money = (n, cents = false) =>
  n == null || n === '' ? '—'
    : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents ? 2 : 0 })

export const shortDate = (d) => (d
  ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00` : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—')

export const REFERRAL_STATUSES = {
  submitted:      { label: 'Submitted',       cls: 'bg-blue-100 text-blue-800' },
  needs_review:   { label: 'Under review',    cls: 'bg-yellow-100 text-yellow-800' },
  accepted:       { label: 'Accepted',        cls: 'bg-indigo-100 text-indigo-800' },
  declined:       { label: 'Declined',        cls: 'bg-gray-100 text-gray-700' },
  represented:    { label: 'Working with buyer', cls: 'bg-sky-100 text-sky-800' },
  under_contract: { label: 'Under contract',  cls: 'bg-orange-100 text-orange-800' },
  closed:         { label: 'Closed',          cls: 'bg-green-100 text-green-800' },
  canceled:       { label: 'Canceled',        cls: 'bg-gray-100 text-gray-700' },
  expired:        { label: 'Expired',         cls: 'bg-gray-100 text-gray-700' },
}

export const AGREEMENT_STATUSES = {
  awaiting_referring:   { label: 'Awaiting your signature',       cls: 'bg-yellow-100 text-yellow-800' },
  awaiting_lightkeeper: { label: 'Awaiting Lightkeeper signature', cls: 'bg-blue-100 text-blue-800' },
  executed:             { label: 'Executed',                       cls: 'bg-green-100 text-green-800' },
  void:                 { label: 'Void',                           cls: 'bg-gray-100 text-gray-700' },
}

export const PAYMENT_STATUSES = {
  pending:  { label: 'Pending',  cls: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Approved', cls: 'bg-blue-100 text-blue-800' },
  paid:     { label: 'Paid',     cls: 'bg-green-100 text-green-800' },
  void:     { label: 'Void',     cls: 'bg-gray-100 text-gray-700' },
}

export const VERIFICATION_STATUSES = {
  pending:   { label: 'Pending',   cls: 'bg-yellow-100 text-yellow-800' },
  verified:  { label: 'Verified',  cls: 'bg-green-100 text-green-800' },
  rejected:  { label: 'Rejected',  cls: 'bg-red-100 text-red-800' },
  suspended: { label: 'Suspended', cls: 'bg-gray-100 text-gray-700' },
}

export const ATTESTATIONS = [
  { key: 'attestBuyerDisclosure', label: 'I have given (or will give) the buyer written disclosure of this referral arrangement, as required, before the buyer signs a buyer agency agreement.' },
  { key: 'attestNoNcActivity',    label: 'I will not physically perform brokerage activities in North Carolina unless I hold the required North Carolina license.' },
  { key: 'attestFirmEligible',    label: 'My brokerage is licensed and may lawfully receive this referral fee under the rules of its own state.' },
]

/**
 * Brokerage-to-brokerage referral agreement. Snapshotted onto the agreement record
 * when Lightkeeper accepts the referral, so later edits never change a signed copy.
 * Have a North Carolina real estate attorney review this text before launch.
 */
export function buildAgreementText({ referral, agent, brokerage, effectiveAt, protectionEndsAt }) {
  const buyer = `${referral.buyer_first_name} ${referral.buyer_last_name}`.trim()
  return `BROKERAGE-TO-BROKERAGE BUYER REFERRAL AGREEMENT (version ${AGREEMENT_VERSION})

Referring Brokerage: ${brokerage?.name || '—'} (${brokerage?.state || '—'}), firm license ${brokerage?.firm_license_number || '—'}
Referring Agent: ${agent?.first_name || ''} ${agent?.last_name || ''}, license ${agent?.license_number || '—'} (${agent?.license_state || '—'})
Receiving Brokerage: ${RECEIVING_BROKERAGE.name}, North Carolina
Referred Buyer: ${buyer}
Effective Date: ${shortDate(effectiveAt)}
Protection Period Ends: ${shortDate(protectionEndsAt)}

1. Referral. The Referring Brokerage refers the Referred Buyer to the Receiving Brokerage for buyer representation in the purchase of HUD-owned residential property located in North Carolina. This is an open referral: it is not limited to a single property.

2. Referral Fee. If the Referred Buyer enters into a contract to purchase a North Carolina HUD home during the Protection Period while represented by the Receiving Brokerage, and that purchase closes, the Receiving Brokerage will pay the Referring Brokerage ${Math.round(REFERRAL_PCT * 100)}% of the buyer-side commission actually received by the Receiving Brokerage on that transaction, not to exceed ${money(REFERRAL_FEE_CAP)} per transaction. The fee is calculated from the commission actually received; any reduction in commission reduces the fee.

3. No Closing, No Fee. No fee is owed if the transaction does not close, is canceled, or is not covered by this Agreement. The fee is payable only after the Receiving Brokerage has received its commission.

4. Payment to Brokerage Only. The fee is paid only to the Referring Brokerage, never to an individual agent, and only if the Referring Brokerage is verified by the Receiving Brokerage as licensed and eligible to receive referral compensation under the laws of its state. The Referring Brokerage will provide a W-9 before payment.

5. Protection Period. This Agreement covers contracts entered into within ${PROTECTION_MONTHS} months after the Effective Date. Contracts entered into after the Protection Period ends are not covered.

6. No North Carolina Brokerage Activity. The Referring Brokerage and its agents will not physically perform brokerage activities in North Carolina unless properly licensed in North Carolina. The Receiving Brokerage alone represents the Referred Buyer in North Carolina.

7. Disclosure. The Referring Brokerage will give the Referred Buyer written disclosure of this referral arrangement, as required, before the buyer signs a buyer agency agreement with the Receiving Brokerage. The referral fee is paid from the Receiving Brokerage's commission and does not increase the buyer's cost.

8. Existing Representation. The Referring Brokerage has disclosed whether the Referred Buyer is a party to any existing buyer agency agreement. The Receiving Brokerage may review any such agreement before beginning representation and may decline the referral.

9. Compliance. This Agreement is intended as a referral between licensed brokerages consistent with the Real Estate Settlement Procedures Act (RESPA) and the rules of the North Carolina Real Estate Commission. Nothing in this Agreement is a payment for the referral of settlement services other than real estate brokerage services.

10. Entire Agreement. This is the entire agreement between the parties about this referral. It may be signed electronically or in counterparts, and an electronic signature or a signed PDF copy has the same effect as an original.`
}
