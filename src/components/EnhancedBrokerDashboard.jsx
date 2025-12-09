import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Input } from '@/components/ui/input.jsx'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts'
import {
  Users, Home, TrendingUp, DollarSign, Phone, Mail, Calendar,
  Search, Filter, Plus, Eye, Edit, MessageSquare, Bell,
  Activity, Target, Award, Clock, MapPin, Star,
  ArrowUp, ArrowDown, MoreHorizontal, Download,
  Briefcase, FileText, Settings, LogOut
} from 'lucide-react'
import customerDatabase from '../services/customerDatabase.js'
import { brokerNetwork } from '../services/brokerNetwork.js'
import PropertyAdmin from './admin/PropertyAdmin.jsx'
import CustomerAdmin from './admin/CustomerAdmin.jsx'
import AgentAdmin from './admin/AgentAdmin.jsx'
import ConsultationAdmin from './admin/ConsultationAdmin.jsx'
import DatabaseReset from './admin/DatabaseReset.jsx'

function EnhancedBrokerDashboard({ onLogout }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [adminSubTab, setAdminSubTab] = useState('properties')
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState([])
  const [leads, setLeads] = useState([])
  const [consultations, setConsultations] = useState([])
  const [stats, setStats] = useState({})
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = () => {
    // Load customers, leads, and consultations
    const allCustomers = customerDatabase.customers || []
    const allLeads = customerDatabase.leads || []
    const allConsultations = customerDatabase.consultations || []
    
    setCustomers(allCustomers)
    setLeads(allLeads)
    setConsultations(allConsultations)
    
    // Calculate statistics
    const today = new Date()
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    
    const thisMonthLeads = allLeads.filter(lead => new Date(lead.createdAt) >= thisMonth)
    const lastMonthLeads = allLeads.filter(lead => 
      new Date(lead.createdAt) >= lastMonth && new Date(lead.createdAt) < thisMonth
    )
    
    const thisMonthCustomers = allCustomers.filter(customer => new Date(customer.createdAt) >= thisMonth)
    const thisMonthConsultations = allConsultations.filter(consultation => new Date(consultation.createdAt) >= thisMonth)
    
    setStats({
      totalCustomers: allCustomers.length,
      totalLeads: allLeads.length,
      totalConsultations: allConsultations.length,
      thisMonthLeads: thisMonthLeads.length,
      lastMonthLeads: lastMonthLeads.length,
      thisMonthCustomers: thisMonthCustomers.length,
      thisMonthConsultations: thisMonthConsultations.length,
      conversionRate: allLeads.length > 0 ? ((allCustomers.length / allLeads.length) * 100).toFixed(1) : 0,
      avgResponseTime: '1.2 hours',
      activeProperties: 6
    })
    
    // Generate recent activity
    const activities = [
      ...allLeads.slice(-5).map(lead => ({
        id: lead.id,
        type: 'lead',
        message: `New lead: ${lead.name} interested in ${lead.propertyCase || 'HUD properties'}`,
        time: lead.createdAt,
        priority: lead.priority || 'medium'
      })),
      ...allConsultations.slice(-5).map(consultation => ({
        id: consultation.id,
        type: 'consultation',
        message: `Consultation request: ${consultation.name} for ${consultation.consultationType}`,
        time: consultation.createdAt,
        priority: consultation.priority || 'medium'
      }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10)
    
    setRecentActivity(activities)
  }

  // Sample data for charts
  const monthlyLeadsData = [
    { month: 'Jan', leads: 12, customers: 8, consultations: 15 },
    { month: 'Feb', leads: 19, customers: 12, consultations: 22 },
    { month: 'Mar', leads: 15, customers: 10, consultations: 18 },
    { month: 'Apr', leads: 25, customers: 18, consultations: 28 },
    { month: 'May', leads: 22, customers: 16, consultations: 25 },
    { month: 'Jun', leads: 30, customers: 22, consultations: 35 }
  ]

  const leadSourceData = [
    { name: 'Website Forms', value: 45, color: '#3B82F6' },
    { name: 'Property Consultations', value: 30, color: '#10B981' },
    { name: 'Chatbot Interactions', value: 15, color: '#F59E0B' },
    { name: 'Direct Referrals', value: 10, color: '#EF4444' }
  ]

  const propertyInterestData = [
    { state: 'NC', properties: 28, value: 1250000 },
    { state: 'TN', properties: 12, value: 580000 },
    { state: 'SC', properties: 8, value: 420000 },
    { state: 'VA', properties: 5, value: 310000 }
  ]

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userName')
    onLogout()
  }

  const StatCard = ({ title, value, change, icon: Icon, color = "blue" }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change && (
              <p className={`text-sm flex items-center mt-1 ${
                change.startsWith('+') ? 'text-green-600' : 'text-red-600'
              }`}>
                {change.startsWith('+') ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                {change}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-full bg-${color}-100`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const QuickActionCard = ({ title, description, icon: Icon, onClick, color = "blue" }) => (
    <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-full bg-${color}-100 group-hover:bg-${color}-200 transition-colors`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers || 0}
          change={`+${stats.thisMonthCustomers || 0} this month`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Active Leads"
          value={stats.totalLeads || 0}
          change={stats.thisMonthLeads > stats.lastMonthLeads ? `+${stats.thisMonthLeads - stats.lastMonthLeads}` : `${stats.thisMonthLeads - stats.lastMonthLeads}`}
          icon={Target}
          color="green"
        />
        <StatCard
          title="Consultations"
          value={stats.totalConsultations || 0}
          change={`+${stats.thisMonthConsultations || 0} this month`}
          icon={Calendar}
          color="purple"
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats.conversionRate || 0}%`}
          change="+2.1% vs last month"
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Performance</CardTitle>
            <CardDescription>Leads, customers, and consultations over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyLeadsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="leads" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="customers" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="consultations" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
            <CardDescription>Where your leads are coming from</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadSourceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {leadSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickActionCard
              title="View All Leads"
              description="Manage and follow up on leads"
              icon={Target}
              onClick={() => navigate('/leads')}
              color="blue"
            />
            <QuickActionCard
              title="Customer Database"
              description="Browse customer profiles"
              icon={Users}
              onClick={() => setActiveTab('customers')}
              color="green"
            />
            <QuickActionCard
              title="Property Consultations"
              description="Review consultation requests"
              icon={Home}
              onClick={() => setActiveTab('consultations')}
              color="purple"
            />
            <QuickActionCard
              title="Send Email Campaign"
              description="Reach out to customers"
              icon={Mail}
              onClick={() => setActiveTab('communications')}
              color="orange"
            />
            <QuickActionCard
              title="Generate Reports"
              description="Business analytics and insights"
              icon={FileText}
              onClick={() => setActiveTab('reports')}
              color="red"
            />
            <QuickActionCard
              title="Broker Network"
              description="Manage referrals and partners"
              icon={Briefcase}
              onClick={() => setActiveTab('network')}
              color="indigo"
            />
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest leads, consultations, and customer interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50">
                <div className={`p-2 rounded-full ${
                  activity.type === 'lead' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  {activity.type === 'lead' ? 
                    <Target className="h-4 w-4 text-blue-600" /> : 
                    <Calendar className="h-4 w-4 text-green-600" />
                  }
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{new Date(activity.time).toLocaleString()}</p>
                </div>
                <Badge variant={activity.priority === 'high' ? 'destructive' : 'secondary'}>
                  {activity.priority}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderCustomers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Customer Database</h2>
        <Button onClick={() => navigate('/leads')} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          View All Leads
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Customer List</CardTitle>
              <CardDescription>Manage your customer database</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Button variant="outline">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customers.slice(0, 10).map((customer) => (
              <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                    <p className="text-sm text-gray-600">{customer.email}</p>
                    <p className="text-xs text-gray-500">{customer.phone} • {customer.state}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{customer.status || 'Active'}</Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/customer/${customer.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderConsultations = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Consultations</h2>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          New Consultation
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Consultation Requests</CardTitle>
          <CardDescription>Manage property consultation requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {consultations.slice(0, 10).map((consultation) => (
              <div key={consultation.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{consultation.name}</h3>
                    <p className="text-sm text-gray-600">{consultation.consultationType}</p>
                    <p className="text-xs text-gray-500">{consultation.propertyCase} • {new Date(consultation.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={consultation.priority === 'high' ? 'destructive' : 'secondary'}>
                    {consultation.priority || 'medium'}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/lead/${consultation.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Lead
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">HUD Homes Dashboard</h1>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                Marc Spencer - Lightkeeper Realty
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'customers', label: 'Customers', icon: Users },
              { id: 'consultations', label: 'Consultations', icon: Calendar },
              { id: 'properties', label: 'Properties', icon: Home },
              { id: 'communications', label: 'Communications', icon: Mail },
              { id: 'reports', label: 'Reports', icon: FileText },
              { id: 'admin', label: 'Admin Panel', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'customers' && renderCustomers()}
        {activeTab === 'consultations' && renderConsultations()}
        {activeTab === 'properties' && <PropertyAdmin />}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Admin Panel</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <button
                  onClick={() => setAdminSubTab('properties')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    adminSubTab === 'properties'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <Home className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="font-semibold">Properties</div>
                  <div className="text-sm text-gray-600">Manage HUD properties</div>
                </button>
                <button
                  onClick={() => setAdminSubTab('customers')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    adminSubTab === 'customers'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="font-semibold">Customers</div>
                  <div className="text-sm text-gray-600">Manage customer database</div>
                </button>
                <button
                  onClick={() => setAdminSubTab('consultations')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    adminSubTab === 'consultations'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <div className="font-semibold">Consultations</div>
                  <div className="text-sm text-gray-600">View consultation requests</div>
                </button>
                <button
                  onClick={() => setAdminSubTab('agents')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    adminSubTab === 'agents'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <Briefcase className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <div className="font-semibold">Agents</div>
                  <div className="text-sm text-gray-600">Manage agent network</div>
                </button>
                <button
                  onClick={() => setAdminSubTab('reset')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    adminSubTab === 'reset'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-red-300'
                  }`}
                >
                  <Settings className="h-8 w-8 mx-auto mb-2 text-red-600" />
                  <div className="font-semibold">Reset Database</div>
                  <div className="text-sm text-gray-600">Load 25 NC properties</div>
                </button>
              </div>
            </div>
            {adminSubTab === 'properties' && <PropertyAdmin />}
            {adminSubTab === 'customers' && <CustomerAdmin />}
            {adminSubTab === 'consultations' && <ConsultationAdmin />}
            {adminSubTab === 'agents' && <AgentAdmin />}
            {adminSubTab === 'reset' && <DatabaseReset />}
          </div>
        )}
        {activeTab === 'communications' && (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Communications Center</h3>
            <p className="text-gray-600">Email campaigns and communication tools coming soon...</p>
          </div>
        )}
        {activeTab === 'reports' && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Business Reports</h3>
            <p className="text-gray-600">Advanced reporting and analytics coming soon...</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default EnhancedBrokerDashboard
