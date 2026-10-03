import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, LogOut, Menu, X, ChevronDown,
  Shield, Briefcase, User, Settings, Home, FileText,
  Users, TrendingUp, Bell, Search
} from 'lucide-react'

/**
 * Unified DashboardLayout Component
 * Provides consistent navigation and role switching for all dashboard types
 */
export default function DashboardLayout({ children, currentRole }) {
  const { user, role, canAccessAdmin, canAccessBroker, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const getRoleInfo = () => {
    if (role === 'admin') {
      return { label: 'Admin', color: 'text-purple-600', bgColor: 'bg-purple-50', icon: Shield }
    }
    if (role === 'broker') {
      return { label: 'Broker', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Briefcase }
    }
    return { label: 'User', color: 'text-gray-600', bgColor: 'bg-gray-50', icon: User }
  }

  const roleInfo = getRoleInfo()
  const RoleIcon = roleInfo.icon

  const expanded = sidebarOpen || mobileMenuOpen

  const navItems = [
    { id: 'overview', label: 'My Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'search', label: 'Search Homes', icon: Search, path: '/search' },
    { id: 'alerts', label: 'Home Alerts', icon: Bell, path: '/alerts' },
    ...(canAccessBroker ? [{ id: 'broker', label: 'Broker Portal', icon: Briefcase, path: '/broker-dashboard', workspace: true }] : []),
    ...(canAccessAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: Shield, path: '/admin', workspace: true }] : [])
  ]

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:relative inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transition-all duration-300 overflow-hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 ${sidebarOpen ? 'md:w-64' : 'md:w-20'}`}
      >
        {/* Logo/Brand */}
        <div className={`flex items-center justify-between p-4 border-b border-gray-200 ${expanded ? '' : 'flex-col'}`}>
          <div className={`flex items-center gap-2 ${expanded ? '' : 'flex-col'}`}>
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            {expanded && <span className="font-bold text-gray-900">Portal</span>}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:block p-1 hover:bg-gray-100 rounded"
            aria-label={sidebarOpen ? 'Collapse menu' : 'Expand menu'}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1 hover:bg-gray-100 rounded"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className={`p-4 border-b border-gray-200 ${expanded ? '' : 'text-center'}`}>
          <div className={`flex items-center gap-2 mb-2 ${expanded ? '' : 'justify-center'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${roleInfo.bgColor}`}>
              <RoleIcon className={`w-4 h-4 ${roleInfo.color}`} />
            </div>
            {expanded && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{user?.email}</p>
                <p className={`text-xs ${roleInfo.color}`}>{roleInfo.label}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {navItems.map((item) => {
              const ItemIcon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.path)
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    expanded ? '' : 'justify-center'
                  } hover:bg-gray-100 text-gray-700 hover:text-blue-600`}
                  title={expanded ? '' : item.label}
                >
                  <ItemIcon className="w-5 h-5 flex-shrink-0" />
                  {expanded && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              expanded ? '' : 'justify-center'
            } hover:bg-red-50 text-red-600 hover:text-red-700`}
          >
            <LogOut className="w-5 h-5" />
            {expanded && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Title */}
            <h1 className="hidden md:block text-xl font-semibold text-gray-900">
              {currentRole || 'My'} Dashboard
            </h1>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${roleInfo.bgColor}`}
                >
                  <RoleIcon className={`w-4 h-4 ${roleInfo.color}`} />
                  <span className={`text-sm font-medium ${roleInfo.color} hidden sm:inline`}>{roleInfo.label}</span>
                  <ChevronDown className={`w-4 h-4 ${roleInfo.color} transition-transform ${roleMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {roleMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-50 py-2 border border-gray-200">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Signed in as</p>
                      <p className="font-medium text-gray-900">{roleInfo.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
                    </div>
                    {navItems.filter(i => i.workspace).map(item => {
                      const ItemIcon = item.icon
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            navigate(item.path)
                            setRoleMenuOpen(false)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100"
                        >
                          <ItemIcon className={`w-5 h-5 ${item.id === 'admin' ? 'text-purple-600' : 'text-blue-600'}`} />
                          <p className="font-medium text-gray-900 text-sm">{item.label}</p>
                        </button>
                      )
                    })}
                    <button
                      onClick={() => {
                        signOut()
                        setRoleMenuOpen(false)
                        navigate('/')
                      }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-red-50 transition-colors text-red-600 hover:text-red-700"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-medium">Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
