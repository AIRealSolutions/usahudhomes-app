/**
 * Lead Service
 * Every inbound request lands in the `leads` table first. Assigning a lead to
 * an agent links/creates the customer and creates the consultation (shown in
 * the admin as an "Assigned Lead") that brokers work from.
 */

import { supabase } from '../../config/supabase'

/**
 * Assign a lead to an agent.
 * @param {Object} lead - Row from the leads table
 * @param {string} agentId - Agent to assign
 * @returns {Promise<{customerId: string|null, consultation: Object|null}>}
 */
export async function assignLeadToAgent(lead, agentId) {
  // Find or create customer
  let customerId = lead.customer_id
  if (!customerId && lead.email) {
    // customers.email is unique, so reuse any existing row (including inactive
    // or soft-deleted ones, which are brought back) instead of failing the insert.
    const { data: existing } = await supabase
      .from('customers')
      .select('id, is_deleted')
      .ilike('email', lead.email.trim().replace(/[\\%_]/g, '\\$&'))
      .limit(1)
    if (existing?.length) {
      customerId = existing[0].id
      if (existing[0].is_deleted) {
        await supabase.rpc('restore_customer', { customer_id: customerId })
      }
    }
  }
  if (!customerId) {
    const { data: newCust, error: custError } = await supabase
      .from('customers')
      .insert([{
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email || null,
        phone: lead.phone,
        state: lead.state,
        lead_source: lead.source || 'website',
        status: 'active',
        is_active: true,
      }])
      .select('id')
      .single()
    if (custError) throw custError
    customerId = newCust.id
  }

  const { error: leadError } = await supabase
    .from('leads')
    .update({
      customer_id: customerId,
      status: 'under_review',
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead.id)
  if (leadError) throw leadError

  const name = `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
  const { data: consultation, error } = await supabase
    .from('consultations')
    .insert([{
      customer_id: customerId,
      agent_id: agentId,
      property_id: lead.property_id || null,
      case_number: lead.property_case_number || null,
      consultation_type: lead.lead_type || 'property_inquiry',
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      customer_name: name || null,
      customer_email: lead.email,
      customer_phone: lead.phone,
      state: lead.state,
      message: lead.message,
      notes: lead.notes || null,
      source: lead.source,
      source_details: lead.source_details || null,
      priority: lead.priority || null,
      budget_min: lead.budget_min ?? null,
      budget_max: lead.budget_max ?? null,
      preferred_location: lead.preferred_location || null,
      timeline: lead.timeline || null,
      financing_type: lead.financing_type || null,
      down_payment: lead.down_payment || null,
      credit_score_range: lead.credit_score_range || null,
      pre_approved: lead.pre_approved ?? null,
      buyer_type: lead.buyer_type || null,
      experience_level: lead.experience_level || null,
      price_range_min: lead.price_range_min ?? null,
      price_range_max: lead.price_range_max ?? null,
      property_preferences: lead.property_preferences || null,
      hear_about_us: lead.hear_about_us || null,
      status: 'new',
      is_deleted: false,
    }])
    .select()
    .single()
  if (error) throw error

  await supabase.from('lead_events').insert({
    lead_id: lead.id,
    event_type: 'assigned_to_agent',
    event_data: { agent_id: agentId, consultation_id: consultation.id },
  })

  return { customerId, consultation }
}

/**
 * Add a lead by hand (admin). New people always enter as leads; their customer
 * record is created when the lead is assigned to an agent.
 * @param {Object} input - { firstName, lastName, email, phone, state, propertyCaseNumber, source, message }
 * @returns {Promise<Object>} The created lead row
 */
export async function createLead(input) {
  const clean = (v) => (typeof v === 'string' ? v.trim() : v) || null
  const email = clean(input.email)?.toLowerCase() || null
  const phone = clean(input.phone)
  if (!clean(input.firstName)) throw new Error('First name is required.')
  if (!email && !phone) throw new Error('Enter an email or a phone number.')

  if (email) {
    const { data: existing } = await supabase
      .from('leads')
      .select('id, first_name, last_name')
      .ilike('email', email.replace(/[\\%_]/g, '\\$&'))
      .limit(1)
    if (existing?.length) {
      const name = `${existing[0].first_name || ''} ${existing[0].last_name || ''}`.trim()
      const err = new Error(`A lead with this email already exists${name ? ` (${name})` : ''}.`)
      err.existingLeadId = existing[0].id
      throw err
    }
  }

  const caseNumber = clean(input.propertyCaseNumber)
  let property = null
  if (caseNumber) {
    const { data } = await supabase
      .from('properties')
      .select('id, address, city, state, price')
      .eq('case_number', caseNumber)
      .maybeSingle()
    property = data
  }

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      first_name: clean(input.firstName),
      last_name: clean(input.lastName),
      email,
      phone,
      state: clean(input.state)?.toUpperCase() || null,
      property_case_number: caseNumber,
      property_id: property?.id || null,
      property_address: property ? [property.address, property.city, property.state].filter(Boolean).join(', ') : null,
      property_price: property?.price ?? null,
      message: clean(input.message),
      source: clean(input.source) || 'manual',
      status: 'new_lead',
    })
    .select()
    .single()
  if (error) throw error

  await supabase.from('lead_events').insert({
    lead_id: lead.id,
    event_type: 'lead_received',
    event_data: { source: lead.source, form_type: 'admin_manual' },
  })

  return lead
}
