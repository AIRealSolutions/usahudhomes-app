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
  Save
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
      
      // Update lead first
      const updateResult = await consultationService.updateLead(editingLead.id, editForm)
      
      if (!updateResult.success) {
        alert('Failed to update lead: ' + (updateResult.error || 'Unknown error'))
        return
      }
      
      // If agent changed, create referral to notify the new broker
      if (agentChanged) {
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
      <div>
        <h2 className="text-2xl font-bold">Leads</h2>
        <p className="text-gray-600">Manage all leads from Facebook, website, and other sources</p>
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
    </div>
  )
}

export default LeadAdmin
