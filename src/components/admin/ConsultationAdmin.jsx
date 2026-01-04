import { useState, useEffect } from 'react'
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
  UserPlus
} from 'lucide-react'
import { consultationService, customerService, propertyService, agentService, referralService } from '../../services/database'

function ConsultationAdmin() {
  const [consultations, setConsultations] = useState([])
  const [filteredConsultations, setFilteredConsultations] = useState([])
  const [agents, setAgents] = useState([])
  const [selectedAgents, setSelectedAgents] = useState({}) // Track selected agent for each consultation
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0
  })

  useEffect(() => {
    loadConsultations()
    loadAgents()
  }, [])

  useEffect(() => {
    filterConsultations()
  }, [consultations, searchQuery, statusFilter, typeFilter])

  async function loadConsultations() {
    setLoading(true)
    const result = await consultationService.getAllConsultations()
    if (result.success) {
      const consultationsData = result.data || []
      setConsultations(consultationsData)
      calculateStats(consultationsData)
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

  function filterConsultations() {
    let filtered = [...consultations]

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
      filtered = filtered.filter(c => c.consultation_type === typeFilter)
    }

    // Sort by created_at descending (newest first)
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    setFilteredConsultations(filtered)
  }

  async function updateConsultationStatus(id, newStatus) {
    const result = await consultationService.updateConsultation(id, { status: newStatus })
    if (result.success) {
      loadConsultations()
    } else {
      alert('Failed to update consultation status')
    }
  }

  async function deleteConsultation(id) {
    if (!confirm('Are you sure you want to delete this consultation?')) return
    
    const result = await consultationService.deleteConsultation(id)
    if (result.success) {
      loadConsultations()
    } else {
      alert('Failed to delete consultation')
    }
  }

  function handleAgentSelection(consultationId, agentId) {
    console.log('Agent selected:', { consultationId, agentId })
    setSelectedAgents(prev => {
      const newState = {
        ...prev,
        [consultationId]: agentId
      }
      console.log('Updated selectedAgents state:', newState)
      return newState
    })
  }

  async function referToAgent(consultationId) {
    console.log('referToAgent called for consultation:', consultationId)
    const agentId = selectedAgents[consultationId]
    console.log('Selected agent ID:', agentId)
    
    if (!agentId) {
      alert('Please select an agent first')
      return
    }

    const agent = agents.find(a => a.id === agentId)
    console.log('Agent found:', agent)
    if (!agent) {
      alert('Agent not found')
      return
    }

    try {
      console.log('Creating referral...')
      // Create referral using referralService
      const result = await referralService.createReferral({
        consultation_id: consultationId,
        agent_id: agentId,
        status: 'referred'
      })
      console.log('Referral result:', result)

      if (result.success) {
      // Update consultation status
      await consultationService.updateConsultation(consultationId, { 
        status: 'scheduled',
        agentId: agentId 
      })
      
      alert(`Lead successfully referred to ${agent.first_name} ${agent.last_name}!`)
      
      // Clear selection
      setSelectedAgents(prev => {
        const newState = { ...prev }
        delete newState[consultationId]
        return newState
      })
      
      loadConsultations()
      } else {
        alert('Failed to refer lead. Please try again.')
      }
    } catch (error) {
      console.error('Error referring lead:', error)
      alert(`Error: ${error.message || 'Failed to refer lead'}`)
    }
  }

  function getStatusBadge(status) {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      scheduled: { color: 'bg-blue-100 text-blue-800', icon: Calendar },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle },
      chat: { color: 'bg-purple-100 text-purple-800', icon: MessageSquare }
    }
    
    const config = statusConfig[status] || statusConfig.pending
    const Icon = config.icon
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  function getTypeBadge(type) {
    const typeColors = {
      general: 'bg-gray-100 text-gray-800',
      financing: 'bg-green-100 text-green-800',
      bidding: 'bg-orange-100 text-orange-800',
      inspection: 'bg-blue-100 text-blue-800',
      renovation: 'bg-purple-100 text-purple-800',
      chatbot: 'bg-pink-100 text-pink-800'
    }
    
    return (
      <Badge className={typeColors[type] || typeColors.general}>
        {type?.replace('_', ' ').charAt(0).toUpperCase() + type?.replace('_', ' ').slice(1) || 'General'}
      </Badge>
    )
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function exportToCSV() {
    const headers = ['Date', 'Customer Name', 'Email', 'Phone', 'Case Number', 'Type', 'Status', 'Message']
    const rows = filteredConsultations.map(c => [
      formatDate(c.created_at),
      c.customer_name,
      c.customer_email,
      c.customer_phone,
      c.case_number,
      c.consultation_type,
      c.status,
      c.message || ''
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `consultations_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading consultations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Consultation Requests</CardTitle>
              <CardDescription>Manage and respond to customer consultation requests</CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, email, phone, case number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Status Filter */}
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
              <option value="chat">Chat</option>
            </select>
            
            {/* Type Filter */}
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
              <option value="renovation">Renovation</option>
              <option value="chatbot">Chatbot</option>
            </select>
          </div>

          {/* Consultations List */}
          {filteredConsultations.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No consultations found</p>
              <p className="text-sm text-gray-400 mt-2">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Consultation requests will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConsultations.map((consultation) => (
                <Card key={consultation.id} className="hover:shadow-md transition-shadow">
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
                              <h3 className="font-semibold text-lg">{consultation.customer_name}</h3>
                              <p className="text-sm text-gray-500">{formatDate(consultation.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {getStatusBadge(consultation.status)}
                            {getTypeBadge(consultation.consultation_type)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="h-4 w-4" />
                            <a href={`mailto:${consultation.customer_email}`} className="hover:text-blue-600">
                              {consultation.customer_email}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="h-4 w-4" />
                            <a href={`tel:${consultation.customer_phone}`} className="hover:text-blue-600">
                              {consultation.customer_phone}
                            </a>
                          </div>
                          {consultation.case_number && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Home className="h-4 w-4" />
                              <span>Case #{consultation.case_number}</span>
                            </div>
                          )}
                        </div>
                        
                        {consultation.message && (
                          <div className="bg-gray-50 p-3 rounded-md">
                            <p className="text-sm text-gray-700">{consultation.message}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Right: Actions */}
                      <div className="flex md:flex-col gap-2">
                        {consultation.status === 'pending' && (
                          <>
                            {/* Agent Selection Dropdown and Send Button */}
                            <div className="flex gap-2 items-center">
                              <select
                                value={selectedAgents[consultation.id] || ''}
                                onChange={(e) => {
                                  console.log('Dropdown changed:', e.target.value)
                                  handleAgentSelection(consultation.id, e.target.value)
                                }}
                                className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                <option value="">
                                  Select Agent...
                                </option>
                                {agents.map((agent) => (
                                  <option key={agent.id} value={agent.id}>
                                    {agent.first_name} {agent.last_name} ({agent.states_covered?.join(', ')})
                                  </option>
                                ))}
                              </select>
                              <Button
                                size="sm"
                                onClick={() => {
                                  console.log('Send Lead button clicked!')
                                  referToAgent(consultation.id)
                                }}
                                disabled={!selectedAgents[consultation.id] || selectedAgents[consultation.id] === ''}
                                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Send Lead
                              </Button>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => updateConsultationStatus(consultation.id, 'scheduled')}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Calendar className="h-4 w-4 mr-1" />
                              Schedule
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateConsultationStatus(consultation.id, 'completed')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          </>
                        )}
                        {consultation.status === 'scheduled' && (
                          <Button
                            size="sm"
                            onClick={() => updateConsultationStatus(consultation.id, 'completed')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        )}
                        {(consultation.status === 'pending' || consultation.status === 'scheduled') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateConsultationStatus(consultation.id, 'cancelled')}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                        {consultation.status === 'completed' && (
                          <Badge className="bg-green-100 text-green-800">
                            Completed
                          </Badge>
                        )}
                        {consultation.status === 'cancelled' && (
                          <Badge className="bg-red-100 text-red-800">
                            Cancelled
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ConsultationAdmin
