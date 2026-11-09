/**
 * Fills NC REALTORS® Standard Form 730 (Referral Agreement, rev. 7/2026) for a
 * Broker Finder referral. The form has no fillable fields, so values are written
 * at the positions of its blanks (US Letter, PDF points from the bottom-left).
 *
 * The blank form is NOT kept in this repository (the repo is public and the form
 * is licensed to NC REALTORS® members). The admin uploads their copy to the private
 * Supabase Storage bucket below; it is only ever sent out filled in, to the broker
 * who accepted that referral.
 *
 * The uploaded copy is expected to already show the referring agent's name and firm
 * address (as the copy produced in Lone Wolf Transact does), so those two blanks on
 * page 1 are left alone.
 *
 * Underscore prefix: Vercel does not turn this file into an endpoint.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export const FORM_BUCKET = 'private-forms'
export const FORM_PATH = 'referral-agreement-730.pdf'
export const DEFAULT_FEE_PERCENT = 25
export const DEFAULT_TERM_MONTHS = 6
export const DEFAULT_PAYMENT_DAYS = 10

export function referringFirm() {
  return {
    firmName: process.env.REFERRAL_FIRM_NAME || 'Lightkeeper Realty',
    firmLicense: process.env.REFERRAL_FIRM_LICENSE || '',
    agentName: process.env.REFERRAL_AGENT_NAME || 'Marc Spencer',
    agentLicense: process.env.REFERRAL_AGENT_LICENSE || '',
    address: process.env.REFERRAL_FIRM_ADDRESS || '701 E Moore Street, Southport NC 28461',
    phone: process.env.REFERRAL_FIRM_PHONE || '(910) 363-6147',
    email: process.env.REFERRAL_FIRM_EMAIL || process.env.GMAIL_USER || '',
  }
}

const fmtDate = d => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' }) : '')

/**
 * @param {Uint8Array} template  the uploaded blank Form 730
 * @param {object} d  { referring, receiving: {firmName, agentName, address, phone, email},
 *   prospect: {name, address, phone, email}, prospectAware: true|false|null,
 *   notes: string[], feePercent, endDate (YYYY-MM-DD), paymentDays }
 */
export async function fillReferralAgreement(template, d) {
  const pdf = await PDFDocument.load(template)
  const [p1, p2] = pdf.getPages()
  if (!p1 || !p2) throw new Error('The uploaded referral form should have two pages (NC Form 730).')
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const ink = rgb(0.05, 0.1, 0.45)

  // Write text on a blank, shrinking it to fit the blank's width
  const put = (page, text, x, y, maxWidth, { size = 9, f = font } = {}) => {
    let t = String(text ?? '').replace(/\s+/g, ' ').trim()
    if (!t) return
    let s = size
    while (s > 6 && f.widthOfTextAtSize(t, s) > maxWidth) s -= 0.5
    while (t.length > 1 && f.widthOfTextAtSize(t, s) > maxWidth) t = t.slice(0, -1)
    page.drawText(t, { x, y: y + 1.5, size: s, font: f, color: ink })
  }
  const check = (page, x, y) => page.drawText('X', { x: x + 1.2, y: y + 0.6, size: 9, font: bold, color: ink })

  const r = d.referring, v = d.receiving, pr = d.prospect || {}

  // ── Page 1: firm and prospect information ────────────────────────────────
  // Referring firm (agent name and address are pre-printed on the uploaded copy)
  put(p1, r.firmName, 90, 710.6, 300)
  put(p1, r.firmLicense, 432, 710.6, 140)
  put(p1, r.agentLicense, 432, 697.4, 140)
  put(p1, r.phone, 67, 671.0, 120)
  put(p1, r.email, 343, 671.0, 230)
  // Receiving firm
  put(p1, v.firmName, 90, 631.3, 300)
  put(p1, v.firmLicense, 432, 631.3, 140)
  put(p1, v.agentName, 93, 618.1, 300)
  put(p1, v.agentLicense, 432, 618.1, 140)
  put(p1, v.address, 97, 604.9, 475)
  put(p1, v.phone, 67, 591.6, 120)
  put(p1, v.email, 343, 591.6, 230)
  // Prospect
  put(p1, pr.name, 65, 552.0, 505)
  put(p1, pr.address, 78, 538.8, 495)
  put(p1, pr.phone, 67, 525.4, 120)
  put(p1, pr.email, 343, 525.4, 230)
  if (d.prospectAware === true) check(p1, 91.3, 495.1)
  if (d.prospectAware === false) check(p1, 112.1, 495.1)
  // Information / notes
  ;(d.notes || []).slice(0, 5).forEach((line, i) => put(p1, line, 36, 428 - i * 11.5, 540))
  // Compensation: listing side N/A, buyer side %, other N/A
  put(p1, 'N/A', 70, 334.0, 50)
  check(p1, 36, 276.5)
  put(p1, String(d.feePercent ?? DEFAULT_FEE_PERCENT), 72, 276.5, 50, { f: bold })
  put(p1, 'N/A', 88, 219.0, 100)
  // End date and payment days
  put(p1, fmtDate(d.endDate), 294, 155.8, 120)
  put(p1, String(d.paymentDays ?? DEFAULT_PAYMENT_DAYS), 205, 144.3, 28)

  // ── Page 2: signature blocks (signatures and dates left for wet/e-signature) ──
  const block = (y, f) => {
    put(p2, f.firmName, 143, y, 150)
    put(p2, f.firmLicense, 361, y, 70)
    put(p2, f.phone, 476, y, 100)
    put(p2, f.agentLicense, 361, y - 15, 70)
    put(p2, f.address, 105, y - 29.9, 470)
    put(p2, [f.phone, f.email].filter(Boolean).join(' · '), 203, y - 44.9, 372)
  }
  block(631.9, { ...r, address: r.address })
  block(537.5, { firmName: v.firmName, firmLicense: v.firmLicense, phone: v.phone, agentLicense: v.agentLicense, address: v.address, email: v.email })

  return pdf.save()
}
