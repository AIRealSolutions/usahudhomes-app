/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth()
  }, [])

  // Initialize authentication
  const initializeAuth = async () => {
    try {
      setLoading(true)
      
      // Try Supabase auth first
      const result = await authService.getSession()
      
      if (result.success && result.data) {
        setUser(result.data.session?.user || null)
        setProfile(result.data.profile)
        setRole(result.data.role)
        
        // Store in localStorage for quick access
        if (result.data.role) {
          localStorage.setItem('userRole', result.data.role)
        }
        if (result.data.profile) {
          localStorage.setItem('userProfile', JSON.stringify(result.data.profile))
        }
      } else {
        // Fallback to legacy localStorage auth (temporary during transition)
        const legacyAuth = localStorage.getItem('isAuthenticated')
        const legacyRole = localStorage.getItem('userRole')
        const legacyEmail = localStorage.getItem('userEmail')
        
        if (legacyAuth === 'true' && legacyRole) {
          console.log('Using legacy auth during transition')
          // Create a mock user object for legacy auth
          setUser({ email: legacyEmail || 'legacy@user.com' })
          setProfile({ 
            email: legacyEmail || 'legacy@user.com',
            role: legacyRole,
            first_name: 'Legacy',
            last_name: 'User'
          })
          setRole(legacyRole)
        } else {
          setUser(null)
          setProfile(null)
          setRole(null)
          localStorage.removeItem('userRole')
          localStorage.removeItem('userProfile')
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error)
      
      // Fallback to legacy auth on error
      const legacyAuth = localStorage.getItem('isAuthenticated')
      const legacyRole = localStorage.getItem('userRole')
      const legacyEmail = localStorage.getItem('userEmail')
      
      if (legacyAuth === 'true' && legacyRole) {
        console.log('Using legacy auth after error')
        setUser({ email: legacyEmail || 'legacy@user.com' })
        setProfile({ 
          email: legacyEmail || 'legacy@user.com',
          role: legacyRole,
          first_name: 'Legacy',
          last_name: 'User'
        })
        setRole(legacyRole)
      } else {
        setUser(null)
        setProfile(null)
        setRole(null)
      }
    } finally {
      setLoading(false)
      setInitialized(true)
    }
  }

  // Set up auth state listener
  useEffect(() => {
    // Only set up listener after initial auth is complete
    if (!initialized) return

    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session, profileData) => {
        console.log('Auth state changed:', event)
        
        // Don't update loading state from listener to avoid conflicts
        if (session?.user) {
          setUser(session.user)
          setProfile(profileData)
          setRole(profileData?.role || null)
          
          if (profileData?.role) {
            localStorage.setItem('userRole', profileData.role)
          }
          if (profileData) {
            localStorage.setItem('userProfile', JSON.stringify(profileData))
          }
        } else {
          setUser(null)
          setProfile(null)
          setRole(null)
          localStorage.removeItem('userRole')
          localStorage.removeItem('userProfile')
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [initialized])

  // Sign up
  const signUp = async (userData) => {
    try {
      setLoading(true)
      const result = await authService.signUp(userData)
      
      if (result.success && result.data) {
        setUser(result.data.user)
        setProfile(result.data.profile)
        setRole(result.data.profile?.role || 'end_user')
        
        if (result.data.profile?.role) {
          localStorage.setItem('userRole', result.data.profile.role)
        }
        if (result.data.profile) {
          localStorage.setItem('userProfile', JSON.stringify(result.data.profile))
        }
      }
      
      return result
    } catch (error) {
      console.error('Error in signUp:', error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // Sign in
  const signIn = async (email, password) => {
    try {
      setLoading(true)
      const result = await authService.signIn(email, password)
      
      if (result.success && result.data) {
        setUser(result.data.user)
        setProfile(result.data.profile)
        setRole(result.data.role)
        
        if (result.data.role) {
          localStorage.setItem('userRole', result.data.role)
        }
        if (result.data.profile) {
          localStorage.setItem('userProfile', JSON.stringify(result.data.profile))
        }
      }
      
      return result
    } catch (error) {
      console.error('Error in signIn:', error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true)
      const result = await authService.signOut()
      
      if (result.success) {
        setUser(null)
        setProfile(null)
        setRole(null)
        localStorage.removeItem('userRole')
        localStorage.removeItem('userProfile')
      }
      
      return result
    } catch (error) {
      console.error('Error in signOut:', error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // Update profile
  const updateProfile = async (updates) => {
    try {
      if (!user) {
        return { success: false, error: 'No authenticated user' }
      }
      
      const result = await authService.updateProfile(user.id, updates)
      
      if (result.success && result.data) {
        setProfile(result.data)
        localStorage.setItem('userProfile', JSON.stringify(result.data))
      }
      
      return result
    } catch (error) {
      console.error('Error in updateProfile:', error)
      return { success: false, error: error.message }
    }
  }

  // Reset password
  const resetPassword = async (email) => {
    try {
      return await authService.resetPassword(email)
    } catch (error) {
      console.error('Error in resetPassword:', error)
      return { success: false, error: error.message }
    }
  }

  // Update password
  const updatePassword = async (newPassword) => {
    try {
      return await authService.updatePassword(newPassword)
    } catch (error) {
      console.error('Error in updatePassword:', error)
      return { success: false, error: error.message }
    }
  }

  // Check if user has role
  const hasRole = (allowedRoles) => {
    if (!role) return false
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
    return roles.includes(role)
  }

  // Check if user is admin
  const isAdmin = () => role === 'admin'

  // Check if user is broker
  const isBroker = () => role === 'broker'

  // Check if user is end user
  const isEndUser = () => role === 'end_user'

  // Get dashboard route based on role
  const getDashboardRoute = () => {
    switch (role) {
      case 'admin':
        return '/broker-dashboard' // Admin goes to broker dashboard (main page)
      case 'broker':
        return '/broker-dashboard'
      case 'end_user':
        return '/user-dashboard'
      default:
        return '/login'
    }
  }

  const value = {
    user,
    profile,
    role,
    loading,
    initialized,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
    hasRole,
    isAdmin,
    isBroker,
    isEndUser,
    getDashboardRoute,
    isAuthenticated: !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
