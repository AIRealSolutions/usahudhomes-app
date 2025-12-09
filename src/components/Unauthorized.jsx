/**
 * Unauthorized Page
 * Shown when user tries to access a route they don't have permission for
 */

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Unauthorized = () => {
  const navigate = useNavigate()
  const { getDashboardRoute, role } = useAuth()

  const handleGoToDashboard = () => {
    const dashboardRoute = getDashboardRoute()
    navigate(dashboardRoute)
  }

  const handleGoBack = () => {
    navigate(-1)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-red-100 mb-6">
          <svg
            className="h-12 w-12 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Access Denied
        </h1>

        {/* Message */}
        <p className="text-lg text-gray-600 mb-2">
          You don't have permission to access this page.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          {role === 'end_user' && 'This page is only accessible to brokers and administrators.'}
          {role === 'broker' && 'This page is only accessible to administrators.'}
          {!role && 'Please log in to access this page.'}
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleGoToDashboard}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Go to My Dashboard
          </button>
          
          <button
            onClick={handleGoBack}
            className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Go Back
          </button>
        </div>

        {/* Help Text */}
        <p className="mt-8 text-xs text-gray-500">
          If you believe you should have access to this page, please contact support.
        </p>
      </div>
    </div>
  )
}

export default Unauthorized
