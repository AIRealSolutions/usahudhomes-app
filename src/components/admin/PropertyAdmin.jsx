import { useState, useEffect } from 'react'
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
  Upload
} from 'lucide-react'
import propertyManagement from '../../services/propertyManagement.js'

function PropertyAdmin() {
  const [properties, setProperties] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState(null)
  const [formData, setFormData] = useState(getEmptyFormData())

  useEffect(() => {
    loadProperties()
  }, [])

  function getEmptyFormData() {
    return {
      caseNumber: '',
      address: '',
      city: '',
      state: 'NC',
      zipCode: '',
      county: '',
      price: '',
      bedrooms: '',
      bathrooms: '',
      sqFt: '',
      lotSize: '',
      yearBuilt: '',
      status: 'BIDS OPEN',
      bidDeadline: '',
      propertyType: 'Single Family Home',
      description: '',
      image: '',
      amenities: {
        indoor: [],
        outdoor: [],
        parking: ''
      }
    }
  }

  function loadProperties() {
    const allProperties = propertyManagement.getAllProperties()
    setProperties(allProperties)
  }

  function handleSearch() {
    if (searchQuery.trim()) {
      const results = propertyManagement.searchProperties(searchQuery)
      setProperties(results)
    } else {
      loadProperties()
    }
  }

  function handleAdd() {
    setEditingProperty(null)
    setFormData(getEmptyFormData())
    setShowForm(true)
  }

  function handleEdit(property) {
    setEditingProperty(property)
    setFormData({
      ...property,
      amenities: property.amenities || { indoor: [], outdoor: [], parking: '' }
    })
    setShowForm(true)
  }

  function handleDelete(property) {
    if (confirm(`Are you sure you want to delete ${property.address}?`)) {
      propertyManagement.deleteProperty(property.id)
      loadProperties()
      alert('Property deleted successfully!')
    }
  }

  function handleSubmit(e) {
    e.preventDefault()

    // Validate required fields
    if (!formData.caseNumber || !formData.address || !formData.city || !formData.price) {
      alert('Please fill in all required fields')
      return
    }

    // Convert string numbers to actual numbers
    const propertyData = {
      ...formData,
      price: parseFloat(formData.price),
      bedrooms: parseInt(formData.bedrooms),
      bathrooms: parseFloat(formData.bathrooms),
      sqFt: parseInt(formData.sqFt),
      yearBuilt: parseInt(formData.yearBuilt)
    }

    if (editingProperty) {
      propertyManagement.updateProperty(editingProperty.id, propertyData)
      alert('Property updated successfully!')
    } else {
      propertyManagement.addProperty(propertyData)
      alert('Property added successfully!')
    }

    setShowForm(false)
    setFormData(getEmptyFormData())
    setEditingProperty(null)
    loadProperties()
  }

  function handleCancel() {
    setShowForm(false)
    setFormData(getEmptyFormData())
    setEditingProperty(null)
  }

  function handleExport() {
    const data = propertyManagement.exportProperties()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `properties_backup_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e) {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result)
          if (propertyManagement.importProperties(data)) {
            loadProperties()
            alert('Properties imported successfully!')
          } else {
            alert('Invalid import file format')
          }
        } catch (error) {
          alert('Error importing properties: ' + error.message)
        }
      }
      reader.readAsText(file)
    }
  }

  const stats = propertyManagement.getPropertyStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Property Management</h2>
          <p className="text-gray-600">Add, edit, and manage HUD properties</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <label>
            <Button variant="outline" as="span">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
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
            <div className="text-2xl font-bold">{stats.total}</div>
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
            <div className="text-2xl font-bold">{stats.byStatus['BIDS OPEN'] || 0}</div>
            <p className="text-sm text-gray-600">Bids Open</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.byStatus['PRICE REDUCED'] || 0}</div>
            <p className="text-sm text-gray-600">Price Reduced</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search by address, city, county, or case number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
        {searchQuery && (
          <Button variant="outline" onClick={() => { setSearchQuery(''); loadProperties(); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Property Form Modal */}
      {showForm && (
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <CardTitle>{editingProperty ? 'Edit Property' : 'Add New Property'}</CardTitle>
            <CardDescription>
              {editingProperty ? 'Update property information' : 'Enter property details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Case Number *</label>
                  <Input
                    value={formData.caseNumber}
                    onChange={(e) => setFormData({...formData, caseNumber: e.target.value})}
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
                    <option>NC</option>
                    <option>TN</option>
                    <option>SC</option>
                    <option>VA</option>
                    <option>GA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ZIP Code</label>
                  <Input
                    value={formData.zipCode}
                    onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
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
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                    placeholder="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bathrooms</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                    placeholder="2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sq Ft</label>
                  <Input
                    type="number"
                    value={formData.sqFt}
                    onChange={(e) => setFormData({...formData, sqFt: e.target.value})}
                    placeholder="2850"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Year Built</label>
                  <Input
                    type="number"
                    value={formData.yearBuilt}
                    onChange={(e) => setFormData({...formData, yearBuilt: e.target.value})}
                    placeholder="2008"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Lot Size</label>
                  <Input
                    value={formData.lotSize}
                    onChange={(e) => setFormData({...formData, lotSize: e.target.value})}
                    placeholder="0.25 acres"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bid Deadline</label>
                  <Input
                    type="datetime-local"
                    value={formData.bidDeadline ? formData.bidDeadline.slice(0, 16) : ''}
                    onChange={(e) => setFormData({...formData, bidDeadline: e.target.value + ':00'})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <Input
                  value={formData.image}
                  onChange={(e) => setFormData({...formData, image: e.target.value})}
                  placeholder="/property-images/387-111612.jpeg"
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
                <Button type="submit">
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
                    {property.image ? (
                      <img src={property.image} alt={property.address} className="w-full h-full object-cover" />
                    ) : (
                      <Home className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold">{property.address}</h3>
                        <p className="text-gray-600">{property.city}, {property.state} {property.zipCode}</p>
                        <p className="text-sm text-gray-500">{property.county}</p>
                      </div>
                      <Badge variant={property.status === 'BIDS OPEN' ? 'default' : 'secondary'}>
                        {property.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Price:</span>
                        <div className="font-bold text-green-600">${property.price.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Beds/Baths:</span>
                        <div className="font-semibold">{property.bedrooms} / {property.bathrooms}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Sq Ft:</span>
                        <div className="font-semibold">{property.sqFt?.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Case #:</span>
                        <div className="font-semibold">{property.caseNumber}</div>
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
            <Button onClick={handleAdd} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Property
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PropertyAdmin
