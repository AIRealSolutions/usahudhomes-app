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
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('email', lead.email)
      .eq('is_active', true)
      .limit(1)
    if (existing?.length) customerId = existing[0].id
  }
  if (!customerId) {
    const { data: newCust } = await supabase
      .from('customers')
      .insert([{
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        state: lead.state,
        lead_source: lead.source || 'website',
        status: 'active',
        is_active: true,
      }])
      .select('id')
      .single()
    if (newCust) customerId = newCust.id
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
