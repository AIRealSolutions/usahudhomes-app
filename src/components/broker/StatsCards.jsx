import React from 'react'
import { AlertCircle, CheckCircle, Clock, TrendingUp, Award, Phone, Mail, MessageSquare } from 'lucide-react'

const StatsCards = ({ stats, pendingCount }) => {
  const cards = [
    {
      title: 'Pending Referrals',
      value: pendingCount || 0,
      subtitle: 'Action needed',
      icon: AlertCircle,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-200'
    },
    {
      title: 'Accepted Leads',
      value: stats.accepted_leads || 0,
      subtitle: 'Working',
      icon: CheckCircle,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Active Leads',
      value: stats.active_leads || 0,
      subtitle: 'In progress',
      icon: Clock,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      borderColor: 'border-yellow-200'
    },
    {
      title: 'Completed',
      value: stats.completed_this_month || 0,
      subtitle: 'This month',
      icon: TrendingUp,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200'
    }
  ]

  const performanceCards = [
    {
      title: 'Acceptance Rate',
      value: stats.acceptance_rate ? `${stats.acceptance_rate}%` : 'N/A',
      subtitle: 'Referrals accepted',
      icon: Award,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Conversion Rate',
      value: stats.conversion_rate ? `${stats.conversion_rate}%` : 'N/A',
      subtitle: 'Leads to deals',
      icon: TrendingUp,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-200'
    },
    {
      title: 'Total Communications',
      value: (stats.total_emails_sent || 0) + (stats.total_sms_sent || 0) + (stats.total_calls_made || 0),
      subtitle: `${stats.total_emails_sent || 0} emails, ${stats.total_sms_sent || 0} SMS, ${stats.total_calls_made || 0} calls`,
      icon: MessageSquare,
      color: 'pink',
      bgColor: 'bg-pink-50',
      iconColor: 'text-pink-600',
      borderColor: 'border-pink-200'
    }
  ]

  return (
    <div className="mb-8 space-y-6">
      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon
          return (
            <div 
              key={index}
              className={`${card.bgColor} border ${card.borderColor} rounded-lg p-6 transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    {card.value}
                  </p>
                  <p className="text-xs text-gray-500">
                    {card.subtitle}
                  </p>
                </div>
                <div className={`${card.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {performanceCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div 
              key={index}
              className={`${card.bgColor} border ${card.borderColor} rounded-lg p-4 transition-all hover:shadow-md`}
            >
              <div className="flex items-center gap-3">
                <div className={`${card.bgColor} p-2 rounded-lg`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">
                    {card.title}
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {card.value}
                  </p>
                  <p className="text-xs text-gray-500">
                    {card.subtitle}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default StatsCards
