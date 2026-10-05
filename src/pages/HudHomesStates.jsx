import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { MapPin, Phone } from 'lucide-react'
import { supabase } from '../config/supabase'
import { US_STATES, stateSlug } from '../utils/states'
import { buildDirectorySeo, fetchStateCounts, HOME_STATE, jsonLdString } from '../utils/geoSeo'

export default function HudHomesStates() {
  const [counts, setCounts] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchStateCounts(supabase)
      .then(result => { if (!cancelled) setCounts(result) })
      .catch(error => {
        console.error('Unable to load HUD home counts by state:', error)
        if (!cancelled) setCounts({})
      })
    return () => {
      cancelled = true
    }
  }, [])

  const homeState = US_STATES.find(state => state.code === HOME_STATE)
  const seo = buildDirectorySeo({ counts: counts || {} })

  return (
    <div className="bg-gray-50">
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <link rel="canonical" href={seo.canonicalUrl} />
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
        <script type="application/ld+json">{jsonLdString(seo.jsonLd)}</script>
      </Helmet>

      <section className="bg-gradient-to-br from-blue-800 to-blue-600 text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <nav className="mb-5 text-sm text-blue-100" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <span>HUD Homes by State</span>
          </nav>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            HUD Homes for Sale by State
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-blue-100">
            Choose a state to browse current HUD-owned properties, explore listings by city,
            and get help preparing and submitting a bid.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {homeState && (
          <section className="mb-10 flex flex-col justify-between gap-4 rounded-xl border border-orange-200 bg-orange-50 p-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Buying a HUD home in {homeState.name}?</h2>
              <p className="mt-1 text-gray-700">
                Lightkeeper Realty specializes in {homeState.name} HUD homes and can submit your bid.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to={`/hud-homes/${stateSlug(homeState.name)}`}
                className="rounded-lg bg-blue-700 px-5 py-3 text-center font-semibold text-white hover:bg-blue-800"
              >
                {homeState.name} HUD Homes
              </Link>
              <a
                href="tel:9103636147"
                className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600"
              >
                <Phone className="mr-2 h-5 w-5" aria-hidden="true" />
                910-363-6147
              </a>
            </div>
          </section>
        )}

        <section aria-label="States">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {US_STATES.map(state => {
              const count = counts?.[state.code] || 0
              return (
                <Link
                  key={state.code}
                  to={`/hud-homes/${stateSlug(state.name)}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="flex items-center font-semibold text-gray-900">
                    <MapPin className="mr-2 h-4 w-4 text-blue-600" aria-hidden="true" />
                    {state.name} HUD Homes
                  </span>
                  {counts && count > 0 && (
                    <span className="ml-3 rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-800">
                      {count.toLocaleString()}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </section>

        <p className="mt-10 text-sm leading-6 text-gray-500">
          USAHUDhomes.com is an independent real estate resource and is not a government agency
          or affiliated with the U.S. Department of Housing and Urban Development. Listing counts
          change daily as HUD adds properties and accepts bids.
        </p>
      </main>
    </div>
  )
}
