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
      const verificationToken = Math.random().toString(36).substring(2) + Date.now().toString(36)

      // Prepare application data
      const application = {
        first_name: applicationData.firstName,
        last_name: applicationData.lastName,
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
        terms_agreed_at: new Date().toISOString(),
        terms_version: 'v1.0',
        email_verification_token: verificationToken,
        email_verified: false,
        status: 'pending'
      }

      // Insert application
      const { data, error } = await supabase
        .from('agent_applications')
        .insert([application])
        .select()
        .single()

      if (error) throw error

      // Log the submission
      await this.logVerificationAction(data.id, null, 'application_submitted', 'Application submitted by agent')

      // Send verification email
      await this.sendVerificationEmail(data.id, applicationData.email, verificationToken, applicationData.firstName)

      return {
        success: true,
        data: {
          id: data.id,
          email: data.email,
          status: data.status
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
  async sendVerificationEmail(applicationId, email, token, firstName) {
    try {
      // Get full application data
      const { data: application } = await supabase
        .from('agent_applications')
        .select('*')
        .eq('id', applicationId)
        .single()

      if (!application) throw new Error('Application not found')

      // Use the new email service
      const result = await emailService.sendAgentVerificationEmail(application, token)

      // Log email sent
      await this.logVerificationAction(applicationId, null, 'verification_email_sent', `Verification email sent to ${email}`)

      return result
    } catch (error) {
      console.error('Error sending verification email:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token) {
    try {
      // Find application with this token
      const { data: application, error: findError } = await supabase
        .from('agent_applications')
        .select('*')
        .eq('email_verification_token', token)
        .eq('email_verified', false)
        .single()

      if (findError || !application) {
        return {
          success: false,
          error: 'Invalid or expired verification token'
        }
      }

      // Check if token is expired (24 hours)
      const createdAt = new Date(application.created_at)
      const now = new Date()
      const hoursDiff = (now - createdAt) / (1000 * 60 * 60)

      if (hoursDiff > 24) {
        return {
          success: false,
          error: 'Verification link has expired. Please request a new one.'
        }
      }

      // Update application as verified
      const { error: updateError } = await supabase
        .from('agent_applications')
        .update({
          email_verified: true,
          email_verified_at: new Date().toISOString(),
          email_verification_token: null,
          status: 'under_review'
        })
        .eq('id', application.id)

      if (updateError) throw updateError

      // Log verification
      await this.logVerificationAction(application.id, null, 'email_verified', 'Email address verified successfully')

      // Notify admins of new application
      await this.notifyAdminsOfNewApplication(application)

      return {
        success: true,
        data: {
          id: application.id,
          email: application.email,
          firstName: application.first_name
        }
      }
    } catch (error) {
      console.error('Error verifying email:', error)
      return {
        success: false,
        error: error.message || 'Failed to verify email'
      }
    }
  },

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email) {
    try {
      // Find pending application
      const { data: application, error } = await supabase
        .from('agent_applications')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('email_verified', false)
        .eq('status', 'pending')
        .single()

      if (error || !application) {
        return {
          success: false,
          error: 'No pending application found for this email'
        }
      }

      // Generate new token
      const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36)

      // Update token
      await supabase
        .from('agent_applications')
        .update({ email_verification_token: newToken })
        .eq('id', application.id)

      // Send new email
      await this.sendVerificationEmail(application.id, email, newToken, application.first_name)

      return { success: true }
    } catch (error) {
      console.error('Error resending verification email:', error)
      return { success: false, error: error.message }
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
