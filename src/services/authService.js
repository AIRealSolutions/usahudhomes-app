/**
 * Authentication Service
 * Handles user authentication, role management, and session control
 */

import { supabase } from '../config/supabase'

class AuthService {
  /**
   * Sign up new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Result with user and profile
   */
  async signUp({ email, password, firstName, lastName, role = 'end_user', phone, state }) {
    try {
      // Safety check
      if (!supabase || !supabase.auth) {
        return { success: false, error: 'Database not configured', data: null }
      }
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: role
          }
        }
      })

      if (authError) {
        console.error('Supabase auth signup error:', authError)
        return { success: false, error: authError.message, data: null }
      }

      if (!authData.user) {
        return { success: false, error: 'User creation failed', data: null }
      }

      // Create profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email,
          role,
          first_name: firstName,
          last_name: lastName,
          phone,
          state,
          is_active: true
        })
        .select()
        .single()

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // Auth user created but profile failed - should handle cleanup
        return { success: false, error: profileError.message, data: authData }
      }

      return {
        success: true,
        data: {
          user: authData.user,
          profile: profileData
        }
      }
    } catch (error) {
      console.error('Error in signUp:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Sign in user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Result with user, profile, and role
   */
  async signIn(email, password) {
    try {
      // Safety check
      if (!supabase || !supabase.auth) {
        return { success: false, error: 'Database not configured', data: null }
      }
      // Authenticate user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        console.error('Supabase auth signin error:', authError)
        return { success: false, error: authError.message, data: null }
      }

      if (!authData.user) {
        return { success: false, error: 'Authentication failed', data: null }
      }

      // Get user profile and role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        return {
          success: false,
          error: 'Profile not found',
          data: { user: authData.user, profile: null }
        }
      }

      // Check if user is active
      if (!profileData.is_active) {
        await this.signOut()
        return { success: false, error: 'Account is inactive', data: null }
      }

      // Update last login
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', authData.user.id)

      return {
        success: true,
        data: {
          user: authData.user,
          profile: profileData,
          role: profileData.role
        }
      }
    } catch (error) {
      console.error('Error in signIn:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Sign out user
   * @returns {Promise<Object>} Result
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('Supabase signout error:', error)
        return { success: false, error: error.message }
      }

      // Clear local storage
      localStorage.removeItem('userRole')
      localStorage.removeItem('userProfile')

      return { success: true }
    } catch (error) {
      console.error('Error in signOut:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get current session
   * @returns {Promise<Object>} Session data
   */
  async getSession() {
    try {
      // Safety check
      if (!supabase || !supabase.auth) {
        console.error('Supabase not initialized')
        return { success: false, error: 'Database not configured', data: null }
      }
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Get session error:', error)
        return { success: false, error: error.message, data: null }
      }

      if (!session) {
        return { success: false, error: 'No active session', data: null }
      }

      // Get profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        return {
          success: true,
          data: { session, profile: null, role: null }
        }
      }

      return {
        success: true,
        data: {
          session,
          profile: profileData,
          role: profileData.role
        }
      }
    } catch (error) {
      console.error('Error in getSession:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Get current user
   * @returns {Promise<Object>} User data
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        console.error('Get user error:', error)
        return { success: false, error: error.message, data: null }
      }

      if (!user) {
        return { success: false, error: 'No authenticated user', data: null }
      }

      // Get profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        return {
          success: true,
          data: { user, profile: null, role: null }
        }
      }

      return {
        success: true,
        data: {
          user,
          profile: profileData,
          role: profileData.role
        }
      }
    } catch (error) {
      console.error('Error in getCurrentUser:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Result
   */
  async updateProfile(userId, updates) {
    try {
      const updateData = {}

      if (updates.firstName) updateData.first_name = updates.firstName
      if (updates.lastName) updateData.last_name = updates.lastName
      if (updates.phone) updateData.phone = updates.phone
      if (updates.state) updateData.state = updates.state
      if (updates.companyName) updateData.company_name = updates.companyName
      if (updates.licenseNumber) updateData.license_number = updates.licenseNumber

      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Profile update error:', error)
        return { success: false, error: error.message, data: null }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error in updateProfile:', error)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Reset password
   * @param {string} email - User email
   * @returns {Promise<Object>} Result
   */
  async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        console.error('Password reset error:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in resetPassword:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Result
   */
  async updatePassword(newPassword) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        console.error('Password update error:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in updatePassword:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Check if user has role
   * @param {string} userId - User ID
   * @param {string|Array} allowedRoles - Role or array of roles
   * @returns {Promise<boolean>} True if user has role
   */
  async hasRole(userId, allowedRoles) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (error || !data) {
        return false
      }

      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
      return roles.includes(data.role)
    } catch (error) {
      console.error('Error in hasRole:', error)
      return false
    }
  }

  /**
   * Listen to auth state changes
   * @param {Function} callback - Callback function
   * @returns {Object} Subscription
   */
  onAuthStateChange(callback) {
    // Safety check: ensure supabase is initialized
    if (!supabase || !supabase.auth) {
      console.error('Supabase not initialized - check environment variables')
      return { data: { subscription: { unsubscribe: () => {} } } }
    }
    
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Get profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        callback(event, session, profileData)
      } else {
        callback(event, null, null)
      }
    })
  }
}

export const authService = new AuthService()
export default authService
