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
  UserCheck, 
  Mail,
  Phone,
  Save,
  X,
  Download,
  Upload,
  Building
} from 'lucide-react'
import { agentService } from '../../services/database'

function AgentAdmin() {
  const [agents, setAgents] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)
  const [formData, setFormData] = useState(getEmptyFormData())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAgents()
  }, [])

  function getEmptyFormData() {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      licenseNumber: '',
      licenseState: 'NC',
      statesCovered: ['NC'],
      specialties: [],
      yearsExperience: 0,
      bio: '',
      isAdmin: false
    }
  }

  async function loadAgents() {
    setLoading(true)
    try {
      const result = await agentService.getAllAgents()
      if (result.success) {
        setAgents(result.data)
      } else {
        console.error('Error loading agents:', result.error)
      }
    } catch (error) {
      console.error('Error loading agents:', error)
    }
    setLoading(false)
  }

  async function handleSearch() {
    if (searchQuery.trim()) {
      setLoading(true)
      const result = await agentService.searchAgents(searchQuery)
      if (result.success) {
        setAgents(result.data)
      }
      setLoading(false)
    } else {
      loadAgents()
    }
  }

  function handleAdd() {
    setEditingAgent(null)
    setFormData(getEmptyFormData())
    setShowForm(true)
  }

  function handleEdit(agent) {
    setEditingAgent(agent)
    setFormData({
      firstName: agent.first_name || '',
      lastName: agent.last_name || '',
      email: agent.email || '',
      phone: agent.phone || '',
      company: agent.company || '',
      licenseNumber: agent.license_number || '',
      licenseState: agent.license_state || 'NC',
      statesCovered: agent.states_covered || ['NC'],
      specialties: agent.specialties || [],
      yearsExperience: agent.years_experience || 0,
      bio: agent.bio || '',
      isAdmin: agent.is_admin || false
    })
    setShowForm(true)
  }

  async function handleDelete(agent) {
    if (confirm(`Are you sure you want to delete ${agent.first_name} ${agent.last_name}?`)) {
      try {
        const result = await agentService.deleteAgent(agent.id)
        if (result.success) {
          alert('Agent deleted successfully!')
          loadAgents()
        } else {
          alert('Error: ' + result.error)
        }
      } catch (error) {
        alert('Error: ' + error.message)
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      let result
      if (editingAgent) {
        result = await agentService.updateAgent(editingAgent.id, formData)
        if (result.success) {
          alert('Agent updated successfully!')
        } else {
          alert('Error: ' + result.error)
        }
      } else {
        result = await agentService.addAgent(formData)
        if (result.success) {
          alert('Agent added successfully!')
        } else {
          alert('Error: ' + result.error)
        }
      }

      if (result.success) {
        setShowForm(false)
        setFormData(getEmptyFormData())
        setEditingAgent(null)
        loadAgents()
      }
    } catch (error) {
      alert('Error: ' + error.message)
    }

    setLoading(false)
  }

  function handleCancel() {
    setShowForm(false)
    setFormData(getEmptyFormData())
    setEditingAgent(null)
  }

  async function handleExport() {
    const result = await agentService.getAllAgents()
    if (!result.success) return
    const data = result.data
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agents_backup_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target.result)
          let successCount = 0
          for (const agent of data.agents || data) {
            const result = await agentService.addAgent(agent)
            if (result.success) successCount++
          }
          loadAgents()
          alert(`Imported ${successCount} agents successfully!`)
        } catch (error) {
          alert('Error importing agents: ' + error.message)
        }
      }
      reader.readAsText(file)
    }
  }

  function handleStateToggle(state) {
    const newStates = formData.statesCovered.includes(state)
      ? formData.statesCovered.filter(s => s !== state)
      : [...formData.statesCovered, state]
    setFormData({...formData, statesCovered: newStates})
  }

  function handleSpecialtyToggle(specialty) {
    const newSpecialties = formData.specialties.includes(specialty)
      ? formData.specialties.filter(s => s !== specialty)
      : [...formData.specialties, specialty]
    setFormData({...formData, specialties: newSpecialties})
  }

  const [stats, setStats] = useState({ total: 0, active: 0, totalListings: 0, totalSales: 0 })
  
  useEffect(() => {
    async function loadStats() {
      const result = await agentService.getAgentStats()
      if (result.success) {
        setStats(result.data)
      }
    }
    loadStats()
  }, [agents])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent/Broker Management</h2>
          <p className="text-gray-600">Add, edit, and manage HUD-registered agents</p>
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
            Add Agent
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-gray-600">Total Agents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-sm text-gray-600">Active Agents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalListings}</div>
            <p className="text-sm text-gray-600">Total Listings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalSales}</div>
            <p className="text-sm text-gray-600">Total Sales</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search by name, email, phone, company, or state..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={loading}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
        {searchQuery && (
          <Button variant="outline" onClick={() => { setSearchQuery(''); loadAgents(); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Agent Form Modal */}
      {showForm && (
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <CardTitle>{editingAgent ? 'Edit Agent' : 'Add New Agent'}</CardTitle>
            <CardDescription>
              {editingAgent ? 'Update agent information' : 'Enter agent details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name *</label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    placeholder="Marc"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    placeholder="Spencer"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Company</label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  placeholder="Lightkeeper Realty"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="agent@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone *</label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="(910) 363-6147"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">License Number</label>
                  <Input
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
                    placeholder="153928"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">License State</label>
                  <select
                    value={formData.licenseState}
                    onChange={(e) => setFormData({...formData, licenseState: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="NC">North Carolina</option>
                    <option value="TN">Tennessee</option>
                    <option value="SC">South Carolina</option>
                    <option value="VA">Virginia</option>
                    <option value="GA">Georgia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Years Experience</label>
                  <Input
                    type="number"
                    value={formData.yearsExperience}
                    onChange={(e) => setFormData({...formData, yearsExperience: parseInt(e.target.value) || 0})}
                    placeholder="25"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">States Covered</label>
                <div className="flex flex-wrap gap-2">
                  {['NC', 'TN', 'SC', 'VA', 'GA', 'FL', 'AL', 'MS'].map(state => (
                    <Button
                      key={state}
                      type="button"
                      variant={formData.statesCovered.includes(state) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStateToggle(state)}
                    >
                      {state}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Specialties</label>
                <div className="flex flex-wrap gap-2">
                  {['HUD Homes', 'Government Foreclosures', 'FHA 203k Loans', 'First-Time Buyers', 'Investment Properties', 'Renovation Financing'].map(specialty => (
                    <Button
                      key={specialty}
                      type="button"
                      variant={formData.specialties.includes(specialty) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSpecialtyToggle(specialty)}
                    >
                      {specialty}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="25+ years helping people buy HUD homes across North Carolina"
                  rows={3}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isAdmin"
                  checked={formData.isAdmin}
                  onChange={(e) => setFormData({...formData, isAdmin: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="isAdmin" className="text-sm font-medium">Admin Access</label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : (editingAgent ? 'Update' : 'Add')} Agent
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Agents List */}
      <div className="grid grid-cols-1 gap-4">
        {agents.map((agent) => (
          <Card key={agent.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex gap-4 flex-1">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserCheck className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold">{agent.first_name} {agent.last_name}</h3>
                          {agent.is_admin && (
                            <Badge variant="destructive" className="text-xs">ADMIN</Badge>
                          )}
                          <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                            {agent.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-gray-600 flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          {agent.company}
                        </p>
                        <div className="flex gap-4 text-sm text-gray-600 mt-1">
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {agent.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {agent.phone}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                      <div>
                        <span className="text-gray-600">States:</span>
                        <div className="font-semibold">{agent.states_covered?.join(', ') || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Experience:</span>
                        <div className="font-semibold">{agent.years_experience} years</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Listings:</span>
                        <div className="font-semibold">{agent.total_listings || 0}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">License:</span>
                        <div className="font-semibold">{agent.license_state} {agent.license_number}</div>
                      </div>
                    </div>
                    {agent.specialties && agent.specialties.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {agent.specialties.map(specialty => (
                          <Badge key={specialty} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {agent.bio && (
                      <p className="text-sm text-gray-600 mt-2">{agent.bio}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(agent)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(agent)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && agents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Loading agents...</p>
          </CardContent>
        </Card>
      )}

      {!loading && agents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No agents found</p>
            <p className="text-sm text-gray-500 mb-4">Add Marc Spencer as your first HUD-registered agent</p>
            <Button onClick={handleAdd} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Agent
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AgentAdmin
