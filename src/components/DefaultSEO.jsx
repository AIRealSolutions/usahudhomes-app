import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

const SITE_URL = 'https://www.usahudhomes.com'
const DEFAULT_IMAGE = `${SITE_URL}/main-marketing-optimized.png`
const DEFAULT_TITLE = 'USAHUDhomes.com - Find HUD Homes & Government Foreclosures'
const DEFAULT_DESCRIPTION = 'Search HUD homes for sale in every state. Learn about bidding, owner-occupant priority, $100-down FHA financing, repair escrows and closing-cost help from a HUD-registered broker.'

// Titles for routes that don't set their own <Helmet> metadata
const ROUTE_META = {
  '/search': {
    title: 'Search HUD Homes for Sale Nationwide | USAHUDhomes.com',
    description: 'Search HUD homes for sale by state, city, price, beds and baths. Listings are updated daily, and a HUD-registered broker can submit your bid.'
  },
  '/contact': {
    title: 'Get Help Buying a HUD Home | USAHUDhomes.com',
    description: 'Talk with Lightkeeper Realty about buying a HUD home: eligibility, financing, inspections and submitting your bid. Call 910-363-6147.'
  },
  '/deals': {
    title: 'Successful HUD Home Purchases | USAHUDhomes.com',
    description: 'See HUD homes our buyers have won, with accepted bids and closings from across the country.'
  },
  '/broker/register': {
    title: 'Become a HUD Home Partner Broker | USAHUDhomes.com',
    description: 'Real estate agents and brokers: join the USAHUDhomes.com network and receive HUD home buyer referrals in your area.'
  }
}

// Private or utility routes that should stay out of search results
const NOINDEX_PREFIXES = [
  '/login', '/reset-password', '/forgot-password', '/dashboard', '/admin', '/broker-dashboard',
  '/profile', '/lead', '/unauthorized', '/contact/thank-you', '/agent/'
]

/**
 * Site-wide fallback metadata. Rendered once above the routes; any page that
 * renders its own <Helmet> tags overrides these.
 */
export default function DefaultSEO() {
  const { pathname } = useLocation()
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/'
  const url = `${SITE_URL}${path}`
  const meta = ROUTE_META[path] || {}
  const title = meta.title || DEFAULT_TITLE
  const description = meta.description || DEFAULT_DESCRIPTION
  const noindex = NOINDEX_PREFIXES.some(prefix => path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`))

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta
        name="robots"
        content={noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}
      />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="USAHUDhomes.com" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={DEFAULT_IMAGE} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={DEFAULT_IMAGE} />
    </Helmet>
  )
}
