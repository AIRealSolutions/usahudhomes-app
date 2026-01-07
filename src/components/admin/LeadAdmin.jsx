import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { 
  Search, 
  MessageSquare, 
  Mail,
  Phone,
  Calendar,
  User,
  Home,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download,
  Eye,
  UserPlus,
  Edit,
  Save,
  Plus,
  Trash2,
  X as XIcon,
  Sparkles,
  Brain
} from 'lucide-react'
import { consultationService, customerService, propertyService, agentService, referralService } from '../../services/database'

function LeadAdmin() {
  const [leads, setLeads] = useState([])
  const [filteredLeads, setFilteredLeads] = useState([])
  const [agents, setAgents] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [editingLead, setEditingLead] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({})
  const [analyzingLead, setAnalyzingLead] = useState(null)
  const [leadAnalysis, setLeadAnalysis] = useState({})
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0
  })

  useEffect(() => {
    loadLeads()
    loadAgents()
  }, [])

  useEffect(() => {
    filterLeads()
  }, [leads, searchQuery, statusFilter, typeFilter])

  async function loadLeads() {
    setLoading(true)
    const result = await consultationService.getAllLeads()
    if (result.success) {
      const leadsData = result.data || []
      setLeads(leadsData)
      calculateStats(leadsData)
    }
    setLoading(false)
  }

  async function loadAgents() {
    const result = await agentService.getAllAgents()
    if (result.success) {
      // Only show active agents
      const activeAgents = (result.data || []).filter(agent => agent.is_active)
      setAgents(activeAgents)
    }
  }

  function calculateStats(data) {
    setStats({
      total: data.length,
      pending: data.filter(c => c.status === 'pending').length,
      scheduled: data.filter(c => c.status === 'scheduled').length,
      completed: data.filter(c => c.status === 'completed').length,
      cancelled: data.filter(c => c.status === 'cancelled').length
    })
  }

  function filterLeads() {
    let filtered = [...leads]

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c =>
        c.customer_name?.toLowerCase().includes(query) ||
        c.customer_email?.toLowerCase().includes(query) ||
        c.customer_phone?.toLowerCase().includes(query) ||
        c.case_number?.toLowerCase().includes(query) ||
        c.message?.toLowerCase().includes(query)
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter)
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(c => c.lead_type === typeFilter)
    }

    setFilteredLeads(filtered)
  }

  function openEditModal(lead) {
    setEditingLead(lead)
    setEditForm({
      status: lead.status || 'pending',
      lead_type: lead.lead_type || 'general',
      agent_id: lead.agent_id || '',
      case_number: lead.case_number || '',
      message: lead.message || ''
    })
  }

  function closeEditModal() {
    setEditingLead(null)
    setEditForm({})
  }

  async function saveLead() {
    if (!editingLead) return

    try {
      console.log('Saving lead:', editingLead.id, editForm)
      
      const agentChanged = editForm.agent_id && editForm.agent_id !== editingLead.agent_id
      const isFirstAssignment = editForm.agent_id && !editingLead.agent_id && !editingLead.customer_id
      
      // If this is the first broker assignment and no customer exists, create customer
      let customerId = editingLead.customer_id
      if (isFirstAssignment) {
        console.log('First broker assignment - creating customer record...')
        const customerResult = await customerService.addCustomer({
          first_name: editingLead.first_name,
          last_name: editingLead.last_name,
          email: editingLead.email,
          phone: editingLead.phone,
          lead_source: editingLead.source || 'manual'
        })
        
        if (customerResult.success) {
          customerId = customerResult.data.id
          console.log('Customer created:', customerId)
          // Update the form to include customer_id
          editForm.customer_id = customerId
        } else {
          console.error('Failed to create customer:', customerResult.error)
          alert('Failed to create customer record: ' + customerResult.error)
          return
        }
      }
      
      // Update lead
      const updateResult = await consultationService.updateLead(editingLead.id, editForm)
      
      if (!updateResult.success) {
        alert('Failed to update lead: ' + (updateResult.error || 'Unknown error'))
        return
      }
      
      // If agent changed (not first assignment), create referral to notify the new broker
      if (agentChanged && !isFirstAssignment) {
        console.log('Agent changed, creating referral...')
        const referralResult = await referralService.createReferral({
          lead_id: editingLead.id,
          agent_id: editForm.agent_id,
          status: 'referred'
        })
        
        if (!referralResult.success) {
          console.warn('Referral notification failed:', referralResult.error)
          // Don't block the update, just warn
        } else {
          console.log('Referral created successfully')
        }
      }
      
      // Close modal and reload data
      closeEditModal()
      await loadLeads() // Reload to show changes
      
    } catch (error) {
      console.error('Error saving lead:', error)
      alert('Failed to save lead: ' + error.message)
    }
  }

  function openCreateModal() {
    setCreateForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      budget_min: '',
      budget_max: '',
      preferred_location: '',
      state: '',
      timeline: '',
      priority: 'medium',
      status: 'new',
      source: 'manual',
      notes: '',
      agent_id: ''
    })
    setShowCreateModal(true)
  }

  function closeCreateModal() {
    setShowCreateModal(false)
    setCreateForm({})
  }

  async function createLead() {
    try {
      // Validate required fields
      if (!createForm.first_name || !createForm.last_name) {
        alert('First name and last name are required')
        return
      }
      if (!createForm.email && !createForm.phone) {
        alert('Either email or phone is required')
        return
      }

      // Create customer only if broker is assigned
      let customerId = null
      if (createForm.agent_id) {
        const customerData = {
          first_name: createForm.first_name,
          last_name: createForm.last_name,
          email: createForm.email || null,
          phone: createForm.phone || null,
          lead_source: createForm.source || 'manual'
        }

        const customerResult = await customerService.addCustomer(customerData)
        if (!customerResult.success) {
          alert('Failed to create customer: ' + customerResult.error)
          return
        }
        customerId = customerResult.data.id
      }

      // Create consultation/lead
      const leadData = {
        customer_id: customerId, // null if no broker assigned yet
        first_name: createForm.first_name,
        last_name: createForm.last_name,
        email: createForm.email || null,
        phone: createForm.phone || null,
        budget_min: createForm.budget_min ? parseFloat(createForm.budget_min) : null,
        budget_max: createForm.budget_max ? parseFloat(createForm.budget_max) : null,
        preferred_location: createForm.preferred_location || null,
        state: createForm.state || null,
        timeline: createForm.timeline || null,
        priority: createForm.priority || 'medium',
        status: createForm.status || 'new',
        source: createForm.source || 'manual',
        notes: createForm.notes || null,
        assigned_agent_id: createForm.agent_id || null
      }

      const leadResult = await consultationService.addLead(leadData)
      if (!leadResult.success) {
        alert('Failed to create lead: ' + leadResult.error)
        return
      }

      // Close modal and reload
      closeCreateModal()
      await loadLeads()
      alert('Lead created successfully!')
    } catch (error) {
      console.error('Error creating lead:', error)
      alert('Failed to create lead: ' + error.message)
    }
  }

  async function deleteLead(lead) {
    const leadName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.customer_email || lead.email || 'this lead'
    
    const confirmed = confirm(
      `⚠️ WARNING: DELETE LEAD\n\n` +
      `Are you sure you want to delete:\n` +
      `Lead: ${leadName}\n` +
      `Email: ${lead.email || lead.customer_email || 'N/A'}\n\n` +
      `This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      const result = await consultationService.deleteLead(lead.id)
      if (result.success) {
        await loadLeads()
        alert('Lead deleted successfully')
      } else {
        alert('Failed to delete lead: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting lead:', error)
      alert('Failed to delete lead: ' + error.message)
    }
  }

  async function analyzeLead(lead) {
    try {
      setAnalyzingLead(lead.id)
      
      // Import AI service dynamically
      const { leadAgentService } = await import('../../services/ai/leadAgentService')
      
      // Analyze the lead
      const result = await leadAgentService.analyzeLead(lead)
      
      if (result.success) {
        // Store analysis
        setLeadAnalysis(prev => ({
          ...prev,
          [lead.id]: result.data
        }))
        
        // Show analysis modal
        setShowAnalysisModal(true)
        setEditingLead(lead)
      } else {
        alert('Failed to analyze lead: ' + result.error)
      }
    } catch (error) {
      console.error('Error analyzing lead:', error)
      alert('Failed to analyze lead: ' + error.message)
    } finally {
      setAnalyzingLead(null)
    }
  }

  function closeAnalysisModal() {
    setShowAnalysisModal(false)
    setEditingLead(null)
  }

  async function updateLeadStatus(leadId, newStatus) {
    const result = await consultationService.updateLead(leadId, { status: newStatus })
    if (result.success) {
      loadLeads()
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getStatusBadge(status) {
    const badges = {
      pending: <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>,
      referred: <Badge className="bg-yellow-100 text-yellow-800">Referred</Badge>,
      scheduled: <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>,
      completed: <Badge className="bg-green-100 text-green-800">Completed</Badge>,
      cancelled: <Badge className="bg-red-100 text-red-800">Cancelled</Badge>
    }
    return badges[status] || <Badge>{status}</Badge>
  }

  function getTypeBadge(type) {
    const badges = {
      general: <Badge variant="outline">General</Badge>,
      financing: <Badge variant="outline">Financing</Badge>,
      bidding: <Badge variant="outline">Bidding</Badge>,
      inspection: <Badge variant="outline">Inspection</Badge>
    }
    return badges[type] || <Badge variant="outline">{type}</Badge>
  }

  async function exportToCSV() {
    const csvData = filteredLeads.map(c => ({
      'Date': formatDate(c.created_at),
      'Customer': c.customer_name,
      'Email': c.customer_email,
      'Phone': c.customer_phone,
      'Status': c.status,
      'Type': c.lead_type,
      'Case Number': c.case_number || '',
      'Assigned To': c.agent ? `${c.agent.first_name} ${c.agent.last_name}` : '',
      'Message': c.message || ''
    }))

    const headers = Object.keys(csvData[0])
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Leads</h2>
          <p className="text-gray-600">Manage all leads from Facebook, website, and other sources</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
            <div className="text-sm text-gray-600">Scheduled</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <div className="text-sm text-gray-600">Cancelled</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by name, email, phone, case number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-md bg-white"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border rounded-md bg-white"
        >
          <option value="all">All Types</option>
          <option value="general">General</option>
          <option value="financing">Financing</option>
          <option value="bidding">Bidding</option>
          <option value="inspection">Inspection</option>
        </select>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Leads List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leads...</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No leads found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  {/* Left: Customer Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{lead.customer_name}</h3>
                          <p className="text-sm text-gray-500">{formatDate(lead.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {getStatusBadge(lead.status)}
                        {getTypeBadge(lead.lead_type)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${lead.customer_email}`} className="hover:text-blue-600">
                          {lead.customer_email}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${lead.customer_phone}`} className="hover:text-blue-600">
                          {lead.customer_phone}
                        </a>
                      </div>
                      {lead.case_number && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Home className="h-4 w-4" />
                          <span>Case #{lead.case_number}</span>
                        </div>
                      )}
                      {lead.agent && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <UserPlus className="h-4 w-4" />
                          <span className="font-medium text-blue-600">
                            Assigned to: {lead.agent.first_name} {lead.agent.last_name}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {lead.message && (
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm text-gray-700">{lead.message}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Right: Actions */}
                  <div className="flex md:flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => analyzeLead(lead)}
                      disabled={analyzingLead === lead.id}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    >
                      {analyzingLead === lead.id ? (
                        <Clock className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-1" />
                      )}
                      {analyzingLead === lead.id ? 'Analyzing...' : 'AI Analyze'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openEditModal(lead)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Update
                    </Button>
                    {lead.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateLeadStatus(lead.id, 'scheduled')}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Calendar className="h-4 w-4 mr-1" />
                          Schedule
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateLeadStatus(lead.id, 'completed')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      </>
                    )}
                    {lead.status === 'scheduled' && (
                      <Button
                        size="sm"
                        onClick={() => updateLeadStatus(lead.id, 'completed')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                    {(lead.status === 'pending' || lead.status === 'scheduled') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateLeadStatus(lead.id, 'cancelled')}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteLead(lead)}
                      className="text-red-600 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold">Update Lead</h3>
              <p className="text-sm text-gray-600">Edit lead details and assign broker</p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Customer Info (Read-only) */}
              <div className="bg-gray-50 p-4 rounded-md space-y-2">
                <h4 className="font-semibold">Customer Information</h4>
                <p className="text-sm"><strong>Name:</strong> {editingLead.customer_name}</p>
                <p className="text-sm"><strong>Email:</strong> {editingLead.customer_email}</p>
                <p className="text-sm"><strong>Phone:</strong> {editingLead.customer_phone}</p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="pending">Pending</option>
                  <option value="referred">Referred</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Lead Type */}
              <div>
                <label className="block text-sm font-medium mb-2">Lead Type</label>
                <select
                  value={editForm.lead_type}
                  onChange={(e) => setEditForm({...editForm, lead_type: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="general">General</option>
                  <option value="financing">Financing</option>
                  <option value="bidding">Bidding</option>
                  <option value="inspection">Inspection</option>
                </select>
              </div>

              {/* Assign Broker */}
              <div>
                <label className="block text-sm font-medium mb-2">Assign Broker</label>
                <select
                  value={editForm.agent_id}
                  onChange={(e) => setEditForm({...editForm, agent_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">No broker assigned</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.first_name} {agent.last_name} ({agent.states_covered?.join(', ')})
                    </option>
                  ))}
                </select>
                {editForm.agent_id && editForm.agent_id !== editingLead.agent_id && (
                  <p className="text-sm text-blue-600 mt-1">
                    ℹ️ This will create a referral with "Referred" status
                  </p>
                )}
              </div>

              {/* Case Number */}
              <div>
                <label className="block text-sm font-medium mb-2">Property Case Number</label>
                <Input
                  type="text"
                  value={editForm.case_number}
                  onChange={(e) => setEditForm({...editForm, case_number: e.target.value})}
                  placeholder="e.g., 387-124193"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium mb-2">Message / Notes</label>
                <textarea
                  value={editForm.message}
                  onChange={(e) => setEditForm({...editForm, message: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Add notes or update message..."
                />
              </div>
            </div>

            <div className="p-6 border-t flex gap-3 justify-end">
              <Button variant="outline" onClick={closeEditModal}>
                Cancel
              </Button>
              <Button onClick={saveLead} className="bg-purple-600 hover:bg-purple-700">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
       )}

      {/* Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold">Create New Lead</h3>
              <p className="text-sm text-gray-600">Add a new lead manually</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name *</label>
                  <Input
                    value={createForm.first_name}
                    onChange={(e) => setCreateForm({...createForm, first_name: e.target.value})}
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <Input
                    value={createForm.last_name}
                    onChange={(e) => setCreateForm({...createForm, last_name: e.target.value})}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <Input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({...createForm, phone: e.target.value})}
                    placeholder="+1234567890"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Budget Min</label>
                  <Input
                    type="number"
                    value={createForm.budget_min}
                    onChange={(e) => setCreateForm({...createForm, budget_min: e.target.value})}
                    placeholder="50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Budget Max</label>
                  <Input
                    type="number"
                    value={createForm.budget_max}
                    onChange={(e) => setCreateForm({...createForm, budget_max: e.target.value})}
                    placeholder="150000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Preferred Location</label>
                  <Input
                    value={createForm.preferred_location}
                    onChange={(e) => setCreateForm({...createForm, preferred_location: e.target.value})}
                    placeholder="Charlotte"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <Input
                    value={createForm.state}
                    onChange={(e) => setCreateForm({...createForm, state: e.target.value})}
                    placeholder="NC"
                    maxLength="2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Timeline</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={createForm.timeline}
                    onChange={(e) => setCreateForm({...createForm, timeline: e.target.value})}
                  >
                    <option value="">Select timeline</option>
                    <option value="ASAP">ASAP</option>
                    <option value="1-3 months">1-3 months</option>
                    <option value="3-6 months">3-6 months</option>
                    <option value="6+ months">6+ months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({...createForm, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={createForm.status}
                    onChange={(e) => setCreateForm({...createForm, status: e.target.value})}
                  >
                    <option value="new">New</option>
                    <option value="pending">Pending</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Assign to Broker</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={createForm.agent_id}
                    onChange={(e) => setCreateForm({...createForm, agent_id: e.target.value})}
                  >
                    <option value="">Unassigned</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.first_name} {agent.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  rows="3"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({...createForm, notes: e.target.value})}
                  placeholder="Additional notes about this lead..."
                />
              </div>
            </div>
            <div className="p-6 border-t flex gap-3 justify-end">
              <Button variant="outline" onClick={closeCreateModal}>
                <XIcon className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={createLead} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Lead
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis Modal */}
      {showAnalysisModal && editingLead && leadAnalysis[editingLead.id] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <div className="flex items-center gap-3">
                <Brain className="h-8 w-8" />
                <div>
                  <h3 className="text-xl font-bold">AI Lead Analysis</h3>
                  <p className="text-sm opacity-90">{editingLead.first_name} {editingLead.last_name}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Lead Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Lead Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="font-medium">Name:</span> {editingLead.first_name} {editingLead.last_name}</div>
                  <div><span className="font-medium">Email:</span> {editingLead.email || 'N/A'}</div>
                  <div><span className="font-medium">Phone:</span> {editingLead.phone || 'N/A'}</div>
                  <div><span className="font-medium">Source:</span> {editingLead.source || 'N/A'}</div>
                  {editingLead.budget_min && (
                    <div><span className="font-medium">Budget:</span> ${editingLead.budget_min?.toLocaleString()} - ${editingLead.budget_max?.toLocaleString()}</div>
                  )}
                  {editingLead.preferred_location && (
                    <div><span className="font-medium">Location:</span> {editingLead.preferred_location}, {editingLead.state}</div>
                  )}
                  {editingLead.timeline && (
                    <div><span className="font-medium">Timeline:</span> {editingLead.timeline}</div>
                  )}
                  <div><span className="font-medium">Priority:</span> <Badge className={editingLead.priority === 'high' ? 'bg-red-100 text-red-800' : editingLead.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>{editingLead.priority}</Badge></div>
                </div>
              </div>

              {/* Key Facts */}
              {leadAnalysis[editingLead.id].key_facts && leadAnalysis[editingLead.id].key_facts.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Key Facts
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {leadAnalysis[editingLead.id].key_facts.map((fact, idx) => (
                      <li key={idx}>{fact}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Needs & Requirements */}
              {leadAnalysis[editingLead.id].needs && leadAnalysis[editingLead.id].needs.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Home className="h-5 w-5 text-blue-600" />
                    Needs & Requirements
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {leadAnalysis[editingLead.id].needs.map((need, idx) => (
                      <li key={idx}>{need}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Urgency */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Urgency Level
                </h4>
                <Badge className={leadAnalysis[editingLead.id].urgency === 'high' ? 'bg-red-100 text-red-800' : leadAnalysis[editingLead.id].urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                  {leadAnalysis[editingLead.id].urgency.toUpperCase()}
                </Badge>
              </div>

              {/* Budget Assessment */}
              {leadAnalysis[editingLead.id].budget_assessment && (
                <div>
                  <h4 className="font-semibold mb-2">Budget Assessment</h4>
                  <p className="text-sm">{leadAnalysis[editingLead.id].budget_assessment}</p>
                </div>
              )}

              {/* Location Preferences */}
              {leadAnalysis[editingLead.id].location_preferences && (
                <div>
                  <h4 className="font-semibold mb-2">Location Preferences</h4>
                  <p className="text-sm">{leadAnalysis[editingLead.id].location_preferences}</p>
                </div>
              )}

              {/* Red Flags */}
              {leadAnalysis[editingLead.id].red_flags && leadAnalysis[editingLead.id].red_flags.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-red-800">
                    <XCircle className="h-5 w-5" />
                    Red Flags / Concerns
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                    {leadAnalysis[editingLead.id].red_flags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Actions */}
              {leadAnalysis[editingLead.id].recommended_actions && leadAnalysis[editingLead.id].recommended_actions.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-blue-800">
                    <Sparkles className="h-5 w-5" />
                    Recommended Actions
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                    {leadAnalysis[editingLead.id].recommended_actions.map((action, idx) => (
                      <li key={idx}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Broker Match Criteria */}
              {leadAnalysis[editingLead.id].broker_criteria && leadAnalysis[editingLead.id].broker_criteria.length > 0 && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-purple-800">
                    <UserPlus className="h-5 w-5" />
                    Ideal Broker Profile
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-purple-700">
                    {leadAnalysis[editingLead.id].broker_criteria.map((criteria, idx) => (
                      <li key={idx}>{criteria}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Raw Analysis */}
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-800">View Full AI Analysis</summary>
                <div className="mt-2 p-4 bg-gray-50 rounded whitespace-pre-wrap">
                  {leadAnalysis[editingLead.id].raw_analysis}
                </div>
              </details>
            </div>
            <div className="p-6 border-t flex gap-3 justify-end bg-gray-50">
              <Button variant="outline" onClick={closeAnalysisModal}>
                Close
              </Button>
              <Button onClick={() => { closeAnalysisModal(); openEditModal(editingLead); }} className="bg-purple-600 hover:bg-purple-700">
                <Edit className="h-4 w-4 mr-2" />
                Assign Broker
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default LeadAdmin
