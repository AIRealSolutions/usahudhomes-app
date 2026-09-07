import React, { useState, useEffect } from 'react'
import {
  Home,
  Heart,
  Users,
  BookOpen,
  Calculator,
  LogOut,
  Settings,
  Bell,
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import FinancialCalculator from './FinancialCalculator'
import SavedProperties from './SavedProperties'
import ReferralTracker from './ReferralTracker'
import EducationHub from './EducationHub'

export default function UserDashboard() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [referralCount, setReferralCount] = useState(0)
  const [savedPropertiesCount, setSavedPropertiesCount] = useState(0)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchDashboardData()
  }, [user, navigate])

  const fetchDashboardData = async () => {
    if (!user) return

    // Fetch referral count
    const { data: referrals, error: refError } = await supabase
      .from('referrals')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)

    if (!refError && referrals) {
      setReferralCount(referrals.length)
    }

    // Fetch saved properties count
    const { data: saved, error: saveError } = await supabase
      .from('property_requests')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)

    if (!saveError && saved) {
      setSavedPropertiesCount(saved.length)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'saved', label: 'Saved Properties', icon: Heart },
    { id: 'calculator', label: 'Financial Calculator', icon: Calculator },
    { id: 'referrals', label: 'My Referrals', icon: Users },
    { id: 'education', label: 'Education Hub', icon: BookOpen },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {profile?.first_name || 'User'}</p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Bell className="h-5 w-5 text-gray-700" />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Settings className="h-5 w-5 text-gray-700" />
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 space-y-2 border-t border-gray-200 pt-4">
              {tabs.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id)
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === id
                      ? 'bg-blue-100 text-blue-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <nav className="hidden md:grid grid-cols-5 gap-4 mb-8">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center space-y-2 px-4 py-3 rounded-lg transition-all ${
                activeTab === id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-semibold text-center">{label}</span>
            </button>
          ))}
        </nav>

        {/* Overview Tab */}
        {activeTab === 'overview' && <OverviewTab profile={profile} referralCount={referralCount} savedPropertiesCount={savedPropertiesCount} onNavigate={setActiveTab} />}

        {/* Saved Properties Tab */}
        {activeTab === 'saved' && <SavedProperties />}

        {/* Financial Calculator Tab */}
        {activeTab === 'calculator' && <FinancialCalculator />}

        {/* Referrals Tab */}
        {activeTab === 'referrals' && <ReferralTracker />}

        {/* Education Hub Tab */}
        {activeTab === 'education' && <EducationHub />}
      </div>
    </div>
  )
}

/**
 * Overview Tab Component
 */
function OverviewTab({ profile, referralCount, savedPropertiesCount, onNavigate }) {
  return (
    <div className="space-y-8">
      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                {profile?.first_name} {profile?.last_name}
              </h2>
              <p className="text-blue-100 mb-4">HUD Home Buyer Profile</p>
              <div className="flex flex-wrap gap-4">
                {profile?.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>{profile.email}</span>
                  </div>
                )}
                {profile?.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile?.address && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {profile.address}
                      {profile.state && `, ${profile.state}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/profile'}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Saved Properties"
          value={savedPropertiesCount}
          subtitle="Properties you've requested info on"
          icon={Heart}
          color="blue"
          action={() => onNavigate('saved')}
        />
        <StatCard
          title="Active Referrals"
          value={referralCount}
          subtitle="Agent callback requests"
          icon={Users}
          color="purple"
          action={() => onNavigate('referrals')}
        />
        <StatCard
          title="Financial Tools"
          value="3"
          subtitle="Calculator & guides"
          icon={Calculator}
          color="green"
          action={() => onNavigate('calculator')}
        />
      </div>

      {/* Getting Started */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Getting Started</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GettingStartedStep
            step={1}
            title="Explore Properties"
            description="Browse our listings of HUD homes in North Carolina. Use filters to find properties in your budget and area."
            icon={Home}
            action="Search Properties"
            onAction={() => (window.location.href = '/search')}
          />
          <GettingStartedStep
            step={2}
            title="Understand Financing"
            description="Use our financial calculator to understand your true cost of ownership, monthly payments, and upfront cash needed."
            icon={Calculator}
            action="Open Calculator"
            onAction={() => onNavigate('calculator')}
          />
          <GettingStartedStep
            step={3}
            title="Connect with Agent"
            description="When you find a property you like, click 'Unlock Address' and submit a callback request. Our agents will reach out within 24 hours."
            icon={Phone}
            action="Learn More"
            onAction={() => (window.location.href = '/how-it-works')}
          />
          <GettingStartedStep
            step={4}
            title="Track Your Journey"
            description="Monitor your referrals and saved properties. We'll keep you updated on every step of the process."
            icon={CheckCircle}
            action="View Referrals"
            onAction={() => onNavigate('referrals')}
          />
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg shadow-lg p-8 border-l-4 border-orange-500">
        <h3 className="text-xl font-bold text-gray-900 mb-4">💡 Your Next Steps</h3>
        <ul className="space-y-3 text-gray-700">
          <li className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Complete Your Profile:</strong> Add more details to get personalized property
              recommendations
            </span>
          </li>
          <li className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Use the Financial Calculator:</strong> Understand your budget before house hunting
            </span>
          </li>
          <li className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Browse Properties:</strong> Start exploring HUD homes that match your criteria
            </span>
          </li>
          <li className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Request Agent Callback:</strong> Connect with specialists in your area
            </span>
          </li>
        </ul>
      </div>

      {/* Resources */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6">📚 Educational Resources</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ResourceCard
            title="HUD Home Buying Guide"
            description="Complete walkthrough of the HUD home buying process, from start to finish."
            icon={BookOpen}
          />
          <ResourceCard
            title="FHA Loan Options"
            description="Explore FHA financing programs, including 203(b) loans and 203(k) renovation loans."
            icon={BookOpen}
          />
          <ResourceCard
            title="First-Time Buyer Tips"
            description="Essential tips and strategies for first-time homebuyers in the HUD market."
            icon={BookOpen}
          />
          <ResourceCard
            title="Investment Property Analysis"
            description="Learn how to evaluate HUD homes as investment or rental properties."
            icon={BookOpen}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Stat Card Component
 */
function StatCard({ title, value, subtitle, icon: Icon, color, action }) {
  const colors = {
    blue: 'from-blue-50 to-blue-100 text-blue-600',
    purple: 'from-purple-50 to-purple-100 text-purple-600',
    green: 'from-green-50 to-green-100 text-green-600',
  }

  return (
    <button
      onClick={action}
      className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group"
    >
      <div className={`bg-gradient-to-br ${colors[color]} px-6 py-6`}>
        <Icon className="h-8 w-8 mb-2" />
      </div>
      <div className="p-6">
        <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
        <p className="text-xs text-gray-600">{subtitle}</p>
      </div>
      <div className="px-6 pb-4">
        <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 group-hover:underline">
          View Details →
        </button>
      </div>
    </button>
  )
}

/**
 * Getting Started Step Component
 */
function GettingStartedStep({ step, title, description, icon: Icon, action, onAction }) {
  return (
    <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-400 transition-colors">
      <div className="flex items-start space-x-4 mb-4">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-600 text-white font-bold">
            {step}
          </div>
        </div>
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">{title}</h4>
          <p className="text-gray-600 text-sm mb-4">{description}</p>
          <button
            onClick={onAction}
            className="text-blue-600 font-semibold text-sm hover:text-blue-700 flex items-center space-x-1"
          >
            <span>{action}</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Resource Card Component
 */
function ResourceCard({ title, description, icon: Icon }) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer group">
      <Icon className="h-8 w-8 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
      <h4 className="text-lg font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      <button className="text-blue-600 font-semibold text-sm hover:text-blue-700 group-hover:underline">
        Read Now →
      </button>
    </div>
  )
}
