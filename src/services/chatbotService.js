// Enhanced Chatbot Service for HUD Property Consultations
// Provides intelligent responses based on property data and common questions

class ChatbotService {
  constructor() {
    this.responses = new Map()
    this.initializeResponses()
  }

  initializeResponses() {
    // Define response patterns and templates
    this.responses.set('greeting', [
      "Hi! I'm here to help you with this HUD property. What would you like to know?",
      "Hello! I can answer questions about this property, financing, and the bidding process. How can I assist you?",
      "Welcome! I'm your HUD property assistant. Feel free to ask me anything about this home."
    ])

    this.responses.set('price', [
      "This property is listed at ${price}. With FHA financing, you could potentially put down as little as $100 if you qualify as an owner-occupant.",
      "The asking price is ${price}. HUD offers special financing options including $100 down payments for owner-occupants and 3% closing cost assistance.",
      "At ${price}, this property offers great value. Would you like to know about available financing incentives?"
    ])

    this.responses.set('financing', [
      "Great question! This property offers several financing options: FHA $100 down payment for owner-occupants, 3% closing cost assistance, and ${eligible203k ? 'is eligible for 203k renovation loans up to $35,000' : 'standard FHA financing'}.",
      "HUD properties come with excellent financing benefits. You can qualify for as little as $100 down if you're an owner-occupant, plus get help with closing costs.",
      "Financing options include FHA loans with minimal down payment, closing cost assistance, and ${eligible203k ? '203k renovation financing if you want to make improvements' : 'competitive interest rates'}."
    ])

    this.responses.set('bidding', [
      "Bids for this property close on ${bidDeadline}. You'll need to work with a HUD-registered broker to submit your bid. I can connect you with Marc Spencer at Lightkeeper Realty - they've been helping people buy HUD homes for 25 years!",
      "The bid deadline is ${bidDeadline}. To submit a bid, you must work with a HUD-approved broker. Marc Spencer at Lightkeeper Realty specializes in HUD properties and can guide you through the entire process.",
      "Bidding closes ${bidDeadline}. The process requires a HUD-registered broker, and I highly recommend Marc Spencer who has 25+ years of experience with HUD home purchases."
    ])

    this.responses.set('203k', [
      "${eligible203k ? 'Yes! This property is 203k eligible, which means you can finance both the purchase and renovation costs (up to $35,000) into one loan. This is perfect if you want to customize the home to your needs.' : 'This property is not currently 203k eligible, but there are other financing options available including standard FHA loans with low down payments.'}",
      "${eligible203k ? 'Absolutely! With 203k financing, you can roll renovation costs up to $35,000 into your mortgage. This allows you to buy and improve the property with one loan.' : 'While this property isn\\'t 203k eligible, you can still take advantage of other HUD benefits like $100 down payments and closing cost assistance.'}",
      "${eligible203k ? 'This property qualifies for 203k renovation loans! You can finance improvements like kitchen updates, flooring, or repairs right into your mortgage.' : 'This property uses standard FHA financing, which still offers great benefits for qualified buyers.'}"
    ])

    this.responses.set('condition', [
      "HUD properties are sold \"as-is\" without warranties. However, you can schedule an inspection during the bid period. This property was built in ${yearBuilt} and ${yearBuilt > 2000 ? 'is relatively modern with good construction standards' : 'has stood the test of time with proper maintenance'}.",
      "All HUD homes are sold in \"as-is\" condition, but you have the right to inspect before bidding. Built in ${yearBuilt}, this home ${yearBuilt > 2010 ? 'features modern construction and energy-efficient systems' : 'offers solid construction from a quality building era'}.",
      "The property is sold \"as-is\" but you can inspect it during the bid period. Given it was built in ${yearBuilt}, ${yearBuilt > 2005 ? 'you can expect modern amenities and building standards' : 'it represents classic construction with character'}."
    ])

    this.responses.set('location', [
      "This property is located in ${county}, ${state}. It's situated on ${lotSize} providing ${lotSize.includes('acre') ? 'plenty of space and privacy' : 'a nice sized lot'}. The area offers ${state === 'NC' ? 'North Carolina\\'s blend of urban amenities and rural charm' : 'Tennessee\\'s growing economy and outdoor recreation opportunities'}.",
      "Located in ${county}, this home sits on ${lotSize}. ${state === 'NC' ? 'North Carolina offers excellent schools, mild climate, and growing job markets' : 'Tennessee provides no state income tax, friendly business climate, and beautiful scenery'}.",
      "The property is in ${county}, ${state} on ${lotSize}. This area is known for ${state === 'NC' ? 'its research triangle, universities, and quality of life' : 'music heritage, outdoor activities, and economic growth'}."
    ])

    this.responses.set('schools', [
      "School information varies by specific location within ${county}. I recommend contacting Marc Spencer at (910) 363-6147 for detailed school district information and ratings for this specific address.",
      "For accurate school district details in ${county}, I'd suggest speaking with our local expert Marc Spencer. He can provide current school ratings, boundaries, and enrollment information.",
      "School districts in ${county} can vary by neighborhood. Marc Spencer has detailed local knowledge and can provide specific school information for this property's location."
    ])

    this.responses.set('timeline', [
      "The typical HUD purchase timeline is: 1) Submit bid by ${bidDeadline}, 2) Bid results announced within 2-3 days, 3) If accepted, you have 45-60 days to close. Marc Spencer can walk you through each step.",
      "After the bid deadline on ${bidDeadline}, HUD reviews all offers and announces results within 2-3 business days. Successful bidders typically have 45-60 days to complete the purchase.",
      "The process moves quickly: bid by ${bidDeadline}, results in 2-3 days, then 45-60 days to close if your bid is accepted. Having a experienced HUD broker like Marc Spencer is crucial for meeting all deadlines."
    ])

    this.responses.set('competition', [
      "HUD properties can be competitive, especially well-priced ones like this. ${status === 'PRICE REDUCED' ? 'The recent price reduction may increase interest, so acting quickly is important.' : 'Getting your bid in early and working with an experienced broker gives you the best chance.'} Marc Spencer knows strategies to make your offer competitive.",
      "Competition varies by property and market conditions. ${status === 'PRICE REDUCED' ? 'Price reductions often generate more interest.' : 'This property\\'s pricing and condition will determine competition level.'} An experienced broker like Marc Spencer can advise on competitive bidding strategies.",
      "HUD properties attract various buyers - investors, owner-occupants, and flippers. ${status === 'PRICE REDUCED' ? 'The price reduction might increase competition.' : 'Your success depends on proper preparation and expert guidance.'} Marc Spencer\\'s 25+ years of HUD experience is invaluable."
    ])

    this.responses.set('inspection', [
      "Yes, you can inspect HUD properties during the bid period. I recommend scheduling an inspection as soon as possible since the bid deadline is ${bidDeadline}. Marc Spencer can coordinate the inspection and help you understand what to look for.",
      "Inspections are allowed and recommended! You should schedule one quickly since bids close ${bidDeadline}. A professional inspection helps you understand the property's condition and any potential repair needs.",
      "Absolutely! Inspection is your right and responsibility. With the bid deadline of ${bidDeadline}, time is important. Marc Spencer can help arrange inspections and recommend qualified inspectors familiar with HUD properties."
    ])

    this.responses.set('default', [
      "That's a great question! For detailed information about this property, I recommend speaking with Marc Spencer at Lightkeeper Realty. He can provide expert guidance on HUD home purchases. Would you like me to arrange a consultation?",
      "I'd be happy to help you with that! For comprehensive answers about this property and the HUD buying process, Marc Spencer at (910) 363-6147 is your best resource. He's been helping people buy HUD homes for 25+ years.",
      "Great question! While I can provide general information, Marc Spencer at Lightkeeper Realty has the detailed expertise you need. He specializes in HUD properties and can give you specific guidance. Would you like his contact information?"
    ])

    this.responses.set('contact', [
      "Absolutely! Marc Spencer at Lightkeeper Realty is your HUD specialist. You can reach him at (910) 363-6147 or marcspencer28461@gmail.com. He typically responds within 2 hours during business hours and offers free consultations.",
      "I'd be happy to connect you! Marc Spencer has been helping people buy HUD homes for 25+ years. Call him at (910) 363-6147 or email marcspencer28461@gmail.com. He provides free consultations and expert guidance throughout the entire process.",
      "Perfect! Marc Spencer at Lightkeeper Realty is standing by to help. Phone: (910) 363-6147, Email: marcspencer28461@gmail.com. He's a registered HUD buyer's agency with decades of experience. Free consultation included!"
    ])
  }

  // Generate response based on user message and property data
  generateResponse(message, property) {
    const msg = message.toLowerCase()
    let responseType = 'default'
    
    // Determine response type based on message content
    if (this.containsKeywords(msg, ['price', 'cost', 'expensive', 'cheap', 'afford', 'payment'])) {
      responseType = 'price'
    } else if (this.containsKeywords(msg, ['financing', 'loan', 'mortgage', 'down payment', 'fha', 'qualify'])) {
      responseType = 'financing'
    } else if (this.containsKeywords(msg, ['bid', 'offer', 'deadline', 'submit', 'when'])) {
      responseType = 'bidding'
    } else if (this.containsKeywords(msg, ['203k', 'renovation', 'repair', 'improve', 'fix', 'remodel'])) {
      responseType = '203k'
    } else if (this.containsKeywords(msg, ['condition', 'inspection', 'as-is', 'problems', 'issues', 'quality'])) {
      responseType = 'condition'
    } else if (this.containsKeywords(msg, ['location', 'area', 'neighborhood', 'county', 'city', 'where'])) {
      responseType = 'location'
    } else if (this.containsKeywords(msg, ['school', 'schools', 'district', 'education', 'kids', 'children'])) {
      responseType = 'schools'
    } else if (this.containsKeywords(msg, ['timeline', 'process', 'steps', 'how long', 'when', 'close'])) {
      responseType = 'timeline'
    } else if (this.containsKeywords(msg, ['competition', 'competitive', 'other buyers', 'chances', 'likely'])) {
      responseType = 'competition'
    } else if (this.containsKeywords(msg, ['inspect', 'look at', 'see', 'visit', 'tour'])) {
      responseType = 'inspection'
    } else if (this.containsKeywords(msg, ['contact', 'call', 'phone', 'speak', 'talk', 'meet', 'consultation'])) {
      responseType = 'contact'
    } else if (this.containsKeywords(msg, ['hello', 'hi', 'hey', 'start', 'help'])) {
      responseType = 'greeting'
    }

    // Get random response template for the type
    const templates = this.responses.get(responseType) || this.responses.get('default')
    const template = templates[Math.floor(Math.random() * templates.length)]

    // Replace placeholders with property data
    return this.replacePlaceholders(template, property)
  }

  // Check if message contains any of the keywords
  containsKeywords(message, keywords) {
    return keywords.some(keyword => message.includes(keyword))
  }

  // Replace template placeholders with actual property data
  replacePlaceholders(template, property) {
    if (!property) return template

    const bidDeadline = new Date(property.bidDeadline).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })

    return template
      .replace(/\${price}/g, property.price ? `$${property.price.toLocaleString()}` : 'the listed price')
      .replace(/\${bidDeadline}/g, bidDeadline)
      .replace(/\${eligible203k}/g, property.eligible203k)
      .replace(/\${yearBuilt}/g, property.yearBuilt || 'unknown')
      .replace(/\${county}/g, property.county || 'the area')
      .replace(/\${state}/g, property.state || 'the state')
      .replace(/\${lotSize}/g, property.lotSize || 'the lot')
      .replace(/\${status}/g, property.status || 'ACTIVE')
  }

  // Get suggested follow-up questions based on the conversation
  getSuggestedQuestions(property) {
    const suggestions = [
      "What financing options are available?",
      "How does the bidding process work?",
      "Can I inspect the property?",
      "What are the closing costs?",
      "Is this property 203k eligible?",
      "How competitive is this property?",
      "What's the timeline to close?",
      "Can you connect me with Marc Spencer?"
    ]

    // Randomize and return 3-4 suggestions
    const shuffled = suggestions.sort(() => 0.5 - Math.random())
    return shuffled.slice(0, Math.floor(Math.random() * 2) + 3)
  }

  // Get quick response buttons based on property
  getQuickResponses(property) {
    const responses = [
      "💰 Financing Options",
      "📅 Bid Deadline",
      "🏠 Property Details",
      "📞 Contact Broker",
      "🔍 Schedule Inspection"
    ]

    if (property?.eligible203k) {
      responses.push("🔨 203k Renovation")
    }

    if (property?.status === 'PRICE REDUCED') {
      responses.push("📉 Price Reduction")
    }

    return responses
  }

  // Handle quick response button clicks
  handleQuickResponse(buttonText, property) {
    const responses = {
      "💰 Financing Options": "What financing options are available for this property?",
      "📅 Bid Deadline": "When is the bid deadline and how do I submit an offer?",
      "🏠 Property Details": "Can you tell me more about this property's features?",
      "📞 Contact Broker": "I'd like to speak with Marc Spencer about this property",
      "🔍 Schedule Inspection": "How do I schedule an inspection of this property?",
      "🔨 203k Renovation": "Is this property eligible for 203k renovation loans?",
      "📉 Price Reduction": "Why was the price reduced on this property?"
    }

    return responses[buttonText] || buttonText
  }

  // Generate contextual help based on property urgency
  getUrgencyMessage(property) {
    if (!property?.bidDeadline) return null

    const now = new Date()
    const deadline = new Date(property.bidDeadline)
    const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))

    if (daysRemaining <= 1) {
      return {
        type: 'urgent',
        message: '⚠️ URGENT: Bidding closes today! Contact Marc Spencer immediately at (910) 363-6147 to submit your bid.',
        action: 'Call Now'
      }
    } else if (daysRemaining <= 3) {
      return {
        type: 'warning',
        message: `⏰ Only ${daysRemaining} days left to bid! Don't wait - contact Marc Spencer to get your bid prepared.`,
        action: 'Contact Broker'
      }
    } else if (daysRemaining <= 7) {
      return {
        type: 'info',
        message: `📅 ${daysRemaining} days remaining to bid. Now is a great time to schedule an inspection and prepare your offer.`,
        action: 'Learn More'
      }
    }

    return null
  }
}

// Create and export singleton instance
const chatbotService = new ChatbotService()
export default chatbotService
