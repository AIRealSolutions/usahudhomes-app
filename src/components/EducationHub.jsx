import React, { useState } from 'react'
import { BookOpen, Play, FileText, ArrowRight, Star, Clock } from 'lucide-react'

export default function EducationHub() {
  const [expandedCourse, setExpandedCourse] = useState(null)

  const guides = [
    {
      id: 'hud-guide',
      title: 'Complete HUD Home Buying Guide',
      description: 'Everything you need to know about buying HUD homes in North Carolina',
      duration: '15 min read',
      icon: BookOpen,
      sections: [
        'What are HUD homes?',
        'Why buy a HUD home?',
        'The bidding process',
        'Inspection and appraisal',
        'Closing the deal',
      ],
      content: `
        HUD homes are properties acquired by the U.S. Department of Housing and Urban Development through mortgage insurance claims. These homes are sold directly by HUD to help families achieve homeownership at competitive prices.

        Key advantages:
        • Typically 10-20% below market value
        • HUD handles all repairs and inspections
        • Owner-occupants get priority (72-hour bid period)
        • Competitive financing through FHA loans

        The process:
        1. Find a property on HUD.com
        2. Work with a real estate agent
        3. Submit an offer through your agent
        4. Get inspection and appraisal
        5. Secure financing
        6. Close on your new home
      `,
    },
    {
      id: 'fha-loans',
      title: 'FHA Loan Programs Explained',
      description: 'Understanding FHA 203(b) and 203(k) loan options',
      duration: '12 min read',
      icon: BookOpen,
      sections: [
        'FHA 203(b) Purchase Loans',
        'FHA 203(k) Renovation Loans',
        'Mortgage Insurance Premiums',
        'Down payment options',
        'Credit requirements',
      ],
      content: `
        FHA loans are ideal for HUD home buyers. Here are the main programs:

        FHA 203(b) - Purchase Loans
        • Down payment: As low as 3.5% (minimum $100 for HUD homes)
        • Mortgage insurance required
        • Available to first-time buyers and repeat buyers
        • Flexible credit score requirements (580+)

        FHA 203(k) - Renovation Loans
        • Finance both purchase and repairs in one loan
        • Perfect for HUD homes needing work
        • Streamlined: Up to $35,000
        • Standard: Larger renovation projects

        Costs to Consider:
        • Upfront Mortgage Insurance Premium: 1.75%
        • Annual Mortgage Insurance: 0.55% of loan amount
        • Property taxes and insurance
      `,
    },
    {
      id: 'first-time',
      title: 'First-Time Buyer Tips',
      description: 'Essential strategies for first-time homebuyers',
      duration: '10 min read',
      icon: BookOpen,
      sections: [
        'Preparing to buy',
        'Getting pre-approved',
        'Budget and affordability',
        'Common mistakes to avoid',
        'After closing tips',
      ],
      content: `
        Starting your homebuying journey? Here's what you need to know:

        Preparation Phase:
        1. Check your credit score (aim for 580+ for FHA)
        2. Save for down payment and closing costs
        3. Get pre-approved for financing
        4. Gather financial documents

        During the Process:
        • Don't make large purchases or debt changes
        • Work with a qualified real estate agent
        • Get a thorough home inspection
        • Understand all closing costs upfront

        Common Mistakes to Avoid:
        • Making large purchases before closing
        • Changing jobs during the process
        • Opening new credit accounts
        • Not reviewing closing documents carefully
      `,
    },
    {
      id: 'investor',
      title: 'Investment Property Analysis',
      description: 'How to evaluate HUD homes as rental or fix-and-flip properties',
      duration: '14 min read',
      icon: BookOpen,
      sections: [
        'Investment strategy types',
        'The 1% rule',
        'Cap rate calculations',
        'Cash-on-cash returns',
        'Exit strategies',
      ],
      content: `
        HUD homes can be excellent investments. Here's how to evaluate them:

        Key Metrics:
        • 1% Rule: Monthly rent should be 1% of purchase price
        • Cap Rate: (Annual Net Income / Property Cost) × 100
        • Cash-on-Cash Return: (Annual Cash Profit / Cash Invested) × 100

        Analysis Steps:
        1. Research comparable rental rates
        2. Estimate renovation costs
        3. Calculate holding costs
        4. Project rental income
        5. Determine exit strategy

        Strategies:
        • Buy and hold for rental income
        • Fix and flip for appreciation
        • Hybrid: Improve then rent out
      `,
    },
  ]

  const videos = [
    {
      id: 'hud-process',
      title: 'HUD Home Buying Process Walkthrough',
      description: 'A step-by-step video guide to buying a HUD home',
      duration: '8:32',
      thumbnail: '🎥',
    },
    {
      id: 'financing',
      title: 'Understanding Your Mortgage Payment',
      description: 'Learn what goes into your monthly payment',
      duration: '6:15',
      thumbnail: '💰',
    },
    {
      id: 'inspection',
      title: 'What to Expect During Home Inspection',
      description: 'Everything about the inspection process for HUD homes',
      duration: '7:45',
      thumbnail: '🔍',
    },
  ]

  const resources = [
    {
      title: 'HUD.com Property Search',
      description: 'Official HUD property listings for all states',
      link: 'https://www.hud.gov/',
      icon: '🏠',
    },
    {
      title: 'FHA Loan Requirements',
      description: 'Official FHA guidelines and requirements',
      link: 'https://www.fha.com/',
      icon: '📋',
    },
    {
      title: 'REALTOR® Association',
      description: 'Find a qualified real estate agent',
      link: 'https://www.realtor.com/',
      icon: '👤',
    },
    {
      title: 'NC Consumer Help Center',
      description: 'North Carolina real estate resources and assistance',
      link: 'https://www.ncconsumer.org/',
      icon: '📞',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-6">
          <div className="flex items-center mb-2">
            <BookOpen className="h-8 w-8 mr-3" />
            <h2 className="text-3xl font-bold">Education Hub</h2>
          </div>
          <p className="text-indigo-100">Learn everything about HUD homes, financing, and homebuying</p>
        </div>
      </div>

      {/* Guides Section */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-6">📚 Comprehensive Guides</h3>
        <div className="grid grid-cols-1 gap-4">
          {guides.map((guide) => (
            <GuideCard
              key={guide.id}
              guide={guide}
              isExpanded={expandedCourse === guide.id}
              onToggle={() =>
                setExpandedCourse(expandedCourse === guide.id ? null : guide.id)
              }
            />
          ))}
        </div>
      </div>

      {/* Videos Section */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-6">🎥 Video Tutorials</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">💡 Quick Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: 'Bid Strategically',
              content:
                'Owner-occupants get a 72-hour advantage. Submit competitive bids that reflect the property condition and market value.',
            },
            {
              title: 'Get Pre-Approved Early',
              content:
                'Pre-approval strengthens your offer and speeds up the closing process. It takes 1-3 days and shows sellers you\'re serious.',
            },
            {
              title: 'Factor in Repairs',
              content:
                'HUD homes are sold "as-is." Use our financial calculator to estimate repair costs and include them in your analysis.',
            },
            {
              title: 'Understand Closing Costs',
              content:
                'Budget 2-5% of the purchase price for closing costs. These include inspections, appraisals, title, and lender fees.',
            },
            {
              title: 'Know Your Timeline',
              content:
                'Typical HUD transactions take 30-45 days from offer to closing. Plan accordingly and maintain pre-approval.',
            },
            {
              title: 'Work with Specialists',
              content:
                'Find an agent experienced with HUD homes. They understand the bidding process and can negotiate on your behalf.',
            },
          ].map((tip, index) => (
            <TipCard key={index} title={tip.title} content={tip.content} />
          ))}
        </div>
      </div>

      {/* External Resources */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-6">🔗 External Resources</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {resources.map((resource, index) => (
            <a
              key={index}
              href={resource.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow group"
            >
              <div className="text-4xl mb-3">{resource.icon}</div>
              <h4 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {resource.title}
              </h4>
              <p className="text-gray-600 text-sm mb-3">{resource.description}</p>
              <div className="flex items-center text-blue-600 font-semibold text-sm group-hover:space-x-2">
                <span>Visit</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">❓ Frequently Asked Questions</h3>
        <div className="space-y-4">
          {[
            {
              q: 'What is the minimum down payment for HUD homes?',
              a: 'As low as $100 with an FHA 203(b) loan. However, you can also put down more (3.5% minimum) if desired. Our financial calculator can show you different scenarios.',
            },
            {
              q: 'How long does the HUD home buying process take?',
              a: 'Typically 30-45 days from offer submission to closing. This includes bidding period (72 hours for owner-occupants), inspection, appraisal, and financing approval.',
            },
            {
              q: 'Can I use FHA financing to buy a HUD home?',
              a: 'Yes! FHA loans are excellent for HUD homes. Many HUD homes are specifically designed for FHA financing. You may also qualify for FHA 203(k) renovation loans if repairs are needed.',
            },
            {
              q: 'Do I need to live in the property to buy a HUD home?',
              a: 'No, but owner-occupants get priority bidding (72-hour exclusive period). Investors can bid after this period ends.',
            },
            {
              q: 'Are HUD homes typically in good condition?',
              a: 'HUD inspects all properties. However, homes are sold "as-is" without warranties. Budget for potential repairs. Our calculator helps estimate these costs.',
            },
            {
              q: 'What if I don\'t have enough for closing costs?',
              a: 'FHA loans allow up to 3% of closing costs to be paid by the seller. Many buyers negotiate with sellers to cover these costs.',
            },
          ].map((faq, index) => (
            <FAQItem key={index} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Guide Card Component
 */
function GuideCard({ guide, isExpanded, onToggle }) {
  const Icon = guide.icon

  return (
    <button
      onClick={onToggle}
      className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow text-left"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-4 flex-1">
            <Icon className="h-6 w-6 text-indigo-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-lg font-bold text-gray-900 mb-1">{guide.title}</h4>
              <p className="text-gray-600 text-sm">{guide.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-gray-600 text-sm flex-shrink-0 ml-4">
            <Clock className="h-4 w-4" />
            <span>{guide.duration}</span>
          </div>
        </div>

        {!isExpanded && (
          <div className="flex flex-wrap gap-2 mt-4">
            {guide.sections.slice(0, 3).map((section, index) => (
              <span
                key={index}
                className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full"
              >
                {section}
              </span>
            ))}
            {guide.sections.length > 3 && (
              <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                +{guide.sections.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-6">
          <div className="prose prose-sm max-w-none">
            {guide.content.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-gray-700 mb-3 whitespace-pre-wrap">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h5 className="font-semibold text-gray-900 mb-3">Topics Covered:</h5>
            <div className="flex flex-wrap gap-2">
              {guide.sections.map((section, index) => (
                <span key={index} className="px-3 py-1 bg-white text-gray-700 text-sm rounded-lg border border-gray-200">
                  ✓ {section}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </button>
  )
}

/**
 * Video Card Component
 */
function VideoCard({ video }) {
  return (
    <a
      href="#"
      className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow group cursor-not-allowed opacity-75"
    >
      <div className="aspect-video bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center relative">
        <div className="text-5xl">{video.thumbnail}</div>
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
          <Play className="h-12 w-12 text-white opacity-75" />
        </div>
      </div>
      <div className="p-4">
        <h4 className="font-bold text-gray-900 mb-2">{video.title}</h4>
        <p className="text-gray-600 text-sm mb-3">{video.description}</p>
        <div className="flex items-center text-gray-600 text-sm">
          <Clock className="h-4 w-4 mr-1" />
          {video.duration}
        </div>
        <p className="text-xs text-gray-500 mt-2">Coming soon</p>
      </div>
    </a>
  )
}

/**
 * Tip Card Component
 */
function TipCard({ title, content }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600 text-sm">{content}</p>
    </div>
  )
}

/**
 * FAQ Item Component
 */
function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
      >
        <p className="font-semibold text-gray-900">{question}</p>
        <div className={`transform transition-transform ${open ? 'rotate-180' : ''}`}>
          <ArrowRight className="h-5 w-5 text-gray-600" />
        </div>
      </button>
      {open && <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-gray-700">{answer}</div>}
    </div>
  )
}
