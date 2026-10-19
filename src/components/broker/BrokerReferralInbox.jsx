import { useState, useEffect, useCallback } from 'react'
import { consultationService } from '../../services/database/consultationService'
import PendingReferralCard from './PendingReferralCard'
import { Mail, Phone, Home, Calendar, Inbox, RefreshCw } from 'lucide-react'

// Leads an admin assigned to this broker live on consultations (agent_id).
// 'referred' = waiting for the broker to accept or decline.
const TABS = [
  { id: 'referred', label: 'Pending' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'declined', label: 'Declined' },
  { id: 'all',      label: 'All' },
]

const STATUS_STYLES = {
  new:      'bg-yellow-100 text-yellow-800',
  referred: 'bg-orange-100 text-orange-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
}

const leadName  = (c) => (c.customer ? `${c.customer.first_name || ''} ${c.customer.last_name || ''}` : '').trim()
  || c.customer_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed lead'
const leadEmail = (c) => c.customer?.email || c.email || c.customer_email
const leadPhone = (c) => c.customer?.phone || c.phone || c.customer_phone

const BrokerReferralInbox = ({ agentId }) => {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('referred')

  const loadLeads = useCallback(async () => {
    if (!agentId) { setLoading(false); return }
    setLoading(true)
    const result = await consultationService.getBrokerConsultations(agentId)
    setLeads(result.success ? (result.data || []) : [])
    setLoading(false)
  }, [agentId])

  useEffect(() => { loadLeads() }, [loadLeads])

  const counts = Object.fromEntries(TABS.map(t => [
    t.id, t.id === 'all' ? leads.length : leads.filter(l => l.status === t.id).length
  ]))
  const visible = tab === 'all' ? leads : leads.filter(l => l.status === tab)

  if (!agentId) {
    return (
      <div className="p-8 text-center text-gray-500">
        Your broker profile wasn't found, so there are no referrals to show.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Referral Inbox</h2>
          <p className="text-gray-600">Leads assigned to you. Accept or decline pending referrals.</p>
        </div>
        <button
          onClick={loadLeads}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === t.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t.label} <span className="ml-1 opacity-75">({counts[t.id]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading referrals...</div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {tab === 'referred' ? 'No referrals waiting on you.' : 'Nothing here yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map(lead => lead.status === 'referred' ? (
            <PendingReferralCard key={lead.id} referral={lead} agentId={agentId} onAction={loadLeads} />
          ) : (
            <div key={lead.id} className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{leadName(lead)}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[lead.status] || 'bg-gray-100 text-gray-800'}`}>
                    {lead.status}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                  {leadEmail(lead) && (
                    <a href={`mailto:${leadEmail(lead)}`} className="flex items-center gap-1 hover:text-blue-600">
                      <Mail className="h-3.5 w-3.5" />{leadEmail(lead)}
                    </a>
                  )}
                  {leadPhone(lead) && (
                    <a href={`tel:${leadPhone(lead)}`} className="flex items-center gap-1 hover:text-blue-600">
                      <Phone className="h-3.5 w-3.5" />{leadPhone(lead)}
                    </a>
                  )}
                  {(lead.property?.case_number || lead.case_number) && (
                    <span className="flex items-center gap-1">
                      <Home className="h-3.5 w-3.5" />Case #{lead.property?.case_number || lead.case_number}
                    </span>
                  )}
                </div>
                {lead.status === 'declined' && lead.decline_reason && (
                  <p className="mt-1 text-sm text-red-600">Declined: {lead.decline_reason}</p>
                )}
              </div>
              <div className="text-sm text-gray-500 flex items-center gap-1 shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(lead.accepted_at || lead.declined_at || lead.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BrokerReferralInbox
