import React, { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setLoading(false)
        return
      }

      setUser(session.user)

      // Get user role from database
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (error) throw error

      setUserRole(userData?.role || 'end_user')
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Simple dashboard based on role
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-4">Welcome to Your Dashboard!</h1>
        <p className="text-gray-600 mb-6">
          You're logged in as: <span className="font-semibold">{user.email}</span>
        </p>
        <p className="text-gray-600 mb-6">
          Your role: <span className="font-semibold capitalize">{userRole?.replace('_', ' ')}</span>
        </p>

        {userRole === 'admin' && (
          <div className="mt-8 p-6 bg-blue-50 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Admin Dashboard</h2>
            <p className="text-gray-700 mb-4">
              You have full access to manage properties, customers, and agents.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">• Manage all HUD properties</p>
              <p className="text-sm text-gray-600">• View and assign customer leads</p>
              <p className="text-sm text-gray-600">• Manage broker agents</p>
            </div>
          </div>
        )}

        {userRole === 'broker' && (
          <div className="mt-8 p-6 bg-green-50 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Broker Dashboard</h2>
            <p className="text-gray-700 mb-4">
              Manage your assigned leads and consultations.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">• View assigned referrals</p>
              <p className="text-sm text-gray-600">• Track active consultations</p>
              <p className="text-sm text-gray-600">• Communicate with clients</p>
            </div>
          </div>
        )}

        {userRole === 'end_user' && (
          <div className="mt-8 p-6 bg-purple-50 rounded-lg">
            <h2 className="text-xl font-bold mb-4">My Inquiries</h2>
            <p className="text-gray-700 mb-4">
              Track your property inquiries and saved homes.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">• View your property inquiries</p>
              <p className="text-sm text-gray-600">• Track inquiry status</p>
              <p className="text-sm text-gray-600">• Update your profile</p>
            </div>
          </div>
        )}

        <div className="mt-8 flex gap-4">
          <Link
            to="/search"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Search Properties
          </Link>
          <Link
            to="/"
            className="inline-block bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
