/**
 * Event Logging Test Script
 * Run this in the browser console to test event logging functionality
 */

// Test 1: Log event without agent_id
async function testEventWithoutAgent() {
  console.log('Test 1: Logging event without agent_id...')
  
  const { eventService, EVENT_TYPES, EVENT_CATEGORIES } = await import('./src/services/database/eventService.js')
  
  const result = await eventService.logEvent({
    customerId: 'test-customer-id', // Replace with actual customer ID
    consultationId: null,
    agentId: null, // No agent_id
    eventType: EVENT_TYPES.NOTE_ADDED,
    eventCategory: EVENT_CATEGORIES.INTERACTION,
    eventTitle: 'Test Event Without Agent',
    eventDescription: 'Testing event logging without agent_id'
  })
  
  console.log('Result:', result)
  
  if (result.success) {
    console.log('✅ Test 1 PASSED: Event logged successfully without agent_id')
  } else {
    console.error('❌ Test 1 FAILED:', result.error)
  }
  
  return result
}

// Test 2: Log event with valid agent_id
async function testEventWithAgent() {
  console.log('Test 2: Logging event with agent_id...')
  
  const { eventService, EVENT_TYPES, EVENT_CATEGORIES } = await import('./src/services/database/eventService.js')
  
  const result = await eventService.logEvent({
    customerId: 'test-customer-id', // Replace with actual customer ID
    consultationId: null,
    agentId: 'test-agent-id', // Replace with actual agent ID
    eventType: EVENT_TYPES.NOTE_ADDED,
    eventCategory: EVENT_CATEGORIES.INTERACTION,
    eventTitle: 'Test Event With Agent',
    eventDescription: 'Testing event logging with agent_id'
  })
  
  console.log('Result:', result)
  
  if (result.success) {
    console.log('✅ Test 2 PASSED: Event logged successfully with agent_id')
  } else {
    console.error('❌ Test 2 FAILED:', result.error)
  }
  
  return result
}

// Test 3: Log event with invalid agent_id
async function testEventWithInvalidAgent() {
  console.log('Test 3: Logging event with invalid agent_id...')
  
  const { eventService, EVENT_TYPES, EVENT_CATEGORIES } = await import('./src/services/database/eventService.js')
  
  const result = await eventService.logEvent({
    customerId: 'test-customer-id', // Replace with actual customer ID
    consultationId: null,
    agentId: '00000000-0000-0000-0000-000000000000', // Invalid agent_id
    eventType: EVENT_TYPES.NOTE_ADDED,
    eventCategory: EVENT_CATEGORIES.INTERACTION,
    eventTitle: 'Test Event With Invalid Agent',
    eventDescription: 'Testing event logging with invalid agent_id'
  })
  
  console.log('Result:', result)
  
  if (result.success) {
    console.log('✅ Test 3 PASSED: Event logged successfully (agent_id will be NULL in DB)')
  } else {
    console.error('❌ Test 3 FAILED:', result.error)
  }
  
  return result
}

// Test 4: Log email sent event
async function testEmailEvent() {
  console.log('Test 4: Logging email sent event...')
  
  const { eventService } = await import('./src/services/database/eventService.js')
  
  const result = await eventService.logEmailSent(
    'test-customer-id', // Replace with actual customer ID
    'test-consultation-id', // Replace with actual consultation ID
    null, // No agent_id
    {
      to: 'customer@example.com',
      subject: 'Test Email',
      body: 'This is a test email message'
    }
  )
  
  console.log('Result:', result)
  
  if (result.success) {
    console.log('✅ Test 4 PASSED: Email event logged successfully')
  } else {
    console.error('❌ Test 4 FAILED:', result.error)
  }
  
  return result
}

// Test 5: Log SMS sent event
async function testSMSEvent() {
  console.log('Test 5: Logging SMS sent event...')
  
  const { eventService } = await import('./src/services/database/eventService.js')
  
  const result = await eventService.logSMSSent(
    'test-customer-id', // Replace with actual customer ID
    'test-consultation-id', // Replace with actual consultation ID
    null, // No agent_id
    {
      to: '+1234567890',
      message: 'This is a test SMS message'
    }
  )
  
  console.log('Result:', result)
  
  if (result.success) {
    console.log('✅ Test 5 PASSED: SMS event logged successfully')
  } else {
    console.error('❌ Test 5 FAILED:', result.error)
  }
  
  return result
}

// Test 6: Get customer events
async function testGetEvents() {
  console.log('Test 6: Retrieving customer events...')
  
  const { eventService } = await import('./src/services/database/eventService.js')
  
  const result = await eventService.getCustomerEvents('test-customer-id') // Replace with actual customer ID
  
  console.log('Result:', result)
  
  if (result.success) {
    console.log(`✅ Test 6 PASSED: Retrieved ${result.data?.length || 0} events`)
    console.log('Events:', result.data)
  } else {
    console.error('❌ Test 6 FAILED:', result.error)
  }
  
  return result
}

// Run all tests
async function runAllTests() {
  console.log('=================================')
  console.log('EVENT LOGGING TEST SUITE')
  console.log('=================================')
  console.log('')
  
  const results = []
  
  try {
    results.push(await testEventWithoutAgent())
    console.log('')
    
    results.push(await testEventWithAgent())
    console.log('')
    
    results.push(await testEventWithInvalidAgent())
    console.log('')
    
    results.push(await testEmailEvent())
    console.log('')
    
    results.push(await testSMSEvent())
    console.log('')
    
    results.push(await testGetEvents())
    console.log('')
  } catch (error) {
    console.error('Test suite error:', error)
  }
  
  console.log('=================================')
  console.log('TEST SUMMARY')
  console.log('=================================')
  
  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  console.log(`Total tests: ${results.length}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  
  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED!')
  } else {
    console.log('❌ SOME TESTS FAILED')
  }
  
  return results
}

// Export functions for use in browser console
if (typeof window !== 'undefined') {
  window.eventLoggingTests = {
    runAll: runAllTests,
    testEventWithoutAgent,
    testEventWithAgent,
    testEventWithInvalidAgent,
    testEmailEvent,
    testSMSEvent,
    testGetEvents
  }
  
  console.log('Event logging tests loaded!')
  console.log('Run: eventLoggingTests.runAll()')
  console.log('Or run individual tests: eventLoggingTests.testEventWithoutAgent()')
}

export {
  runAllTests,
  testEventWithoutAgent,
  testEventWithAgent,
  testEventWithInvalidAgent,
  testEmailEvent,
  testSMSEvent,
  testGetEvents
}
