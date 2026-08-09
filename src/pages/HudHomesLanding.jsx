import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import { Home, MapPin, Phone } from 'lucide-react'
import { supabase } from '../config/supabase'
import { US_STATES } from '../utils/states'

const SITE_URL = 'https://www.usahudhomes.com'

function slugify(value = '') {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function PropertyCard({ property }) {
  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="h-48 bg-gray-100">
        {property.main_image ? (
          <img
            src={property.main_image}
            alt={`HUD home at ${property.address} in ${property.city}, ${property.state}`}
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
        <h2 className="text-lg font-bold text-gray-900">{property.address}</h2>
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
  const stateInfo = useMemo(
    () => US_STATES.find(state => slugify(state.name) === stateSlug),
    [stateSlug]
  )
  const [properties, setProperties] = useState([])
  const [cities, setCities] = useState([])
  const [cityName, setCityName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadLandingPage() {
      if (!stateInfo) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const { data: cityRows, error: cityError } = await supabase
          .from('properties')
          .select('city')
          .eq('state', stateInfo.code)
          .eq('is_active', true)
          .neq('status', 'UNDER CONTRACT')
          .not('city', 'is', null)
          .limit(1000)

        if (cityError) throw cityError
        const uniqueCities = [...new Set((cityRows || []).map(row => row.city).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b))
        const resolvedCity = citySlug
          ? uniqueCities.find(city => slugify(city) === citySlug) || ''
          : ''

        let query = supabase
          .from('properties')
          .select('id, case_number, address, city, state, zip_code, price, beds, baths, sq_ft, main_image, status, updated_at')
          .eq('state', stateInfo.code)
          .eq('is_active', true)
          .neq('status', 'UNDER CONTRACT')
          .order('updated_at', { ascending: false })
          .limit(60)

        if (citySlug) {
          if (!resolvedCity) {
            if (!cancelled) {
              setCities(uniqueCities)
              setCityName('')
              setProperties([])
            }
            return
          }
          query = query.eq('city', resolvedCity)
        }

        const { data, error } = await query
        if (error) throw error

        if (!cancelled) {
          setCities(uniqueCities)
          setCityName(resolvedCity)
          setProperties(data || [])
        }
      } catch (error) {
        console.error('Unable to load geographic HUD listings:', error)
        if (!cancelled) setProperties([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadLandingPage()
    return () => {
      cancelled = true
    }
  }, [stateInfo, citySlug])

  if (!stateInfo) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-3xl font-bold">State not found</h1>
        <p className="mt-4 text-gray-600">Choose a state from the HUD home search.</p>
        <Link to="/search" className="mt-6 inline-block text-blue-700 hover:underline">
          Search all HUD homes
        </Link>
      </div>
    )
  }

  const locationName = cityName || stateInfo.name
  const canonicalPath = citySlug
    ? `/hud-homes/${stateSlug}/${citySlug}`
    : `/hud-homes/${stateSlug}`
  const canonicalUrl = `${SITE_URL}${canonicalPath}`
  const title = `HUD Homes for Sale in ${locationName} | USAHUDhomes.com`
  const description = `Search active HUD homes for sale in ${locationName}. Review prices, property details, owner-occupant opportunities, and request help from a HUD-registered real estate broker.`

  return (
    <div className="bg-gray-50">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
      </Helmet>

      <section className="bg-gradient-to-br from-blue-800 to-blue-600 text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <nav className="mb-5 text-sm text-blue-100" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-white">Home</Link>
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
            HUD Homes for Sale in {locationName}
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-blue-100">
            Browse current HUD-owned properties and get help understanding eligibility,
            financing, inspections, bidding deadlines, and the closing process.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {loading ? 'Loading current listings…' : `${properties.length} active HUD ${properties.length === 1 ? 'home' : 'homes'}`}
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
              HUD inventory changes regularly. Search nearby areas or contact us about new listings.
            </p>
            <Link to="/search" className="mt-5 inline-block font-semibold text-blue-700 hover:underline">
              Search all properties
            </Link>
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
              {cities.map(city => (
                <Link
                  key={city}
                  to={`/hud-homes/${stateSlug}/${slugify(city)}`}
                  className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 font-medium text-blue-800 hover:bg-blue-100"
                >
                  {city}
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

        <p className="mt-8 text-sm leading-6 text-gray-500">
          USAHUDhomes.com is an independent real estate resource and is not a government agency
          or affiliated with the U.S. Department of Housing and Urban Development. Program,
          financing, and closing-cost eligibility varies by buyer and property.
        </p>
      </main>
    </div>
  )
}
