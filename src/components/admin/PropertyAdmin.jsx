import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Home, 
  DollarSign,
  MapPin,
  Save,
  X,
  Download,
  Upload,
  Image as ImageIcon,
  Loader2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { propertyService } from '../../services/database'
import { supabase } from '../../config/supabase'
import { getImageUrl, getImageUrlFromCaseNumber } from '../../utils/imageUtils'

function PropertyAdmin() {
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState(null)
  const [formData, setFormData] = useState(getEmptyFormData())
  const [stats, setStats] = useState({ total: 0, averagePrice: 0, bidsOpen: 0, priceReduced: 0 })
  
  // Image upload states
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadProperties()
    loadStats()
  }, [])

  function getEmptyFormData() {
    return {
      case_number: '',
      address: '',
      city: '',
      state: 'NC',
      zip_code: '',
      county: '',
      price: '',
      beds: '',
      baths: '',
      sq_ft: '',
      lot_size: '',
      year_built: '',
      status: 'BIDS OPEN',
      bid_deadline: '',
      property_type: 'Single Family Home',
      description: '',
      main_image: '',
      images: [],
      features: []
    }
  }

  async function loadProperties() {
    const result = await propertyService.getAllProperties()
    if (result.success) {
      setProperties(result.data)
    }
  }

  async function loadStats() {
    const result = await propertyService.getPropertyStats()
    if (result.success) {
      setStats(result.data)
    }
  }

  async function handleSearch() {
    if (searchQuery.trim()) {
      const result = await propertyService.searchProperties(searchQuery)
      if (result.success) {
        setProperties(result.data)
      }
    } else {
      loadProperties()
    }
  }

  function handleAdd() {
    setEditingProperty(null)
    setFormData(getEmptyFormData())
    setImageFile(null)
    setImagePreview(null)
    setShowForm(true)
  }

  function handleEdit(property) {
    setEditingProperty(property)
    setFormData({
      case_number: property.case_number || '',
      address: property.address || '',
      city: property.city || '',
      state: property.state || 'NC',
      zip_code: property.zip_code || '',
      county: property.county || '',
      price: property.price || '',
      beds: property.beds || '',
      baths: property.baths || '',
      sq_ft: property.sq_ft || '',
      lot_size: property.lot_size || '',
      year_built: property.year_built || '',
      status: property.status || 'BIDS OPEN',
      bid_deadline: property.bid_deadline || '',
      property_type: property.property_type || 'Single Family Home',
      description: property.description || '',
      main_image: property.main_image || '',
      images: property.images || [],
      features: property.features || []
    })
    setImagePreview(property.main_image || null)
    setImageFile(null)
    setShowForm(true)
  }

  async function handleDelete(property) {
    if (confirm(`Are you sure you want to delete ${property.address}?`)) {
      const result = await propertyService.deleteProperty(property.id)
      if (result.success) {
        loadProperties()
        loadStats()
        alert('Property deleted successfully!')
      } else {
        alert('Error deleting property: ' + result.error)
      }
    }
  }

  // Handle image file selection
  function handleImageSelect(e) {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
        return
      }
      setImageFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Upload image to Supabase Storage
  async function uploadImageToSupabase(file, caseNumber) {
    try {
      setUploading(true)
      setUploadProgress(0)

      const fileExt = file.name.split('.').pop()
      const fileName = `${caseNumber}.${fileExt}`
      const filePath = fileName

      const { data, error } = await supabase.storage
        .from('USAHUDhomes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('USAHUDhomes')
        .getPublicUrl(filePath)

      setUploadProgress(100)
      setUploading(false)

      return { success: true, url: urlData.publicUrl }
    } catch (error) {
      console.error('Error uploading image:', error)
      setUploading(false)
      return { success: false, error: error.message }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.case_number || !formData.address || !formData.city || !formData.price) {
      alert('Please fill in all required fields (Case Number, Address, City, Price)')
      return
    }

    let imageUrl = formData.main_image

    if (imageFile) {
      const uploadResult = await uploadImageToSupabase(imageFile, formData.case_number)
      if (uploadResult.success) {
        imageUrl = uploadResult.url
      } else {
        alert('Error uploading image: ' + uploadResult.error)
        return
      }
    }

    const propertyData = {
      case_number: formData.case_number,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zip_code: formData.zip_code,
      county: formData.county,
      price: parseFloat(formData.price) || 0,
      beds: parseInt(formData.beds) || 0,
      baths: parseFloat(formData.baths) || 0,
      sq_ft: parseInt(formData.sq_ft) || 0,
      lot_size: formData.lot_size,
      year_built: parseInt(formData.year_built) || null,
      status: formData.status,
      bid_deadline: formData.bid_deadline || null,
      property_type: formData.property_type,
      description: formData.description,
      main_image: imageUrl,
      images: formData.images,
      features: formData.features
    }

    let result
    if (editingProperty) {
      result = await propertyService.updateProperty(editingProperty.id, propertyData)
      if (result.success) alert('Property updated successfully!')
    } else {
      result = await propertyService.addProperty(propertyData)
      if (result.success) alert('Property added successfully!')
    }

    if (result.success) {
      setShowForm(false)
      setFormData(getEmptyFormData())
      setEditingProperty(null)
      setImageFile(null)
      setImagePreview(null)
      loadProperties()
      loadStats()
    } else {
      alert('Error: ' + result.error)
    }
  }

  function handleCancel() {
    setShowForm(false)
    setFormData(getEmptyFormData())
    setEditingProperty(null)
    setImageFile(null)
    setImagePreview(null)
  }

  async function handleExport() {
    const result = await propertyService.getAllProperties()
    if (result.success) {
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `properties_backup_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Property Management</h2>
          <p className="text-gray-600">View, edit, and manage HUD properties. Use <strong>HUD Scraper</strong> in the sidebar to import new listings.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total || 0}</div>
            <p className="text-sm text-gray-600">Total Properties</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">${(stats.averagePrice || 0).toLocaleString()}</div>
            <p className="text-sm text-gray-600">Average Price</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.bidsOpen || 0}</div>
            <p className="text-sm text-gray-600">Bids Open</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.priceReduced || 0}</div>
            <p className="text-sm text-gray-600">Price Reduced</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search properties..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="max-w-md"
        />
        <Button variant="outline" onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
        {searchQuery && (
          <Button variant="ghost" onClick={() => { setSearchQuery(''); loadProperties() }}>
            Clear
          </Button>
        )}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingProperty ? 'Edit Property' : 'Add New Property'}</CardTitle>
            <CardDescription>
              {editingProperty ? 'Update property details' : 'Manually add a single HUD property'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Upload Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                <div className="flex flex-col items-center">
                  <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Property Image</h3>
                  
                  {imagePreview && (
                    <div className="mb-4">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-64 h-48 object-cover rounded-lg shadow-md"
                      />
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading... {uploadProgress}%
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {imagePreview ? 'Change Image' : 'Upload Image'}
                        </>
                      )}
                    </Button>
                    {imagePreview && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setImageFile(null)
                          setImagePreview(null)
                          setFormData({...formData, main_image: ''})
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Supported: JPG, PNG, WebP (Max 5MB)
                  </p>
                </div>
              </div>

              {/* Property Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Case Number *</label>
                  <Input
                    value={formData.case_number}
                    onChange={(e) => setFormData({...formData, case_number: e.target.value})}
                    placeholder="387-111612"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option>BIDS OPEN</option>
                    <option>PRICE REDUCED</option>
                    <option>SOLD</option>
                    <option>PENDING</option>
                    <option>AVAILABLE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address *</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="123 Main St"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">City *</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="Charlotte"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State *</label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option>AL</option><option>AK</option><option>AZ</option><option>AR</option>
                    <option>CA</option><option>CO</option><option>CT</option><option>DE</option>
                    <option>FL</option><option>GA</option><option>HI</option><option>ID</option>
                    <option>IL</option><option>IN</option><option>IA</option><option>KS</option>
                    <option>KY</option><option>LA</option><option>ME</option><option>MD</option>
                    <option>MA</option><option>MI</option><option>MN</option><option>MS</option>
                    <option>MO</option><option>MT</option><option>NE</option><option>NV</option>
                    <option>NH</option><option>NJ</option><option>NM</option><option>NY</option>
                    <option>NC</option><option>ND</option><option>OH</option><option>OK</option>
                    <option>OR</option><option>PA</option><option>RI</option><option>SC</option>
                    <option>SD</option><option>TN</option><option>TX</option><option>UT</option>
                    <option>VT</option><option>VA</option><option>WA</option><option>WV</option>
                    <option>WI</option><option>WY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ZIP Code</label>
                  <Input
                    value={formData.zip_code}
                    onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                    placeholder="28269"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">County</label>
                  <Input
                    value={formData.county}
                    onChange={(e) => setFormData({...formData, county: e.target.value})}
                    placeholder="Mecklenburg County"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price *</label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="365000"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Bedrooms</label>
                  <Input
                    type="number"
                    value={formData.beds}
                    onChange={(e) => setFormData({...formData, beds: e.target.value})}
                    placeholder="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bathrooms</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.baths}
                    onChange={(e) => setFormData({...formData, baths: e.target.value})}
                    placeholder="2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sq Ft</label>
                  <Input
                    type="number"
                    value={formData.sq_ft}
                    onChange={(e) => setFormData({...formData, sq_ft: e.target.value})}
                    placeholder="2850"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Year Built</label>
                  <Input
                    type="number"
                    value={formData.year_built}
                    onChange={(e) => setFormData({...formData, year_built: e.target.value})}
                    placeholder="2008"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Lot Size</label>
                  <Input
                    value={formData.lot_size}
                    onChange={(e) => setFormData({...formData, lot_size: e.target.value})}
                    placeholder="0.25 acres"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Property Type</label>
                  <select
                    value={formData.property_type}
                    onChange={(e) => setFormData({...formData, property_type: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option>Single Family Home</option>
                    <option>Townhouse</option>
                    <option>Condo</option>
                    <option>Multi-Family</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bid Deadline</label>
                <Input
                  type="datetime-local"
                  value={formData.bid_deadline ? formData.bid_deadline.slice(0, 16) : ''}
                  onChange={(e) => setFormData({...formData, bid_deadline: e.target.value ? e.target.value + ':00' : ''})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Property description..."
                  rows={4}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingProperty ? 'Update' : 'Add'} Property
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Properties List */}
      <div className="grid grid-cols-1 gap-4">
        {properties.map((property) => (
          <Card key={property.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex gap-4 flex-1">
                  <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {(property.main_image || property.case_number) ? (
                      <>
                        <img 
                          src={getImageUrl(property.main_image) || getImageUrlFromCaseNumber(property.case_number)} 
                          alt={property.address} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                        <div className="hidden w-full h-full items-center justify-center">
                          <Home className="h-12 w-12 text-gray-400" />
                        </div>
                      </>
                    ) : (
                      <Home className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold">{property.address}</h3>
                        <p className="text-gray-600">{property.city}, {property.state} {property.zip_code}</p>
                        <p className="text-sm text-gray-500">{property.county}</p>
                      </div>
                      <Badge variant={property.status === 'BIDS OPEN' ? 'default' : 'secondary'}>
                        {property.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Price:</span>
                        <div className="font-bold text-green-600">${property.price?.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Beds/Baths:</span>
                        <div className="font-semibold">{property.beds} / {property.baths}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Sq Ft:</span>
                        <div className="font-semibold">{property.sq_ft?.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Case #:</span>
                        <div className="font-semibold">{property.case_number}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(property)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(property)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {properties.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No properties found</p>
            <p className="text-sm text-gray-400 mt-1">Use the <strong>HUD Scraper</strong> in the sidebar to import listings from hudhomestore.gov</p>
            <Button onClick={handleAdd} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Property Manually
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PropertyAdmin
