import { supabase } from '../config/supabase'

/**
 * Agent Invitation Service
 * Handles sending invitation emails to newly registered agents
 */

export const agentInvitationService = {
  /**
   * Send invitation email to a new agent
   * Creates Supabase auth user and sends password setup email
   * 
   * @param {Object} agentData - Agent information
   * @param {string} agentData.email - Agent's email address
   * @param {string} agentData.firstName - Agent's first name
   * @param {string} agentData.lastName - Agent's last name
   * @returns {Promise<Object>} Result with success status
   */
  async sendInvitation(agentData) {
    try {
      const { email, firstName, lastName } = agentData

      // Create auth user with Supabase
      // This will send an invitation email automatically
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: 'broker',
          full_name: `${firstName} ${lastName}`
        },
        redirectTo: `${window.location.origin}/broker-dashboard`
      })

      if (error) {
        console.error('Error sending invitation:', error)
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data: data,
        message: `Invitation email sent to ${email}`
      }
    } catch (error) {
      console.error('Exception sending invitation:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Resend invitation email to an existing agent
   * 
   * @param {string} email - Agent's email address
   * @returns {Promise<Object>} Result with success status
   */
  async resendInvitation(email) {
    try {
      // Check if user already exists in auth
      const { data: existingUser, error: checkError } = await supabase.auth.admin.getUserByEmail(email)

      if (checkError) {
        console.error('Error checking user:', checkError)
      }

      // If user exists and hasn't confirmed email, resend
      if (existingUser && !existingUser.email_confirmed_at) {
        const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${window.location.origin}/broker-dashboard`
        })

        if (error) {
          return {
            success: false,
            error: error.message
          }
        }

        return {
          success: true,
          message: `Invitation email resent to ${email}`
        }
      }

      // If user doesn't exist, send new invitation
      if (!existingUser) {
        const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${window.location.origin}/broker-dashboard`
        })

        if (error) {
          return {
            success: false,
            error: error.message
          }
        }

        return {
          success: true,
          message: `Invitation email sent to ${email}`
        }
      }

      // User already confirmed
      return {
        success: false,
        error: 'User has already set up their account'
      }
    } catch (error) {
      console.error('Exception resending invitation:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Check if agent has accepted invitation
   * 
   * @param {string} email - Agent's email address
   * @returns {Promise<Object>} Result with status
   */
  async checkInvitationStatus(email) {
    try {
      const { data: user, error } = await supabase.auth.admin.getUserByEmail(email)

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      if (!user) {
        return {
          success: true,
          status: 'not_invited',
          message: 'No invitation sent yet'
        }
      }

      if (user.email_confirmed_at) {
        return {
          success: true,
          status: 'accepted',
          message: 'Agent has set up their account',
          confirmedAt: user.email_confirmed_at
        }
      }

      return {
        success: true,
        status: 'pending',
        message: 'Invitation sent, waiting for agent to accept',
        invitedAt: user.invited_at
      }
    } catch (error) {
      console.error('Exception checking invitation status:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Generate a password reset link for an agent
   * Useful if they forgot their password
   * 
   * @param {string} email - Agent's email address
   * @returns {Promise<Object>} Result with success status
   */
  async sendPasswordReset(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/broker-dashboard`
      })

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        message: `Password reset email sent to ${email}`
      }
    } catch (error) {
      console.error('Exception sending password reset:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}
