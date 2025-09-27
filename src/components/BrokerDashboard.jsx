import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Input } from '@/components/ui/input.jsx'
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
  Download
} from 'lucide-react'

const BrokerDashboard = () => {
  const [leads, setLeads] = useState([])
  const [referrals, setReferrals] = useState([])
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeLeads: 0,
    closedDeals: 0,
    totalEarnings: 0,
    monthlyEarnings: 0,
    conversionRate: 0
  })
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Sample data (in production, this would come from Firebase)
  const sampleLeads = [
    {
      id: 'lead-001',
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '(555) 123-4567',
      state: 'NC',
      propertyId: '387-069497',
      propertyAddress: '3819 Flat Mountain Rd, Highlands, NC',
      status: 'New',
      createdAt: '2025-09-25T10:30:00Z',
      lastContact: null,
      notes: 'Interested in HUD homes under $400k'
    },
    {
      id: 'lead-002',
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '(555) 987-6543',
      state: 'NC',
      propertyId: '387-111612',
      propertyAddress: '80 Prong Creek Ln, Yanceyville, NC',
      status: 'Contacted',
      createdAt: '2025-09-24T14:15:00Z',
      lastContact: '2025-09-25T09:00:00Z',
      notes: 'Scheduled property viewing for this weekend'
    },
    {
      id: 'lead-003',
      name: 'Michael Davis',
      email: 'mdavis@email.com',
      phone: '(555) 456-7890',
      state: 'NC',
      propertyId: '387-570372',
      propertyAddress: '2105 Fathom Way, Charlotte, NC',
      status: 'Active',
      createdAt: '2025-09-22T16:45:00Z',
      lastContact: '2025-09-24T11:30:00Z',
      notes: 'Pre-approved for $400k, ready to bid'
    },
    {
      id: 'lead-004',
      name: 'Emily Wilson',
      email: 'emily.wilson@email.com',
      phone: '(555) 321-0987',
      state: 'NC',
      propertyId: '381-799288',
      propertyAddress: '3009 Wynston Way, Clayton, NC',
      status: 'Closed',
      createdAt: '2025-09-15T12:00:00Z',
      lastContact: '2025-09-23T15:20:00Z',
      notes: 'Successfully closed on property, earned $2,250 referral fee'
    }
  ]

  const sampleReferrals = [
    {
      id: 'ref-001',
      leadId: 'lead-004',
      leadName: 'Emily Wilson',
      propertyId: '381-799288',
      propertyAddress: '3009 Wynston Way, Clayton, NC',
      salePrice: 345000,
      commission: 10350, // 3% of sale price
      referralFee: 2587.50, // 25% of commission
      status: 'Closed',
      payoutStatus: 'Paid',
      closedAt: '2025-09-23T15:20:00Z',
      paidAt: '2025-09-24T10:00:00Z'
    },
    {
      id: 'ref-002',
      leadId: 'lead-003',
      leadName: 'Michael Davis',
      propertyId: '387-570372',
      propertyAddress: '2105 Fathom Way, Charlotte, NC',
      salePrice: 365000,
      commission: 10950, // 3% of sale price
      referralFee: 2737.50, // 25% of commission
      status: 'Active',
      payoutStatus: 'Pending',
      closedAt: null,
      paidAt: null
    }
  ]

  useEffect(() => {
    setLeads(sampleLeads)
    setReferrals(sampleReferrals)
    
    // Calculate stats
    const totalLeads = sampleLeads.length
    const activeLeads = sampleLeads.filter(lead => ['New', 'Contacted', 'Active'].includes(lead.status)).length
    const closedDeals = sampleLeads.filter(lead => lead.status === 'Closed').length
    const totalEarnings = sampleReferrals.reduce((sum, ref) => sum + (ref.payoutStatus === 'Paid' ? ref.referralFee : 0), 0)
    const monthlyEarnings = totalEarnings // Simplified for demo
    const conversionRate = totalLeads > 0 ? (closedDeals / totalLeads) * 100 : 0

    setStats({
      totalLeads,
      activeLeads,
      closedDeals,
      totalEarnings,
      monthlyEarnings,
      conversionRate
    })
  }, [])

  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800'
      case 'Contacted': return 'bg-yellow-100 text-yellow-800'
      case 'Active': return 'bg-green-100 text-green-800'
      case 'Closed': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'New': return <AlertCircle className="h-4 w-4" />
      case 'Contacted': return <Clock className="h-4 w-4" />
      case 'Active': return <TrendingUp className="h-4 w-4" />
      case 'Closed': return <CheckCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const updateLeadStatus = (leadId, newStatus) => {
    setLeads(leads.map(lead => 
      lead.id === leadId 
        ? { ...lead, status: newStatus, lastContact: new Date().toISOString() }
        : lead
    ))
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

  const filteredLeads = leads.filter(lead => {
    const matchesStatus = filterStatus === 'all' || lead.status.toLowerCase() === filterStatus.toLowerCase()
    const matchesSearch = !searchQuery || 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesStatus && matchesSearch
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Broker Dashboard</h1>
        <p className="text-lg text-gray-600">Manage your HUD home leads and track referral earnings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeLeads} active leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Deals</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.closedDeals}</div>
            <p className="text-xs text-muted-foreground">
              {stats.conversionRate.toFixed(1)}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">
              All-time referral fees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.monthlyEarnings)}</div>
            <p className="text-xs text-muted-foreground">
              September 2025
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="leads" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="leads">Lead Management</TabsTrigger>
          <TabsTrigger value="referrals">Referral Tracking</TabsTrigger>
        </TabsList>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search leads by name, email, or property..."
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
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leads List */}
          <div className="space-y-4">
            {filteredLeads.map((lead) => (
              <Card key={lead.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{lead.name}</h3>
                        <Badge className={`${getStatusColor(lead.status)} flex items-center gap-1`}>
                          {getStatusIcon(lead.status)}
                          {lead.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {lead.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {lead.phone}
                        </div>
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          {lead.propertyAddress}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Created: {formatDate(lead.createdAt)}
                        </div>
                      </div>

                      {lead.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">{lead.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 lg:w-48">
                      <Select 
                        value={lead.status} 
                        onValueChange={(value) => updateLeadStatus(lead.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New">New</SelectItem>
                          <SelectItem value="Contacted">Contacted</SelectItem>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      
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
          </div>

          {filteredLeads.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No leads found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-6">
          <div className="space-y-4">
            {referrals.map((referral) => (
              <Card key={referral.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{referral.leadName}</h3>
                        <Badge className={`${getStatusColor(referral.status)} flex items-center gap-1`}>
                          {getStatusIcon(referral.status)}
                          {referral.status}
                        </Badge>
                        <Badge variant={referral.payoutStatus === 'Paid' ? 'default' : 'secondary'}>
                          {referral.payoutStatus}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          {referral.propertyAddress}
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Sale Price: {formatCurrency(referral.salePrice)}
                        </div>
                        {referral.closedAt && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Closed: {formatDate(referral.closedAt)}
                          </div>
                        )}
                        {referral.paidAt && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Paid: {formatDate(referral.paidAt)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                        <div>
                          <p className="text-sm text-gray-600">Commission (3%)</p>
                          <p className="text-lg font-semibold text-gray-900">{formatCurrency(referral.commission)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Your Referral Fee (25%)</p>
                          <p className="text-2xl font-bold text-green-600">{formatCurrency(referral.referralFee)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {referrals.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No referrals yet</h3>
                <p className="text-gray-600">Start working with your leads to generate referral income</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default BrokerDashboard
