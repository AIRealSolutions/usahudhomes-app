/**
 * Agent buyer referral program — data access for referring agents and admins.
 * Agent writes go through security-definer RPCs; admin writes are direct and
 * limited to admins by row level security.
 */

import { supabase } from '../config/supabase'
import { AGREEMENT_VERSION, PROGRAM_TERMS_VERSION, buildAgreementText } from '../data/buyerReferralProgram'

export const AGREEMENT_BUCKET = 'referral-agreements'

const unwrap = ({ data, error }) => {
  if (error) throw new Error(error.message)
  return data
}

// ── Referring agent ─────────────────────────────────────────────────────────
export async function fetchMyRegistration(userId) {
  const agent = unwrap(await supabase.from('referral_agents').select('*').eq('user_id', userId).maybeSingle())
  if (!agent) return { agent: null, brokerage: null }
  const brokerage = unwrap(await supabase.from('referral_brokerages')
    .select('id, name, state, firm_license_number, broker_in_charge_name, verification_status, w9_status, payment_setup_status')
    .eq('id', agent.brokerage_id).maybeSingle())
  return { agent, brokerage }
}

export async function registerReferralAgent(f) {
  return unwrap(await supabase.rpc('register_referral_agent', {
    p_first_name: f.firstName, p_last_name: f.lastName, p_phone: f.phone,
    p_license_number: f.licenseNumber, p_license_state: f.licenseState,
    p_brokerage_name: f.brokerageName, p_brokerage_state: f.brokerageState,
    p_firm_license_number: f.firmLicenseNumber, p_broker_in_charge_name: f.brokerInCharge,
    p_brokerage_email: f.brokerageEmail, p_brokerage_phone: f.brokeragePhone, p_brokerage_address: f.brokerageAddress,
    p_terms_version: PROGRAM_TERMS_VERSION,
  }))
}

export async function submitBuyerReferral(f) {
  return unwrap(await supabase.rpc('submit_buyer_referral', {
    p_first_name: f.firstName, p_last_name: f.lastName, p_email: f.email, p_phone: f.phone,
    p_nc_area: f.ncArea, p_relationship: f.relationship, p_notes: f.notes,
    p_other_agency_status: f.otherAgencyStatus, p_consent_given: f.consent, p_consent_text: f.consentText,
  }))
}

/** Referrals with their agreement and payments; RLS limits agents to their own. */
export async function fetchReferrals({ agentId } = {}) {
  let q = supabase.from('buyer_referrals')
    .select('*, buyer_referral_agreements(*), buyer_referral_payments(*)')
    .order('created_at', { ascending: false })
  if (agentId) q = q.eq('referral_agent_id', agentId)
  return unwrap(await q)
}

export async function signAgreement(agreementId, { signerName, signerTitle, documentPath = null }) {
  return unwrap(await supabase.rpc('sign_buyer_referral_agreement', {
    p_agreement_id: agreementId, p_signer_name: signerName, p_signer_title: signerTitle,
    p_attest_buyer_disclosure: true, p_attest_no_nc_activity: true, p_attest_firm_eligible: true,
    p_document_path: documentPath,
  }))
}

/** Upload a signed PDF to {brokerage_id}/{agreement_id}/ and return its path. */
export async function uploadAgreementPdf(agreement, file) {
  if (file.type !== 'application/pdf') throw new Error('Upload the signed agreement as a PDF')
  if (file.size > 10 * 1024 * 1024) throw new Error('The PDF must be 10 MB or smaller')
  const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(-80)
  const path = `${agreement.brokerage_id}/${agreement.id}/${Date.now()}-${safe}`
  unwrap(await supabase.storage.from(AGREEMENT_BUCKET).upload(path, file, { contentType: 'application/pdf' }))
  return path
}

export async function agreementPdfUrl(path) {
  const data = unwrap(await supabase.storage.from(AGREEMENT_BUCKET).createSignedUrl(path, 300))
  return data.signedUrl
}

// ── Admin ───────────────────────────────────────────────────────────────────
export async function fetchAdminData() {
  const [referrals, agents, brokerages] = await Promise.all([
    fetchReferrals(),
    supabase.from('referral_agents').select('*').order('created_at', { ascending: false }).then(unwrap),
    supabase.from('referral_brokerages').select('*').order('created_at', { ascending: false }).then(unwrap),
  ])
  return { referrals, agents, brokerages }
}

export async function fetchEvents(referralId) {
  return unwrap(await supabase.from('buyer_referral_events').select('*')
    .eq('referral_id', referralId).order('created_at', { ascending: false }))
}

export async function addNote(referral, note) {
  return unwrap(await supabase.from('buyer_referral_events').insert({
    referral_id: referral.id, brokerage_id: referral.brokerage_id, entity: 'note',
    entity_id: referral.id, event_type: 'note', details: { note },
  }))
}

export async function acceptReferral(referral, agent, brokerage) {
  const effectiveAt = new Date()
  const protectionEndsAt = new Date(effectiveAt)
  protectionEndsAt.setFullYear(protectionEndsAt.getFullYear() + 1)
  const text = buildAgreementText({ referral, agent, brokerage, effectiveAt, protectionEndsAt })
  return unwrap(await supabase.rpc('accept_buyer_referral', {
    p_referral_id: referral.id, p_agreement_version: AGREEMENT_VERSION, p_agreement_text: text,
  }))
}

export async function updateReferral(id, patch) {
  return unwrap(await supabase.from('buyer_referrals').update(patch).eq('id', id).select().single())
}

export async function updateAgreement(id, patch) {
  return unwrap(await supabase.from('buyer_referral_agreements').update(patch).eq('id', id).select().single())
}

export async function updateAgent(id, patch) {
  return unwrap(await supabase.from('referral_agents').update(patch).eq('id', id).select().single())
}

export async function updateBrokerage(id, patch) {
  return unwrap(await supabase.from('referral_brokerages').update(patch).eq('id', id).select().single())
}

export async function createPayment(row) {
  return unwrap(await supabase.from('buyer_referral_payments').insert(row).select().single())
}

export async function updatePayment(id, patch) {
  return unwrap(await supabase.from('buyer_referral_payments').update(patch).eq('id', id).select().single())
}
