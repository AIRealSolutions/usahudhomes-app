import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  User, Phone, Mail, MapPin, Calendar, Clock, DollarSign,
  MessageSquare, Send, FileText, Users, Home, Star,
  Edit, Save, X, Plus, ArrowLeft, AlertCircle, CheckCircle,
  TrendingUp, Activity, Target, Briefcase, Share2
} from 'lucide-react'
import customerDatabase from '../services/customerDatabase.js'
import { brokerNetwork } from '../services/brokerNetwork.js'
import emailService from '../services/emailService.js'
// import AIAgentAssistant from './broker/AIAgentAssistant'

function LeadDetail() {
  const { leadId } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [editMode, setEditMode] = useState(false)
  const [editedLead, setEditedLead] = useState({})
  
  // CRM State
  const [newNote, setNewNote] = useState('')
  const [newTask, setNewTask] = useState({ title: '', dueDate: '', priority: 'medium' })
  const [emailComposer, setEmailComposer] = useState({ subject: '', body: '', template: '' })
  const [referralData, setReferralData] = useState({ brokerId: '', notes: '', commission: '' })
  
  // Data
  const [interactions, setInteractions] = useState([])
  const [tasks, setTasks] = useState([])
  const [brokers, setBrokers] = useState([])
  const [emailTemplates, setEmailTemplates] = useState([])

  useEffect(() => {
    loadLeadData()
    loadBrokers()
    loadEmailTemplates()
  }, [leadId])

  const loadLeadData = () => {
    setLoading(true)
    setError(null)
    try {
      console.log('Loading lead with ID:', leadId)
      console.log('Available consultations:', customerDatabase.consultations?.length || 0)
      
      // Get lead from consultations (since consultations are leads)
      const consultation = customerDatabase.consultations?.find(c => c.id === leadId)
      
      if (consultation) {
        console.log('Found consultation:', consultation)
        setLead(consultation)
        setEditedLead(consultation)
        
        // Load related interactions and tasks
        setInteractions(customerDatabase.getLeadInteractions?.(leadId) || [])
        setTasks(customerDatabase.getLeadTasks?.(leadId) || [])
      } else {
        const errorMsg = `Lead not found with ID: ${leadId}. Available: ${customerDatabase.consultations?.length || 0} consultations`
        console.error(errorMsg)
        setError(errorMsg)
      }
    } catch (error) {
      console.error('Error loading lead:', error)
      setError(`Failed to load lead: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadBrokers = () => {
    setBrokers(brokerNetwork.getAllBrokers())
  }

  const loadEmailTemplates = () => {
    setEmailTemplates([
      {
        id: 'welcome',
        name: 'Welcome Email',
        subject: 'Welcome to USAhudHomes.com - Your HUD Property Journey Begins',
        body: `Dear {{name}},

Thank you for your interest in HUD properties! I'm Marc Spencer from Lightkeeper Realty, and I'm excited to help you find your perfect HUD home.

As a Registered HUD Buyer's Agency with over 25 years of experience, we specialize in helping people successfully bid on and purchase HUD homes at below-market prices.

Next Steps:
1. I'll review your consultation request and property interests
2. We'll schedule a call to discuss your specific needs
3. I'll provide you with a customized list of suitable properties
4. We'll guide you through the bidding process

Best regards,
Marc Spencer
Lightkeeper Realty
(910) 363-6147
marcspencer28461@gmail.com`
      },
      {
        id: 'follow_up',
        name: 'Follow-up Email',
        subject: 'Following up on your HUD property consultation',
        body: `Hi {{name}},

I wanted to follow up on your recent consultation request for HUD properties. I've reviewed your requirements and have some excellent options that might interest you.

Property Highlights:
- Properties in your preferred area: {{state}}
- Price range matching your budget
- Owner-occupant incentives available ($100 down FHA loans, 3% closing costs paid)

Would you like to schedule a call this week to discuss these opportunities? I'm available at your convenience.

Best regards,
Marc Spencer
(910) 363-6147`
      },
      {
        id: 'property_match',
        name: 'Property Match Notification',
        subject: 'Perfect HUD Property Match Found!',
        body: `Dear {{name}},

Great news! I found a HUD property that perfectly matches your criteria:

Property Details:
- Location: {{propertyLocation}}
- Price: {{propertyPrice}}
- Bedrooms/Bathrooms: {{propertySpecs}}
- Special Features: {{propertyFeatures}}

This property offers excellent value and qualifies for owner-occupant incentives. The bid deadline is approaching, so we should act quickly.

Let's schedule a showing and discuss your bidding strategy.

Marc Spencer
Lightkeeper Realty
(910) 363-6147`
      }
    ])
  }

  const handleSaveLead = () => {
    try {
      customerDatabase.updateConsultation(leadId, editedLead)
      setLead(editedLead)
      setEditMode(false)
      
      // Add interaction log
      addInteraction('Lead information updated', 'system')
    } catch (error) {
      console.error('Error saving lead:', error)
    }
  }

  const handleStatusChange = (newStatus) => {
    const updatedLead = { ...lead, status: newStatus }
    setLead(updatedLead)
    setEditedLead(updatedLead)
    
    try {
      customerDatabase.updateConsultation(leadId, updatedLead)
      addInteraction(`Status changed to: ${newStatus}`, 'system')
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const addInteraction = (message, type = 'note', data = {}) => {
    const interaction = {
      id: Date.now().toString(),
      leadId,
      type,
      message,
      data,
      timestamp: new Date().toISOString(),
      user: 'Marc Spencer'
    }
    
    const updatedInteractions = [interaction, ...interactions]
    setInteractions(updatedInteractions)
    
    // Save to database
    customerDatabase.addLeadInteraction?.(leadId, interaction)
  }

  const handleAddNote = () => {
    if (newNote.trim()) {
      addInteraction(newNote, 'note')
      setNewNote('')
    }
  }

  const handleAddTask = () => {
    if (newTask.title.trim()) {
      const task = {
        id: Date.now().toString(),
        leadId,
        ...newTask,
        completed: false,
        createdAt: new Date().toISOString()
      }
      
      const updatedTasks = [task, ...tasks]
      setTasks(updatedTasks)
      
      // Save to database
      customerDatabase.addLeadTask?.(leadId, task)
      
      setNewTask({ title: '', dueDate: '', priority: 'medium' })
      addInteraction(`Task created: ${task.title}`, 'task')
    }
  }

  const handleSendEmail = async () => {
    if (emailComposer.subject && emailComposer.body) {
      try {
        // Replace template variables
        let emailBody = emailComposer.body
        emailBody = emailBody.replace(/{{name}}/g, lead.name)
        emailBody = emailBody.replace(/{{state}}/g, lead.state || 'your area')
        emailBody = emailBody.replace(/{{propertyCase}}/g, lead.propertyCase || '')
        
        const emailData = {
          to: lead.email,
          subject: emailComposer.subject,
          body: emailBody,
          leadId: leadId
        }
        
        const result = await emailService.sendEmail(emailData)
        
        if (result.success) {
          addInteraction(`Email sent: ${emailComposer.subject}`, 'email', emailData)
          setEmailComposer({ subject: '', body: '', template: '' })
          alert('Email sent successfully!')
        } else {
          alert('Failed to send email: ' + result.error)
        }
      } catch (error) {
        console.error('Error sending email:', error)
        alert('Error sending email')
      }
    }
  }

  const handleReferToBroker = () => {
    if (referralData.brokerId) {
      const broker = brokers.find(b => b.id === referralData.brokerId)
      const referral = {
        id: Date.now().toString(),
        leadId,
        brokerId: referralData.brokerId,
        brokerName: broker?.name,
        notes: referralData.notes,
        commission: referralData.commission,
        status: 'pending',
        createdAt: new Date().toISOString()
      }
      
      // Save referral
      brokerNetwork.createReferral(referral)
      
      // Update lead status
      handleStatusChange('referred')
      
      addInteraction(`Referred to broker: ${broker?.name}`, 'referral', referral)
      setReferralData({ brokerId: '', notes: '', commission: '' })
      
      alert(`Lead successfully referred to ${broker?.name}`)
    }
  }

  const loadEmailTemplate = (templateId) => {
    const template = emailTemplates.find(t => t.id === templateId)
    if (template) {
      setEmailComposer({
        subject: template.subject,
        body: template.body,
        template: templateId
      })
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'contacted': return 'bg-yellow-100 text-yellow-800'
      case 'qualified': return 'bg-green-100 text-green-800'
      case 'proposal': return 'bg-purple-100 text-purple-800'
      case 'closed': return 'bg-green-100 text-green-800'
      case 'lost': return 'bg-red-100 text-red-800'
      case 'referred': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lead details...</p>
        </div>
      </div>
    )
  }

  if (!lead || error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Lead Not Found</h2>
          <p className="text-gray-600 mb-2">The requested lead could not be found.</p>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-mono">{error}</p>
              <p className="text-xs text-red-600 mt-2">Lead ID: {leadId}</p>
            </div>
          )}
          <Button onClick={() => navigate('/broker-dashboard')} className="mt-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate('/broker-dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Lead Details</h1>
                <p className="text-sm text-gray-600">{lead.name} • {lead.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(lead.status)}>
                {lead.status || 'new'}
              </Badge>
              <Badge className={getPriorityColor(lead.priority)}>
                {lead.priority || 'medium'} priority
              </Badge>
              {editMode ? (
                <div className="flex space-x-2">
                  <Button size="sm" onClick={handleSaveLead}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Lead Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lead Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Information</CardTitle>
                <CardDescription>Customer details and consultation request</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {editMode ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      <Input
                        value={editedLead.name || ''}
                        onChange={(e) => setEditedLead({...editedLead, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <Input
                        value={editedLead.email || ''}
                        onChange={(e) => setEditedLead({...editedLead, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <Input
                        value={editedLead.phone || ''}
                        onChange={(e) => setEditedLead({...editedLead, phone: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">State</label>
                      <Input
                        value={editedLead.state || ''}
                        onChange={(e) => setEditedLead({...editedLead, state: e.target.value})}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <User className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Name</p>
                          <p className="font-medium">{lead.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium">{lead.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-medium">{lead.phone}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <MapPin className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">State</p>
                          <p className="font-medium">{lead.state}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Created</p>
                          <p className="font-medium">{formatDate(lead.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Home className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Property Interest</p>
                          <p className="font-medium">{lead.propertyCase || 'General HUD Properties'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Consultation Details */}
                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Consultation Request</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Type</p>
                      <p className="font-medium">{lead.consultationType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Preferred Contact</p>
                      <p className="font-medium">{lead.preferredContact}</p>
                    </div>
                  </div>
                  {lead.message && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600">Message</p>
                      <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-lg">{lead.message}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* CRM Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="ai-agent">🤖 AI Agent</TabsTrigger>
                <TabsTrigger value="interactions">Interactions</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
              </TabsList>

              <TabsContent value="ai-agent" className="space-y-6">
                <div className="p-8 text-center">
                  <p className="text-gray-600">AI Agent Assistant is temporarily disabled for debugging.</p>
                  <p className="text-sm text-gray-500 mt-2">This will be re-enabled shortly.</p>
                </div>
                {/* <AIAgentAssistant 
                  lead={lead} 
                  onAction={async (action, data) => {
                    // Handle AI Agent actions
                    console.log('AI Agent action:', action, data)
                    if (action === 'send_message') {
                      addInteraction(`AI Agent sent ${data.channel}: ${data.subject || 'message'}`, data.channel)
                    }
                  }}
                /> */}
              </TabsContent>

              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Lead Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <MessageSquare className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-600">{interactions.length}</p>
                        <p className="text-sm text-gray-600">Interactions</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-600">{tasks.filter(t => t.completed).length}</p>
                        <p className="text-sm text-gray-600">Completed Tasks</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-orange-600">{tasks.filter(t => !t.completed).length}</p>
                        <p className="text-sm text-gray-600">Pending Tasks</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="interactions" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Add Interaction</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex space-x-2">
                      <Textarea
                        placeholder="Add a note about this lead..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={handleAddNote}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Interaction History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {interactions.map((interaction) => (
                        <div key={interaction.id} className="flex space-x-4 p-4 bg-gray-50 rounded-lg">
                          <div className={`p-2 rounded-full ${
                            interaction.type === 'email' ? 'bg-blue-100' :
                            interaction.type === 'task' ? 'bg-green-100' :
                            interaction.type === 'referral' ? 'bg-orange-100' :
                            'bg-gray-100'
                          }`}>
                            {interaction.type === 'email' ? <Mail className="h-4 w-4" /> :
                             interaction.type === 'task' ? <CheckCircle className="h-4 w-4" /> :
                             interaction.type === 'referral' ? <Share2 className="h-4 w-4" /> :
                             <MessageSquare className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{interaction.message}</p>
                            <p className="text-xs text-gray-500">{formatDate(interaction.timestamp)} • {interaction.user}</p>
                          </div>
                        </div>
                      ))}
                      {interactions.length === 0 && (
                        <p className="text-gray-500 text-center py-8">No interactions yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tasks" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Add Task</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        placeholder="Task title..."
                        value={newTask.title}
                        onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                      />
                      <Input
                        type="date"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                      />
                      <div className="flex space-x-2">
                        <Select value={newTask.priority} onValueChange={(value) => setNewTask({...newTask, priority: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low Priority</SelectItem>
                            <SelectItem value="medium">Medium Priority</SelectItem>
                            <SelectItem value="high">High Priority</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={handleAddTask}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Task List</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {tasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={(e) => {
                                const updatedTasks = tasks.map(t => 
                                  t.id === task.id ? {...t, completed: e.target.checked} : t
                                )
                                setTasks(updatedTasks)
                                customerDatabase.updateLeadTask?.(leadId, task.id, {completed: e.target.checked})
                              }}
                              className="h-4 w-4 text-blue-600"
                            />
                            <div>
                              <p className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {task.title}
                              </p>
                              {task.dueDate && (
                                <p className="text-xs text-gray-500">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                              )}
                            </div>
                          </div>
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </div>
                      ))}
                      {tasks.length === 0 && (
                        <p className="text-gray-500 text-center py-8">No tasks yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="email" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Email Templates</CardTitle>
                    <CardDescription>Choose a template to get started</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {emailTemplates.map((template) => (
                        <Button
                          key={template.id}
                          variant="outline"
                          onClick={() => loadEmailTemplate(template.id)}
                          className="h-auto p-4 text-left"
                        >
                          <div>
                            <p className="font-medium">{template.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{template.subject}</p>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Compose Email</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">To</label>
                      <Input value={lead.email} disabled />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Subject</label>
                      <Input
                        value={emailComposer.subject}
                        onChange={(e) => setEmailComposer({...emailComposer, subject: e.target.value})}
                        placeholder="Email subject..."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Message</label>
                      <Textarea
                        value={emailComposer.body}
                        onChange={(e) => setEmailComposer({...emailComposer, body: e.target.value})}
                        placeholder="Email message..."
                        rows={8}
                      />
                    </div>
                    <Button onClick={handleSendEmail} className="w-full">
                      <Send className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Actions & Status */}
          <div className="space-y-6">
            {/* Status Management */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {['new', 'contacted', 'qualified', 'proposal', 'closed', 'lost'].map((status) => (
                    <Button
                      key={status}
                      variant={lead.status === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChange(status)}
                      className="capitalize"
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" variant="outline">
                  <Phone className="h-4 w-4 mr-2" />
                  Call {lead.name}
                </Button>
                <Button className="w-full" variant="outline" onClick={() => setActiveTab('email')}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                <Button className="w-full" variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send SMS
                </Button>
                <Button className="w-full" variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  Share Property
                </Button>
              </CardContent>
            </Card>

            {/* Broker Referral */}
            <Card>
              <CardHeader>
                <CardTitle>Refer to Broker</CardTitle>
                <CardDescription>Transfer this lead to another broker</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={referralData.brokerId} onValueChange={(value) => setReferralData({...referralData, brokerId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select broker..." />
                  </SelectTrigger>
                  <SelectContent>
                    {brokers.map((broker) => (
                      <SelectItem key={broker.id} value={broker.id}>
                        {broker.name} - {broker.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Commission %"
                  value={referralData.commission}
                  onChange={(e) => setReferralData({...referralData, commission: e.target.value})}
                />
                <Textarea
                  placeholder="Referral notes..."
                  value={referralData.notes}
                  onChange={(e) => setReferralData({...referralData, notes: e.target.value})}
                  rows={3}
                />
                <Button onClick={handleReferToBroker} className="w-full">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Refer Lead
                </Button>
              </CardContent>
            </Card>

            {/* Lead Score */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">85</div>
                  <p className="text-sm text-gray-600">High Quality Lead</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Engagement</span>
                      <span>90%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{width: '90%'}}></div>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Qualification</span>
                      <span>80%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{width: '80%'}}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LeadDetail
