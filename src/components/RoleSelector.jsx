import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Shield, Briefcase, User, ChevronDown } from 'lucide-react'

export default function RoleSelector() {
  const authContext = useAuth()
  const { role } = authContext
  const isAdmin = typeof authContext.isAdmin === 'function' ? authContext.isAdmin() : false
  const isBroker = typeof authContext.isBroker === 'function' ? authContext.isBroker() : false
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  if (!role) {
    return null
  }

  const getRoleInfo = () => {
    if (isAdmin) {
      return { label: 'Admin Panel', icon: Shield, color: 'text-purple-600', bgColor: 'bg-purple-50' }
    }
    if (isBroker) {
      return { label: 'Broker Portal', icon: Briefcase, color: 'text-blue-600', bgColor: 'bg-blue-50' }
    }
    return { label: 'My Account', icon: User, color: 'text-gray-600', bgColor: 'bg-gray-50' }
  }

  const currentRole = getRoleInfo()
  const CurrentIcon = currentRole.icon

  const handleMenuClick = (path) => {
    navigate(path)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${currentRole.bgColor} ${currentRole.color} hover:opacity-80`}
        type="button"
      >
        <CurrentIcon className="w-4 h-4" />
        <span className="hidden sm:inline">{currentRole.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-50 py-2">
          {isAdmin && (
            <>
              <button
                onClick={() => handleMenuClick('/dashboard')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 transition-colors"
                type="button"
              >
                <Shield className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">Admin Dashboard</p>
                  <p className="text-sm text-gray-600">Manage all operations</p>
                </div>
              </button>
              <button
                onClick={() => handleMenuClick('/dashboard')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                type="button"
              >
                <Briefcase className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">View Broker Perspective</p>
                  <p className="text-sm text-gray-600">See broker view</p>
                </div>
              </button>
            </>
          )}
          {isBroker && (
            <button
              onClick={() => handleMenuClick('/dashboard')}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              type="button"
            >
              <Briefcase className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Broker Portal</p>
                <p className="text-sm text-gray-600">Your active leads</p>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
