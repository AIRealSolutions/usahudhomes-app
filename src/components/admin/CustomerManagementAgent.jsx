import React, { useState, useEffect, useRef } from 'react'
import { customerAI } from '../../services/openai/customerAI'
import { propertyService } from '../../services/database'
import { 
  Bot, 
  Send, 
  Copy, 
  Check,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Sparkles,
  Target,
  TrendingUp,
  Home
} from 'lucide-react'

function CustomerManagementAgent({ customer, events, consultations }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm your AI customer management assistant for ${customer.first_name} ${customer.last_name}. I can help you:\n\n• 🎯 Find matching properties\n• ✉️ Generate personalized emails\n• 💬 Create SMS messages\n• 📊 Analyze customer engagement\n• 💡 Suggest next steps\n\nWhat would you like to do?`
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const result = await customerAI.chat(
        customer, 
        [...messages, userMessage],
        { events, consultations }
      )
      
      if (result.success) {
        setMessages(prev => [...prev, result.message])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${result.error}. Please try again.`
        }])
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.'
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAction = async (action) => {
    setLoading(true)
    let result

    try {
      switch (action) {
        case 'recommend':
          await handleRecommendProperties()
          setLoading(false)
          return
        
        case 'email_welcome':
          result = await customerAI.generateCustomerEmail(customer, 'welcome')
          break
        
        case 'email_followup':
          result = await customerAI.generateCustomerEmail(customer, 'followup', {
            consultation: consultations[0]
          })
          break
        
        case 'sms':
          result = await customerAI.generateCustomerSMS(customer, 'followup')
          break
        
        case 'analyze':
          result = await customerAI.analyzeCustomer(customer, events, consultations)
          break
        
        default:
          setLoading(false)
          return
      }

      if (result.success) {
        const content = result.content || JSON.stringify(result.analysis, null, 2)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: content
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${result.error}`
        }])
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.'
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleRecommendProperties = async () => {
    setLoadingRecommendations(true)
    
    try {
      // Get all properties
      const propertiesResult = await propertyService.getAllProperties()
      const allProperties = propertiesResult.data || []
      
      // Get recommendations from AI
      const result = await customerAI.recommendProperties(customer, allProperties)
      
      if (result.success && result.recommendations) {
        setRecommendations(result.recommendations)
        
        // Add message with recommendations
        const recommendationText = `🎯 **Top Property Recommendations for ${customer.first_name}:**\n\n${
          result.recommendations.map((rec, i) => {
            const property = allProperties.find(p => p.case_number === rec.caseNumber)
            return `**${i + 1}. ${property?.address || rec.caseNumber}** (Match Score: ${rec.matchScore}/10)\n${property ? `   ${property.city}, ${property.state} - $${property.price?.toLocaleString()}\n` : ''}   ${rec.reason}\n\n   **Talking Points:**\n${rec.talkingPoints.map(tp => `   • ${tp}`).join('\n')}`
          }).join('\n\n')
        }`
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: recommendationText
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.content || 'I analyzed the properties but couldn\'t generate structured recommendations. Please try again.'
        }])
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I couldn\'t analyze properties right now. Please try again.'
      }])
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-teal-600 p-4">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">Customer Management AI</h3>
            <p className="text-white/90 text-sm">Personalized customer engagement assistant</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <p className="text-sm text-gray-600 mb-3 font-medium">Quick Actions:</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <button
            onClick={() => handleQuickAction('recommend')}
            disabled={loading || loadingRecommendations}
            className="flex items-center justify-center space-x-2 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loadingRecommendations ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Home className="w-4 h-4" />
            )}
            <span>Find Properties</span>
          </button>
          
          <button
            onClick={() => handleQuickAction('email_welcome')}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Mail className="w-4 h-4" />
            <span>Welcome Email</span>
          </button>
          
          <button
            onClick={() => handleQuickAction('email_followup')}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Mail className="w-4 h-4" />
            <span>Follow-up Email</span>
          </button>
          
          <button
            onClick={() => handleQuickAction('sms')}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <MessageSquare className="w-4 h-4" />
            <span>SMS Message</span>
          </button>
          
          <button
            onClick={() => handleQuickAction('analyze')}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Analyze Customer</span>
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-green-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              {message.role === 'assistant' && (
                <button
                  onClick={() => copyToClipboard(message.content, index)}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <Loader2 className="w-5 h-5 animate-spin text-green-500" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to help with customer engagement, send emails, or find properties..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: Ask me to "find matching properties" or "write a follow-up email"
        </p>
      </div>
    </div>
  )
}

export default CustomerManagementAgent
