import React, { useState, useRef, useEffect } from 'react'
import { marketingAI } from '../../services/openai/marketingAI'
import { 
  Sparkles, 
  Send, 
  Copy, 
  Check,
  Loader2,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  FileText,
  Search,
  Zap
} from 'lucide-react'

function AIMarketingAssistant({ property }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm your AI marketing assistant. I can help you create compelling marketing content for ${property.address}. What would you like to create today?`
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [customerContext, setCustomerContext] = useState(null)
  const [loadingContext, setLoadingContext] = useState(true)
  const messagesEndRef = useRef(null)

  // Load customer context on mount
  useEffect(() => {
    async function loadCustomerContext() {
      setLoadingContext(true)
      const context = await marketingAI.getCustomerContext(property)
      setCustomerContext(context)
      setLoadingContext(false)
      
      // Update welcome message with customer insights
      if (context.success && context.insights && context.insights.totalInterested > 0) {
        setMessages([{
          role: 'assistant',
          content: `Hi! I'm your AI marketing assistant. I can help you create compelling marketing content for ${property.address}.\n\n📊 **Customer Interest**: ${context.insights.totalInterested} people have shown interest in this property! I can use this data to create personalized, targeted marketing content. What would you like to create today?`
        }])
      }
    }
    loadCustomerContext()
  }, [property])

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
      const result = await marketingAI.chat(property, [...messages, userMessage], customerContext)
      
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
        case 'facebook':
          result = await marketingAI.generateSocialPost(property, 'facebook', customerContext)
          break
        case 'twitter':
          result = await marketingAI.generateSocialPost(property, 'twitter', customerContext)
          break
        case 'linkedin':
          result = await marketingAI.generateSocialPost(property, 'linkedin', customerContext)
          break
        case 'email':
          result = await marketingAI.generateSocialPost(property, 'email', customerContext)
          break
        case 'description':
          result = await marketingAI.generateDescription(property, 'standard')
          break
        case 'seo':
          result = await marketingAI.generateSEO(property)
          break
        case 'campaign':
          result = await marketingAI.generateCampaign(property, 'comprehensive')
          break
        default:
          return
      }

      if (result.success) {
        const content = result.content || JSON.stringify(result.data, null, 2)
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

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const quickActions = [
    { id: 'facebook', icon: Facebook, label: 'Facebook Post', color: 'bg-blue-600 hover:bg-blue-700' },
    { id: 'twitter', icon: Twitter, label: 'Twitter Post', color: 'bg-sky-500 hover:bg-sky-600' },
    { id: 'linkedin', icon: Linkedin, label: 'LinkedIn Post', color: 'bg-blue-700 hover:bg-blue-800' },
    { id: 'email', icon: Mail, label: 'Email Content', color: 'bg-gray-600 hover:bg-gray-700' },
    { id: 'description', icon: FileText, label: 'Description', color: 'bg-green-600 hover:bg-green-700' },
    { id: 'seo', icon: Search, label: 'SEO Content', color: 'bg-purple-600 hover:bg-purple-700' },
    { id: 'campaign', icon: Zap, label: 'Full Campaign', color: 'bg-orange-600 hover:bg-orange-700' }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Marketing Assistant</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Generate marketing content, get strategy advice, and optimize your listings
        </p>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <p className="text-xs font-medium text-gray-700 mb-2">Quick Actions:</p>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action.id)}
              disabled={loading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors ${action.color} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <action.icon className="h-3.5 w-3.5" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
              {message.role === 'assistant' && (
                <button
                  onClick={() => copyToClipboard(message.content, index)}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me to create marketing content, give advice, or answer questions..."
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: Try asking "Create a Facebook post" or "Generate a property description"
        </p>
      </div>
    </div>
  )
}

export default AIMarketingAssistant
