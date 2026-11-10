/**
 * Call / Text / Email buttons for a partner agent, with ready-made messages.
 * Text opens the phone's messaging app (sms: link, iPhone and Android); Email opens
 * the mail app (mailto:). The message can be edited before sending.
 */
import React, { useMemo, useState } from 'react'
import { Phone, MessageSquare, Mail, Copy, Check } from 'lucide-react'
import { smsHref, mailtoHref } from '../../services/brokerFinder'

const SITE = 'https://usahudhomes.com'

function templates({ first, sender, company, agreementMissing, openBuyers }) {
  const me = `${sender}${company ? ` with ${company}` : ''} / USAHUDhomes.com`
  return [
    {
      id: 'checkin', label: 'Check in on my buyer',
      subject: 'Update on the HUD buyer I referred',
      body: `Hi ${first}, this is ${me}. Checking in on the HUD buyer I referred to you. Any update on showings or an offer?`,
    },
    {
      id: 'new_buyer', label: 'New buyer sent',
      subject: 'New HUD buyer in your USAHUDhomes.com account',
      body: `Hi ${first}, this is ${me}. I just sent a HUD buyer to your USAHUDhomes.com account. Please sign in at ${SITE}/login and reach out to them today.`,
    },
    {
      id: 'agreement', label: agreementMissing ? 'Referral agreement reminder' : 'Referral agreement',
      subject: 'Referral agreement (NC REALTORS® Form 730)',
      body: `Hi ${first}, this is ${me}. A quick reminder to sign and return the referral agreement (NC REALTORS® Form 730) for the HUD buyer referral. You can reply with the signed copy. Thank you!`,
    },
    {
      id: 'login', label: 'How to sign in',
      subject: 'Your USAHUDhomes.com partner account',
      body: `Hi ${first}, this is ${me}. Your USAHUDhomes.com partner account is ready. Sign in at ${SITE}/login (use "Forgot password" if you need a new link) to see your HUD buyer referrals${openBuyers ? ` — you have ${openBuyers} open now` : ''}.`,
    },
    { id: 'blank', label: 'Blank message', subject: 'USAHUDhomes.com', body: `Hi ${first}, this is ${me}. ` },
  ]
}

export default function AgentContactBar({ agent, senderName, senderCompany, openBuyers = 0 }) {
  const first = String(agent.first_name || '').trim() || 'there'
  const list = useMemo(() => templates({
    first, sender: senderName || 'Marc Spencer', company: senderCompany,
    agreementMissing: !agent.referral_agreement_signed, openBuyers,
  }), [first, senderName, senderCompany, agent.referral_agreement_signed, openBuyers])

  const [open, setOpen] = useState(false)
  const [templateId, setTemplateId] = useState(agent.referral_agreement_signed ? 'checkin' : 'agreement')
  const tpl = list.find(t => t.id === templateId) || list[0]
  const [subject, setSubject] = useState(tpl.subject)
  const [body, setBody] = useState(tpl.body)
  const [copied, setCopied] = useState('')

  const choose = id => {
    const t = list.find(x => x.id === id)
    setTemplateId(id)
    if (t) { setSubject(t.subject); setBody(t.body) }
  }
  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(''), 1500) } catch { /* select and copy by hand */ }
  }

  const phone = String(agent.phone || '').trim()
  const email = String(agent.email || '').trim()
  const btn = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border'

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        {phone && <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className={`${btn} border-gray-300 hover:bg-gray-50`}><Phone className="h-4 w-4" /> Call</a>}
        {phone && (
          <button type="button" onClick={() => setOpen(o => (o === 'text' ? false : 'text'))} className={`${btn} ${open === 'text' ? 'bg-green-700 text-white border-green-700' : 'border-green-700 text-green-800 hover:bg-green-50'}`}>
            <MessageSquare className="h-4 w-4" /> Text
          </button>
        )}
        {email && (
          <button type="button" onClick={() => setOpen(o => (o === 'email' ? false : 'email'))} className={`${btn} ${open === 'email' ? 'bg-blue-700 text-white border-blue-700' : 'border-blue-700 text-blue-800 hover:bg-blue-50'}`}>
            <Mail className="h-4 w-4" /> Email
          </button>
        )}
        {!phone && !email && <span className="text-sm text-gray-500">No phone or email on file — use Edit to add one.</span>}
      </div>

      {open && (
        <div className={`rounded-lg border p-3 space-y-2 ${open === 'text' ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold text-gray-700">Message</label>
            <select value={templateId} onChange={e => choose(e.target.value)} className="border rounded px-2 py-1 text-sm bg-white">
              {list.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <span className="text-xs text-gray-500">{open === 'text' ? `to ${phone}` : `to ${email}`}</span>
          </div>
          {open === 'email' && (
            <input value={subject} onChange={e => setSubject(e.target.value)} aria-label="Subject" className="w-full border rounded px-2 py-1.5 text-sm bg-white" />
          )}
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} aria-label="Message" className="w-full border rounded px-2 py-1.5 text-sm bg-white" />
          <div className="flex flex-wrap gap-2">
            {open === 'text'
              ? <a href={smsHref(phone, body)} className={`${btn} bg-green-700 text-white border-green-700`}><MessageSquare className="h-4 w-4" /> Open in Messages</a>
              : <a href={mailtoHref(email, subject, body)} className={`${btn} bg-blue-700 text-white border-blue-700`}><Mail className="h-4 w-4" /> Open in Email</a>}
            <button type="button" onClick={() => copy(body, 'message')} className={`${btn} border-gray-300 bg-white`}>
              {copied === 'message' ? <Check className="h-4 w-4 text-green-700" /> : <Copy className="h-4 w-4" />} Copy message
            </button>
            <button type="button" onClick={() => copy(open === 'text' ? phone : email, 'contact')} className={`${btn} border-gray-300 bg-white`}>
              {copied === 'contact' ? <Check className="h-4 w-4 text-green-700" /> : <Copy className="h-4 w-4" />} Copy {open === 'text' ? 'number' : 'email'}
            </button>
          </div>
          {open === 'text' && <p className="text-xs text-gray-500">Texting works from your phone. On a computer, use Copy message and paste it into your texting app.</p>}
        </div>
      )}
    </div>
  )
}
