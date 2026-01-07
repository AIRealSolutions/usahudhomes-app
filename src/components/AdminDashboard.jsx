import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  Home, 
  Users, 
  MessageSquare, 
  UserCog,
  FileText,
  LogOut,
  RefreshCw,
  ArrowLeft,
  Upload
} from 'lucide-react'
import PropertyAdmin from './admin/PropertyAdmin'
import CustomerAdmin from './admin/CustomerAdmin'
import LeadAdmin from './admin/LeadAdmin'
import AgentAdmin from './admin/AgentAdmin'
import AgentApplicationsAdmin from './admin/AgentApplicationsAdmin'
import FacebookLeadsImport from './admin/FacebookLeadsImport'

const AdminDashboard = () => {
  const { user, profile, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('properties')

  const tabs = [
    { id: 'properties', label: 'Properties', icon: Home, component: PropertyAdmin },
    { id: 'customers', label: 'Customers', icon: Users, component: CustomerAdmin },
    { id: 'leads', label: 'Leads', icon: MessageSquare, component: LeadAdmin },
    { id: 'agents', label: 'Agents', icon: UserCog, component: AgentAdmin },
    { id: 'applications', label: 'Agent Applications', icon: FileText, component: AgentApplicationsAdmin },
    { id: 'facebook-import', label: 'Import Facebook Leads', icon: Upload, component: FacebookLeadsImport }
  ]

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Manage properties, customers, consultations, and agents
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Back to Broker Dashboard */}
              <a
                href="/broker-dashboard"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Broker Dashboard</span>
              </a>

              {/* Logout */}
              <button 
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                      ${isActive
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {ActiveComponent && <ActiveComponent />}
      </main>
    </div>
  )
}

export default AdminDashboard
