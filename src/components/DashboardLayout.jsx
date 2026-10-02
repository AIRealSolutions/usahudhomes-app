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
  const { user, isAdmin, isBroker, isEndUser, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
    return { label: 'User', color: 'text-gray-600', bgColor: 'bg-gray-50', icon: User }
  }

  const roleInfo = getRoleInfo()
  const RoleIcon = roleInfo.icon

  const getNavItems = () => {
    if (isAdmin?.()) {
      return [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'leads', label: 'Leads', icon: FileText, path: '/admin/leads' },
        { id: 'brokers', label: 'Brokers', icon: Users, path: '/admin/brokers' },
        { id: 'properties', label: 'Properties', icon: Home, path: '/admin/properties' },
        { id: 'analytics', label: 'Analytics', icon: TrendingUp, path: '/admin/analytics' },
        { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' }
      ]
    }
    if (isBroker?.()) {
      return [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'leads', label: 'My Leads', icon: FileText, path: '/broker/leads' },
        { id: 'properties', label: 'Properties', icon: Home, path: '/broker/properties' },
        { id: 'analytics', label: 'Analytics', icon: TrendingUp, path: '/broker/analytics' },
        { id: 'settings', label: 'Settings', icon: Settings, path: '/broker/settings' }
      ]
    }
    // End User
    return [
      { id: 'overview', label: 'My Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { id: 'inquiries', label: 'My Inquiries', icon: FileText, path: '/user/inquiries' },
      { id: 'alerts', label: 'Alerts', icon: Bell, path: '/alerts' },
      { id: 'settings', label: 'Settings', icon: Settings, path: '/user/settings' }
    ]
  }

  const navItems = getNavItems()

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div
        className={`fixed md:relative inset-y-0 left-0 z-50 bg-white shadow-lg transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0 md:w-20'
        } overflow-hidden`}
      >
        {/* Logo/Brand */}
        <div className={`flex items-center justify-between p-4 border-b border-gray-200 ${sidebarOpen ? '' : 'flex-col'}`}>
          <div className={`flex items-center gap-2 ${sidebarOpen ? '' : 'flex-col'}`}>
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && <span className="font-bold text-gray-900">Portal</span>}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:block p-1 hover:bg-gray-100 rounded"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* User Info */}
        <div className={`p-4 border-b border-gray-200 ${sidebarOpen ? '' : 'text-center'}`}>
          <div className={`flex items-center gap-2 mb-2 ${sidebarOpen ? '' : 'justify-center'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${roleInfo.bgColor}`}>
              <RoleIcon className={`w-4 h-4 ${roleInfo.color}`} />
            </div>
            {sidebarOpen && (
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
                    sidebarOpen ? '' : 'justify-center'
                  } hover:bg-gray-100 text-gray-700 hover:text-blue-600`}
                  title={sidebarOpen ? '' : item.label}
                >
                  <ItemIcon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
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
              sidebarOpen ? '' : 'justify-center'
            } hover:bg-red-50 text-red-600 hover:text-red-700`}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
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
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Title */}
            <h1 className="hidden md:block text-xl font-semibold text-gray-900">
              {currentRole || roleInfo.label} Dashboard
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
                      <p className="text-xs text-gray-500 mb-1">Current Role</p>
                      <p className="font-medium text-gray-900">{roleInfo.label} Dashboard</p>
                      <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
                    </div>
                    {isAdmin?.() && (
                      <>
                        <button
                          onClick={() => {
                            navigate('/dashboard')
                            setRoleMenuOpen(false)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100"
                        >
                          <Shield className="w-5 h-5 text-purple-600" />
                          <div>
                            <p className="font-medium text-gray-900 text-sm">Admin Dashboard</p>
                            <p className="text-xs text-gray-500">Manage all systems</p>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            navigate('/broker-dashboard')
                            setRoleMenuOpen(false)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100"
                        >
                          <Briefcase className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900 text-sm">Broker View</p>
                            <p className="text-xs text-gray-500">See broker perspective</p>
                          </div>
                        </button>
                      </>
                    )}
                    {isBroker?.() && (
                      <button
                        onClick={() => {
                          navigate('/dashboard')
                          setRoleMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100"
                      >
                        <Briefcase className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Broker Portal</p>
                          <p className="text-xs text-gray-500">Your leads & properties</p>
                        </div>
                      </button>
                    )}
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

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-200 p-4">
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
                    className="w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-700 hover:text-blue-600"
                  >
                    <ItemIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

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
