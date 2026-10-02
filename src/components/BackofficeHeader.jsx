import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, Shield, Briefcase, Settings } from 'lucide-react'

/**
 * BackofficeHeader Component
 * Unified header for Admin and Broker dashboards with role switching
 */
export default function BackofficeHeader({ title }) {
  const { user, isAdmin, isBroker, signOut } = useAuth()
  const navigate = useNavigate()
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const getRoleInfo = () => {
    if (isAdmin?.()) {
      return { label: 'Admin', color: 'text-purple-600', bgColor: 'bg-purple-50', icon: Shield }
    }
    if (isBroker?.()) {
      return { label: 'Broker', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Briefcase }
    }
    return null
  }

  const roleInfo = getRoleInfo()
  if (!roleInfo) return null

  const RoleIcon = roleInfo.icon

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Title */}
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="p-2 hover:bg-gray-100 rounded-lg relative text-gray-600 hover:text-gray-900 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Role & Settings Menu */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${roleInfo.bgColor} hover:opacity-80`}
            >
              <RoleIcon className={`w-4 h-4 ${roleInfo.color}`} />
              <span className={`text-sm font-medium ${roleInfo.color} hidden sm:inline`}>{roleInfo.label}</span>
              <ChevronDown className={`w-4 h-4 ${roleInfo.color} transition-transform ${roleMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl z-50 py-2 border border-gray-200">
                {/* Current Role Info */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Logged in as</p>
                  <p className="font-medium text-gray-900 text-sm">{user?.email}</p>
                  <p className={`text-xs ${roleInfo.color} font-semibold mt-1`}>{roleInfo.label} Dashboard</p>
                </div>

                {/* Role Options */}
                {isAdmin?.() && (
                  <>
                    <button
                      onClick={() => {
                        navigate('/dashboard')
                        setRoleMenuOpen(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <Shield className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Admin Dashboard</p>
                        <p className="text-xs text-gray-500">Full system control</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        navigate('/broker-dashboard')
                        setRoleMenuOpen(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-t border-gray-100"
                    >
                      <Briefcase className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">View as Broker</p>
                        <p className="text-xs text-gray-500">See broker perspective</p>
                      </div>
                    </button>
                  </>
                )}

                {isBroker?.() && (
                  <div className="px-4 py-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600 text-center">
                      Admin access not available for your role
                    </p>
                  </div>
                )}

                {/* Settings & Logout */}
                <div className="border-t border-gray-100 pt-2">
                  <button
                    onClick={() => {
                      navigate('/settings')
                      setRoleMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors text-gray-700 hover:text-gray-900"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">Account Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      handleSignOut()
                      setRoleMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-red-50 transition-colors text-red-600 hover:text-red-700"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
