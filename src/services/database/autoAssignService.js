/**
 * Auto-Assignment Service
 * Automatically assigns new consultations to available agents
 */

import { referralService } from './referralService'

class AutoAssignService {
  /**
   * Auto-assign consultation to agent after creation
   * @param {Object} consultation - The consultation object
   * @returns {Promise<Object>} Assignment result
   */
  async autoAssignConsultation(consultation) {
    try {
      console.log('🔄 Auto-assigning consultation to agent...')
      console.log('   Consultation ID:', consultation.id)
      console.log('   State:', consultation.state || 'Not specified')

      // Assign to agent (will auto-select based on state)
      const result = await referralService.assignConsultationToAgent(consultation.id)

      if (result.success) {
        console.log('✅ Consultation auto-assigned successfully!')
        console.log('   Agent:', result.data.agents?.first_name, result.data.agents?.last_name)
        console.log('   Expires:', result.data.referral_expires_at)
      } else {
        console.log('⚠️  Auto-assignment failed:', result.error)
      }

      return result
    } catch (error) {
      console.error('❌ Error in auto-assignment:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Check if auto-assignment is enabled
   * @returns {boolean} True if enabled
   */
  isAutoAssignEnabled() {
    // Can be controlled via environment variable
    return process.env.VITE_AUTO_ASSIGN_ENABLED !== 'false'
  }
}

// Export singleton instance
export const autoAssignService = new AutoAssignService()
export default autoAssignService
