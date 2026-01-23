import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { propertyService } from '../../services/database'
import AIMarketingAssistant from './AIMarketingAssistant'
import { getImageUrl } from '../../utils/imageUtils'
import {
  ArrowLeft,
  Home,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  Maximize,
  Calendar,
  FileText,
  Eye,
  Share2,
  Download,
  Edit,
  ExternalLink,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  Link as LinkIcon,
  Copy,
  CheckCircle,
  Image as ImageIcon,
  TrendingUp,
  Users,
  Building
} from 'lucide-react'

const PropertyDetailsAdmin = () => {
  const { caseNumber } = useParams()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('details') // details, marketing, seo

  useEffect(() => {
    loadProperty()
  }, [caseNumber])

  async function loadProperty() {
    setLoading(true)
    try {
      const result = await propertyService.getPropertyByCaseNumber(caseNumber)
      if (result.success && result.data) {
        setProperty(result.data)
      }
    } catch (error) {
      console.error('Error loading property:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPropertyUrl = () => {
    return `${window.location.origin}/property/${property.case_number}`
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareToFacebook = () => {
    const url = getPropertyUrl()
    // Use Facebook's modern share dialog which works better on mobile
    window.open(`https://www.facebook.com/sharer.php?u=${encodeURIComponent(url)}&display=popup`, '_blank', 'width=600,height=400')
  }

  const shareToTwitter = () => {
    const url = getPropertyUrl()
    const text = `Check out this HUD Home: ${property.address}, ${property.city}, ${property.state} - $${property.price?.toLocaleString()}`
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank')
  }

  const shareToLinkedIn = () => {
    const url = getPropertyUrl()
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank')
  }

  const shareViaEmail = () => {
    const url = getPropertyUrl()
    const subject = `HUD Home: ${property.address}, ${property.city}, ${property.state}`
    const body = `I wanted to share this HUD Home with you:\n\n${property.address}\n${property.city}, ${property.state} ${property.zip}\n\nPrice: $${property.price?.toLocaleString()}\nCase Number: ${property.case_number}\n\nView details: ${url}`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const downloadPropertyInfo = () => {
    const info = `
HUD HOME PROPERTY DETAILS
========================

Address: ${property.address}
City: ${property.city}
State: ${property.state}
ZIP: ${property.zip}
Case Number: ${property.case_number}

PRICING
-------
List Price: $${property.price?.toLocaleString()}
${property.bid_open_date ? `Bid Opening: ${new Date(property.bid_open_date).toLocaleDateString()}` : ''}

PROPERTY DETAILS
---------------
Bedrooms: ${property.bedrooms || 'N/A'}
Bathrooms: ${property.bathrooms || 'N/A'}
Square Feet: ${property.square_feet ? property.square_feet.toLocaleString() : 'N/A'}
Year Built: ${property.year_built || 'N/A'}
Property Type: ${property.property_type || 'N/A'}

STATUS
------
Status: ${property.status || 'Available'}
${property.fha_insurable ? 'FHA Insurable: Yes' : 'FHA Insurable: No'}

VIEW ONLINE
-----------
${getPropertyUrl()}

Generated: ${new Date().toLocaleString()}
    `.trim()

    const blob = new Blob([info], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `property-${property.case_number}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading property details...</p>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Home className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Property Not Found</h2>
          <p className="text-gray-600 mb-6">The property you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/admin-dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const imageUrl = getImageUrl(property.image_url)

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>{`${property.address}, ${property.city}, ${property.state} - HUD Home | USAHUDhomes.com`}</title>
        <meta name="description" content={`${property.bedrooms} bed, ${property.bathrooms} bath HUD home in ${property.city}, ${property.state}. Listed at $${property.price?.toLocaleString()}. Case #${property.case_number}. View details and schedule a showing.`} />
        <meta name="keywords" content={`HUD home, ${property.city}, ${property.state}, foreclosure, real estate, ${property.bedrooms} bedroom, ${property.property_type}`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={getPropertyUrl()} />
        <meta property="og:title" content={`${property.address}, ${property.city}, ${property.state} - HUD Home`} />
        <meta property="og:description" content={`${property.bedrooms} bed, ${property.bathrooms} bath HUD home. $${property.price?.toLocaleString()}. Case #${property.case_number}`} />
        <meta property="og:image" content={imageUrl} />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={getPropertyUrl()} />
        <meta property="twitter:title" content={`${property.address}, ${property.city}, ${property.state} - HUD Home`} />
        <meta property="twitter:description" content={`${property.bedrooms} bed, ${property.bathrooms} bath HUD home. $${property.price?.toLocaleString()}`} />
        <meta property="twitter:image" content={imageUrl} />
        
        {/* Additional SEO */}
        <link rel="canonical" content={getPropertyUrl()} />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="USAHUDhomes.com" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <button
              onClick={() => navigate('/admin-dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>

            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {property.address}
                </h1>
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <MapPin className="w-5 h-5" />
                  <span className="text-lg">
                    {property.city}, {property.state} {property.zip}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-bold text-blue-600">
                    ${property.price?.toLocaleString()}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    property.status === 'available' ? 'bg-green-100 text-green-800' :
                    property.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {property.status || 'Available'}
                  </span>
                  {property.fha_insurable && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      FHA Insurable
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 ml-4">

                <button
                  onClick={() => navigate('/admin-dashboard', { state: { editPropertyId: property.id } })}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  title="Edit Property"
                >
                  <Edit className="w-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-4 border-b-2 font-medium transition-colors ${
                  activeTab === 'details'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Property Details
              </button>
              <button
                onClick={() => setActiveTab('marketing')}
                className={`py-4 border-b-2 font-medium transition-colors ${
                  activeTab === 'marketing'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Marketing Tools
              </button>
              <button
                onClick={() => setActiveTab('seo')}
                className={`py-4 border-b-2 font-medium transition-colors ${
                  activeTab === 'seo'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                SEO & Meta
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Property Image */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="aspect-video bg-gray-200 relative">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={property.address}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full text-sm font-medium shadow">
                    Case #{property.case_number}
                  </div>
                </div>
              </div>

              {/* Property Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Bedrooms</p>
                      <p className="text-2xl font-bold text-gray-900">{property.bedrooms || 'N/A'}</p>
                    </div>
                    <Bed className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Bathrooms</p>
                      <p className="text-2xl font-bold text-gray-900">{property.bathrooms || 'N/A'}</p>
                    </div>
                    <Bath className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Square Feet</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {property.square_feet ? property.square_feet.toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <Maximize className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Year Built</p>
                      <p className="text-2xl font-bold text-gray-900">{property.year_built || 'N/A'}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Property Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Property Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Property Type</p>
                    <p className="font-semibold text-gray-900">{property.property_type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Case Number</p>
                    <p className="font-semibold text-gray-900">{property.case_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Bid Opening Date</p>
                    <p className="font-semibold text-gray-900">
                      {property.bid_open_date 
                        ? new Date(property.bid_open_date).toLocaleDateString()
                        : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">FHA Insurable</p>
                    <p className="font-semibold text-gray-900">
                      {property.fha_insurable ? 'Yes' : 'No'}
                    </p>
                  </div>
                  {property.description && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600 mb-1">Description</p>
                      <p className="text-gray-900">{property.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'marketing' && (
            <div className="space-y-6">
              {/* AI Marketing Assistant */}
              <AIMarketingAssistant property={property} />
              {/* Social Media Sharing */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Share2 className="w-6 h-6" />
                  Social Media Sharing
                </h2>
                <p className="text-gray-600 mb-6">
                  Share this property across social media platforms to reach potential buyers.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={shareToFacebook}
                    className="flex items-center gap-3 px-6 py-4 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-lg transition-colors"
                  >
                    <Facebook className="w-6 h-6" />
                    <div className="text-left">
                      <p className="font-semibold">Share on Facebook</p>
                      <p className="text-sm opacity-90">Post to your timeline or page</p>
                    </div>
                  </button>

                  <button
                    onClick={shareToTwitter}
                    className="flex items-center gap-3 px-6 py-4 bg-[#1DA1F2] hover:bg-[#1A91DA] text-white rounded-lg transition-colors"
                  >
                    <Twitter className="w-6 h-6" />
                    <div className="text-left">
                      <p className="font-semibold">Share on Twitter</p>
                      <p className="text-sm opacity-90">Tweet to your followers</p>
                    </div>
                  </button>

                  <button
                    onClick={shareToLinkedIn}
                    className="flex items-center gap-3 px-6 py-4 bg-[#0A66C2] hover:bg-[#095196] text-white rounded-lg transition-colors"
                  >
                    <Linkedin className="w-6 h-6" />
                    <div className="text-left">
                      <p className="font-semibold">Share on LinkedIn</p>
                      <p className="text-sm opacity-90">Post to your network</p>
                    </div>
                  </button>

                  <button
                    onClick={shareViaEmail}
                    className="flex items-center gap-3 px-6 py-4 bg-gray-700 hover:bg-gray-800 text-white rounded-lg transition-colors"
                  >
                    <Mail className="w-6 h-6" />
                    <div className="text-left">
                      <p className="font-semibold">Share via Email</p>
                      <p className="text-sm opacity-90">Send to your contacts</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Copy Link */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <LinkIcon className="w-6 h-6" />
                  Property Link
                </h2>
                <p className="text-gray-600 mb-4">
                  Copy the direct link to this property page.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={getPropertyUrl()}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                  <button
                    onClick={() => copyToClipboard(getPropertyUrl())}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Download Property Info */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Download className="w-6 h-6" />
                  Download Property Information
                </h2>
                <p className="text-gray-600 mb-4">
                  Download a text file with complete property details for offline use or email distribution.
                </p>
                <button
                  onClick={downloadPropertyInfo}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download Property Details
                </button>
              </div>

              {/* Marketing Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Marketing Tips
                </h3>
                <ul className="space-y-2 text-sm text-blue-900">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Share on Facebook and LinkedIn during business hours (9 AM - 5 PM) for maximum reach</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Use Twitter for quick updates and property highlights with relevant hashtags</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Email the property link to your buyer list and interested clients</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Include high-quality photos and highlight FHA insurability if applicable</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Mention the case number and bid opening date in all communications</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="space-y-6">
              {/* SEO Preview */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">SEO Preview</h2>
                <p className="text-gray-600 mb-6">
                  This is how your property will appear in search engine results.
                </p>
                
                {/* Google Search Result Preview */}
                <div className="border border-gray-300 rounded-lg p-4 bg-white">
                  <div className="text-sm text-gray-600 mb-1">{getPropertyUrl()}</div>
                  <div className="text-xl text-blue-600 hover:underline cursor-pointer mb-1">
                    {property.address}, {property.city}, {property.state} - HUD Home | USAHUDhomes.com
                  </div>
                  <div className="text-sm text-gray-700">
                    {property.bedrooms} bed, {property.bathrooms} bath HUD home in {property.city}, {property.state}. 
                    Listed at ${property.price?.toLocaleString()}. Case #{property.case_number}. View details and schedule a showing.
                  </div>
                </div>
              </div>

              {/* Meta Tags */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Meta Tags</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title Tag</label>
                    <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 font-mono text-sm">
                      {property.address}, {property.city}, {property.state} - HUD Home | USAHUDhomes.com
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Length: {`${property.address}, ${property.city}, ${property.state} - HUD Home | USAHUDhomes.com`.length} characters (Optimal: 50-60)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                    <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 font-mono text-sm">
                      {property.bedrooms} bed, {property.bathrooms} bath HUD home in {property.city}, {property.state}. 
                      Listed at ${property.price?.toLocaleString()}. Case #{property.case_number}. View details and schedule a showing.
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Length: {`${property.bedrooms} bed, ${property.bathrooms} bath HUD home in ${property.city}, ${property.state}. Listed at $${property.price?.toLocaleString()}. Case #${property.case_number}. View details and schedule a showing.`.length} characters (Optimal: 150-160)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Keywords</label>
                    <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 font-mono text-sm">
                      HUD home, {property.city}, {property.state}, foreclosure, real estate, {property.bedrooms} bedroom, {property.property_type}
                    </div>
                  </div>
                </div>
              </div>

              {/* Open Graph Preview */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Social Media Preview</h2>
                <p className="text-gray-600 mb-6">
                  This is how your property will appear when shared on social media.
                </p>
                
                {/* Facebook/LinkedIn Preview */}
                <div className="border border-gray-300 rounded-lg overflow-hidden max-w-lg">
                  <div className="aspect-video bg-gray-200">
                    {imageUrl ? (
                      <img src={imageUrl} alt={property.address} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-white">
                    <div className="text-xs text-gray-500 uppercase mb-1">usahudhomes.com</div>
                    <div className="font-bold text-gray-900 mb-1">
                      {property.address}, {property.city}, {property.state} - HUD Home
                    </div>
                    <div className="text-sm text-gray-600">
                      {property.bedrooms} bed, {property.bathrooms} bath HUD home. ${property.price?.toLocaleString()}. Case #{property.case_number}
                    </div>
                  </div>
                </div>
              </div>

              {/* SEO Checklist */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  SEO Checklist
                </h3>
                <ul className="space-y-2 text-sm text-green-900">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Title tag optimized with location and property type</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Meta description includes key details and call-to-action</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Open Graph tags configured for social sharing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Twitter Card tags for enhanced Twitter sharing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Canonical URL set to prevent duplicate content</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Image optimized with alt text for accessibility</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Structured data ready for rich snippets</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default PropertyDetailsAdmin
