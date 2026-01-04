import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // For client-side usage in development
})

/**
 * Marketing AI Service
 * Uses OpenAI to generate marketing content for properties
 */
export const marketingAI = {
  /**
   * Generate platform-specific social media post
   */
  async generateSocialPost(property, platform) {
    const platformGuidelines = {
      facebook: {
        maxLength: 500,
        tone: 'friendly and engaging',
        features: 'Use emojis, ask questions, encourage sharing',
        callToAction: 'Learn more or schedule a showing'
      },
      twitter: {
        maxLength: 280,
        tone: 'concise and punchy',
        features: 'Use hashtags, keep it brief, include key details',
        callToAction: 'Click to view details'
      },
      linkedin: {
        maxLength: 700,
        tone: 'professional and informative',
        features: 'Focus on investment opportunity, market data, ROI potential',
        callToAction: 'Contact us for more information'
      },
      email: {
        maxLength: 1000,
        tone: 'professional yet warm',
        features: 'Include all details, structured format, clear sections',
        callToAction: 'Schedule a consultation or request more information'
      }
    }

    const guidelines = platformGuidelines[platform] || platformGuidelines.facebook

    const prompt = `Generate a ${platform} post for this HUD home property:

Property Details:
- Address: ${property.address}, ${property.city}, ${property.state}
- Case Number: ${property.case_number}
- Price: $${property.price?.toLocaleString()}
- Bedrooms: ${property.bedrooms || 'N/A'}
- Bathrooms: ${property.bathrooms || 'N/A'}
- Square Feet: ${property.sqft?.toLocaleString() || 'N/A'}
- Year Built: ${property.yearBuilt || 'N/A'}
- Status: ${property.status}
- County: ${property.county || 'N/A'}
- FHA Insurable: ${property.fhaInsurable ? 'Yes' : 'No'}

Platform Guidelines:
- Maximum length: ${guidelines.maxLength} characters
- Tone: ${guidelines.tone}
- Features: ${guidelines.features}
- Call to action: ${guidelines.callToAction}

Generate an engaging ${platform} post that highlights the property's best features and encourages potential buyers to take action. Include relevant details and make it compelling.`

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional real estate marketing expert specializing in HUD homes and government foreclosures. You create compelling, accurate, and platform-optimized marketing content.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })

      return {
        success: true,
        content: response.choices[0].message.content,
        platform,
        usage: response.usage
      }
    } catch (error) {
      console.error('OpenAI API error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Generate property description
   */
  async generateDescription(property, style = 'standard') {
    const stylePrompts = {
      standard: 'professional and informative',
      luxury: 'upscale and sophisticated',
      family: 'warm and family-focused',
      investor: 'ROI-focused and analytical'
    }

    const prompt = `Write a compelling property description for this HUD home:

Property Details:
- Address: ${property.address}, ${property.city}, ${property.state}
- Price: $${property.price?.toLocaleString()}
- Bedrooms: ${property.bedrooms || 'N/A'}
- Bathrooms: ${property.bathrooms || 'N/A'}
- Square Feet: ${property.sqft?.toLocaleString() || 'N/A'}
- Year Built: ${property.yearBuilt || 'N/A'}
- County: ${property.county || 'N/A'}
- Lot Size: ${property.lotSize || 'N/A'}

Style: ${stylePrompts[style] || stylePrompts.standard}

Write a 150-200 word description that:
1. Highlights the property's best features
2. Mentions the HUD opportunity and potential savings
3. Describes the location and neighborhood
4. Creates urgency and excitement
5. Includes a call to action

Make it engaging and persuasive while remaining factual and professional.`

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional real estate copywriter specializing in HUD homes. You write compelling, accurate property descriptions that convert browsers into buyers.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 400
      })

      return {
        success: true,
        content: response.choices[0].message.content,
        style,
        usage: response.usage
      }
    } catch (error) {
      console.error('OpenAI API error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Generate SEO-optimized content
   */
  async generateSEO(property) {
    const prompt = `Generate SEO-optimized content for this HUD home property:

Property: ${property.address}, ${property.city}, ${property.state}
Price: $${property.price?.toLocaleString()}
Case Number: ${property.case_number}

Generate:
1. SEO Title (60 characters max)
2. Meta Description (155 characters max)
3. 5 relevant keywords
4. H1 heading
5. 3 H2 subheadings for content sections

Focus on:
- HUD homes, government foreclosures
- Location-specific keywords (${property.city}, ${property.state}, ${property.county})
- Property features
- Affordability and opportunity

Format as JSON.`

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an SEO expert specializing in real estate. You create optimized content that ranks well in search engines while remaining natural and user-friendly.'
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
      // Try to parse as JSON, fallback to text if it fails
      try {
        const seoData = JSON.parse(content)
        return {
          success: true,
          data: seoData,
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
      console.error('OpenAI API error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Chat with AI assistant about property marketing
   */
  async chat(property, messages) {
    const systemPrompt = `You are a professional real estate marketing assistant specializing in HUD homes and government foreclosures. You help agents and brokers create effective marketing content, answer questions about property marketing strategies, and provide expert advice.

Current Property Context:
- Address: ${property.address}, ${property.city}, ${property.state}
- Case Number: ${property.case_number}
- Price: $${property.price?.toLocaleString()}
- Bedrooms: ${property.bedrooms || 'N/A'}
- Bathrooms: ${property.bathrooms || 'N/A'}
- Square Feet: ${property.sqft?.toLocaleString() || 'N/A'}
- Status: ${property.status}

You can help with:
- Generating social media posts
- Writing property descriptions
- Creating email campaigns
- SEO optimization
- Marketing strategy advice
- Answering questions about HUD homes
- Suggesting improvements to marketing materials

Be helpful, professional, and provide actionable advice.`

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
      console.error('OpenAI API error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Generate marketing campaign
   */
  async generateCampaign(property, campaignType = 'comprehensive') {
    const prompt = `Create a ${campaignType} marketing campaign for this HUD home:

Property: ${property.address}, ${property.city}, ${property.state}
Price: $${property.price?.toLocaleString()}
Features: ${property.bedrooms} bed, ${property.bathrooms} bath, ${property.sqft} sqft

Generate a complete marketing campaign including:
1. Campaign theme/angle
2. Target audience description
3. Key messaging points (3-5 bullets)
4. Facebook post
5. Twitter post
6. Email subject line and preview text
7. Recommended hashtags
8. Best times to post
9. Follow-up strategy

Make it actionable and ready to implement.`

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a marketing strategist specializing in real estate campaigns. You create comprehensive, multi-channel marketing plans that drive results.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1200
      })

      return {
        success: true,
        content: response.choices[0].message.content,
        campaignType,
        usage: response.usage
      }
    } catch (error) {
      console.error('OpenAI API error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export default marketingAI
