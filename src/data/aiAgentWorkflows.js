/**
 * AI Agent Workflow Presets
 * Pre-configured workflows for client maintenance and HUD home sales
 */

export const WORKFLOW_PRESETS = {
  // Initial Contact & Qualification
  INITIAL_CONTACT: {
    id: 'initial_contact',
    name: 'Initial Contact & Qualification',
    description: 'First contact with new lead - qualify and understand needs',
    icon: 'UserPlus',
    steps: [
      {
        id: 1,
        action: 'send_welcome_email',
        title: 'Send Welcome Email',
        description: 'Introduce yourself and USA HUD Homes',
        template: 'welcome_email',
        channel: 'email',
        delay: 0
      },
      {
        id: 2,
        action: 'schedule_call',
        title: 'Schedule Discovery Call',
        description: 'Book a 15-minute call to understand needs',
        template: 'discovery_call_request',
        channel: 'email',
        delay: 2 // hours
      },
      {
        id: 3,
        action: 'send_sms_reminder',
        title: 'SMS Reminder',
        description: 'Text reminder before scheduled call',
        template: 'call_reminder_sms',
        channel: 'sms',
        delay: 24 // hours
      }
    ],
    aiPrompts: {
      qualification: 'Analyze lead information and suggest qualification questions',
      budget: 'Estimate budget range based on stated preferences',
      timeline: 'Determine buying timeline urgency'
    }
  },

  // Property Recommendation
  PROPERTY_MATCH: {
    id: 'property_match',
    name: 'Property Matching & Sharing',
    description: 'Find and share matching HUD properties',
    icon: 'Home',
    steps: [
      {
        id: 1,
        action: 'analyze_preferences',
        title: 'Analyze Client Preferences',
        description: 'AI reviews client needs and budget',
        aiEnabled: true
      },
      {
        id: 2,
        action: 'find_properties',
        title: 'Find Matching Properties',
        description: 'Search HUD inventory for matches',
        aiEnabled: true
      },
      {
        id: 3,
        action: 'share_properties',
        title: 'Share Top 3-5 Properties',
        description: 'Send curated property list via email',
        template: 'property_recommendations',
        channel: 'email'
      },
      {
        id: 4,
        action: 'follow_up',
        title: 'Follow-Up',
        description: 'Check if they viewed properties',
        template: 'property_followup',
        channel: 'sms',
        delay: 48 // hours
      }
    ],
    aiPrompts: {
      matching: 'Match client preferences with available HUD properties',
      description: 'Generate compelling property descriptions highlighting HUD benefits',
      comparison: 'Create comparison chart of recommended properties'
    }
  },

  // Nurture Campaign
  NURTURE_CAMPAIGN: {
    id: 'nurture_campaign',
    name: 'Long-Term Nurture',
    description: 'Stay top-of-mind with not-ready-yet leads',
    icon: 'Calendar',
    steps: [
      {
        id: 1,
        action: 'send_market_update',
        title: 'Monthly Market Update',
        description: 'Share local HUD market insights',
        template: 'market_update',
        channel: 'email',
        recurring: 'monthly'
      },
      {
        id: 2,
        action: 'share_success_story',
        title: 'Success Story',
        description: 'Share recent HUD home buyer success',
        template: 'success_story',
        channel: 'email',
        delay: 15 // days
      },
      {
        id: 3,
        action: 'check_in',
        title: 'Personal Check-In',
        description: 'Quick text to see if timing has changed',
        template: 'check_in_sms',
        channel: 'sms',
        delay: 30 // days
      }
    ],
    aiPrompts: {
      content: 'Generate personalized market insights based on client location',
      timing: 'Suggest optimal contact timing based on engagement history'
    }
  },

  // Showing & Offer
  SHOWING_PROCESS: {
    id: 'showing_process',
    name: 'Property Showing & Offer',
    description: 'Guide client through viewing and bidding',
    icon: 'Eye',
    steps: [
      {
        id: 1,
        action: 'schedule_showing',
        title: 'Schedule Property Showing',
        description: 'Coordinate viewing appointment',
        template: 'showing_confirmation',
        channel: 'email'
      },
      {
        id: 2,
        action: 'send_showing_prep',
        title: 'Showing Preparation Guide',
        description: 'What to look for in HUD homes',
        template: 'showing_prep',
        channel: 'email',
        delay: 24 // hours before
      },
      {
        id: 3,
        action: 'post_showing_followup',
        title: 'Post-Showing Follow-Up',
        description: 'Get feedback and discuss next steps',
        template: 'post_showing',
        channel: 'sms',
        delay: 2 // hours after
      },
      {
        id: 4,
        action: 'offer_guidance',
        title: 'Offer Strategy Guidance',
        description: 'AI-powered bidding strategy',
        aiEnabled: true
      }
    ],
    aiPrompts: {
      strategy: 'Analyze property data and suggest competitive offer strategy',
      inspection: 'Generate inspection checklist for this specific property',
      financing: 'Recommend FHA 203(k) if repairs needed'
    }
  },

  // Under Contract
  UNDER_CONTRACT: {
    id: 'under_contract',
    name: 'Under Contract Management',
    description: 'Guide client through closing process',
    icon: 'FileText',
    steps: [
      {
        id: 1,
        action: 'send_congratulations',
        title: 'Congratulations Message',
        description: 'Celebrate offer acceptance',
        template: 'offer_accepted',
        channel: 'email'
      },
      {
        id: 2,
        action: 'closing_timeline',
        title: 'Closing Timeline',
        description: 'Share step-by-step closing process',
        template: 'closing_timeline',
        channel: 'email',
        delay: 24 // hours
      },
      {
        id: 3,
        action: 'weekly_updates',
        title: 'Weekly Progress Updates',
        description: 'Keep client informed of progress',
        template: 'progress_update',
        channel: 'sms',
        recurring: 'weekly'
      },
      {
        id: 4,
        action: 'pre_closing_checklist',
        title: 'Pre-Closing Checklist',
        description: 'Final items before closing day',
        template: 'pre_closing',
        channel: 'email',
        delay: 72 // hours before closing
      }
    ],
    aiPrompts: {
      timeline: 'Generate personalized closing timeline with key dates',
      documents: 'Explain required documents in simple terms',
      issues: 'Suggest solutions for common closing issues'
    }
  },

  // Post-Closing
  POST_CLOSING: {
    id: 'post_closing',
    name: 'Post-Closing Care',
    description: 'Build long-term relationship and referrals',
    icon: 'Heart',
    steps: [
      {
        id: 1,
        action: 'closing_gift',
        title: 'Closing Day Congratulations',
        description: 'Celebrate their new home',
        template: 'closing_congratulations',
        channel: 'email'
      },
      {
        id: 2,
        action: 'request_review',
        title: 'Request Review',
        description: 'Ask for Google/Facebook review',
        template: 'review_request',
        channel: 'email',
        delay: 7 // days
      },
      {
        id: 3,
        action: 'referral_request',
        title: 'Referral Request',
        description: 'Ask if they know anyone looking',
        template: 'referral_request',
        channel: 'sms',
        delay: 30 // days
      },
      {
        id: 4,
        action: 'anniversary',
        title: 'Home Anniversary',
        description: 'Celebrate 1-year anniversary',
        template: 'home_anniversary',
        channel: 'email',
        delay: 365 // days
      }
    ],
    aiPrompts: {
      personalization: 'Generate personalized message referencing their specific home',
      referrals: 'Suggest referral incentive based on local market',
      maintenance: 'Provide seasonal home maintenance tips'
    }
  }
}

// Communication Channels
export const COMMUNICATION_CHANNELS = {
  EMAIL: {
    id: 'email',
    name: 'Email',
    icon: 'Mail',
    description: 'Professional email communication',
    capabilities: ['attachments', 'html', 'tracking', 'scheduling']
  },
  SMS: {
    id: 'sms',
    name: 'SMS/Text',
    icon: 'MessageSquare',
    description: 'Quick text messages',
    capabilities: ['quick_response', 'high_open_rate', 'scheduling']
  },
  FACEBOOK: {
    id: 'facebook',
    name: 'Facebook Messenger',
    icon: 'Facebook',
    description: 'Connect via Facebook',
    capabilities: ['casual', 'media_sharing', 'reactions']
  },
  INSTAGRAM: {
    id: 'instagram',
    name: 'Instagram DM',
    icon: 'Instagram',
    description: 'Visual property sharing',
    capabilities: ['photos', 'stories', 'reels']
  },
  WHATSAPP: {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: 'MessageCircle',
    description: 'International clients',
    capabilities: ['voice', 'video', 'documents']
  }
}

// AI Agent Capabilities
export const AI_CAPABILITIES = {
  CONTENT_GENERATION: {
    id: 'content_generation',
    name: 'Content Generation',
    description: 'Generate personalized emails, texts, and social posts',
    prompts: {
      email: 'Write a professional email about {topic} for {client_name}',
      sms: 'Write a friendly 160-character text about {topic}',
      social: 'Create an engaging social media post about {property}'
    }
  },
  PROPERTY_ANALYSIS: {
    id: 'property_analysis',
    name: 'Property Analysis',
    description: 'Analyze properties and provide insights',
    prompts: {
      comparison: 'Compare these properties and highlight best value',
      investment: 'Analyze investment potential of this HUD property',
      repairs: 'Estimate repair costs and recommend FHA 203(k) if needed'
    }
  },
  CLIENT_INSIGHTS: {
    id: 'client_insights',
    name: 'Client Insights',
    description: 'Understand client needs and behavior',
    prompts: {
      preferences: 'Analyze client preferences from conversation history',
      urgency: 'Assess buying urgency based on engagement',
      objections: 'Identify potential objections and suggest responses'
    }
  },
  MARKET_INTELLIGENCE: {
    id: 'market_intelligence',
    name: 'Market Intelligence',
    description: 'Local market insights and trends',
    prompts: {
      trends: 'Summarize HUD market trends in {location}',
      pricing: 'Analyze pricing strategy for this property',
      competition: 'Identify competing properties and differentiate'
    }
  }
}

export default {
  WORKFLOW_PRESETS,
  COMMUNICATION_CHANNELS,
  AI_CAPABILITIES
}
