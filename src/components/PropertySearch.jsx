import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Slider } from '@/components/ui/slider.jsx'
import { Checkbox } from '@/components/ui/checkbox.jsx'
import { 
  Search, 
  Filter, 
  MapPin, 
  Home, 
  DollarSign, 
  Bed, 
  Bath, 
  Calendar,
  Heart,
  Share2,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

const PropertySearch = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    state: '',
    minPrice: 0,
    maxPrice: 1000000,
    bedrooms: '',
    bathrooms: '',
    status: '',
    county: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(false)
  const [favorites, setFavorites] = useState(new Set())

  // Real HUD properties matching main page (NC and TN)
  const sampleProperties = [
    {
      id: '387-111612',
      address: '80 Prong Creek Ln',
      city: 'Yanceyville',
      state: 'NC',
      price: 544000,
      beds: 3,
      baths: 2,
      status: 'BIDS OPEN',
      county: 'Caswell County',
      sqft: 3073,
      listingDate: '2025-10-15',
      bidDeadline: '2025-11-03',
      images: ['/property-images/387-111612.jpeg']
    },
    {
      id: '387-570372',
      address: '2105 Fathom Way',
      city: 'Charlotte',
      state: 'NC',
      price: 365000,
      beds: 4,
      baths: 2.1,
      status: 'BIDS OPEN',
      county: 'Mecklenburg County',
      sqft: 2850,
      listingDate: '2025-10-10',
      bidDeadline: '2025-11-03',
      images: ['/property-images/387-570372.jpeg']
    },
    {
      id: '387-412268',
      address: '162 Black Horse Ln',
      city: 'Kittrell',
      state: 'NC',
      price: 336150,
      beds: 3,
      baths: 3,
      status: 'PRICE REDUCED',
      county: 'Vance County',
      sqft: 2650,
      listingDate: '2025-10-05',
      bidDeadline: '2025-11-03',
      images: ['/property-images/387-412268.jpeg']
    },
    {
      id: '381-799288',
      address: '3009 Wynston Way',
      city: 'Clayton',
      state: 'NC',
      price: 310500,
      beds: 3,
      baths: 2,
      status: 'BIDS OPEN',
      county: 'Johnston County',
      sqft: 2200,
      listingDate: '2025-10-12',
      bidDeadline: '2025-11-03',
      images: ['/property-images/381-799288.jpeg']
    },
    {
      id: '482-521006',
      address: '1234 Main St',
      city: 'Mc Kenzie',
      state: 'TN',
      price: 147200,
      beds: 4,
      baths: 2,
      status: 'PRICE REDUCED',
      county: 'Carroll County',
      sqft: 2400,
      listingDate: '2025-10-08',
      bidDeadline: '2025-11-03',
      images: ['/property-images/482-521006.jpeg']
    }
  ]

  useEffect(() => {
    setProperties(sampleProperties)
  }, [])

  const handleSearch = () => {
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      let filtered = sampleProperties.filter(property => {
        const matchesQuery = !searchQuery || 
          property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          property.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          property.county.toLowerCase().includes(searchQuery.toLowerCase())
        
        const matchesState = !filters.state || property.state === filters.state
        const matchesPrice = property.price >= filters.minPrice && property.price <= filters.maxPrice
        const matchesBeds = !filters.bedrooms || property.beds >= parseInt(filters.bedrooms)
        const matchesBaths = !filters.bathrooms || property.baths >= parseFloat(filters.bathrooms)
        const matchesStatus = !filters.status || property.status === filters.status

        return matchesQuery && matchesState && matchesPrice && matchesBeds && matchesBaths && matchesStatus
      })
      
      setProperties(filtered)
      setLoading(false)
    }, 1000)
  }

  const toggleFavorite = (propertyId) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(propertyId)) {
      newFavorites.delete(propertyId)
    } else {
      newFavorites.add(propertyId)
    }
    setFavorites(newFavorites)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'New Listing': return 'bg-green-100 text-green-800'
      case 'Price Reduced': return 'bg-red-100 text-red-800'
      case 'Available': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getDaysUntilDeadline = (deadline) => {
    const today = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Search HUD Properties</h1>
        <p className="text-lg text-gray-600">Find your perfect HUD home from our nationwide database</p>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search by address, city, county, or case number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-lg"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="h-12 px-6"
              >
                <Filter className="h-5 w-5 mr-2" />
                Filters
                {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
              <Button onClick={handleSearch} className="h-12 px-8 bg-blue-600 hover:bg-blue-700">
                <Search className="h-5 w-5 mr-2" />
                Search
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <Select value={filters.state} onValueChange={(value) => setFilters({...filters, state: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NC">North Carolina</SelectItem>
                      <SelectItem value="SC">South Carolina</SelectItem>
                      <SelectItem value="GA">Georgia</SelectItem>
                      <SelectItem value="FL">Florida</SelectItem>
                      <SelectItem value="TX">Texas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Bedrooms</label>
                  <Select value={filters.bedrooms} onValueChange={(value) => setFilters({...filters, bedrooms: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1+</SelectItem>
                      <SelectItem value="2">2+</SelectItem>
                      <SelectItem value="3">3+</SelectItem>
                      <SelectItem value="4">4+</SelectItem>
                      <SelectItem value="5">5+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Bathrooms</label>
                  <Select value={filters.bathrooms} onValueChange={(value) => setFilters({...filters, bathrooms: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1+</SelectItem>
                      <SelectItem value="1.5">1.5+</SelectItem>
                      <SelectItem value="2">2+</SelectItem>
                      <SelectItem value="2.5">2.5+</SelectItem>
                      <SelectItem value="3">3+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="New Listing">New Listing</SelectItem>
                      <SelectItem value="Price Reduced">Price Reduced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Price Range: {formatPrice(filters.minPrice)} - {formatPrice(filters.maxPrice)}
                </label>
                <div className="px-2">
                  <Slider
                    value={[filters.minPrice, filters.maxPrice]}
                    onValueChange={([min, max]) => setFilters({...filters, minPrice: min, maxPrice: max})}
                    max={1000000}
                    min={0}
                    step={25000}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {loading ? 'Searching...' : `${properties.length} Properties Found`}
          </h2>
          {searchQuery && (
            <p className="text-gray-600">Results for "{searchQuery}"</p>
          )}
        </div>
        <div className="flex gap-2">
          <Select defaultValue="newest">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="beds">Most Bedrooms</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Property Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg"></div>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <Card key={property.id} className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="relative">
                <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 rounded-t-lg flex items-center justify-center overflow-hidden">
                  <Home className="h-16 w-16 text-gray-400" />
                  {/* In production, replace with actual property images */}
                </div>
                
                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                  <Badge className={`${getStatusColor(property.status)} font-medium`}>
                    {property.status}
                  </Badge>
                </div>

                {/* Action Buttons */}
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                    onClick={() => toggleFavorite(property.id)}
                  >
                    <Heart 
                      className={`h-4 w-4 ${favorites.has(property.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
                    />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                  >
                    <Share2 className="h-4 w-4 text-gray-600" />
                  </Button>
                </div>

                {/* Bid Deadline */}
                {getDaysUntilDeadline(property.bidDeadline) <= 7 && (
                  <div className="absolute bottom-3 left-3">
                    <Badge variant="destructive" className="bg-red-600">
                      <Calendar className="h-3 w-3 mr-1" />
                      {getDaysUntilDeadline(property.bidDeadline)} days left
                    </Badge>
                  </div>
                )}
              </div>

              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {property.address}
                  </CardTitle>
                </div>
                <CardDescription className="flex items-center text-gray-600">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.city}, {property.state} • {property.county}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold text-green-600">
                    {formatPrice(property.price)}
                  </span>
                  <span className="text-sm text-gray-500">
                    Case #{property.id}
                  </span>
                </div>

                <div className="flex justify-between text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <Bed className="h-4 w-4 mr-1" />
                    {property.beds} beds
                  </div>
                  <div className="flex items-center">
                    <Bath className="h-4 w-4 mr-1" />
                    {property.baths} baths
                  </div>
                  <div className="flex items-center">
                    <Home className="h-4 w-4 mr-1" />
                    {property.sqft?.toLocaleString()} sqft
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Submit Interest
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && properties.length === 0 && (
        <div className="text-center py-12">
          <Home className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No properties found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your search criteria or filters</p>
          <Button onClick={() => {
            setSearchQuery('')
            setFilters({
              state: '',
              minPrice: 0,
              maxPrice: 1000000,
              bedrooms: '',
              bathrooms: '',
              status: '',
              county: ''
            })
            setProperties(sampleProperties)
          }}>
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  )
}

export default PropertySearch
