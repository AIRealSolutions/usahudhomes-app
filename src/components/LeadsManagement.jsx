import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  User, 
  Calendar, 
  MapPin, 
  Home,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Edit,
  Trash2,
  Download,
  Plus,
  SortAsc,
  SortDesc
} from 'lucide-react'
import customerDB from '../services/customerDatabase.js'
import emailService from '../services/emailService.js'

function LeadsManagement() {
  const [leads, setLeads] = useState([])
  const [filteredLeads, setFilteredLeads] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedLead, setSelectedLead] = useState(null)
  const [showEmailComposer, setShowEmailComposer] = useState(false)
  const [showAddNote, setShowAddNote] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    body: '',
    template: 'custom'
  })

  useEffect(() => {
    loadLeads()
  }, [])

  useEffect(() => {
    filterAndSortLeads()
  }, [leads, searchTerm, statusFilter, sourceFilter, priorityFilter, sortBy, sortOrder])

  const loadLeads = () => {
    const allLeads = customerDB.getAllLeads()
    setLeads(allLeads)
  }

  const filterAndSortLeads = () => {
    let filtered = [...leads]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(lead => 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm) ||
        lead.propertyCase?.includes(searchTerm) ||
        lead.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter)
    }

    // Apply source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(lead => lead.source === sourceFilter)
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(lead => lead.priority === priorityFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'date':
          aValue = new Date(a.createdAt)
          bValue = new Date(b.createdAt)
          break
        case 'priority':
          const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 }
          aValue = priorityOrder[a.priority] || 0
          bValue = priorityOrder[b.priority] || 0
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        default:
          aValue = a.createdAt
          bValue = b.createdAt
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredLeads(filtered)
  }

  const updateLeadStatus = (leadId, newStatus) => {
    customerDB.updateLeadStatus(leadId, newStatus)
    loadLeads()
  }

  const updateLeadPriority = (leadId, newPriority) => {
    customerDB.updateLeadPriority(leadId, newPriority)
    loadLeads()
  }

  const addNoteToLead = (leadId, note) => {
    customerDB.addNoteToLead(leadId, note)
    loadLeads()
    setNewNote('')
    setShowAddNote(false)
  }

  const deleteLead = (leadId) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      customerDB.deleteLead(leadId)
      loadLeads()
      setSelectedLead(null)
    }
  }

  const sendEmail = async () => {
    try {
      await emailService.sendEmail({
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        leadId: selectedLead?.id
      })
      
      // Log email activity
      customerDB.addActivityToLead(selectedLead.id, {
        type: 'email',
        description: `Email sent: ${emailData.subject}`,
        timestamp: new Date()
      })
      
      alert('Email sent successfully!')
      setShowEmailComposer(false)
      setEmailData({ to: '', subject: '', body: '', template: 'custom' })
      loadLeads()
    } catch (error) {
      alert('Error sending email: ' + error.message)
    }
  }

  const exportLeads = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'State', 'Property Case', 'Status', 'Priority', 'Source', 'Created Date', 'Message'],
      ...filteredLeads.map(lead => [
        lead.name,
        lead.email,
        lead.phone,
        lead.state,
        lead.propertyCase || '',
        lead.status,
        lead.priority,
        lead.source,
        new Date(lead.createdAt).toLocaleDateString(),
        lead.message.replace(/,/g, ';') // Replace commas to avoid CSV issues
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'new': return 'default'
      case 'contacted': return 'secondary'
      case 'qualified': return 'outline'
      case 'closed': return 'destructive'
      default: return 'default'
    }
  }

  const getPriorityBadgeVariant = (priority) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const emailTemplates = {
    welcome: {
      subject: 'Welcome to USAhudHomes.com - Your HUD Home Journey Begins',
      body: `Dear [Name],

Thank you for your interest in HUD homes! I'm Marc Spencer from Lightkeeper Realty, and I'm excited to help you find your perfect HUD property.

As a HUD-registered buyer's agency with over 25 years of experience, we specialize in helping clients navigate the HUD home buying process and secure properties at below-market prices.

Here's what we can offer you:
• $100 down FHA loans for owner-occupants
• Up to 3% closing cost assistance
• Repair escrows up to $35,000 with 203k loans
• Expert guidance through the bidding process

I'll be reaching out to you within 24 hours to discuss your specific needs and answer any questions you may have.

Best regards,
Marc Spencer
Lightkeeper Realty
(910) 363-6147
marcspencer28461@gmail.com
USAhudHomes.com`
    },
    followup: {
      subject: 'Following Up on Your HUD Home Interest',
      body: `Dear [Name],

I wanted to follow up on your recent inquiry about HUD homes. Have you had a chance to review any of the properties we discussed?

The HUD market moves quickly, and I want to make sure you don't miss out on any opportunities that match your criteria.

If you're ready to move forward, I can help you:
• Get pre-qualified for financing
• Schedule property viewings
• Prepare and submit competitive bids
• Navigate the closing process

Please let me know if you have any questions or if you'd like to schedule a consultation.

Best regards,
Marc Spencer
Lightkeeper Realty
(910) 363-6147`
    },
    consultation: {
      subject: 'Your HUD Home Consultation - Next Steps',
      body: `Dear [Name],

Thank you for scheduling a consultation regarding the HUD property at [Property Address]. I'm looking forward to helping you with this opportunity.

Before our meeting, please gather the following information:
• Pre-qualification letter or financial documentation
• List of your must-have features
• Questions about the property or HUD process

During our consultation, we'll cover:
• Property details and market analysis
• Financing options and incentives
• Bidding strategy and timeline
• Next steps in the process

I'll contact you within 2 hours to confirm our appointment time.

Best regards,
Marc Spencer
Lightkeeper Realty
(910) 363-6147`
    }
  }

  const applyEmailTemplate = (templateKey) => {
    const template = emailTemplates[templateKey]
    if (template && selectedLead) {
      setEmailData({
        ...emailData,
        subject: template.subject.replace('[Name]', selectedLead.name),
        body: template.body
          .replace(/\[Name\]/g, selectedLead.name)
          .replace('[Property Address]', selectedLead.propertyAddress || 'the property you inquired about'),
        template: templateKey
      })
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads Management</h1>
          <p className="text-gray-600 mt-1">Manage and track your HUD home leads</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportLeads} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => window.location.reload()}>
            <Plus className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="chatbot">Chatbot</SelectItem>
                <SelectItem value="consultation">Consultation</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-')
              setSortBy(field)
              setSortOrder(order)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Date (Newest)</SelectItem>
                <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="priority-desc">Priority (High-Low)</SelectItem>
                <SelectItem value="status-asc">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold">{leads.length}</p>
              </div>
              <User className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New Leads</p>
                <p className="text-2xl font-bold text-green-600">
                  {leads.filter(l => l.status === 'new').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-red-600">
                  {leads.filter(l => l.priority === 'high').length}
                </p>
              </div>
              <Star className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Qualified</p>
                <p className="text-2xl font-bold text-blue-600">
                  {leads.filter(l => l.status === 'qualified').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Leads ({filteredLeads.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredLeads.map((lead) => (
                  <div 
                    key={lead.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedLead?.id === lead.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{lead.name}</h3>
                        <p className="text-gray-600">{lead.email}</p>
                        <p className="text-sm text-gray-500">{lead.phone}</p>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <Badge variant={getStatusBadgeVariant(lead.status)}>
                          {lead.status}
                        </Badge>
                        <Badge variant={getPriorityBadgeVariant(lead.priority)}>
                          {lead.priority}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {lead.state}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {lead.source}
                      </span>
                      {lead.propertyCase && (
                        <span className="flex items-center gap-1">
                          <Home className="h-3 w-3" />
                          {lead.propertyCase}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-700 line-clamp-2">{lead.message}</p>
                  </div>
                ))}
                
                {filteredLeads.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No leads found matching your criteria</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lead Details Panel */}
        <div>
          {selectedLead ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Lead Details
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setEmailData({ ...emailData, to: selectedLead.email })
                        setShowEmailComposer(true)
                      }}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowAddNote(true)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => deleteLead(selectedLead.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedLead.name}</h3>
                  <p className="text-gray-600">{selectedLead.email}</p>
                  <p className="text-gray-600">{selectedLead.phone}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select 
                      value={selectedLead.status} 
                      onValueChange={(value) => updateLeadStatus(selectedLead.id, value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <Select 
                      value={selectedLead.priority} 
                      onValueChange={(value) => updateLeadPriority(selectedLead.id, value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Property Interest</label>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedLead.propertyCase ? `Case #${selectedLead.propertyCase}` : 'General inquiry'}
                  </p>
                  {selectedLead.propertyAddress && (
                    <p className="text-sm text-gray-500">{selectedLead.propertyAddress}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Message</label>
                  <p className="text-sm text-gray-600 mt-1 p-2 bg-gray-50 rounded">
                    {selectedLead.message}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Lead Source</label>
                  <p className="text-sm text-gray-600 mt-1 capitalize">{selectedLead.source}</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Created</label>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(selectedLead.createdAt).toLocaleString()}
                  </p>
                </div>

                {selectedLead.notes && selectedLead.notes.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <div className="mt-1 space-y-2">
                      {selectedLead.notes.map((note, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                          <p className="text-gray-700">{note.text}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(note.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLead.activities && selectedLead.activities.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Recent Activity</label>
                    <div className="mt-1 space-y-2">
                      {selectedLead.activities.slice(-3).map((activity, index) => (
                        <div key={index} className="p-2 bg-blue-50 rounded text-sm">
                          <p className="text-blue-700">{activity.description}</p>
                          <p className="text-xs text-blue-500 mt-1">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select a lead to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Email Composer Modal */}
      {showEmailComposer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Compose Email
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowEmailComposer(false)}
                >
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email Template</label>
                <Select value={emailData.template} onValueChange={(value) => {
                  setEmailData({ ...emailData, template: value })
                  if (value !== 'custom') {
                    applyEmailTemplate(value)
                  }
                }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Email</SelectItem>
                    <SelectItem value="welcome">Welcome Email</SelectItem>
                    <SelectItem value="followup">Follow-up Email</SelectItem>
                    <SelectItem value="consultation">Consultation Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">To</label>
                <Input
                  value={emailData.to}
                  onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                  placeholder="recipient@example.com"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  placeholder="Email subject"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={emailData.body}
                  onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                  placeholder="Email message"
                  rows={12}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEmailComposer(false)}
                >
                  Cancel
                </Button>
                <Button onClick={sendEmail}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Note Modal */}
      {showAddNote && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Add Note
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowAddNote(false)}
                >
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note about this lead..."
                rows={4}
              />
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddNote(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => addNoteToLead(selectedLead.id, newNote)}
                  disabled={!newNote.trim()}
                >
                  Add Note
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default LeadsManagement
