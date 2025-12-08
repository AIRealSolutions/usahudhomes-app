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
  User, 
  Mail,
  Phone,
  Save,
  X,
  Download,
  Upload
} from 'lucide-react'
import { customerService } from '../../services/database'

function CustomerAdmin() {
  const [customers, setCustomers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [formData, setFormData] = useState(getEmptyFormData())

  useEffect(() => {
    loadCustomers()
  }, [])

  function getEmptyFormData() {
    return {
      name: '',
      email: '',
      phone: '',
      state: 'NC',
      propertyId: '',
      status: 'new',
      source: 'website',
      notes: []
    }
  }

  async function loadCustomers() {
    const result = await customerService.getAllCustomers()
    if (result.success) {
      setCustomers(result.data)
    }
  }

  async function handleSearch() {
    if (searchQuery.trim()) {
      const result = await customerService.searchCustomers(searchQuery)
      if (result.success) {
        setCustomers(result.data)
      }
    } else {
      loadCustomers()
    }
  }

  function handleAdd() {
    setEditingCustomer(null)
    setFormData(getEmptyFormData())
    setShowForm(true)
  }

  function handleEdit(customer) {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      state: customer.state || 'NC',
      propertyId: customer.propertyId || '',
      status: customer.status || 'new',
      source: customer.source || 'website',
      notes: customer.notes || []
    })
    setShowForm(true)
  }

  function handleDelete(customer) {
    if (confirm(`Are you sure you want to delete ${customer.name}?`)) {
      // Note: customerDB doesn't have a delete method, so we'll need to add it
      // For now, we'll just show an alert
      alert('Delete functionality will be added to customerDatabase service')
      // TODO: Add deleteCustomer method to customerDatabase.js
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.phone) {
      alert('Please fill in all required fields')
      return
    }

    let result
    if (editingCustomer) {
      result = await customerService.updateCustomer(editingCustomer.id, formData)
      if (result.success) {
        alert('Customer updated successfully!')
      }
    } else {
      result = await customerService.createCustomer(formData)
      if (result.success) {
        alert('Customer added successfully!')
      }
    }

    setShowForm(false)
    setFormData(getEmptyFormData())
    setEditingCustomer(null)
    loadCustomers()
  }

  function handleCancel() {
    setShowForm(false)
    setFormData(getEmptyFormData())
    setEditingCustomer(null)
  }

  async function handleExport() {
    const result = await customerService.getAllCustomers()
    if (!result.success) return
    const data = result.data
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customers_backup_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e) {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target.result)
          // Import each customer
          let successCount = 0
          for (const customer of data.customers || data) {
            const result = await customerService.createCustomer(customer)
            if (result.success) successCount++
          }
          loadCustomers()
          alert(`Imported ${successCount} customers successfully!`)
          alert('Customers imported successfully!')
        } catch (error) {
          alert('Error importing customers: ' + error.message)
        }
      }
      reader.readAsText(file)
    }
  }

  const [stats, setStats] = useState({ totalCustomers: 0, newThisWeek: 0, totalLeads: 0, pendingConsultations: 0 })
  
  useEffect(() => {
    async function loadStats() {
      const result = await customerService.getAllCustomers()
      if (result.success) {
        const customers = result.data
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        setStats({
          totalCustomers: customers.length,
          newThisWeek: customers.filter(c => new Date(c.created_at) > weekAgo).length,
          totalLeads: customers.filter(c => c.status === 'lead').length,
          pendingConsultations: customers.filter(c => c.status === 'consultation').length
        })
      }
    }
    loadStats()
  }, [customers])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
          <p className="text-gray-600">Add, edit, and manage customer records</p>
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
            Add Customer
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-sm text-gray-600">Total Customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.newCustomersThisWeek}</div>
            <p className="text-sm text-gray-600">This Week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
            <p className="text-sm text-gray-600">Total Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.pendingConsultations}</div>
            <p className="text-sm text-gray-600">Pending Consultations</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search by name, email, phone, or state..."
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
          <Button variant="outline" onClick={() => { setSearchQuery(''); loadCustomers(); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Customer Form Modal */}
      {showForm && (
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <CardTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</CardTitle>
            <CardDescription>
              {editingCustomer ? 'Update customer information' : 'Enter customer details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="john@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone *</label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="(910) 555-1234"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
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
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="viewing">Viewing</option>
                    <option value="bidding">Bidding</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Property Interest (Case #)</label>
                <Input
                  value={formData.propertyId}
                  onChange={(e) => setFormData({...formData, propertyId: e.target.value})}
                  placeholder="387-111612"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({...formData, source: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                  <option value="social">Social Media</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingCustomer ? 'Update' : 'Add'} Customer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Customers List */}
      <div className="grid grid-cols-1 gap-4">
        {customers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex gap-4 flex-1">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold">{customer.name}</h3>
                        <div className="flex gap-4 text-sm text-gray-600 mt-1">
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {customer.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {customer.phone}
                          </div>
                        </div>
                      </div>
                      <Badge variant={customer.status === 'new' ? 'default' : 'secondary'}>
                        {customer.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                      <div>
                        <span className="text-gray-600">State:</span>
                        <div className="font-semibold">{customer.state || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Source:</span>
                        <div className="font-semibold">{customer.source || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Property:</span>
                        <div className="font-semibold">{customer.propertyId || 'None'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Created:</span>
                        <div className="font-semibold">
                          {new Date(customer.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(customer)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(customer)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {customers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No customers found</p>
            <Button onClick={handleAdd} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Customer
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default CustomerAdmin
