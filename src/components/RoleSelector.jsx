import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Shield, Briefcase, User, ChevronDown, LayoutDashboard } from 'lucide-react'

export default function RoleSelector() {
  const { user, role, canAccessAdmin, canAccessBroker } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  if (!user) {
    return null
  }

  const current =
    role === 'admin' ? { label: 'Admin', icon: Shield, color: 'text-purple-600', bgColor: 'bg-purple-50' }
    : role === 'broker' ? { label: 'Broker', icon: Briefcase, color: 'text-blue-600', bgColor: 'bg-blue-50' }
    : { label: 'My Account', icon: User, color: 'text-gray-600', bgColor: 'bg-gray-50' }
  const CurrentIcon = current.icon

  const items = [
    { path: '/dashboard', label: 'My Dashboard', sub: 'Your account home', icon: LayoutDashboard, color: 'text-gray-600' },
    ...(canAccessBroker ? [{ path: '/broker-dashboard', label: 'Broker Portal', sub: 'Leads & referrals', icon: Briefcase, color: 'text-blue-600' }] : []),
    ...(canAccessAdmin ? [{ path: '/admin', label: 'Admin Panel', sub: 'Manage all operations', icon: Shield, color: 'text-purple-600' }] : [])
  ]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${current.bgColor} ${current.color} hover:opacity-80`}
      >
        <CurrentIcon className="w-4 h-4" />
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-50 py-2">
          {items.map(({ path, label, sub, icon: Icon, color }) => (
            <button
              key={path}
              type="button"
              onClick={() => {
                navigate(path)
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 border-gray-100 transition-colors"
            >
              <Icon className={`w-5 h-5 ${color}`} />
              <div>
                <p className="font-medium text-gray-900">{label}</p>
                <p className="text-sm text-gray-600">{sub}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
