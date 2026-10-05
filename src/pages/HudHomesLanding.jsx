import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import { Home, MapPin, Phone } from 'lucide-react'
import { supabase } from '../config/supabase'
import { US_STATES, stateSlug as toSlug } from '../utils/states'
import { buildGeoSeo, fetchStateListings, findStateBySlug, jsonLdString } from '../utils/geoSeo'

function PropertyCard({ property }) {
  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="h-48 bg-gray-100">
        {property.main_image ? (
          <img
            src={property.main_image}
            alt={`HUD home for sale in ${property.city}, ${property.state}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Home className="h-14 w-14 text-gray-300" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-900">{property.address}</h3>
        <p className="mt-1 flex items-center text-sm text-gray-600">
          <MapPin className="mr-1 h-4 w-4" aria-hidden="true" />
          {property.city}, {property.state} {property.zip_code}
        </p>
        <p className="mt-4 text-2xl font-bold text-blue-700">
          {property.price ? `$${Number(property.price).toLocaleString()}` : 'Price available'}
        </p>
        <p className="mt-2 text-sm text-gray-600">
          {property.beds ?? 'N/A'} beds · {property.baths ?? 'N/A'} baths
          {property.sq_ft ? ` · ${Number(property.sq_ft).toLocaleString()} sq. ft.` : ''}
        </p>
        <Link
          to={`/property/${property.case_number}`}
          className="mt-5 block rounded-lg bg-blue-700 px-4 py-2.5 text-center font-semibold text-white hover:bg-blue-800"
        >
          View HUD home
        </Link>
      </div>
    </article>
  )
}

export default function HudHomesLanding() {
  const { stateSlug, citySlug } = useParams()
  const stateInfo = useMemo(() => findStateBySlug(stateSlug), [stateSlug])
  const [stateListings, setStateListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!stateInfo) {
      setLoading(false)
      return
    }

    setLoading(true)
    fetchStateListings(supabase, stateInfo.code)
      .then(rows => { if (!cancelled) setStateListings(rows) })
      .catch(error => {
        console.error('Unable to load geographic HUD listings:', error)
        if (!cancelled) setStateListings([])
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => {
      cancelled = true
    }
  }, [stateInfo])

  const seo = useMemo(
    () => stateInfo && buildGeoSeo({ state: stateInfo, stateListings, citySlug }),
    [stateInfo, stateListings, citySlug]
  )

  if (!stateInfo) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <Helmet>
          <title>State not found | USAHUDhomes.com</title>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <h1 className="text-3xl font-bold">State not found</h1>
        <p className="mt-4 text-gray-600">Choose a state to browse HUD homes.</p>
        <Link to="/hud-homes" className="mt-6 inline-block text-blue-700 hover:underline">
          Browse HUD homes by state
        </Link>
      </div>
    )
  }

  const { listings: properties, cities, city, faqs } = seo
  const cityName = city?.name || ''
  const cityMissing = !loading && !seo.found
  const locationName = cityName ? `${cityName}, ${stateInfo.name}` : stateInfo.name

  return (
    <div className="bg-gray-50">
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta
          name="robots"
          content={cityMissing ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1'}
        />
        <link rel="canonical" href={seo.canonicalUrl} />
        <meta name="geo.region" content={`US-${stateInfo.code}`} />
        <meta name="geo.placename" content={cityName || stateInfo.name} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="USAHUDhomes.com" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:url" content={seo.canonicalUrl} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:image" content={seo.image} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seo.title} />
        <meta name="twitter:description" content={seo.description} />
        <meta name="twitter:image" content={seo.image} />
        {!loading && <script type="application/ld+json">{jsonLdString(seo.jsonLd)}</script>}
      </Helmet>

      <section className="bg-gradient-to-br from-blue-800 to-blue-600 text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <nav className="mb-5 text-sm text-blue-100" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/hud-homes" className="hover:text-white">States</Link>
            <span className="mx-2">/</span>
            {citySlug ? (
              <>
                <Link to={`/hud-homes/${stateSlug}`} className="hover:text-white">
                  {stateInfo.name}
                </Link>
                <span className="mx-2">/</span>
                <span>{cityName || 'City'}</span>
              </>
            ) : (
              <span>{stateInfo.name}</span>
            )}
          </nav>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {seo.h1}
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-blue-100">
            {loading
              ? 'Browse current HUD-owned properties and get help with financing, inspections, bidding deadlines, and closing.'
              : seo.intro}
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {loading
                ? 'Loading current listings…'
                : `${seo.count} active HUD ${seo.count === 1 ? 'home' : 'homes'} in ${locationName}`}
            </h2>
            <p className="mt-2 text-gray-600">Inventory and bidding periods can change quickly.</p>
          </div>
          <a
            href="tel:9103636147"
            className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600"
          >
            <Phone className="mr-2 h-5 w-5" aria-hidden="true" />
            Get bidding help
          </a>
        </div>

        {!loading && properties.length === 0 ? (
          <section className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <h2 className="text-xl font-bold">No active listings found today</h2>
            <p className="mt-2 text-gray-600">
              HUD inventory changes regularly. Get an email when new HUD homes are listed here,
              or search nearby areas.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row sm:gap-6">
              <Link to="/alerts" className="font-semibold text-blue-700 hover:underline">
                Get free HUD home alerts
              </Link>
              <Link to="/search" className="font-semibold text-blue-700 hover:underline">
                Search all properties
              </Link>
            </div>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="HUD listings">
            {properties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </section>
        )}

        {!citySlug && cities.length > 0 && (
          <section className="mt-14 rounded-xl border border-gray-200 bg-white p-7">
            <h2 className="text-2xl font-bold text-gray-900">
              Explore HUD homes by city in {stateInfo.name}
            </h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {cities.map(c => (
                <Link
                  key={c.slug}
                  to={`/hud-homes/${stateSlug}/${c.slug}`}
                  className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 font-medium text-blue-800 hover:bg-blue-100"
                >
                  {c.name} ({c.count})
                </Link>
              ))}
            </div>
          </section>
        )}

        {!citySlug && (
          <section className="mt-14 rounded-xl border border-gray-200 bg-white p-7">
            <h2 className="text-2xl font-bold text-gray-900">HUD homes in other states</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {US_STATES.filter(state => state.code !== stateInfo.code).map(state => (
                <Link
                  key={state.code}
                  to={`/hud-homes/${toSlug(state.name)}`}
                  className="rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                >
                  {state.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-14 grid gap-7 rounded-xl bg-white p-8 shadow-sm md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">How buying a HUD home works</h2>
            <p className="mt-3 leading-7 text-gray-700">
              HUD homes are generally sold as-is through an electronic bidding process.
              A HUD-registered real estate broker submits the bid for the buyer. Owner-occupants
              may receive priority during designated listing periods.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Prepare before bidding</h2>
            <p className="mt-3 leading-7 text-gray-700">
              Buyers should arrange financing or proof of funds, review the property’s financing
              designation, understand earnest-money requirements, and plan for inspections and
              utility activation after an accepted bid.
            </p>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold text-gray-900">
            Questions about HUD homes in {locationName}
          </h2>
          <div className="mt-5 space-y-3">
            {faqs.map(faq => (
              <details key={faq.question} className="rounded-lg border border-gray-200 bg-white p-5">
                <summary className="cursor-pointer font-semibold text-gray-900">{faq.question}</summary>
                <p className="mt-3 leading-7 text-gray-700">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="mt-8 text-sm leading-6 text-gray-500">
          USAHUDhomes.com is an independent real estate resource and is not a government agency
          or affiliated with the U.S. Department of Housing and Urban Development. Program,
          financing, and closing-cost eligibility varies by buyer and property.
        </p>
      </main>
    </div>
  )
}
