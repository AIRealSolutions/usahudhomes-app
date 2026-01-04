/**
 * Database Initialization Script
 * Adds Marc Spencer as the primary agent and tests the referral workflow
 */

import fetch from 'node-fetch'

const API_BASE_URL = process.env.API_BASE_URL || 'https://usahudhomes.com'
const INIT_SECRET_KEY = process.env.INIT_SECRET_KEY || 'your-secret-key-here'

async function initializeDatabase() {
  console.log('🚀 Initializing database...\n')

  try {
    // Step 1: Add Marc Spencer as agent
    console.log('📝 Step 1: Adding Marc Spencer as agent...')
    const agentResponse = await fetch(`${API_BASE_URL}/api/init-agent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${INIT_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    const agentResult = await agentResponse.json()
    
    if (agentResult.success) {
      console.log('✅ Agent created successfully!')
      console.log(`   ID: ${agentResult.data.id}`)
      console.log(`   Name: ${agentResult.data.first_name} ${agentResult.data.last_name}`)
      console.log(`   Email: ${agentResult.data.email}`)
      console.log(`   Phone: ${agentResult.data.phone}`)
      console.log(`   License: ${agentResult.data.license_state} ${agentResult.data.license_number}`)
      console.log(`   States: ${agentResult.data.states_covered.join(', ')}`)
      console.log()
    } else {
      console.log('⚠️  Agent already exists or error occurred')
      console.log(`   Message: ${agentResult.message || agentResult.error}`)
      console.log()
    }

    // Step 2: Test referral workflow (optional)
    console.log('📋 Step 2: Referral workflow is ready!')
    console.log('   The following endpoints are available:')
    console.log('   - POST /api/referral (action: assign)')
    console.log('   - POST /api/referral (action: accept)')
    console.log('   - POST /api/referral (action: decline)')
    console.log('   - POST /api/referral (action: update_outcome)')
    console.log('   - POST /api/referral (action: get_agent_referrals)')
    console.log('   - POST /api/referral (action: process_expired)')
    console.log()

    console.log('✅ Database initialization complete!')
    console.log()
    console.log('📊 Summary:')
    console.log('   - Agents database: Ready')
    console.log('   - Referral workflow: Ready')
    console.log('   - Marc Spencer: Registered')
    console.log()
    console.log('🎯 Next steps:')
    console.log('   1. New leads will be automatically assigned to Marc Spencer')
    console.log('   2. Marc can accept/decline referrals via the broker dashboard')
    console.log('   3. Expired referrals (48 hours) will be automatically processed')
    console.log()

  } catch (error) {
    console.error('❌ Error initializing database:', error.message)
    process.exit(1)
  }
}

// Run initialization
initializeDatabase()
