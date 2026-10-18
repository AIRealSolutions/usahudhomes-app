/**
 * Suggested replies for a lead on the Manage Lead page. Each one opens the email
 * or SMS composer pre-filled, so the broker can edit before sending.
 * Street addresses stay behind the login, so homes are linked rather than spelled out.
 */

const SITE_URL = 'https://www.usahudhomes.com'

export const INQUIRY_LABELS = {
  property_inquiry: 'Asked about a home',
  agent_callback_request: 'Requested an agent callback',
  account_signup: 'Created a buyer account',
  registered_buyer: 'Registered buyer',
  hud_home_alerts: 'Signed up for HUD home alerts',
  website: 'Contact form',
  agent_request: 'Requested an agent',
  facebook: 'Facebook lead',
  general: 'General inquiry',
}

export const labelFor = (value) =>
  INQUIRY_LABELS[value] || (value ? String(value).replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) : 'Website')

const money = (v) => (v || v === 0 ? `$${Number(v).toLocaleString()}` : '')

/**
 * @param {object} args
 * @param {object} args.lead      consultation row
 * @param {object} [args.property] the home they asked about
 * @param {{ first: string, full: string, phone: string, email: string }} args.sender
 * @returns {Array<{ id, title, why, subject, body, sms }>}
 */
export function suggestedReplies({ lead, property, sender }) {
  const first = lead.first_name || String(lead.customer_name || '').split(' ')[0] || 'there'
  const caseNumber = property?.case_number || lead.case_number
  const homeUrl = caseNumber ? `${SITE_URL}/property/${encodeURIComponent(caseNumber)}` : null
  const where = property?.city ? `${property.city}, ${property.state}` : lead.preferred_location || (lead.state ? `your area` : 'your area')
  const homeLine = property
    ? `the HUD home in ${where}${property.price ? ` listed at ${money(property.price)}` : ''}`
    : 'the HUD home you asked about'
  const signoff = `\n\nBest regards,\n${sender.full}${sender.phone ? `\n${sender.phone}` : ''}\nLightkeeper Realty, Registered HUD Buyer's Agency`
  const smsSign = ` - ${sender.first}${sender.phone ? ` ${sender.phone}` : ''}`
  const preApproved = lead.pre_approved === true
  const replies = []

  if (caseNumber) {
    replies.push({
      id: 'property_answer',
      title: 'Answer their property question',
      why: `They asked about Case #${caseNumber}.`,
      subject: `Your question about ${property?.city ? `the HUD home in ${property.city}` : `HUD case #${caseNumber}`}`,
      body: `Hi ${first},\n\nThank you for reaching out about ${homeLine}.${lead.message ? ` You asked: "${String(lead.message).trim().slice(0, 300)}"` : ''}\n\nHere is the listing with photos, price history and the full address once you sign in:\n${homeUrl}\n\nI can set up a showing, pull the condition report, and walk you through what it would take to bid. When is a good time to talk?${signoff}`,
      sms: `Hi ${first}, this is ${sender.first} with Lightkeeper Realty about the HUD home you asked about (case ${caseNumber}). Happy to answer questions or set up a showing. When's a good time to talk?${smsSign}`,
    })
  }

  replies.push({
    id: 'showing',
    title: 'Offer a showing',
    why: 'Move them toward seeing a home in person.',
    subject: caseNumber ? 'Want to see this HUD home in person?' : 'Want to tour some HUD homes?',
    body: `Hi ${first},\n\nI'd be glad to show you ${caseNumber ? homeLine : `a few HUD homes in ${where}`}. HUD homes are sold as-is, so seeing it in person (and bringing a contractor if you like) is the best way to judge repairs before bidding.\n\nI have openings this week:\n- [Day/time option 1]\n- [Day/time option 2]\n\nWhich works better for you?${signoff}`,
    sms: `Hi ${first}, would you like to see ${caseNumber ? 'the home' : 'some HUD homes'} in person this week? I have [day/time] or [day/time] open.${smsSign}`,
  })

  replies.push({
    id: 'financing',
    title: preApproved ? 'Confirm financing details' : 'Financing & pre-approval',
    why: preApproved ? 'They said they are pre-approved.' : 'HUD bids need proof of financing or funds.',
    subject: 'Financing your HUD home',
    body: preApproved
      ? `Hi ${first},\n\nGreat to hear you're pre-approved. To submit a HUD bid I'll need a copy of your pre-approval letter (or proof of funds for cash). If your lender offers FHA, ask about the $100-down program for owner-occupants and the 203(k) loan if the home needs repairs.\n\nCan you send the letter over when you have a moment?${signoff}`
      : `Hi ${first},\n\nA quick note on financing, since HUD needs proof of a loan pre-approval or funds with every bid:\n\n- Owner-occupants can often buy with just $100 down on an FHA loan\n- HUD may pay up to 3% toward closing costs\n- A 203(k) loan can roll repair costs into the mortgage\n\nHave you talked with a lender yet? If not, I can connect you with one who works with HUD buyers every week.${signoff}`,
    sms: preApproved
      ? `Hi ${first}, to submit a HUD bid I'll need a copy of your pre-approval letter. Can you text or email it to me?${smsSign}`
      : `Hi ${first}, HUD bids need a lender pre-approval. Owner-occupants can often buy with $100 down (FHA). Want me to connect you with a lender?${smsSign}`,
  })

  replies.push({
    id: 'bidding',
    title: 'How HUD bidding works',
    why: 'Explain the process and the owner-occupant advantage.',
    subject: 'How buying a HUD home works',
    body: `Hi ${first},\n\nHere's how buying a HUD home works:\n\n1. You choose a home and we review the condition report and comparable sales.\n2. HUD only accepts bids from a HUD-registered broker, so I submit your bid online.\n3. Owner-occupants get the first chance to bid during the exclusive listing period.\n4. Bids are reviewed after each deadline; if HUD accepts yours, we sign the contract within 48 hours and close in about 30-60 days.\n\nI can also show you what HUD has accepted on similar homes so your bid is competitive. Any questions so far?${signoff}`,
    sms: `Hi ${first}, quick overview: I submit your bid online (HUD requires a registered broker), owner-occupants get first priority, and closing is usually 30-60 days after acceptance. Want to talk through it?${smsSign}`,
  })

  replies.push({
    id: 'picks',
    title: 'Send homes I picked',
    why: 'Use "Insert picked homes" in the composer to add your picks.',
    subject: 'HUD homes I picked out for you',
    body: `Hi ${first},\n\nBased on what you're looking for${lead.price_range_max || lead.budget_max ? ` (up to ${money(lead.price_range_max || lead.budget_max)})` : ''}, here are some HUD homes worth a look.\n\n[Use "Insert picked homes" above to add them here]\n\nLet me know which ones you'd like to see, and I'll set up showings.${signoff}`,
    sms: `Hi ${first}, I found a few HUD homes that fit what you're looking for. [Insert picked homes]${smsSign}`,
  })

  if (['account_signup', 'registered_buyer', 'hud_home_alerts'].includes(lead.source) || lead.consultation_type === 'registered_buyer') {
    replies.push({
      id: 'welcome',
      title: 'Welcome a new member',
      why: `${labelFor(lead.source || lead.consultation_type)}.`,
      subject: 'Welcome to USAHUDhomes.com',
      body: `Hi ${first},\n\nThanks for signing up at USAHUDhomes.com! I'm ${sender.full}, a HUD-registered broker, and I'll be your point of contact.\n\nTo help me find the right homes, could you tell me:\n- Where you'd like to live\n- Your price range\n- How many bedrooms you need\n- Whether you plan to live in the home or invest\n\nI'll send homes that fit as soon as they list.${signoff}`,
      sms: `Hi ${first}, thanks for signing up at USAHUDhomes.com! I'm ${sender.first}, your HUD broker. What area and price range are you looking in? I'll send homes that fit.${smsSign}`,
    })
  }

  replies.push({
    id: 'check_in',
    title: 'Check in',
    why: 'For leads who have gone quiet.',
    subject: 'Still looking for a HUD home?',
    body: `Hi ${first},\n\nJust checking in. Are you still looking for a home${lead.preferred_location ? ` in ${lead.preferred_location}` : ''}? New HUD homes list every week, and I'm happy to keep an eye out for ones that fit.\n\nIf your plans have changed, no problem at all; just let me know.${signoff}`,
    sms: `Hi ${first}, ${sender.first} here. Still looking for a HUD home? New ones list every week and I'm happy to send ones that fit.${smsSign}`,
  })

  return replies
}
