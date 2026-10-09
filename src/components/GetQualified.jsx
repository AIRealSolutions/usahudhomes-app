import React from 'react'
import { BadgeCheck, CheckCircle, ExternalLink, Mail } from 'lucide-react'
import { cn } from '../lib/utils'

// Preferred lender for HUD home financing. Update here to change it site-wide.
export const PREFERRED_LENDER = {
  name: 'Patrick Wynn',
  title: 'Mortgage Loan Officer',
  company: 'Homespire Mortgage',
  nmls: '71181',
  email: 'pwynn@homespiremortgage.com',
  photo: '/images/patrick-wynn.jpg',
  applyUrl: 'https://apply.homespirehomeloans.com/app/pwynn'
}

// Disclosure shown wherever the lender is advertised
function LenderDisclosure({ className = '' }) {
  return (
    <p className={`text-xs text-gray-500 ${className}`}>
      {PREFERRED_LENDER.name}, NMLS #{PREFERRED_LENDER.nmls}. Loans offered through NFM Lending, LLC, NMLS #2893
      (<a href="https://www.nmlsconsumeraccess.org" target="_blank" rel="noopener noreferrer" className="underline">nmlsconsumeraccess.org</a>).
      Equal Housing Lender. Eligibility for loan approval is subject to completion of an application and other
      underwriting requirements. Not all programs are available in all areas. Licensing and disclosures at{' '}
      <a href="https://www.nfmlending.com/licensing" target="_blank" rel="noopener noreferrer" className="underline">nfmlending.com/licensing</a>.
    </p>
  )
}

const SPECIALTIES = [
  'FHA $100-down financing on eligible HUD homes',
  '203(k) and repair escrow loans for homes needing work',
  'Pre-approval letters ready to submit with your HUD bid'
]

export function GetQualifiedButton({ className = '', children = 'Get Qualified', onClick }) {
  return (
    <a
      href={PREFERRED_LENDER.applyUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={cn('inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors', className)}
    >
      {children}
    </a>
  )
}

// Full-width homepage section, or a card for property pages with compact
export default function LenderSpotlight({ compact = false }) {
  if (compact) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <img
            src={PREFERRED_LENDER.photo}
            alt={PREFERRED_LENDER.name}
            className="h-20 w-20 rounded-full object-cover flex-shrink-0"
            loading="lazy"
          />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Get qualified for this HUD home</h2>
            <p className="text-gray-700">
              HUD requires a pre-approval or proof of funds with every bid. {PREFERRED_LENDER.name} of{' '}
              {PREFERRED_LENDER.company} specializes in HUD home financing, including $100-down FHA and 203(k) loans.
            </p>
          </div>
          <GetQualifiedButton className="py-3 flex-shrink-0">
            Get Qualified <ExternalLink className="h-4 w-4 ml-2" />
          </GetQualifiedButton>
        </div>
        <LenderDisclosure className="mt-4" />
      </div>
    )
  }

  return (
    <div className="py-16 bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 md:flex md:items-center md:gap-10">
          <div className="flex-1">
            <p className="inline-flex items-center text-sm font-semibold text-green-700 bg-green-100 rounded-full px-3 py-1 mb-4">
              <BadgeCheck className="h-4 w-4 mr-1" />
              Preferred HUD Home Lender
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Get Qualified with {PREFERRED_LENDER.name}</h2>
            <p className="text-gray-600 mb-6">
              {PREFERRED_LENDER.title}, {PREFERRED_LENDER.company} · NMLS #{PREFERRED_LENDER.nmls}
            </p>
            <p className="text-gray-700 mb-6">
              Every HUD bid needs a pre-approval letter or proof of funds. {PREFERRED_LENDER.name} specializes in
              financing HUD homes and knows the programs that make them affordable.
            </p>
            <ul className="space-y-3">
              {SPECIALTIES.map(item => (
                <li key={item} className="flex items-start text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8 md:mt-0 md:w-64 text-center flex-shrink-0">
            <img
              src={PREFERRED_LENDER.photo}
              alt={PREFERRED_LENDER.name}
              className="h-40 w-40 rounded-full object-cover mx-auto mb-4 shadow"
              loading="lazy"
            />
            <p className="font-bold text-gray-900">{PREFERRED_LENDER.name}</p>
            <p className="text-sm text-gray-600">NMLS #{PREFERRED_LENDER.nmls}</p>
            <a href={`mailto:${PREFERRED_LENDER.email}`} className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4 break-all">
              <Mail className="h-4 w-4 mr-1 flex-shrink-0" />
              {PREFERRED_LENDER.email}
            </a>
            <GetQualifiedButton className="w-full py-4 text-lg">
              Get Qualified <ExternalLink className="h-5 w-5 ml-2" />
            </GetQualifiedButton>
            <p className="text-sm text-gray-500 mt-3">Secure online application through {PREFERRED_LENDER.company}.</p>
          </div>
        </div>
        <LenderDisclosure className="mt-6 text-center" />
      </div>
    </div>
  )
}
