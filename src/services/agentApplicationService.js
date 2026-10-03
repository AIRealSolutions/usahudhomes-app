/**
 * Agent Application Service
 * Handles agent registration, verification, and approval workflow
 */

import { supabase } from '../config/supabase'
import emailService from './emailService'

export const agentApplicationService = {
  /**
   * Submit a new agent application
   */
  async submitApplication(applicationData) {
    try {
      // Generate email verification token
      const verificationToken = crypto.randomUUID().replace(/-/g, '')

      // Prepare application data
      const application = {
        first_name: applicationData.firstName,
        last_name: applicationData.lastName,
        legal_name: applicationData.legalName,
        email: applicationData.email.toLowerCase(),
        phone: applicationData.phone,
        company: applicationData.company || null,
        license_number: applicationData.licenseNumber,
        license_state: applicationData.licenseState,
        years_experience: applicationData.yearsExperience || 0,
        bio: applicationData.bio || null,
        states_covered: applicationData.statesCovered,
        specialties: applicationData.specialties,
        referral_fee_percentage: applicationData.referralFeePercentage || 25.00,
        agreed_to_terms: applicationData.agreedToTerms,
        signature: applicationData.signature,
        signature_date: new Date().toISOString(),
        terms_agreed_at: new Date().toISOString(),
        terms_version: 'v1.0',
        email_verification_token: verificationToken,
        email_verified: false,
        status: 'pending'
      }

      // Applicants are signed out and can insert but not read back, so the id is generated here.
      const data = { ...application, id: crypto.randomUUID() }
      const { error } = await supabase
        .from('agent_applications')
        .insert([data])

      if (error) throw error

      // Log the submission
      await this.logVerificationAction(data.id, null, 'application_submitted', 'Application submitted by agent')

      // The server issues the token and sends the verification email.
      const emailResult = await this.resendVerificationEmail(data.email)
      if (!emailResult.success) console.error('Verification email not sent:', emailResult.error)

      return {
        success: true,
        data: {
          id: data.id,
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          status: data.status,
          email_verified: false
        }
      }
    } catch (error) {
      console.error('Error submitting application:', error)
      return {
        success: false,
        error: error.message || 'Failed to submit application'
      }
    }
  },

  /**
   * Send email verification link
   */
  /**
   * Verify email with token (server-side: applicants can't read agent_applications under RLS)
   */
  async verifyEmail(token) {
    try {
      const response = await fetch('/api/notifications?action=agent-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success) {
        return { success: false, error: result.error || 'Invalid or expired verification token' }
      }
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error verifying email:', error)
      return { success: false, error: 'Failed to verify email' }
    }
  },

  /**
   * Resend verification email (server issues the new token)
   */
  async resendVerificationEmail(email) {
    try {
      const response = await fetch('/api/notifications?action=agent-resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success) {
        return { success: false, error: result.error || 'Failed to resend verification email' }
      }
      return { success: true }
    } catch (error) {
      console.error('Error resending verification email:', error)
      return { success: false, error: 'Failed to resend verification email' }
    }
  },

  /**
   * Get application by ID
   */
  async getApplication(applicationId) {
    try {
      const { data, error } = await supabase
        .from('agent_applications')
        .select('*')
        .eq('id', applicationId)
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error getting application:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Get all pending applications (admin)
   */
  async getPendingApplications() {
    try {
      const { data, error } = await supabase
        .from('agent_applications')
        .select('*')
        .in('status', ['under_review', 'pending'])
        .order('created_at', { ascending: false })

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error getting pending applications:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Approve application (admin)
   */
  async approveApplication(applicationId, adminId) {
    try {
      // Get application
      const { data: application, error: getError } = await supabase
        .from('agent_applications')
        .select('*')
        .eq('id', applicationId)
        .single()

      if (getError) throw getError

      // Create agent record
      const agentData = {
        first_name: application.first_name,
        last_name: application.last_name,
        email: application.email,
        phone: application.phone,
        company: application.company,
        license_number: application.license_number,
        license_state: application.license_state,
        years_experience: application.years_experience,
        bio: application.bio,
        states_covered: application.states_covered,
        specialties: application.specialties,
        referral_fee_percentage: application.referral_fee_percentage,
        application_id: applicationId,
        is_admin: false,
        is_active: true,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString()
      }

      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .insert([agentData])
        .select()
        .single()

      if (agentError) throw agentError

      // Create referral agreement
      await this.createReferralAgreement(agent.id, application)

      // Update application status
      await supabase
        .from('agent_applications')
        .update({
          status: 'approved',
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId)

      // Log approval
      await this.logVerificationAction(applicationId, agent.id, 'approved', 'Application approved by admin', adminId)

      // Send approval email with credentials
      await this.sendApprovalEmail(application, agent.id)

      return { success: true, data: agent }
    } catch (error) {
      console.error('Error approving application:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Reject application (admin)
   */
  async rejectApplication(applicationId, adminId, reason) {
    try {
      await supabase
        .from('agent_applications')
        .update({
          status: 'rejected',
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', applicationId)

      // Log rejection
      await this.logVerificationAction(applicationId, null, 'rejected', `Application rejected: ${reason}`, adminId)

      // Send rejection email
      const { data: application } = await this.getApplication(applicationId)
      if (application) {
        await this.sendRejectionEmail(application, reason)
      }

      return { success: true }
    } catch (error) {
      console.error('Error rejecting application:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Create referral agreement
   */
  async createReferralAgreement(agentId, application) {
    try {
      const agreement = {
        agent_id: agentId,
        application_id: application.id,
        referral_fee_percentage: application.referral_fee_percentage,
        states_covered: application.states_covered,
        agreement_version: application.terms_version,
        agreement_text: `Full agreement text for ${application.first_name} ${application.last_name}`,
        agent_signature: `${application.first_name} ${application.last_name}`,
        agent_ip_address: application.ip_address || null,
        signed_at: application.terms_agreed_at,
        status: 'active',
        effective_date: new Date().toISOString().split('T')[0]
      }

      const { data, error } = await supabase
        .from('referral_agreements')
        .insert([agreement])
        .select()
        .single()

      if (error) throw error

      // Update agent with agreement ID
      await supabase
        .from('agents')
        .update({ referral_agreement_id: data.id })
        .eq('id', agentId)

      return { success: true, data }
    } catch (error) {
      console.error('Error creating referral agreement:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Log verification action
   */
  async logVerificationAction(applicationId, agentId, actionType, notes, performedBy = null) {
    try {
      await supabase
        .from('agent_verification_logs')
        .insert([{
          application_id: applicationId,
          agent_id: agentId,
          action_type: actionType,
          performed_by: performedBy,
          notes: notes
        }])

      return { success: true }
    } catch (error) {
      console.error('Error logging verification action:', error)
      return { success: false }
    }
  },

  /**
   * Notify admins of new application
   */
  async notifyAdminsOfNewApplication(application) {
    // This would send notifications to admin users
    // Implementation depends on your notification system
    console.log('New application ready for review:', application.id)
  },

  /**
   * Send approval email
   */
  async sendApprovalEmail(application, agentId) {
    // Generate temporary password (in production, use proper auth system)
    const temporaryPassword = Math.random().toString(36).slice(-8)
    
    const credentials = {
      email: application.email,
      temporaryPassword: temporaryPassword
    }

    return await emailService.sendAgentApprovalEmail(application, credentials)
  },

  /**
   * Send rejection email
   */
  async sendRejectionEmail(application, reason) {
    return await emailService.sendAgentRejectionEmail(application, reason)
  }
}

export default agentApplicationService
