import React from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { UserPlus, ShieldCheck, Send, FileSignature, Home, DollarSign } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  FEE_EXAMPLES, REFERRAL_FEE_CAP, REFERRAL_PCT, PROTECTION_MONTHS, RECEIVING_BROKERAGE, money,
} from '../data/buyerReferralProgram'

const STEPS = [
  { icon: UserPlus,      title: 'Register',              text: 'Your name, license number and state, and your brokerage.' },
  { icon: ShieldCheck,   title: 'We verify your license', text: 'Lightkeeper Realty confirms your license and approves your brokerage.' },
  { icon: Send,          title: 'Refer a buyer',          text: 'A family member, friend or past client who wants a HUD home anywhere in North Carolina.' },
  { icon: FileSignature, title: 'Sign the agreement',     text: 'A brokerage-to-brokerage referral agreement, signed online or uploaded as a PDF.' },
  { icon: Home,          title: 'We close the HUD sale',  text: 'Lightkeeper represents your buyer in NC, and your brokerage is paid at closing.' },
]

export default function ReferABuyer() {
  const { user } = useAuth()
  const start = user ? '/agent-referrals' : '/login?signup=1&next=/agent-referrals'

  return (
    <div className="bg-gray-50">
      <Helmet>
        <title>Refer a Buyer to a North Carolina HUD Home Agent | USAHUDhomes.com</title>
        <meta name="description" content={`Licensed agents in any state: refer family and friends buying a HUD home in North Carolina to Lightkeeper Realty and earn ${Math.round(REFERRAL_PCT * 100)}% of the commission, up to ${money(REFERRAL_FEE_CAP)}, when the sale closes.`} />
      </Helmet>

      <section className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-14 sm:py-20">
          <p className="uppercase tracking-wide text-blue-200 text-sm font-semibold">Nationwide Agent Referral Program</p>
          <h1 className="mt-2 text-3xl sm:text-5xl font-bold leading-tight">Know someone buying a HUD home in North Carolina?</h1>
          <p className="mt-4 text-lg text-blue-100 max-w-2xl">
            Licensed agents anywhere in the U.S. can refer family, friends and personal contacts to {RECEIVING_BROKERAGE.name}, a
            North Carolina HUD buyer's agent. Your brokerage earns a referral fee when the sale closes.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 items-center">
            <Link to={start} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold">
              {user ? 'Go to Agent Referrals' : 'Register to refer a buyer'}
            </Link>
            {!user && <Link to="/login?next=/agent-referrals" className="text-blue-100 hover:text-white underline">Already have an account? Sign in</Link>}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12 grid gap-6 sm:grid-cols-3">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <DollarSign className="h-8 w-8 text-green-600 mx-auto" />
          <p className="mt-2 text-4xl font-bold text-gray-900">{Math.round(REFERRAL_PCT * 100)}%</p>
          <p className="text-gray-600">of the buyer-side commission</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <ShieldCheck className="h-8 w-8 text-blue-600 mx-auto" />
          <p className="mt-2 text-4xl font-bold text-gray-900">{money(REFERRAL_FEE_CAP)}</p>
          <p className="text-gray-600">maximum referral fee</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <Home className="h-8 w-8 text-orange-500 mx-auto" />
          <p className="mt-2 text-4xl font-bold text-gray-900">{PROTECTION_MONTHS / 12} year</p>
          <p className="text-gray-600">protection on any NC HUD home your buyer purchases</p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-12">
        <h2 className="text-2xl font-bold text-gray-900">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="bg-white rounded-xl shadow-sm p-5">
              <s.icon className="h-6 w-6 text-blue-600" />
              <p className="mt-3 font-semibold text-gray-900">{i + 1}. {s.title}</p>
              <p className="mt-1 text-sm text-gray-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-12">
        <h2 className="text-2xl font-bold text-gray-900">Referral fee examples</h2>
        <p className="mt-2 text-gray-600">Assuming a 3% buyer-side commission. The fee is based on the commission Lightkeeper Realty actually receives, not the sales price, so a reduced commission reduces the fee.</p>
        <div className="mt-4 overflow-x-auto bg-white rounded-xl shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr><th className="px-4 py-2 text-left">HUD sales price</th><th className="px-4 py-2 text-right">Gross commission</th><th className="px-4 py-2 text-right">Referral payment</th></tr>
            </thead>
            <tbody>
              {FEE_EXAMPLES.map(r => (
                <tr key={r.price} className="border-t">
                  <td className="px-4 py-2">{money(r.price)}</td>
                  <td className="px-4 py-2 text-right">{money(r.commission)}</td>
                  <td className="px-4 py-2 text-right font-semibold">{money(r.fee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">Referral Fee = MIN(Actual Commission × {Math.round(REFERRAL_PCT * 100)}%, {money(REFERRAL_FEE_CAP)}).</p>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-gray-900">Program rules</h2>
        <ul className="mt-4 space-y-2 text-gray-700 list-disc pl-6">
          <li>Fees are paid to your brokerage, never to an individual agent, and only to a verified, licensed brokerage that may lawfully receive referral fees in its state.</li>
          <li>No closing means no referral payment. Canceled or unsuccessful transactions earn no fee.</li>
          <li>Your buyer must agree to be contacted before you submit the referral.</li>
          <li>Lightkeeper must accept a referral before representation begins. Existing Lightkeeper clients and duplicate referrals are reviewed by hand.</li>
          <li>A referral covers any North Carolina HUD home the buyer goes under contract on within {PROTECTION_MONTHS} months after it is accepted.</li>
          <li>You give your buyer written disclosure of the referral arrangement, and you do not physically perform brokerage activities in North Carolina without a North Carolina license.</li>
        </ul>
        <p className="mt-6 text-sm text-gray-500">Questions? Call {RECEIVING_BROKERAGE.name} at {RECEIVING_BROKERAGE.phone}.</p>
      </section>
    </div>
  )
}
