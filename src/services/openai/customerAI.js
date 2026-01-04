import OpenAI from 'openai'
import { propertyService, consultationService, eventService } from '../database'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})

/**
 * Customer Management AI Service
 * Uses OpenAI to help manage customer interactions and recommend properties
 */
export const customerAI = {
  /**
   * Analyze customer and recommend matching properties
   */
  async recommendProperties(customer, allProperties) {
    try {
      // Get customer's consultation history
      const consultations = await consultationService.getAllConsultations({
        customerId: customer.id
      })

      // Build customer profile
      const customerProfile = {
        name: `${customer.first_name} ${customer.last_name}`,
        state: customer.state,
        budget: customer.budget || 'Not specified',
        preferences: customer.preferences || 'Not specified',
        consultationHistory: consultations.data?.map(c => ({
          property: c.property?.address || 'N/A',
          type: c.consultation_type,
          status: c.status,
          message: c.message
        })) || []
      }

      const prompt = `You are a real estate AI assistant analyzing a customer to recommend matching HUD home properties.

Customer Profile:
- Name: ${customerProfile.name}
- Location: ${customerProfile.state}
- Budget: ${customerProfile.budget}
- Preferences: ${customerProfile.preferences}
- Previous Consultations: ${customerProfile.consultationHistory.length} consultations

Consultation History:
${customerProfile.consultationHistory.map((c, i) => 
  `${i + 1}. ${c.property} - ${c.type} consultation (${c.status})${c.message ? ': ' + c.message : ''}`
).join('\n')}

Available Properties (${allProperties.length} total):
${allProperties.slice(0, 20).map(p => 
  `- ${p.address}, ${p.city}, ${p.state} | $${p.price?.toLocaleString()} | ${p.bedrooms}bed/${p.bathrooms}bath | ${p.sqft}sqft | Case: ${p.case_number}`
).join('\n')}
${allProperties.length > 20 ? `\n... and ${allProperties.length - 20} more properties` : ''}

Task: Analyze this customer's profile and consultation history to recommend the TOP 5 most suitable properties from the list.

For each recommendation, provide:
1. Property case number
2. Match score (1-10)
3. Why it matches (2-3 sentences)
4. Talking points for the agent (what to emphasize)

Format as JSON array:
[
  {
    "caseNumber": "xxx-xxxxxx",
    "matchScore": 9,
    "reason": "Why this property matches...",
    "talkingPoints": ["Point 1", "Point 2", "Point 3"]
  }
]

Consider:
- Location preferences (same state, nearby states)
- Budget constraints
- Property features mentioned in consultations
- Consultation patterns (what types of properties they've shown interest in)
- Property status (prefer BIDS OPEN or EXTENDED)
- Value for money`

      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert real estate AI assistant specializing in matching customers with HUD homes. You analyze customer preferences, history, and behavior to recommend the most suitable properties.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })

      const content = response.choices[0].message.content
      
      // Try to parse JSON response
      try {
        const recommendations = JSON.parse(content)
        return {
          success: true,
          recommendations,
          usage: response.usage
        }
      } catch {
        // If not JSON, return as text
        return {
          success: true,
          content,
          usage: response.usage
        }
      }
    } catch (error) {
      console.error('Error recommending properties:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Generate personalized email for customer
   */
  async generateCustomerEmail(customer, purpose, context = {}) {
    const purposes = {
      welcome: 'Welcome new customer and introduce services',
      followup: 'Follow up on consultation or property inquiry',
      recommendation: 'Recommend properties based on their preferences',
      update: 'Update customer on property status or new listings',
      reengagement: 'Re-engage inactive customer'
    }

    const prompt = `Generate a personalized email for this customer:

Customer: ${customer.first_name} ${customer.last_name}
Email: ${customer.email}
Location: ${customer.state}
Status: ${customer.status}
Lead Source: ${customer.lead_source}

Purpose: ${purposes[purpose] || purpose}

${context.properties ? `\nRecommended Properties:\n${context.properties.map(p => 
  `- ${p.address}, ${p.city}, ${p.state} - $${p.price?.toLocaleString()}`
).join('\n')}` : ''}

${context.consultation ? `\nRecent Consultation:\n- Type: ${context.consultation.consultation_type}\n- Status: ${context.consultation.status}\n- Message: ${context.consultation.message}` : ''}

${context.additionalInfo ? `\nAdditional Context:\n${context.additionalInfo}` : ''}

Write a professional, personalized email that:
1. Addresses the customer by first name
2. References their specific situation/interests
3. Provides value (information, recommendations, updates)
4. Has a clear call-to-action
5. Is warm and conversational but professional
6. Is 150-250 words

Include:
- Subject line
- Email body
- Signature (from USAHUDhomes.com team)`

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional real estate customer service specialist. You write personalized, engaging emails that build relationships and drive action.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 600
      })

      return {
        success: true,
        content: response.choices[0].message.content,
        purpose,
        usage: response.usage
      }
    } catch (error) {
      console.error('Error generating customer email:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Generate personalized SMS for customer
   */
  async generateCustomerSMS(customer, purpose, context = {}) {
    const prompt = `Generate a personalized SMS text message for this customer:

Customer: ${customer.first_name} ${customer.last_name}
Phone: ${customer.phone}
Location: ${customer.state}

Purpose: ${purpose}

${context.property ? `\nProperty: ${context.property.address}, ${context.property.city} - $${context.property.price?.toLocaleString()}` : ''}

${context.message ? `\nContext: ${context.message}` : ''}

Write a brief, personalized SMS (160 characters max) that:
1. Uses first name
2. Is conversational and friendly
3. Has clear value
4. Includes call-to-action
5. Feels personal, not automated

Just return the SMS text, no labels.`

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a real estate SMS specialist. You write brief, personal text messages that feel human and drive engagement.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 100
      })

      return {
        success: true,
        content: response.choices[0].message.content,
        purpose,
        usage: response.usage
      }
    } catch (error) {
      console.error('Error generating customer SMS:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Chat with customer management AI
   */
  async chat(customer, messages, context = {}) {
    // Get customer events for context
    const events = context.events || []
    const consultations = context.consultations || []

    const systemPrompt = `You are a professional customer relationship management AI assistant for USAHUDhomes.com. You help agents manage customer relationships, recommend properties, and improve customer engagement.

Current Customer:
- Name: ${customer.first_name} ${customer.last_name}
- Email: ${customer.email}
- Phone: ${customer.phone}
- Location: ${customer.state}
- Status: ${customer.status}
- Lead Source: ${customer.lead_source}
- Created: ${new Date(customer.created_at).toLocaleDateString()}

Customer Activity:
- Total Events: ${events.length}
- Consultations: ${consultations.length}
- Last Contact: ${events[0]?.created_at ? new Date(events[0].created_at).toLocaleDateString() : 'Never'}

Recent Activity:
${events.slice(0, 5).map(e => 
  `- ${e.event_type}: ${e.event_data?.subject || e.event_data?.outcome || 'Activity logged'}`
).join('\n') || '- No recent activity'}

You can help with:
- Analyzing customer behavior and preferences
- Recommending properties that match their needs
- Generating personalized emails and SMS messages
- Suggesting follow-up strategies
- Identifying engagement opportunities
- Answering questions about customer management
- Providing insights on customer journey

Be helpful, professional, and action-oriented. Provide specific, actionable recommendations.`

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 800
      })

      return {
        success: true,
        message: response.choices[0].message,
        usage: response.usage
      }
    } catch (error) {
      console.error('Error in customer AI chat:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Analyze customer engagement and suggest next steps
   */
  async analyzeCustomer(customer, events, consultations) {
    const prompt = `Analyze this customer and suggest next steps:

Customer: ${customer.first_name} ${customer.last_name}
Status: ${customer.status}
Lead Source: ${customer.lead_source}
Created: ${new Date(customer.created_at).toLocaleDateString()}

Activity Summary:
- Total Events: ${events.length}
- Emails Sent: ${events.filter(e => e.event_type === 'email_sent').length}
- SMS Sent: ${events.filter(e => e.event_type === 'sms_sent').length}
- Calls Made: ${events.filter(e => e.event_type === 'call_made').length}
- Consultations: ${consultations.length}

Recent Events:
${events.slice(0, 10).map(e => 
  `- ${new Date(e.created_at).toLocaleDateString()}: ${e.event_type}`
).join('\n') || '- No events yet'}

Consultations:
${consultations.map(c => 
  `- ${c.consultation_type} (${c.status}): ${c.message || 'No message'}`
).join('\n') || '- No consultations yet'}

Provide:
1. Engagement Level (Low/Medium/High)
2. Customer Stage (New Lead / Interested / Engaged / Hot Lead / Cold)
3. Next Best Action (specific recommendation)
4. Recommended Timeline (when to take action)
5. Key Insights (2-3 observations)

Format as JSON:
{
  "engagementLevel": "...",
  "customerStage": "...",
  "nextBestAction": "...",
  "recommendedTimeline": "...",
  "insights": ["...", "...", "..."]
}`

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a customer analytics expert. You analyze customer behavior and provide actionable insights for sales teams.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 500
      })

      const content = response.choices[0].message.content
      
      try {
        const analysis = JSON.parse(content)
        return {
          success: true,
          analysis,
          usage: response.usage
        }
      } catch {
        return {
          success: true,
          content,
          usage: response.usage
        }
      }
    } catch (error) {
      console.error('Error analyzing customer:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export default customerAI
