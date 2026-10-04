import { supabase } from '../config/supabase'

/**
 * Agent Invitation Service
 * Creating auth users needs the Supabase service key, so invitations go through
 * /api/notifications?action=agent-invite (admin only) instead of supabase.auth.admin.
 */

async function callInvite(body) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch('/api/notifications?action=agent-invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
      },
      body: JSON.stringify({ ...body, redirectTo: `${window.location.origin}/broker-dashboard` })
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || !result.success) {
      return { success: false, error: result.error || `Invitation failed (${response.status})` }
    }
    return { success: true, mode: result.mode, message: result.message }
  } catch (error) {
    console.error('Exception sending invitation:', error)
    return { success: false, error: error.message }
  }
}

export const agentInvitationService = {
  /**
   * Send invitation email to a new agent (creates their login with a "set your password" link)
   * @param {Object} agentData - { email, firstName, lastName }
   */
  async sendInvitation({ email, firstName, lastName }) {
    return callInvite({ email, firstName, lastName })
  },

  /**
   * Resend invitation. If the agent already has an account, a password reset link is sent instead.
   * @param {string} email - Agent's email address
   */
  async resendInvitation(email) {
    return callInvite({ email })
  },

  /**
   * Send a password reset email (works with the anon key)
   * @param {string} email - Agent's email address
   */
  async sendPasswordReset(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/broker-dashboard`
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, message: `Password reset email sent to ${email}` }
    } catch (error) {
      console.error('Exception sending password reset:', error)
      return { success: false, error: error.message }
    }
  }
}
