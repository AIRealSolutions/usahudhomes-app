import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Banknote,
  CheckCircle,
  ClipboardCheck,
  FileCheck,
  Home,
  KeyRound,
  Phone,
  Search,
  ShieldCheck,
  Users
} from 'lucide-react'

const SITE_URL = 'https://www.usahudhomes.com'
const PAGE_URL = `${SITE_URL}/how-it-works`

const steps = [
  {
    title: 'Prepare your financing or proof of funds',
    description:
      'Talk with a lender before bidding, or prepare current proof of funds for a cash purchase. Ask what property conditions your loan will accept and whether repair financing may be needed.',
    icon: Banknote
  },
  {
    title: 'Search current HUD listings',
    description:
      'Review the price, property condition, financing designation, listing period, eligible bidders, photographs, documents, and bid deadline for each home.',
    icon: Search
  },
  {
    title: 'Choose a HUD-registered real estate broker',
    description:
      'A registered broker submits the electronic bid for you. Your broker also helps review the sales package, deadlines, required buyer documents, and bidding strategy.',
    icon: Users
  },
  {
    title: 'Tour the property and review the information',
    description:
      'Visit the home when access is available. HUD homes are generally sold as-is, so consider the visible condition, likely repairs, financing limits, and your inspection plan before bidding.',
    icon: Home
  },
  {
    title: 'Submit the bid',
    description:
      'Your broker enters the bid using your legal name, financing terms, requested closing-cost assistance when permitted, occupancy type, and other required information.',
    icon: FileCheck
  },
  {
    title: 'Respond promptly if the bid is accepted',
    description:
      'Acceptance instructions contain firm deadlines for signatures, earnest money, financing or funds verification, and delivery of the contract package. Follow the current sales package exactly.',
    icon: CheckCircle
  },
  {
    title: 'Complete inspections and utility activation',
    description:
      'Arrange inspections during the contract period. Utility activation normally requires advance authorization and is generally arranged and paid for by the buyer under the property’s current rules.',
    icon: ClipboardCheck
  },
  {
    title: 'Finish financing and close',
    description:
      'Complete lender conditions, appraisal requirements, title work, insurance, final documents, and closing by the contractual deadline. You receive the keys after the transaction is completed.',
    icon: KeyRound
  }
]

const faqs = [
  {
    question: 'Can anyone buy a HUD home?',
    answer:
      'Eligible individuals, investors, nonprofits, and government entities may purchase HUD homes, but the allowed bidder type depends on the property’s current listing period. Owner-occupants often receive an initial priority opportunity.'
  },
  {
    question: 'Can I submit a HUD bid myself?',
    answer:
      'HUD home bids are submitted through a HUD-registered real estate broker. The broker enters the buyer information, financing terms, occupancy type, and bid details.'
  },
  {
    question: 'Are HUD homes sold as-is?',
    answer:
      'HUD homes are generally sold as-is. Buyers should review the available property information and obtain appropriate inspections during the contract period.'
  },
  {
    question: 'Can HUD pay some buyer closing costs?',
    answer:
      'Owner-occupant buyers may be permitted to request eligible closing-cost assistance as part of the bid. Availability and limits depend on the current program rules, property, bid, and sales package. Investors should not assume that assistance is available.'
  },
  {
    question: 'Does every HUD home qualify for $100-down financing?',
    answer:
      'No. The $100-down option is limited to eligible owner-occupants using qualifying FHA financing on eligible properties and is subject to lender and program requirements.'
  },
  {
    question: 'Can repairs be included in the financing?',
    answer:
      'Some properties and buyers may qualify for FHA repair escrow or renovation financing. The available option depends on the property’s financing designation, repair needs, lender approval, and applicable FHA requirements.'
  },
  {
    question: 'How much earnest money is required?',
    answer:
      'The required earnest-money amount and acceptable payment method are stated in the current acceptance instructions or sales package. Buyers should have the funds ready before submitting a bid.'
  },
  {
    question: 'What happens if my bid is not selected?',
    answer:
      'You are not obligated to purchase the property. You can continue monitoring that home, adjust your strategy if another bidding opportunity becomes available, or consider other HUD listings.'
  }
]

const ownerOccupantItems = [
  'Plans to use the home as a primary residence',
  'May receive priority during designated listing periods',
  'May be able to request eligible closing-cost assistance',
  'May qualify for eligible FHA programs, including $100-down financing',
  'Must follow HUD occupancy and prior-purchase requirements'
]

const investorItems = [
  'Can bid when the property listing period allows investors',
  'Should prepare proof of funds or investor-loan documentation',
  'Should evaluate repairs, carrying costs, insurance, and resale or rental assumptions',
  'Should not assume owner-occupant incentives or closing-cost assistance apply',
  'Must meet the same contract, earnest-money, inspection, and closing deadlines'
]

export default function HowItWorks() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Buy a HUD Home',
    description:
      'Prepare financing, find a property, work with a HUD-registered broker, submit a bid, inspect the home, and complete closing.',
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.title,
      text: step.description
    }))
  }

  return (
    <div className="bg-gray-50">
      <Helmet>
        <title>How to Buy a HUD Home: Bidding to Closing | USAHUDhomes.com</title>
        <meta
          name="description"
          content="Learn how to buy a HUD home, including financing preparation, bidder eligibility, broker-submitted bids, earnest money, inspections, utilities, and closing."
        />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={PAGE_URL} />
        <meta property="og:title" content="How to Buy a HUD Home: Bidding to Closing" />
        <meta
          property="og:description"
          content="A practical guide to preparing, bidding, inspecting, financing, and closing on a HUD-owned home."
        />
        <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <nav className="mb-6 text-sm text-blue-100" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <span>How It Works</span>
          </nav>
          <div className="max-w-4xl">
            <p className="mb-4 font-semibold uppercase tracking-wider text-orange-300">
              HUD Home Buying Guide
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              How to Buy a HUD Home
            </h1>
            <p className="mt-6 max-w-3xl text-xl leading-8 text-blue-100">
              HUD home purchases move on firm deadlines. The best preparation is to understand
              your financing, bidder eligibility, inspection responsibilities, and contract
              requirements before the right property appears.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/search"
                className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-600"
              >
                Search HUD Homes
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Link>
              <a
                href="tel:9103636147"
                className="inline-flex items-center justify-center rounded-lg border border-white/40 bg-white/10 px-6 py-3 font-bold text-white hover:bg-white/20"
              >
                <Phone className="mr-2 h-5 w-5" aria-hidden="true" />
                Ask Marc for Help
              </a>
            </div>
          </div>
        </div>
      </section>

      <main>
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <ShieldCheck className="mt-1 h-8 w-8 flex-none text-amber-700" aria-hidden="true" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Prepare before you bid</h2>
                <p className="mt-3 leading-7 text-gray-700">
                  Have a lender prequalification or current proof of funds available. Discuss the
                  property condition your loan will accept, your cash needed for earnest money and
                  inspections, and whether repair financing may be necessary. Do not wait until a
                  bid is accepted to begin collecting these documents.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="font-semibold uppercase tracking-wider text-blue-700">The process</p>
              <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
                From preparation to closing
              </h2>
              <p className="mt-4 text-lg leading-8 text-gray-600">
                Specific deadlines and documents can vary. Always follow the instructions for the
                property and sales contract you are actually using.
              </p>
            </div>

            <ol className="mt-12 grid gap-6 md:grid-cols-2">
              {steps.map((step, index) => {
                const Icon = step.icon
                return (
                  <li key={step.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-blue-700 text-white">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
                          Step {index + 1}
                        </p>
                        <h3 className="mt-1 text-xl font-bold text-gray-900">{step.title}</h3>
                        <p className="mt-3 leading-7 text-gray-600">{step.description}</p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="font-semibold uppercase tracking-wider text-blue-700">Buyer paths</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
              Owner-occupants and investors
            </h2>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <article className="rounded-2xl border-2 border-blue-200 bg-white p-7 shadow-sm">
              <div className="flex items-center gap-3">
                <Home className="h-8 w-8 text-blue-700" aria-hidden="true" />
                <h3 className="text-2xl font-bold">Owner-occupant buyers</h3>
              </div>
              <p className="mt-4 leading-7 text-gray-600">
                Buyers who intend to make the property their primary residence may have an
                opportunity to bid before investors during designated listing periods.
              </p>
              <ul className="mt-6 space-y-4">
                {ownerOccupantItems.map(item => (
                  <li key={item} className="flex gap-3 text-gray-700">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-none text-green-600" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-gray-300 bg-white p-7 shadow-sm">
              <div className="flex items-center gap-3">
                <Banknote className="h-8 w-8 text-gray-700" aria-hidden="true" />
                <h3 className="text-2xl font-bold">Investor buyers</h3>
              </div>
              <p className="mt-4 leading-7 text-gray-600">
                Investors can participate when the property’s listing period permits investor
                bids. Investment decisions should be based on verified costs and conservative
                assumptions.
              </p>
              <ul className="mt-6 space-y-4">
                {investorItems.map(item => (
                  <li key={item} className="flex gap-3 text-gray-700">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-none text-green-600" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="bg-blue-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="font-semibold uppercase tracking-wider text-orange-300">
                After acceptance
              </p>
              <h2 className="mt-2 text-3xl font-bold">Deadlines matter</h2>
              <p className="mt-5 leading-8 text-blue-100">
                Winning the bid begins the contract process. Signatures, earnest money, funds or
                financing verification, inspections, utility requests, lender conditions, and
                closing must be handled within the applicable instructions and contract deadlines.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-7">
              <h3 className="text-xl font-bold">Keep these ready</h3>
              <ul className="mt-5 space-y-3 text-blue-50">
                <li>Government-issued identification</li>
                <li>Lender prequalification or current proof of funds</li>
                <li>Earnest-money funds in the required form</li>
                <li>Inspection and utility-activation budget</li>
                <li>Homeowner’s insurance contact</li>
                <li>Reliable access to email and electronic signatures</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="font-semibold uppercase tracking-wider text-blue-700">Common questions</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
              HUD home buying FAQ
            </h2>
          </div>

          <div className="mt-10 space-y-4">
            {faqs.map(faq => (
              <details key={faq.question} className="group rounded-xl border border-gray-200 bg-white p-6">
                <summary className="cursor-pointer list-none pr-8 text-lg font-bold text-gray-900">
                  {faq.question}
                </summary>
                <p className="mt-4 leading-7 text-gray-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="bg-orange-50">
          <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900">Ready to look for a HUD home?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-gray-600">
              Search current inventory or contact Lightkeeper Realty for help preparing and
              submitting a HUD bid.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/hud-homes/north-carolina"
                className="rounded-lg bg-blue-700 px-6 py-3 font-bold text-white hover:bg-blue-800"
              >
                North Carolina HUD Homes
              </Link>
              <Link
                to="/contact"
                className="rounded-lg bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-600"
              >
                Contact Lightkeeper Realty
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10 text-sm leading-6 text-gray-500 sm:px-6 lg:px-8">
          <p>
            USAHUDhomes.com is an independent real estate resource and is not a government agency
            or affiliated with the U.S. Department of Housing and Urban Development. Program
            availability, property eligibility, bidder periods, financing, earnest money,
            closing-cost assistance, and deadlines are governed by the current property listing,
            sales package, lender requirements, and applicable HUD rules.
          </p>
        </section>
      </main>
    </div>
  )
}
