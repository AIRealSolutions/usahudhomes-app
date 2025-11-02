import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Home,
  Filter,
  Download,
  Search,
  Plus,
  Eye,
  MessageSquare,
  Send,
  RefreshCw
} from 'lucide-react'
import customerDB from '../services/customerDatabase.js'
import emailService from '../services/emailService.js'

const EnhancedBrokerDashboard = () => {
  const [customers, setCustomers] = useState([])
  const [consultations, setConsultations] = useState([])
  const [leads, setLeads] = useState([])
  const [stats, setStats] = useState({})
  const [emailLogs, setEmailLogs] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [newNote, setNewNote] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = () => {
    setCustomers(customerDB.getAllCustomers())
    setConsultations(customerDB.getAllConsultations())
    setLeads(customerDB.getAllLeads())
    setStats(customerDB.getDashboardStats())
    setEmailLogs(emailService.getEmailLogs())
  }

  const handleAddNote = (customerId) => {
    if (newNote.trim()) {
      customerDB.addCustomerNote(customerId, newNote)
      setNewNote('')
      loadDashboardData()
      if (selectedCustomer && selectedCustomer.id === customerId) {
        setSelectedCustomer(customerDB.getCustomerById(customerId))
      }
    }
  }

  const handleUpdateCustomerStatus = (customerId, status) => {
    customerDB.updateCustomer(customerId, { status })
    loadDashboardData()
    if (selectedCustomer && selectedCustomer.id === customerId) {
      setSelectedCustomer(customerDB.getCustomerById(customerId))
    }
  }

  const handleTestEmail = async () => {
    const result = await emailService.testEmail()
    if (result.success) {
      alert('Test email sent successfully!')
      loadDashboardData()
    } else {
      alert('Failed to send test email: ' + result.error)
    }
  }

  const filteredCustomers = searchQuery
    ? customerDB.searchCustomers(searchQuery)
    : customers

  const filteredByStatus = filterStatus === 'all' 
    ? filteredCustomers 
    : filteredCustomers.filter(customer => customer.status === filterStatus)

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'contacted': return 'bg-yellow-100 text-yellow-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-purple-100 text-purple-800'
      case 'pending': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'new': return <AlertCircle className="h-4 w-4" />
      case 'contacted': return <Clock className="h-4 w-4" />
      case 'active': return <TrendingUp className="h-4 w-4" />
      case 'closed': return <CheckCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'normal': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const exportData = () => {
    const data = customerDB.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `usahudhomes-data-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Management Dashboard</h1>
          <p className="text-lg text-gray-600">USAhudHomes.com - Marc Spencer</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadDashboardData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleTestEmail} variant="outline">
            <Send className="h-4 w-4 mr-2" />
            Test Email
          </Button>
          <Button onClick={exportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newCustomersToday || 0} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConsultations || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingConsultations || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.highPriorityConsultations || 0}</div>
            <p className="text-xs text-muted-foreground">
              Urgent responses needed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newCustomersThisWeek || 0}</div>
            <p className="text-xs text-muted-foreground">
              New customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="consultations">Consultations</TabsTrigger>
          <TabsTrigger value="emails">Email Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Customers */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Customers</CardTitle>
                <CardDescription>Latest customer registrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customers.slice(0, 5).map((customer) => (
                    <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-gray-600">{customer.email}</p>
                        <p className="text-xs text-gray-500">{formatDate(customer.createdAt)}</p>
                      </div>
                      <Badge className={getStatusColor(customer.status)}>
                        {customer.status}
                      </Badge>
                    </div>
                  ))}
                  {customers.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No customers yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Consultations */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Consultations</CardTitle>
                <CardDescription>Latest consultation requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {consultations.slice(0, 5).map((consultation) => (
                    <div key={consultation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{consultation.name}</p>
                        <p className="text-sm text-gray-600">{consultation.consultationType}</p>
                        <p className="text-xs text-gray-500">{formatDate(consultation.createdAt)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getPriorityColor(consultation.priority)}>
                          {consultation.priority}
                        </Badge>
                        <Badge className={getStatusColor(consultation.status)}>
                          {consultation.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {consultations.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No consultations yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search customers by name, email, phone, or state..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customers List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {filteredByStatus.map((customer) => (
                <Card key={customer.id} className={`hover:shadow-md transition-shadow cursor-pointer ${selectedCustomer?.id === customer.id ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => setSelectedCustomer(customer)}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
                      <Badge className={getStatusColor(customer.status)}>
                        {getStatusIcon(customer.status)}
                        {customer.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {customer.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {customer.phone}
                      </div>
                      {customer.state && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {customer.state}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(customer.createdAt)}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Phone className="h-4 w-4 mr-1" />
                        Call
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Mail className="h-4 w-4 mr-1" />
                        Email
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredByStatus.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No customers found</h3>
                    <p className="text-gray-600">Try adjusting your search or filter criteria</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Customer Details Panel */}
            <div className="lg:sticky lg:top-8">
              {selectedCustomer ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Details</CardTitle>
                    <CardDescription>{selectedCustomer.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Status Update */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                      <Select 
                        value={selectedCustomer.status} 
                        onValueChange={(value) => handleUpdateCustomerStatus(selectedCustomer.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <p className="text-sm text-gray-900">{selectedCustomer.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Phone</label>
                        <p className="text-sm text-gray-900">{selectedCustomer.phone}</p>
                      </div>
                      {selectedCustomer.state && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">State</label>
                          <p className="text-sm text-gray-900">{selectedCustomer.state}</p>
                        </div>
                      )}
                      {selectedCustomer.propertyId && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Property Interest</label>
                          <p className="text-sm text-gray-900">{selectedCustomer.propertyId}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-700">Registration Date</label>
                        <p className="text-sm text-gray-900">{formatDate(selectedCustomer.createdAt)}</p>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Notes</label>
                      <div className="space-y-3">
                        {selectedCustomer.notes && selectedCustomer.notes.length > 0 ? (
                          selectedCustomer.notes.map((note) => (
                            <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-900">{note.text}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {note.createdBy} - {formatDate(note.createdAt)}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No notes yet</p>
                        )}
                      </div>
                    </div>

                    {/* Add Note */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Add Note</label>
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Add a note about this customer..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          rows={3}
                        />
                        <Button 
                          onClick={() => handleAddNote(selectedCustomer.id)}
                          disabled={!newNote.trim()}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Note
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Eye className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Customer</h3>
                    <p className="text-gray-600">Click on a customer to view their details</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Consultations Tab */}
        <TabsContent value="consultations" className="space-y-6">
          <div className="space-y-4">
            {consultations.map((consultation) => (
              <Card key={consultation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{consultation.name}</h3>
                        <Badge className={getPriorityColor(consultation.priority)}>
                          {consultation.priority} priority
                        </Badge>
                        <Badge className={getStatusColor(consultation.status)}>
                          {getStatusIcon(consultation.status)}
                          {consultation.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {consultation.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {consultation.phone}
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          {consultation.consultationType}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDate(consultation.createdAt)}
                        </div>
                      </div>

                      {consultation.propertyId && (
                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-700">Property: </span>
                          <span className="text-sm text-gray-900">{consultation.propertyId}</span>
                        </div>
                      )}

                      {consultation.message && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">{consultation.message}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 lg:w-48">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Phone className="h-4 w-4 mr-1" />
                          Call
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Mail className="h-4 w-4 mr-1" />
                          Email
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {consultations.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No consultations yet</h3>
                  <p className="text-gray-600">Consultation requests will appear here</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Email Logs Tab */}
        <TabsContent value="emails" className="space-y-6">
          <div className="space-y-4">
            {emailLogs.map((email) => (
              <Card key={email.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{email.subject}</h3>
                    <Badge variant="outline">
                      <Send className="h-3 w-3 mr-1" />
                      Sent
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      To: {email.to}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(email.sentAt)}
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700 whitespace-pre-line">{email.text}</p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {emailLogs.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Send className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No emails sent yet</h3>
                  <p className="text-gray-600">Email notifications will appear here</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default EnhancedBrokerDashboard
