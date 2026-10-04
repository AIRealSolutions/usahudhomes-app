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
  async signUp({ email, password, firstName, lastName, role = 'end_user', phone, state, address }) {
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
          // Saved to the profile by the on_auth_user_created trigger, even before email confirmation
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone || undefined,
            state: state || undefined,
            address: address || undefined,
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

      // Create user record in database
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          role,
          name: [firstName, lastName].filter(Boolean).join(' ') || null,
          first_name: firstName || null,
          last_name: lastName || null,
          phone,
          state: state ? String(state).trim().toUpperCase().slice(0, 2) : null,
          address: address || null
        })
        .select()
        .single()

      // The on_auth_user_created trigger already created the profile; without a session
      // (email confirmation pending) RLS rejects this insert, which is expected.
      if (profileError) {
        console.warn('Client profile insert skipped:', profileError.message)
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
        console.error('Supabase not configured')
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
      let { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      // If profile doesn't exist, create one
      if (profileError) {
        console.log('Profile not found, creating new profile for user')
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: authData.user.email,
            role: 'end_user'
          })
          .select()
          .single()

        if (createError) {
          console.error('Profile creation error:', createError)
          return {
            success: false,
            error: 'Could not create user profile',
            data: { user: authData.user, profile: null }
          }
        }

        profileData = newProfile
      }

      // users table has no is_active column; only block when explicitly disabled
      if (profileData.is_active === false) {
        await this.signOut()
        return { success: false, error: 'Account is inactive', data: null }
      }

      supabase
        .from('users')
        .update({ last_signed_in: new Date().toISOString() })
        .eq('id', authData.user.id)
        .then(({ error }) => error && console.warn('last_signed_in update failed:', error.message))

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
        .from('users')
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
        .from('users')
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
      if (updates.address) updateData.address = updates.address
      if (updates.companyName) updateData.company_name = updates.companyName
      if (updates.licenseNumber) updateData.license_number = updates.licenseNumber

      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('users')
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
        .from('users')
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
    
    return supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        callback(event, null, null)
        return
      }
      // Awaiting Supabase calls inside this callback deadlocks the auth lock; defer them.
      setTimeout(async () => {
        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        callback(event, session, profileData)
      }, 0)
    })
  }
}

export const authService = new AuthService()
export default authService
