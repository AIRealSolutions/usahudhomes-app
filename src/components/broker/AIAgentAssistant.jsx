import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Bot, Sparkles, Send, Mail, MessageSquare, Share2, Calendar,
  Zap, Target, TrendingUp, Clock, CheckCircle, Play, Pause,
  Home, FileText, Heart, Eye, UserPlus, Facebook, Instagram,
  MessageCircle, Phone, Copy, Wand2
} from 'lucide-react'
import { WORKFLOW_PRESETS, COMMUNICATION_CHANNELS, AI_CAPABILITIES } from '../../data/aiAgentWorkflows'

const AIAgentAssistant = ({ lead, onAction }) => {
  const [activeWorkflow, setActiveWorkflow] = useState(null)
  const [selectedChannel, setSelectedChannel] = useState('email')
  const [showWorkflowModal, setShowWorkflowModal] = useState(false)
  const [showMessageComposer, setShowMessageComposer] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [messageContent, setMessageContent] = useState({
    subject: '',
    body: '',
    channel: 'email'
  })
  const [clientInsights, setClientInsights] = useState(null)
  const [recommendedProperties, setRecommendedProperties] = useState([])

  useEffect(() => {
    // Generate AI insights when component loads
    generateClientInsights()
  }, [lead])

  const generateClientInsights = async () => {
    // Simulate AI analysis
    setClientInsights({
      urgency: determineUrgency(lead),
      budget: estimateBudget(lead),
      preferences: analyzePreferences(lead),
      nextBestAction: suggestNextAction(lead),
      engagementScore: calculateEngagement(lead)
    })
  }

  const determineUrgency = (lead) => {
    // Simple urgency scoring
    const daysOld = Math.floor((new Date() - new Date(lead.createdAt || Date.now())) / (1000 * 60 * 60 * 24))
    if (daysOld < 3) return { level: 'high', label: 'Hot Lead', color: 'red' }
    if (daysOld < 7) return { level: 'medium', label: 'Warm Lead', color: 'orange' }
    return { level: 'low', label: 'Cold Lead', color: 'blue' }
  }

  const estimateBudget = (lead) => {
    // Extract budget from lead data
    const budget = lead.budget || lead.maxPrice || 'Not specified'
    return budget
  }

  const analyzePreferences = (lead) => {
    return {
      location: lead.preferredLocation || lead.city || 'Not specified',
      bedrooms: lead.bedrooms || 'Any',
      propertyType: lead.propertyType || 'Single Family',
      timeline: lead.timeline || 'Not specified'
    }
  }

  const suggestNextAction = (lead) => {
    const daysOld = Math.floor((new Date() - new Date(lead.createdAt || Date.now())) / (1000 * 60 * 60 * 24))
    
    if (daysOld === 0) {
      return {
        action: 'INITIAL_CONTACT',
        title: 'Send Welcome Email',
        description: 'Introduce yourself and schedule discovery call',
        priority: 'high'
      }
    } else if (daysOld < 7 && !lead.propertiesShared) {
      return {
        action: 'PROPERTY_MATCH',
        title: 'Share Property Recommendations',
        description: 'Send 3-5 matching HUD properties',
        priority: 'high'
      }
    } else if (daysOld > 30 && daysOld < 90) {
      return {
        action: 'NURTURE_CAMPAIGN',
        title: 'Re-engage with Market Update',
        description: 'Share local HUD market insights',
        priority: 'medium'
      }
    }
    
    return {
      action: 'FOLLOW_UP',
      title: 'Check-In Follow-Up',
      description: 'Quick text to see if still interested',
      priority: 'medium'
    }
  }

  const calculateEngagement = (lead) => {
    // Calculate engagement score (0-100)
    let score = 50 // Base score
    
    if (lead.emailOpened) score += 10
    if (lead.emailClicked) score += 15
    if (lead.phoneCallCompleted) score += 20
    if (lead.propertyViewed) score += 15
    
    return Math.min(score, 100)
  }

  const startWorkflow = (workflowId) => {
    const workflow = Object.values(WORKFLOW_PRESETS).find(w => w.id === workflowId)
    setActiveWorkflow(workflow)
    setShowWorkflowModal(true)
  }

  const executeWorkflowStep = async (step) => {
    setAiGenerating(true)
    
    // Simulate AI content generation
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const generatedContent = await generateAIContent(step, lead)
    
    setMessageContent({
      subject: generatedContent.subject,
      body: generatedContent.body,
      channel: step.channel || 'email'
    })
    
    setAiGenerating(false)
    setShowMessageComposer(true)
    setShowWorkflowModal(false)
  }

  const generateAIContent = async (step, lead) => {
    // This would call your AI service (OpenAI, etc.)
    // For now, using templates
    
    const clientName = lead.name || lead.firstName || 'there'
    
    const templates = {
      welcome_email: {
        subject: `Welcome to USA HUD Homes, ${clientName}!`,
        body: `Hi ${clientName},\n\nThank you for your interest in HUD properties! I'm excited to help you find your perfect home.\n\nI've reviewed your consultation request and I'd love to schedule a quick 15-minute call to understand your needs better and show you some great HUD properties in your area.\n\nWhen would be a good time for you this week?\n\nBest regards,\n[Your Name]`
      },
      discovery_call_request: {
        subject: `Let's Schedule Your HUD Home Discovery Call`,
        body: `Hi ${clientName},\n\nI wanted to follow up on your interest in HUD properties. I have some exciting options that match what you're looking for!\n\nCould we schedule a brief 15-minute call? I'll share:\n• Current HUD properties in ${lead.city || 'your area'}\n• How the HUD bidding process works\n• Potential savings you could achieve\n\nClick here to book a time that works for you: [Calendar Link]\n\nLooking forward to connecting!\n\n[Your Name]`
      },
      call_reminder_sms: {
        subject: '',
        body: `Hi ${clientName}! Quick reminder about our call today to discuss HUD properties. Looking forward to it! - [Your Name]`
      },
      property_recommendations: {
        subject: `${recommendedProperties.length} Perfect HUD Homes for You!`,
        body: `Hi ${clientName},\n\nGreat news! I found ${recommendedProperties.length} HUD properties that match your criteria:\n\n${recommendedProperties.map((p, i) => `${i + 1}. ${p.address} - ${p.bedrooms}BR/${p.bathrooms}BA - $${p.price.toLocaleString()}`).join('\n')}\n\nThese properties offer significant savings compared to market value. Would you like to schedule showings?\n\nLet me know which ones interest you most!\n\nBest,\n[Your Name]`
      }
    }
    
    return templates[step.template] || {
      subject: `Update from USA HUD Homes`,
      body: `Hi ${clientName},\n\n[AI-generated content will appear here]\n\nBest regards,\n[Your Name]`
    }
  }

  const sendMessage = async () => {
    // Call your email/SMS service
    if (onAction) {
      await onAction('send_message', {
        leadId: lead.id,
        channel: messageContent.channel,
        subject: messageContent.subject,
        body: messageContent.body
      })
    }
    
    setShowMessageComposer(false)
    setMessageContent({ subject: '', body: '', channel: 'email' })
  }

  const getWorkflowIcon = (iconName) => {
    const icons = {
      UserPlus,
      Home,
      Calendar,
      Eye,
      FileText,
      Heart
    }
    return icons[iconName] || Bot
  }

  return (
    <div className="space-y-4">
      {/* AI Insights Card */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-600" />
            AI Agent Assistant
            <Badge variant="secondary" className="ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              Powered by AI
            </Badge>
          </CardTitle>
          <CardDescription>
            Smart workflows and insights to help you close this lead faster
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Client Insights */}
          {clientInsights && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-xs text-gray-500 mb-1">Urgency</div>
                <Badge variant={clientInsights.urgency.color === 'red' ? 'destructive' : 'secondary'}>
                  {clientInsights.urgency.label}
                </Badge>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-xs text-gray-500 mb-1">Budget</div>
                <div className="font-semibold text-sm">
                  {typeof clientInsights.budget === 'number' 
                    ? `$${clientInsights.budget.toLocaleString()}` 
                    : clientInsights.budget}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-xs text-gray-500 mb-1">Engagement</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${clientInsights.engagementScore}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{clientInsights.engagementScore}%</span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-xs text-gray-500 mb-1">Timeline</div>
                <div className="font-semibold text-sm">{clientInsights.preferences.timeline}</div>
              </div>
            </div>
          )}

          {/* Next Best Action */}
          {clientInsights?.nextBestAction && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-blue-900 mb-1">
                    Recommended Next Step
                  </div>
                  <div className="text-sm text-blue-800 mb-2">
                    {clientInsights.nextBestAction.description}
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => startWorkflow(clientInsights.nextBestAction.action)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {clientInsights.nextBestAction.title}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMessageComposer(true)}
              className="justify-start"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              AI Compose Message
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startWorkflow('PROPERTY_MATCH')}
              className="justify-start"
            >
              <Home className="w-4 h-4 mr-2" />
              Share Properties
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workflow Presets</CardTitle>
          <CardDescription>
            Pre-configured workflows for common scenarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.values(WORKFLOW_PRESETS).map((workflow) => {
              const Icon = getWorkflowIcon(workflow.icon)
              return (
                <Button
                  key={workflow.id}
                  variant="outline"
                  className="h-auto flex-col items-start p-4 hover:border-purple-300 hover:bg-purple-50"
                  onClick={() => startWorkflow(workflow.id)}
                >
                  <Icon className="w-5 h-5 mb-2 text-purple-600" />
                  <div className="font-semibold text-sm text-left">{workflow.name}</div>
                  <div className="text-xs text-gray-500 text-left mt-1">
                    {workflow.steps.length} steps
                  </div>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Workflow Modal */}
      <Dialog open={showWorkflowModal} onOpenChange={setShowWorkflowModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeWorkflow && React.createElement(getWorkflowIcon(activeWorkflow.icon), { className: "w-5 h-5" })}
              {activeWorkflow?.name}
            </DialogTitle>
            <DialogDescription>
              {activeWorkflow?.description}
            </DialogDescription>
          </DialogHeader>
          
          {activeWorkflow && (
            <div className="space-y-4 py-4">
              {activeWorkflow.steps.map((step, index) => (
                <div key={step.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold mb-1">{step.title}</div>
                    <div className="text-sm text-gray-600 mb-2">{step.description}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {COMMUNICATION_CHANNELS[step.channel?.toUpperCase()]?.name || 'Action'}
                      </Badge>
                      {step.delay && (
                        <span className="text-xs text-gray-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {step.delay < 24 ? `${step.delay}h` : `${Math.floor(step.delay / 24)}d`} delay
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => executeWorkflowStep(step)}
                    disabled={aiGenerating}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Execute
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWorkflowModal(false)}>
              Close
            </Button>
            <Button onClick={() => {
              // Execute all steps
              alert('Full workflow automation coming soon!')
            }}>
              <Zap className="w-4 h-4 mr-2" />
              Automate Entire Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Composer Modal */}
      <Dialog open={showMessageComposer} onOpenChange={setShowMessageComposer}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              AI Message Composer
              {aiGenerating && (
                <Badge variant="secondary" className="ml-auto">
                  <Sparkles className="w-3 h-3 mr-1 animate-pulse" />
                  Generating...
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              AI-powered message generation for {lead?.name || 'client'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Channel Selection */}
            <div className="space-y-2">
              <Label>Communication Channel</Label>
              <Select value={messageContent.channel} onValueChange={(value) => setMessageContent({...messageContent, channel: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(COMMUNICATION_CHANNELS).map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject (for email) */}
            {messageContent.channel === 'email' && (
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={messageContent.subject}
                  onChange={(e) => setMessageContent({...messageContent, subject: e.target.value})}
                  placeholder="Email subject..."
                />
              </div>
            )}

            {/* Message Body */}
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={messageContent.body}
                onChange={(e) => setMessageContent({...messageContent, body: e.target.value})}
                placeholder="Type your message or let AI generate it..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            {/* AI Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setAiGenerating(true)
                  await new Promise(resolve => setTimeout(resolve, 1500))
                  // Regenerate content
                  setAiGenerating(false)
                }}
                disabled={aiGenerating}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Regenerate with AI
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Make it more professional
                  setMessageContent({
                    ...messageContent,
                    body: messageContent.body + '\n\n[AI will enhance this to be more professional]'
                  })
                }}
              >
                Make More Professional
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Make it shorter
                  setMessageContent({
                    ...messageContent,
                    body: messageContent.body.substring(0, 160) + '...'
                  })
                }}
              >
                Make Shorter
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageComposer(false)}>
              Cancel
            </Button>
            <Button onClick={sendMessage} disabled={!messageContent.body.trim()}>
              <Send className="w-4 h-4 mr-2" />
              Send {messageContent.channel === 'email' ? 'Email' : 'Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AIAgentAssistant
