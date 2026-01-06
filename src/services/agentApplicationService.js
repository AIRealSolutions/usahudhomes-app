/**
 * Agent Application Service
 * Handles agent registration, verification, and approval workflow
 */

import { supabase } from '../lib/supabase'
import { sendEmail } from './emailService'
import crypto from 'crypto'

export const agentApplicationService = {
  /**
   * Submit a new agent application
   */
  async submitApplication(applicationData) {
    try {
      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex')

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
      const verificationLink = `${window.location.origin}/agent/verify-email?token=${token}`

      const emailContent = `
        <h2>Verify Your Email Address</h2>
        <p>Hi ${firstName},</p>
        <p>Thank you for applying to become a HUD Home Lead Partner!</p>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email Address</a></p>
        <p>Or copy and paste this link into your browser:</p>
        <p>${verificationLink}</p>
        <p>This link will expire in 24 hours.</p>
        <p><strong>What's Next?</strong></p>
        <ul>
          <li>Verify your email address</li>
          <li>We'll verify your real estate license</li>
          <li>An administrator will review your application</li>
          <li>You'll receive login credentials once approved</li>
        </ul>
        <p>Questions? Reply to this email or contact us at support@usahudhomes.com</p>
        <p>Best regards,<br>USA HUD Homes Team</p>
      `

      await sendEmail({
        to: email,
        subject: 'Verify Your Email - HUD Home Lead Partner Application',
        html: emailContent
      })

      // Log email sent
      await this.logVerificationAction(applicationId, null, 'verification_email_sent', `Verification email sent to ${email}`)

      return { success: true }
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
      const newToken = crypto.randomBytes(32).toString('hex')

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
    const emailContent = `
      <h2>Congratulations! Your Application Has Been Approved</h2>
      <p>Hi ${application.first_name},</p>
      <p>Great news! Your application to become a HUD Home Lead Partner has been approved.</p>
      <p><strong>You can now start receiving qualified HUD home buyer leads!</strong></p>
      <h3>Next Steps:</h3>
      <ol>
        <li>Log in to your broker dashboard at: <a href="${window.location.origin}/broker-dashboard">${window.location.origin}/broker-dashboard</a></li>
        <li>Complete your profile setup</li>
        <li>Review your lead preferences</li>
        <li>Start receiving leads!</li>
      </ol>
      <p><strong>Your Login Credentials:</strong></p>
      <p>Email: ${application.email}<br>
      Password: (Use the same password you set during registration, or reset it if needed)</p>
      <p>Questions? Contact us at support@usahudhomes.com or call (910) 363-6147</p>
      <p>Welcome to the team!<br>USA HUD Homes</p>
    `

    await sendEmail({
      to: application.email,
      subject: 'Welcome to HUD Home Lead Partners - Application Approved!',
      html: emailContent
    })
  },

  /**
   * Send rejection email
   */
  async sendRejectionEmail(application, reason) {
    const emailContent = `
      <h2>Application Status Update</h2>
      <p>Hi ${application.first_name},</p>
      <p>Thank you for your interest in becoming a HUD Home Lead Partner.</p>
      <p>After careful review, we are unable to approve your application at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>If you believe this decision was made in error or if your circumstances have changed, please contact us at support@usahudhomes.com</p>
      <p>Best regards,<br>USA HUD Homes Team</p>
    `

    await sendEmail({
      to: application.email,
      subject: 'Application Status Update - HUD Home Lead Partners',
      html: emailContent
    })
  }
}

export default agentApplicationService
