import React, { useState, useEffect } from 'react'
import { propertyService } from '../../services/database'
import { useAuth } from '../../contexts/AuthContext'
import PropertyDetailModal from '../admin/PropertyDetailModal'
import PropertyShareModal from '../admin/PropertyShareModal'
import { 
  Home, 
  Sparkles, 
  TrendingUp, 
  Target,
  Brain,
  Zap,
  Heart,
  Eye,
  Share2,
  Send,
  Bed,
  Bath,
  Maximize,
  DollarSign,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader,
  ThumbsUp,
  ThumbsDown,
  Star,
  Filter,
  RefreshCw
} from 'lucide-react'

const AIPropertiesTab = ({ lead }) => {
  const { profile } = useAuth()
  const [properties, setProperties] = useState([])
  const [aiRecommendations, setAiRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [aiInsights, setAiInsights] = useState(null)
  const [selectedForSharing, setSelectedForSharing] = useState([])

  // Extract customer data from lead
  const customer = lead.customer || {
    id: lead.customer_id,
    first_name: lead.customer_name?.split(' ')[0] || '',
    last_name: lead.customer_name?.split(' ').slice(1).join(' ') || '',
    email: lead.customer_email || '',
    phone: lead.customer_phone || '',
    state: lead.customer?.state || null,
    city: lead.customer?.city || null
  }

  useEffect(() => {
    loadPropertiesAndAnalyze()
  }, [lead])

  async function loadPropertiesAndAnalyze() {
    setLoading(true)
    setAnalyzing(true)
    
    try {
      // Load properties from customer's state or nearby states
      const state = customer.state || 'NC' // Default to NC if no state
      const result = await propertyService.getPropertiesByState(state)
      
      if (result.success && result.data) {
        setProperties(result.data)
        
        // Run AI analysis
        const insights = await analyzeLeadAndProperties(lead, result.data)
        setAiInsights(insights)
        
        // Generate AI recommendations
        const recommendations = await generateAIRecommendations(lead, result.data, insights)
        setAiRecommendations(recommendations)
      }
    } catch (error) {
      console.error('Error loading properties:', error)
    } finally {
      setLoading(false)
      setAnalyzing(false)
    }
  }

  async function analyzeLeadAndProperties(lead, properties) {
    // Simulate AI analysis (in production, this would call an AI service)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const insights = {
      leadProfile: {
        urgency: calculateUrgency(lead),
        budget: estimateBudget(lead),
        preferences: extractPreferences(lead),
        location: customer.city || customer.state || 'Not specified'
      },
      marketInsights: {
        averagePrice: properties.length > 0 
          ? properties.reduce((sum, p) => sum + parseFloat(p.price), 0) / properties.length 
          : 0,
        totalAvailable: properties.length,
        priceRange: {
          min: Math.min(...properties.map(p => parseFloat(p.price))),
          max: Math.max(...properties.map(p => parseFloat(p.price)))
        },
        popularTypes: getPopularPropertyTypes(properties)
      },
      recommendations: {
        bestMatches: 3,
        confidence: 'high',
        factors: ['Location match', 'Price range', 'Property features', 'Market timing']
      }
    }
    
    return insights
  }

  function calculateUrgency(lead) {
    const daysOld = Math.floor((new Date() - new Date(lead.created_at)) / (1000 * 60 * 60 * 24))
    const hasRecentActivity = (lead.email_count || 0) + (lead.sms_count || 0) + (lead.call_count || 0) > 0
    
    if (daysOld < 2 || hasRecentActivity) {
      return { level: 'high', label: 'Hot Lead', color: 'red', score: 90 }
    } else if (daysOld < 7) {
      return { level: 'medium', label: 'Warm Lead', color: 'orange', score: 65 }
    } else {
      return { level: 'low', label: 'Cold Lead', color: 'blue', score: 40 }
    }
  }

  function estimateBudget(lead) {
    // Extract budget hints from message or use market average
    const message = lead.message?.toLowerCase() || ''
    
    if (message.includes('budget') || message.includes('price') || message.includes('afford')) {
      const numbers = message.match(/\$?(\d{1,3}(,\d{3})*(\.\d{2})?)/g)
      if (numbers && numbers.length > 0) {
        return {
          estimated: parseInt(numbers[0].replace(/[$,]/g, '')),
          confidence: 'medium',
          source: 'message'
        }
      }
    }
    
    return {
      estimated: 150000,
      confidence: 'low',
      source: 'market_average'
    }
  }

  function extractPreferences(lead) {
    const message = lead.message?.toLowerCase() || ''
    const preferences = {
      beds: null,
      baths: null,
      propertyType: null,
      features: []
    }
    
    // Extract bedroom preferences
    if (message.includes('bedroom') || message.includes('bed')) {
      const bedMatch = message.match(/(\d+)\s*(bed|bedroom)/i)
      if (bedMatch) preferences.beds = parseInt(bedMatch[1])
    }
    
    // Extract bathroom preferences
    if (message.includes('bathroom') || message.includes('bath')) {
      const bathMatch = message.match(/(\d+(\.\d+)?)\s*(bath|bathroom)/i)
      if (bathMatch) preferences.baths = parseFloat(bathMatch[1])
    }
    
    // Extract property type
    if (message.includes('single family')) preferences.propertyType = 'Single Family'
    if (message.includes('condo')) preferences.propertyType = 'Condo'
    if (message.includes('townhouse')) preferences.propertyType = 'Townhouse'
    
    // Extract features
    if (message.includes('garage')) preferences.features.push('Garage')
    if (message.includes('yard') || message.includes('garden')) preferences.features.push('Yard')
    if (message.includes('pool')) preferences.features.push('Pool')
    if (message.includes('updated') || message.includes('renovated')) preferences.features.push('Recently Updated')
    
    return preferences
  }

  function getPopularPropertyTypes(properties) {
    const typeCounts = {}
    properties.forEach(p => {
      const type = p.property_type || 'Unknown'
      typeCounts[type] = (typeCounts[type] || 0) + 1
    })
    
    return Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => ({ type, count }))
  }

  async function generateAIRecommendations(lead, properties, insights) {
    // Simulate AI recommendation engine
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const preferences = insights.leadProfile.preferences
    const budget = insights.leadProfile.budget
    
    // Score each property based on match criteria
    const scoredProperties = properties.map(property => {
      let score = 0
      const reasons = []
      
      // Location match
      if (customer.city && property.city?.toLowerCase() === customer.city.toLowerCase()) {
        score += 30
        reasons.push('Perfect location match')
      } else if (customer.state && property.state === customer.state) {
        score += 15
        reasons.push('Same state')
      }
      
      // Budget match
      const priceDiff = Math.abs(property.price - budget.estimated)
      const priceScore = Math.max(0, 25 - (priceDiff / budget.estimated) * 25)
      score += priceScore
      if (priceScore > 15) reasons.push('Within budget range')
      
      // Bedroom match
      if (preferences.beds && property.beds >= preferences.beds) {
        score += 20
        reasons.push(`${property.beds} bedrooms (matches preference)`)
      }
      
      // Bathroom match
      if (preferences.baths && property.baths >= preferences.baths) {
        score += 15
        reasons.push(`${property.baths} bathrooms (matches preference)`)
      }
      
      // Property type match
      if (preferences.propertyType && property.property_type === preferences.propertyType) {
        score += 20
        reasons.push(`${property.property_type} (preferred type)`)
      }
      
      // Feature match
      if (preferences.features.length > 0 && property.features) {
        const matchingFeatures = preferences.features.filter(f => 
          property.features.some(pf => pf.toLowerCase().includes(f.toLowerCase()))
        )
        score += matchingFeatures.length * 5
        if (matchingFeatures.length > 0) {
          reasons.push(`Has ${matchingFeatures.join(', ')}`)
        }
      }
      
      // Recency bonus (newer listings)
      const daysListed = Math.floor((new Date() - new Date(property.listing_date || property.created_at)) / (1000 * 60 * 60 * 24))
      if (daysListed < 7) {
        score += 10
        reasons.push('Recently listed')
      }
      
      // Status bonus
      if (property.status === 'AVAILABLE') {
        score += 5
      }
      
      return {
        ...property,
        aiScore: Math.min(100, score),
        matchReasons: reasons,
        confidence: score > 70 ? 'high' : score > 50 ? 'medium' : 'low'
      }
    })
    
    // Sort by AI score and return top matches
    return scoredProperties
      .sort((a, b) => b.aiScore - a.aiScore)
      .slice(0, 10)
  }

  function handleViewDetails(property) {
    setSelectedProperty(property)
    setShowDetailModal(true)
  }

  function handleShareProperty(property) {
    setSelectedProperty(property)
    setSelectedForSharing([property.id])
    setShowShareModal(true)
  }

  function handleShareSelected() {
    if (selectedForSharing.length === 0) {
      alert('Please select at least one property to share')
      return
    }
    setShowShareModal(true)
  }

  function togglePropertySelection(propertyId) {
    setSelectedForSharing(prev => {
      if (prev.includes(propertyId)) {
        return prev.filter(id => id !== propertyId)
      } else {
        return [...prev, propertyId]
      }
    })
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-blue-600 bg-blue-100'
    if (score >= 40) return 'text-orange-600 bg-orange-100'
    return 'text-gray-600 bg-gray-100'
  }

  const getConfidenceBadge = (confidence) => {
    const config = {
      high: { label: 'High Match', color: 'bg-green-100 text-green-800' },
      medium: { label: 'Good Match', color: 'bg-blue-100 text-blue-800' },
      low: { label: 'Possible Match', color: 'bg-gray-100 text-gray-800' }
    }
    return config[confidence] || config.low
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600 mb-2">Loading properties...</p>
        {analyzing && (
          <div className="flex items-center gap-2 text-sm text-purple-600">
            <Brain className="w-4 h-4 animate-pulse" />
            <span>AI is analyzing property matches...</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* AI Insights Header */}
      {aiInsights && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold text-gray-900">AI Property Analysis</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  aiInsights.leadProfile.urgency.level === 'high' ? 'bg-red-100 text-red-800' :
                  aiInsights.leadProfile.urgency.level === 'medium' ? 'bg-orange-100 text-orange-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {aiInsights.leadProfile.urgency.label}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-600 mb-1">Estimated Budget</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatPrice(aiInsights.leadProfile.budget.estimated)}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{aiInsights.leadProfile.budget.confidence} confidence</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-600 mb-1">Available Properties</p>
                  <p className="text-lg font-bold text-gray-900">{aiInsights.marketInsights.totalAvailable}</p>
                  <p className="text-xs text-gray-500">In {customer.state || 'target area'}</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-600 mb-1">Best Matches</p>
                  <p className="text-lg font-bold text-gray-900">{aiRecommendations.length}</p>
                  <p className="text-xs text-gray-500">AI recommended</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-600 mb-1">Match Confidence</p>
                  <p className="text-lg font-bold text-gray-900 capitalize">{aiInsights.recommendations.confidence}</p>
                  <p className="text-xs text-gray-500">Based on preferences</p>
                </div>
              </div>
              
              {/* Lead Preferences */}
              {aiInsights.leadProfile.preferences && (
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Detected Preferences:</p>
                  <div className="flex flex-wrap gap-2">
                    {aiInsights.leadProfile.preferences.beds && (
                      <span className="px-3 py-1 bg-white rounded-full text-sm text-gray-700 border border-gray-200">
                        {aiInsights.leadProfile.preferences.beds}+ bedrooms
                      </span>
                    )}
                    {aiInsights.leadProfile.preferences.baths && (
                      <span className="px-3 py-1 bg-white rounded-full text-sm text-gray-700 border border-gray-200">
                        {aiInsights.leadProfile.preferences.baths}+ bathrooms
                      </span>
                    )}
                    {aiInsights.leadProfile.preferences.propertyType && (
                      <span className="px-3 py-1 bg-white rounded-full text-sm text-gray-700 border border-gray-200">
                        {aiInsights.leadProfile.preferences.propertyType}
                      </span>
                    )}
                    {aiInsights.leadProfile.preferences.features.map((feature, idx) => (
                      <span key={idx} className="px-3 py-1 bg-white rounded-full text-sm text-gray-700 border border-gray-200">
                        {feature}
                      </span>
                    ))}
                    {!aiInsights.leadProfile.preferences.beds && 
                     !aiInsights.leadProfile.preferences.baths && 
                     !aiInsights.leadProfile.preferences.propertyType &&
                     aiInsights.leadProfile.preferences.features.length === 0 && (
                      <span className="text-sm text-gray-500 italic">No specific preferences detected</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={loadPropertiesAndAnalyze}
              className="flex-shrink-0 p-2 hover:bg-purple-100 rounded-lg transition-colors"
              title="Refresh AI analysis"
            >
              <RefreshCw className="w-5 h-5 text-purple-600" />
            </button>
          </div>
        </div>
      )}

      {/* Action Bar */}
      {selectedForSharing.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">
              {selectedForSharing.length} {selectedForSharing.length === 1 ? 'property' : 'properties'} selected
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedForSharing([])}
              className="px-4 py-2 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Clear Selection
            </button>
            <button
              onClick={handleShareSelected}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share Selected
            </button>
          </div>
        </div>
      )}

      {/* AI Recommended Properties */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-bold text-gray-900">AI Recommended Properties</h3>
          <span className="text-sm text-gray-500">
            (Sorted by match score)
          </span>
        </div>

        {aiRecommendations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Properties Found</h3>
            <p className="text-gray-600">
              No properties available in {customer.state || 'the target area'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {aiRecommendations.map((property, index) => (
              <div
                key={property.id}
                className={`bg-white border-2 rounded-lg p-4 transition-all hover:shadow-lg ${
                  selectedForSharing.includes(property.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Rank Badge */}
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {index + 1}
                    </div>
                  </div>

                  {/* Property Image */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 bg-gray-200 rounded-lg overflow-hidden">
                      {property.main_image ? (
                        <img
                          src={property.main_image}
                          alt={property.address}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Property Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-lg font-semibold text-gray-900 truncate">
                            {property.address}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceBadge(property.confidence).color}`}>
                            {getConfidenceBadge(property.confidence).label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {property.city}, {property.state} {property.zip_code}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">
                          {formatPrice(property.price)}
                        </p>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-1 ${getScoreColor(property.aiScore)}`}>
                          <Star className="w-3 h-3" />
                          {property.aiScore}% Match
                        </div>
                      </div>
                    </div>

                    {/* Property Features */}
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      {property.beds && (
                        <div className="flex items-center gap-1">
                          <Bed className="w-4 h-4" />
                          <span>{property.beds} bed{property.beds !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {property.baths && (
                        <div className="flex items-center gap-1">
                          <Bath className="w-4 h-4" />
                          <span>{property.baths} bath{property.baths !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {property.sq_ft && (
                        <div className="flex items-center gap-1">
                          <Maximize className="w-4 h-4" />
                          <span>{property.sq_ft.toLocaleString()} sq ft</span>
                        </div>
                      )}
                      {property.property_type && (
                        <div className="flex items-center gap-1">
                          <Home className="w-4 h-4" />
                          <span>{property.property_type}</span>
                        </div>
                      )}
                    </div>

                    {/* AI Match Reasons */}
                    {property.matchReasons && property.matchReasons.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          Why this property matches:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {property.matchReasons.map((reason, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePropertySelection(property.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          selectedForSharing.includes(property.id)
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        {selectedForSharing.includes(property.id) ? 'Selected' : 'Select'}
                      </button>
                      
                      <button
                        onClick={() => handleViewDetails(property)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-sm font-medium transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                      
                      <button
                        onClick={() => handleShareProperty(property)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded text-sm font-medium transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        Share Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showDetailModal && selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedProperty(null)
          }}
          onShare={() => {
            setShowDetailModal(false)
            handleShareProperty(selectedProperty)
          }}
        />
      )}

      {showShareModal && (
        <PropertyShareModal
          customer={customer}
          properties={properties.filter(p => selectedForSharing.includes(p.id))}
          onClose={() => {
            setShowShareModal(false)
            setSelectedForSharing([])
          }}
          onSuccess={() => {
            setShowShareModal(false)
            setSelectedForSharing([])
          }}
        />
      )}
    </div>
  )
}

export default AIPropertiesTab
