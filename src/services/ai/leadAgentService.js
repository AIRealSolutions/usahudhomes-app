/**
 * AI Lead Agent Service
 * Analyzes leads and extracts key facts, needs, and insights
 */

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

class LeadAgentService {
  /**
   * Analyze a lead and extract key information
   * @param {Object} leadData - Lead information
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeLead(leadData) {
    try {
      const prompt = this.buildAnalysisPrompt(leadData)
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert real estate lead analyst. Your job is to analyze incoming leads and extract key facts, needs, urgency, and provide actionable insights for assignment to the right broker.

Analyze the lead data and provide:
1. Key Facts - Important details about the lead
2. Needs & Requirements - What they're looking for
3. Urgency Level - How quickly they need to act
4. Budget Assessment - Their financial capacity
5. Location Preferences - Where they want to buy
6. Red Flags - Any concerns or issues
7. Recommended Actions - What to do next
8. Broker Match Criteria - What type of broker would be best

Be concise, actionable, and highlight the most important information.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })

      const analysis = completion.choices[0].message.content
      
      // Parse the analysis into structured format
      const structured = this.parseAnalysis(analysis)
      
      return {
        success: true,
        data: {
          raw_analysis: analysis,
          ...structured,
          analyzed_at: new Date().toISOString(),
          model: 'gpt-4.1-mini'
        }
      }
    } catch (error) {
      console.error('Error analyzing lead:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * Build analysis prompt from lead data
   * @param {Object} leadData - Lead information
   * @returns {string} Formatted prompt
   */
  buildAnalysisPrompt(leadData) {
    const parts = []
    
    parts.push(`**Lead Information:**`)
    parts.push(`Name: ${leadData.first_name} ${leadData.last_name}`)
    
    if (leadData.email) parts.push(`Email: ${leadData.email}`)
    if (leadData.phone) parts.push(`Phone: ${leadData.phone}`)
    
    if (leadData.budget_min || leadData.budget_max) {
      const budgetStr = leadData.budget_min && leadData.budget_max
        ? `$${leadData.budget_min.toLocaleString()} - $${leadData.budget_max.toLocaleString()}`
        : leadData.budget_min
        ? `$${leadData.budget_min.toLocaleString()}+`
        : leadData.budget_max
        ? `Up to $${leadData.budget_max.toLocaleString()}`
        : 'Not specified'
      parts.push(`Budget: ${budgetStr}`)
    }
    
    if (leadData.preferred_location) {
      parts.push(`Location: ${leadData.preferred_location}${leadData.state ? ', ' + leadData.state : ''}`)
    }
    
    if (leadData.timeline) {
      parts.push(`Timeline: ${leadData.timeline}`)
    }
    
    if (leadData.source) {
      parts.push(`Source: ${leadData.source}`)
    }
    
    if (leadData.notes) {
      parts.push(`\n**Additional Notes:**`)
      parts.push(leadData.notes)
    }
    
    if (leadData.source_details) {
      parts.push(`\n**Source Details:**`)
      if (leadData.source_details.campaign_name) {
        parts.push(`Campaign: ${leadData.source_details.campaign_name}`)
      }
      if (leadData.source_details.platform) {
        parts.push(`Platform: ${leadData.source_details.platform === 'ig' ? 'Instagram' : 'Facebook'}`)
      }
      if (leadData.source_details.raw_budget) {
        parts.push(`Original Budget Response: "${leadData.source_details.raw_budget}"`)
      }
      if (leadData.source_details.raw_location) {
        parts.push(`Original Location Response: "${leadData.source_details.raw_location}"`)
      }
      if (leadData.source_details.raw_timeline) {
        parts.push(`Original Timeline Response: "${leadData.source_details.raw_timeline}"`)
      }
    }
    
    parts.push(`\n**Task:**`)
    parts.push(`Analyze this lead and provide actionable insights for assignment to the right broker.`)
    
    return parts.join('\n')
  }

  /**
   * Parse AI analysis into structured format
   * @param {string} analysis - Raw AI analysis text
   * @returns {Object} Structured analysis
   */
  parseAnalysis(analysis) {
    const structured = {
      key_facts: [],
      needs: [],
      urgency: 'medium',
      budget_assessment: '',
      location_preferences: '',
      red_flags: [],
      recommended_actions: [],
      broker_criteria: []
    }

    try {
      // Extract sections using regex
      const sections = {
        'Key Facts': /(?:Key Facts|Important Details)[:\s]*\n([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i,
        'Needs': /(?:Needs|Requirements)[:\s]*\n([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i,
        'Urgency': /(?:Urgency|Timeline)[:\s]*\n?([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i,
        'Budget': /(?:Budget Assessment|Financial)[:\s]*\n?([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i,
        'Location': /(?:Location Preferences|Area)[:\s]*\n?([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i,
        'Red Flags': /(?:Red Flags|Concerns|Issues)[:\s]*\n([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i,
        'Actions': /(?:Recommended Actions|Next Steps)[:\s]*\n([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i,
        'Broker': /(?:Broker Match|Broker Criteria)[:\s]*\n([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i
      }

      // Extract key facts
      const keyFactsMatch = analysis.match(sections['Key Facts'])
      if (keyFactsMatch) {
        structured.key_facts = this.extractBulletPoints(keyFactsMatch[1])
      }

      // Extract needs
      const needsMatch = analysis.match(sections['Needs'])
      if (needsMatch) {
        structured.needs = this.extractBulletPoints(needsMatch[1])
      }

      // Extract urgency
      const urgencyMatch = analysis.match(sections['Urgency'])
      if (urgencyMatch) {
        const urgencyText = urgencyMatch[1].toLowerCase()
        if (urgencyText.includes('high') || urgencyText.includes('urgent') || urgencyText.includes('asap')) {
          structured.urgency = 'high'
        } else if (urgencyText.includes('low') || urgencyText.includes('flexible')) {
          structured.urgency = 'low'
        }
      }

      // Extract budget assessment
      const budgetMatch = analysis.match(sections['Budget'])
      if (budgetMatch) {
        structured.budget_assessment = budgetMatch[1].trim()
      }

      // Extract location preferences
      const locationMatch = analysis.match(sections['Location'])
      if (locationMatch) {
        structured.location_preferences = locationMatch[1].trim()
      }

      // Extract red flags
      const redFlagsMatch = analysis.match(sections['Red Flags'])
      if (redFlagsMatch) {
        structured.red_flags = this.extractBulletPoints(redFlagsMatch[1])
      }

      // Extract recommended actions
      const actionsMatch = analysis.match(sections['Actions'])
      if (actionsMatch) {
        structured.recommended_actions = this.extractBulletPoints(actionsMatch[1])
      }

      // Extract broker criteria
      const brokerMatch = analysis.match(sections['Broker'])
      if (brokerMatch) {
        structured.broker_criteria = this.extractBulletPoints(brokerMatch[1])
      }

    } catch (error) {
      console.error('Error parsing analysis:', error)
    }

    return structured
  }

  /**
   * Extract bullet points from text
   * @param {string} text - Text containing bullet points
   * @returns {Array<string>} Array of bullet points
   */
  extractBulletPoints(text) {
    const lines = text.split('\n')
    const points = []
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      
      // Remove bullet markers (-, *, •, numbers)
      const cleaned = trimmed
        .replace(/^[-*•]\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .trim()
      
      if (cleaned && cleaned.length > 3) {
        points.push(cleaned)
      }
    }
    
    return points
  }

  /**
   * Suggest broker match based on lead analysis
   * @param {Object} analysis - Lead analysis
   * @param {Array} agents - Available agents
   * @returns {Object} Suggested agent with reasoning
   */
  suggestBrokerMatch(analysis, agents) {
    // This is a simple matching algorithm
    // Can be enhanced with more sophisticated AI matching
    
    const scores = agents.map(agent => {
      let score = 0
      
      // Match by state coverage
      if (analysis.location_preferences && agent.states_covered) {
        const state = analysis.location_preferences.match(/\b[A-Z]{2}\b/)?.[0]
        if (state && agent.states_covered.includes(state)) {
          score += 3
        }
      }
      
      // Match by specialties
      if (analysis.broker_criteria && agent.specialties) {
        const criteriaLower = analysis.broker_criteria.join(' ').toLowerCase()
        for (const specialty of agent.specialties) {
          if (criteriaLower.includes(specialty.toLowerCase())) {
            score += 2
          }
        }
      }
      
      // Prefer agents with lower current workload
      score += (10 - (agent.total_listings || 0)) * 0.1
      
      return { agent, score }
    })
    
    // Sort by score descending
    scores.sort((a, b) => b.score - a.score)
    
    const best = scores[0]
    
    return {
      agent: best.agent,
      confidence: best.score > 5 ? 'high' : best.score > 2 ? 'medium' : 'low',
      reasoning: this.buildMatchReasoning(best.agent, analysis)
    }
  }

  /**
   * Build reasoning for broker match
   * @param {Object} agent - Selected agent
   * @param {Object} analysis - Lead analysis
   * @returns {string} Reasoning text
   */
  buildMatchReasoning(agent, analysis) {
    const reasons = []
    
    if (agent.states_covered && agent.states_covered.length > 0) {
      reasons.push(`Covers ${agent.states_covered.join(', ')}`)
    }
    
    if (agent.specialties && agent.specialties.length > 0) {
      reasons.push(`Specializes in ${agent.specialties.join(', ')}`)
    }
    
    if (agent.years_experience) {
      reasons.push(`${agent.years_experience} years of experience`)
    }
    
    return reasons.join('. ')
  }
}

export const leadAgentService = new LeadAgentService()
export default leadAgentService
