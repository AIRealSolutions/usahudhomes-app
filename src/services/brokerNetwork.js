// Broker Network and Referral System
// Manages broker database, referrals, and network communications

export class BrokerNetwork {
  constructor() {
    this.brokers = this.loadBrokers()
    this.referrals = this.loadReferrals()
  }

  // Load broker network from localStorage
  loadBrokers() {
    const stored = localStorage.getItem('brokerNetwork')
    if (stored) {
      return JSON.parse(stored)
    }

    // Default broker network for NC and TN
    return [
      {
        id: 'broker-001',
        name: 'Marc Spencer',
        email: 'marcspencer28461@gmail.com',
        phone: '(910) 363-6147',
        company: 'Lightkeeper Realty',
        license: 'NC-12345',
        states: ['NC'],
        counties: ['Caswell', 'Mecklenburg', 'Vance', 'Johnston', 'Wake'],
        specialties: ['HUD Homes', 'FHA 203k', 'First-Time Buyers'],
        rating: 4.9,
        totalReferrals: 156,
        successRate: 87,
        responseTime: '< 2 hours',
        languages: ['English'],
        certifications: ['HUD Registered Buyer Agent', 'FHA 203k Specialist'],
        bio: 'Helping people buy HUD homes for 25+ years. Registered HUD Buyer\'s Agency with extensive experience in government foreclosure properties.',
        profileImage: '/images/marc-spencer.jpg',
        isActive: true,
        joinDate: '1999-03-15',
        lastActive: new Date().toISOString()
      },
      {
        id: 'broker-002',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@tnrealty.com',
        phone: '(615) 555-0123',
        company: 'Tennessee Home Experts',
        license: 'TN-67890',
        states: ['TN'],
        counties: ['Davidson', 'Knox', 'Hamilton', 'Shelby', 'Carroll'],
        specialties: ['HUD Homes', 'Investment Properties', 'Rural Properties'],
        rating: 4.7,
        totalReferrals: 89,
        successRate: 82,
        responseTime: '< 4 hours',
        languages: ['English', 'Spanish'],
        certifications: ['HUD Registered Buyer Agent', 'Investment Property Specialist'],
        bio: 'Tennessee HUD specialist with 15 years experience helping buyers find affordable government properties.',
        profileImage: '/images/sarah-johnson.jpg',
        isActive: true,
        joinDate: '2008-07-22',
        lastActive: new Date().toISOString()
      },
      {
        id: 'broker-003',
        name: 'Michael Davis',
        email: 'mdavis@charlottehomes.com',
        phone: '(704) 555-0456',
        company: 'Charlotte Home Solutions',
        license: 'NC-54321',
        states: ['NC'],
        counties: ['Mecklenburg', 'Gaston', 'Union', 'Cabarrus'],
        specialties: ['HUD Homes', 'Urban Properties', 'Luxury Homes'],
        rating: 4.8,
        totalReferrals: 134,
        successRate: 85,
        responseTime: '< 3 hours',
        languages: ['English'],
        certifications: ['HUD Registered Buyer Agent', 'Luxury Home Specialist'],
        bio: 'Charlotte area HUD expert specializing in urban and suburban government foreclosure properties.',
        profileImage: '/images/michael-davis.jpg',
        isActive: true,
        joinDate: '2005-11-10',
        lastActive: new Date().toISOString()
      },
      {
        id: 'broker-004',
        name: 'Jennifer Wilson',
        email: 'jwilson@trianglerealty.com',
        phone: '(919) 555-0789',
        company: 'Triangle Realty Group',
        license: 'NC-98765',
        states: ['NC'],
        counties: ['Wake', 'Durham', 'Orange', 'Chatham'],
        specialties: ['HUD Homes', 'First-Time Buyers', 'FHA 203k'],
        rating: 4.9,
        totalReferrals: 201,
        successRate: 91,
        responseTime: '< 1 hour',
        languages: ['English', 'French'],
        certifications: ['HUD Registered Buyer Agent', 'FHA 203k Consultant'],
        bio: 'Triangle area HUD specialist with exceptional track record in helping first-time buyers.',
        profileImage: '/images/jennifer-wilson.jpg',
        isActive: true,
        joinDate: '2003-01-18',
        lastActive: new Date().toISOString()
      }
    ]
  }

  // Load referrals from localStorage
  loadReferrals() {
    const stored = localStorage.getItem('brokerReferrals')
    if (stored) {
      return JSON.parse(stored)
    }
    return []
  }

  // Save brokers to localStorage
  saveBrokers() {
    localStorage.setItem('brokerNetwork', JSON.stringify(this.brokers))
  }

  // Save referrals to localStorage
  saveReferrals() {
    localStorage.setItem('brokerReferrals', JSON.stringify(this.referrals))
  }

  // Find best broker for a customer based on location and needs
  findBestBroker(customerData) {
    const { state, county, propertyType, budget, specialNeeds } = customerData

    // Filter brokers by state
    let availableBrokers = this.brokers.filter(broker => 
      broker.isActive && broker.states.includes(state)
    )

    // Filter by county if specified
    if (county) {
      availableBrokers = availableBrokers.filter(broker =>
        broker.counties.includes(county)
      )
    }

    // Score brokers based on specialties and performance
    const scoredBrokers = availableBrokers.map(broker => {
      let score = 0
      
      // Base score from rating and success rate
      score += broker.rating * 10
      score += broker.successRate * 0.5
      
      // Bonus for relevant specialties
      if (specialNeeds) {
        specialNeeds.forEach(need => {
          if (broker.specialties.some(specialty => 
            specialty.toLowerCase().includes(need.toLowerCase())
          )) {
            score += 15
          }
        })
      }
      
      // Bonus for fast response time
      if (broker.responseTime.includes('< 1 hour')) score += 10
      else if (broker.responseTime.includes('< 2 hours')) score += 7
      else if (broker.responseTime.includes('< 4 hours')) score += 5
      
      // Bonus for experience (total referrals)
      score += Math.min(broker.totalReferrals * 0.1, 20)
      
      return { ...broker, score }
    })

    // Sort by score and return top matches
    return scoredBrokers.sort((a, b) => b.score - a.score)
  }

  // Create a referral
  createReferral(customerData, fromBrokerId, toBrokerId, reason = '') {
    const referral = {
      id: `ref-${Date.now()}`,
      customerId: customerData.id,
      customerName: customerData.name,
      customerEmail: customerData.email,
      customerPhone: customerData.phone,
      fromBrokerId,
      toBrokerId,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      propertyInterest: customerData.propertyInterest || '',
      budget: customerData.budget || '',
      timeline: customerData.timeline || '',
      notes: customerData.notes || ''
    }

    this.referrals.push(referral)
    this.saveReferrals()

    // Send notification emails
    this.sendReferralNotification(referral)

    return referral
  }

  // Update referral status
  updateReferralStatus(referralId, status, notes = '') {
    const referral = this.referrals.find(r => r.id === referralId)
    if (referral) {
      referral.status = status
      referral.updatedAt = new Date().toISOString()
      if (notes) {
        referral.notes = (referral.notes || '') + '\n' + notes
      }
      this.saveReferrals()
      return referral
    }
    return null
  }

  // Get referrals for a broker
  getBrokerReferrals(brokerId, status = null) {
    let referrals = this.referrals.filter(r => 
      r.fromBrokerId === brokerId || r.toBrokerId === brokerId
    )

    if (status) {
      referrals = referrals.filter(r => r.status === status)
    }

    return referrals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  // Send referral notification email
  sendReferralNotification(referral) {
    const fromBroker = this.brokers.find(b => b.id === referral.fromBrokerId)
    const toBroker = this.brokers.find(b => b.id === referral.toBrokerId)

    if (!fromBroker || !toBroker) return

    // Email to receiving broker
    const emailData = {
      to: toBroker.email,
      subject: `New Customer Referral from ${fromBroker.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Customer Referral</h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${referral.customerName}</p>
            <p><strong>Email:</strong> ${referral.customerEmail}</p>
            <p><strong>Phone:</strong> ${referral.customerPhone}</p>
            <p><strong>Property Interest:</strong> ${referral.propertyInterest}</p>
            <p><strong>Budget:</strong> ${referral.budget}</p>
            <p><strong>Timeline:</strong> ${referral.timeline}</p>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Referral Details</h3>
            <p><strong>Referred by:</strong> ${fromBroker.name} (${fromBroker.company})</p>
            <p><strong>Reason:</strong> ${referral.reason}</p>
            <p><strong>Notes:</strong> ${referral.notes}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://usahudhomes-app.vercel.app/customer/${referral.customerId}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Customer Details
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Please contact the customer within 24 hours to maintain our high service standards.
          </p>
        </div>
      `
    }

    // In a real application, this would send via email service
    console.log('Referral notification email:', emailData)
    
    // Also notify Marc Spencer
    if (toBroker.email !== 'marcspencer28461@gmail.com') {
      const marcNotification = {
        to: 'marcspencer28461@gmail.com',
        subject: `Referral Created: ${referral.customerName} → ${toBroker.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Referral Notification</h2>
            <p>A new referral has been created in the USAhudHomes.com system:</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
              <p><strong>Customer:</strong> ${referral.customerName}</p>
              <p><strong>Referred to:</strong> ${toBroker.name} (${toBroker.company})</p>
              <p><strong>Property Interest:</strong> ${referral.propertyInterest}</p>
              <p><strong>Reason:</strong> ${referral.reason}</p>
            </div>
            
            <p style="margin-top: 20px;">
              <a href="https://usahudhomes-app.vercel.app/leads">View in Dashboard</a>
            </p>
          </div>
        `
      }
      console.log('Marc notification email:', marcNotification)
    }
  }

  // Get broker statistics
  getBrokerStats(brokerId) {
    const broker = this.brokers.find(b => b.id === brokerId)
    if (!broker) return null

    const brokerReferrals = this.getBrokerReferrals(brokerId)
    const receivedReferrals = brokerReferrals.filter(r => r.toBrokerId === brokerId)
    const sentReferrals = brokerReferrals.filter(r => r.fromBrokerId === brokerId)

    return {
      ...broker,
      stats: {
        totalReceived: receivedReferrals.length,
        totalSent: sentReferrals.length,
        pendingReceived: receivedReferrals.filter(r => r.status === 'pending').length,
        completedReceived: receivedReferrals.filter(r => r.status === 'completed').length,
        thisMonth: receivedReferrals.filter(r => {
          const referralDate = new Date(r.createdAt)
          const now = new Date()
          return referralDate.getMonth() === now.getMonth() && 
                 referralDate.getFullYear() === now.getFullYear()
        }).length
      }
    }
  }

  // Search brokers
  searchBrokers(query) {
    const searchTerm = query.toLowerCase()
    return this.brokers.filter(broker =>
      broker.name.toLowerCase().includes(searchTerm) ||
      broker.company.toLowerCase().includes(searchTerm) ||
      broker.states.some(state => state.toLowerCase().includes(searchTerm)) ||
      broker.counties.some(county => county.toLowerCase().includes(searchTerm)) ||
      broker.specialties.some(specialty => specialty.toLowerCase().includes(searchTerm))
    )
  }

  // Add new broker to network
  addBroker(brokerData) {
    const newBroker = {
      id: `broker-${Date.now()}`,
      ...brokerData,
      totalReferrals: 0,
      rating: 0,
      successRate: 0,
      isActive: true,
      joinDate: new Date().toISOString(),
      lastActive: new Date().toISOString()
    }

    this.brokers.push(newBroker)
    this.saveBrokers()
    return newBroker
  }

  // Update broker information
  updateBroker(brokerId, updates) {
    const brokerIndex = this.brokers.findIndex(b => b.id === brokerId)
    if (brokerIndex !== -1) {
      this.brokers[brokerIndex] = {
        ...this.brokers[brokerIndex],
        ...updates,
        lastActive: new Date().toISOString()
      }
      this.saveBrokers()
      return this.brokers[brokerIndex]
    }
    return null
  }

  // Get network overview
  getNetworkOverview() {
    const totalBrokers = this.brokers.length
    const activeBrokers = this.brokers.filter(b => b.isActive).length
    const totalReferrals = this.referrals.length
    const pendingReferrals = this.referrals.filter(r => r.status === 'pending').length
    
    const statesCovered = [...new Set(this.brokers.flatMap(b => b.states))].sort()
    const avgRating = this.brokers.reduce((sum, b) => sum + b.rating, 0) / totalBrokers
    
    return {
      totalBrokers,
      activeBrokers,
      totalReferrals,
      pendingReferrals,
      statesCovered,
      avgRating: Math.round(avgRating * 10) / 10,
      topPerformers: this.brokers
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 3)
    }
  }
}

// Export singleton instance
export const brokerNetwork = new BrokerNetwork()
export default brokerNetwork
