import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Home as HomeIcon, Search, Calculator, Bell } from 'lucide-react'
import { supabase } from '../config/supabase'

// A watch page for one listing video: the video is the main content, so Google can show it
// in video results. Search engines get the same page pre-rendered by api/_video-meta.js.
export default function VideoWatchPage() {
  const { caseNumber } = useParams()
  const [state, setState] = useState({ loading: true, property: null, video: null })

  useEffect(() => {
    let live = true
    setState({ loading: true, property: null, video: null })
    Promise.all([
      supabase.from('properties')
        .select('case_number, city, state, price, beds, baths, sq_ft, status, is_active, updated_at')
        .eq('case_number', caseNumber).maybeSingle(),
      supabase.from('video_jobs')
        .select('s3_url, youtube_title, duration_sec, completed_at')
        .eq('case_number', caseNumber).eq('status', 'done').not('s3_url', 'is', null)
        .order('created_at', { ascending: false }).limit(1)
    ]).then(([p, v]) => {
      if (live) setState({ loading: false, property: p.data || null, video: v.data?.[0] || null })
    })
    return () => { live = false }
  }, [caseNumber])

  const { loading, property, video } = state
  if (loading) return <p className="text-center text-gray-600 py-16">Loading video…</p>
  if (!property || !video) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <Helmet><meta name="robots" content="noindex" /></Helmet>
        <p className="text-gray-700 mb-4">This video isn't available.</p>
        <Link to="/search" className="text-blue-600 hover:underline">Search HUD homes</Link>
      </div>
    )
  }

  const price = property.price ? `$${Number(property.price).toLocaleString()}` : ''
  const title = video.youtube_title || `HUD Home Video Tour${price ? ` – ${price}` : ''} in ${property.city}, ${property.state}`
  // Same wording as api/_video.js (what search engines see)
  const facts = [property.beds != null && `${property.beds} bed`, property.baths != null && `${property.baths} bath`].filter(Boolean).join(', ')
  const description =
    `Video tour of a ${facts ? `${facts} ` : ''}HUD home in ${property.city}, ${property.state}` +
    `${price ? ` listed at ${price}` : ''}. Compare HUD homes with free tools and connect with a HUD buyer's agency at USAHUDhomes.com.`
  const offMarket = property.is_active === false || String(property.status || '').toUpperCase() === 'UNDER CONTRACT'
  const v = String(property.updated_at || '').replace(/\D/g, '').slice(0, 14)
  const poster = `https://www.usahudhomes.com/api/og-image?caseNumber=${encodeURIComponent(property.case_number)}&v=${v}`
  const pageUrl = `https://www.usahudhomes.com/video/${encodeURIComponent(property.case_number)}`

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <Helmet>
        <title>{`${title} | USAHUDhomes.com`}</title>
        <meta name="description" content={description.slice(0, 300)} />
        <link rel="canonical" href={pageUrl} />
      </Helmet>

      <div className="mb-4 text-sm text-gray-600">
        <Link to="/" className="hover:text-blue-600">Home</Link>
        <span className="mx-2">/</span>
        <Link to={`/property/${property.case_number}`} className="hover:text-blue-600">{property.city}, {property.state}</Link>
        <span className="mx-2">/</span>
        <span>Video</span>
      </div>

      <div className="grid md:grid-cols-[minmax(0,420px)_1fr] gap-8 items-start">
        <video
          src={video.s3_url}
          poster={poster}
          controls
          playsInline
          preload="metadata"
          className="w-full aspect-[9/16] bg-black rounded-xl shadow-lg"
        />

        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-lg text-gray-700 mb-1">
            {[price, property.beds != null && `${property.beds} bd`, property.baths != null && `${property.baths} ba`]
              .filter(Boolean).join(' · ')} · {property.city}, {property.state}
          </p>
          {offMarket && (
            <p className="inline-block text-sm font-semibold bg-amber-100 text-amber-800 rounded px-2 py-1 mb-2">
              This home is no longer available — browse similar HUD homes below.
            </p>
          )}
          <p className="text-gray-600 whitespace-pre-line my-4">{description}</p>

          <div className="flex flex-wrap gap-3 mb-8">
            <Link to={`/property/${property.case_number}`}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg">
              <HomeIcon className="h-4 w-4" /> View Listing
            </Link>
            <Link to="/search"
                  className="inline-flex items-center gap-2 border border-gray-300 hover:bg-gray-50 font-semibold px-5 py-2.5 rounded-lg">
              <Search className="h-4 w-4" /> Search HUD Homes
            </Link>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="font-bold text-gray-900 mb-3">Make an informed decision</h2>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li className="flex gap-2"><Search className="h-4 w-4 mt-0.5 text-blue-600" /> Search every HUD home and compare past bid results</li>
              <li className="flex gap-2"><Calculator className="h-4 w-4 mt-0.5 text-blue-600" /> Estimate your monthly payment</li>
              <li className="flex gap-2"><Bell className="h-4 w-4 mt-0.5 text-blue-600" /> <Link to="/alerts" className="hover:underline">Get HUD home alerts</Link></li>
            </ul>
            <p className="text-sm text-gray-700 mt-4">
              Connect with a HUD buyer's agency to submit your bid — <Link to="/contact" className="text-blue-600 font-semibold hover:underline">contact us</Link>.
            </p>
          </div>

          <p className="text-xs text-gray-500 mt-6 leading-5">
            USAHUDhomes.com is operated by Lightkeeper Realty, a licensed real estate brokerage and HUD-registered
            buyer's agency, and is not affiliated with the U.S. Department of Housing and Urban Development. Price,
            availability, incentives and financing are subject to change and eligibility. Equal Housing Opportunity.
          </p>
        </div>
      </div>
    </div>
  )
}
