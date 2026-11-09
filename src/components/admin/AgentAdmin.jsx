import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  UserCheck, 
  Mail,
  Phone,
  Save,
  X,
  Download,
  Upload,
  Building,
  Send,
  RotateCcw,
  FileCheck,
  MapPin
} from 'lucide-react'
import { agentService } from '../../services/database'
import { US_STATES } from '../../utils/states'
import { agentInvitationService } from '../../services/agentInvitationService'
import { supabase } from '../../config/supabase'
import { getEconomicRegions, previewAgreement } from '../../services/brokerFinder'

const ALL_STATES = [...US_STATES, { code: 'PR', name: 'Puerto Rico' }]

function AgentAdmin() {
  const [agents, setAgents] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)
  const [formData, setFormData] = useState(getEmptyFormData())
  const [loading, setLoading] = useState(false)
  const [showStatus, setShowStatus] = useState('active') // active | inactive | all
  const [stateFilter, setStateFilter] = useState('')
  const [regions, setRegions] = useState([])           // every economic region (for names and the form)
  const [workload, setWorkload] = useState({})         // agentId -> { total, new, accepted }
  const [referrals, setReferrals] = useState({})       // agentId -> accepted Broker Finder referrals
  const [viaBrokerFinder, setViaBrokerFinder] = useState(new Set())

  useEffect(() => {
    loadAgents()
    getEconomicRegions().then(setRegions).catch(() => setRegions([]))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Buyers assigned to each agent, and Broker Finder referrals they accepted
  async function loadActivity() {
    try {
      const [{ data: cons }, { data: linked }] = await Promise.all([
        supabase.from('consultations').select('agent_id,status').not('agent_id', 'is', null).or('is_deleted.is.null,is_deleted.eq.false').limit(5000),
        supabase.from('hud_brokers').select('id,agent_id').not('agent_id', 'is', null).limit(5000),
      ])
      const w = {}
      for (const c of cons || []) {
        const x = (w[c.agent_id] ||= { total: 0, new: 0, accepted: 0 })
        x.total++
        if (c.status === 'new' || c.status === 'referred') x.new++
        if (c.status === 'accepted') x.accepted++
      }
      setWorkload(w)
      const brokerToAgent = Object.fromEntries((linked || []).map(b => [b.id, b.agent_id]))
      setViaBrokerFinder(new Set(Object.values(brokerToAgent)))
      const ids = Object.keys(brokerToAgent)
      if (ids.length) {
        const { data: reqs } = await supabase.from('broker_referral_requests')
          .select('id,broker_id,status,property_address,property_city,property_state,case_number,responded_at,fee_percent')
          .in('broker_id', ids).eq('status', 'accepted').order('responded_at', { ascending: false })
        const r = {}
        for (const q of reqs || []) (r[brokerToAgent[q.broker_id]] ||= []).push(q)
        setReferrals(r)
      } else setReferrals({})
    } catch (e) { console.error('Agent activity:', e) }
  }

  const regionName = key => {
    const [st, slug] = String(key).split(':')
    return regions.find(r => r.state === st && r.slug === slug)?.name || slug
  }

  function getEmptyFormData() {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      licenseNumber: '',
      licenseState: 'NC',
      statesCovered: ['NC'],
      specialties: [],
      yearsExperience: 0,
      bio: '',
      isAdmin: false,
      autoReferralEnabled: false,
      autoReferralStates: [],
      economicRegions: [],
      referralAgreementSigned: false
    }
  }

  async function loadAgents() {
    setLoading(true)
    try {
      const result = await agentService.getAllAgents({ includeInactive: true })
      if (result.success) {
        setAgents(result.data)
      } else {
        console.error('Error loading agents:', result.error)
      }
    } catch (error) {
      console.error('Error loading agents:', error)
    }
    setLoading(false)
    loadActivity()
  }

  // Search and filters run on the loaded list (names, contact, company, states, regions)
  const shown = useMemo(() => {
    const term = searchQuery.trim().toLowerCase()
    return agents.filter(a => {
      if (showStatus === 'active' && !a.is_active) return false
      if (showStatus === 'inactive' && a.is_active) return false
      if (stateFilter && !(a.states_covered || []).includes(stateFilter)) return false
      if (!term) return true
      const regionNames = (a.economic_regions || []).map(regionName)
      return [a.first_name, a.last_name, `${a.first_name} ${a.last_name}`, a.email, a.phone, a.company, a.license_number,
        ...(a.states_covered || []), ...regionNames].some(v => String(v || '').toLowerCase().includes(term))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents, searchQuery, showStatus, stateFilter, regions])

  function handleAdd() {
    setEditingAgent(null)
    setFormData(getEmptyFormData())
    setShowForm(true)
  }

  function handleEdit(agent) {
    setEditingAgent(agent)
    setFormData({
      firstName: agent.first_name || '',
      lastName: agent.last_name || '',
      email: agent.email || '',
      phone: agent.phone || '',
      company: agent.company || '',
      licenseNumber: agent.license_number || '',
      licenseState: agent.license_state || 'NC',
      statesCovered: agent.states_covered || ['NC'],
      specialties: agent.specialties || [],
      yearsExperience: agent.years_experience || 0,
      bio: agent.bio || '',
      isAdmin: agent.is_admin || false,
      autoReferralEnabled: agent.auto_referral_enabled || false,
      autoReferralStates: agent.auto_referral_states || [],
      economicRegions: agent.economic_regions || [],
      referralAgreementSigned: !!agent.referral_agreement_signed,
      referralAgreementDate: agent.referral_agreement_date || null
    })
    setShowForm(true)
  }

  async function handleReactivate(agent) {
    if (!confirm(`Reactivate ${agent.first_name} ${agent.last_name}? They can sign in and receive buyer referrals again.`)) return
    const result = await agentService.updateAgent(agent.id, { isActive: true })
    if (result.success) loadAgents()
    else alert('Error: ' + result.error)
  }

  async function toggleAgreement(agent) {
    const signed = !agent.referral_agreement_signed
    if (!confirm(signed
      ? `Mark that you received ${agent.first_name}'s signed referral agreement (NC Form 730)?`
      : `Mark ${agent.first_name}'s referral agreement as not received?`)) return
    const result = await agentService.updateAgent(agent.id, { referralAgreementSigned: signed })
    if (result.success) setAgents(list => list.map(a => (a.id === agent.id ? result.data : a)))
    else alert('Error: ' + result.error)
  }

  async function handleDelete(agent) {
    if (confirm(`Deactivate ${agent.first_name} ${agent.last_name}? They won't receive buyer referrals or be able to use the broker dashboard. You can reactivate them later.`)) {
      try {
        const result = await agentService.deleteAgent(agent.id)
        if (result.success) {
          alert('Agent deactivated.')
          loadAgents()
        } else {
          alert('Error: ' + result.error)
        }
      } catch (error) {
        alert('Error: ' + error.message)
      }
    }
  }

  async function handleResendInvitation(agent) {
    if (confirm(`Send invitation email to ${agent.email}?`)) {
      setLoading(true)
      try {
        const result = await agentInvitationService.resendInvitation(agent.email)
        if (result.success) {
          alert(result.message || 'Invitation email sent successfully!')
        } else {
          alert('Error: ' + result.error)
        }
      } catch (error) {
        alert('Error: ' + error.message)
      }
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      alert('Please fill in all required fields')
      return
    }

    if (formData.autoReferralEnabled && !formData.autoReferralStates.length) {
      alert('Choose at least one state for automatic referrals, or turn off auto referrals.')
      return
    }
    const overlaps = agents.filter(a => a.id !== editingAgent?.id && a.auto_referral_enabled && (a.auto_referral_states || []).some(s => formData.autoReferralStates.includes(s)))
    if (formData.autoReferralEnabled && overlaps.length) {
      alert('These states are already assigned for automatic referrals to: ' + overlaps.map(a => `${a.first_name} ${a.last_name}`).join(', ') + '. Remove the conflicting assignments first.')
      return
    }
    setLoading(true)
    // Keep only regions in states the agent still covers
    const payload = { ...formData, economicRegions: formData.economicRegions.filter(k => formData.statesCovered.includes(String(k).split(':')[0])) }

    try {
      let result
      if (editingAgent) {
        result = await agentService.updateAgent(editingAgent.id, payload)
        if (result.success) {
          alert('Agent updated successfully!')
        } else {
          alert('Error: ' + result.error)
        }
      } else {
        result = await agentService.addAgent(payload)
        if (result.success) {
          if (result.invitationSent) {
            alert('Agent added successfully! Invitation email sent to ' + formData.email)
          } else if (result.invitationError) {
            alert('Agent added successfully, but invitation email failed: ' + result.invitationError + '\n\nYou can resend the invitation using the Send button.')
          } else {
            alert('Agent added successfully!')
          }
        } else {
          alert('Error: ' + result.error)
        }
      }

      if (result.success) {
        setShowForm(false)
        setFormData(getEmptyFormData())
        setEditingAgent(null)
        loadAgents()
      }
    } catch (error) {
      alert('Error: ' + error.message)
    }

    setLoading(false)
  }

  function handleCancel() {
    setShowForm(false)
    setFormData(getEmptyFormData())
    setEditingAgent(null)
  }

  async function handleExport() {
    const result = await agentService.getAllAgents()
    if (!result.success) return
    const data = result.data
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agents_backup_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target.result)
          let successCount = 0
          // Restoring a backup shouldn't email every agent an invitation
          for (const agent of data.agents || data) {
            const result = await agentService.addAgent(agent, { invite: false })
            if (result.success) successCount++
          }
          loadAgents()
          alert(`Imported ${successCount} agents successfully!`)
        } catch (error) {
          alert('Error importing agents: ' + error.message)
        }
      }
      reader.readAsText(file)
    }
  }

  function handleStateToggle(state) {
    const newStates = formData.statesCovered.includes(state)
      ? formData.statesCovered.filter(s => s !== state)
      : [...formData.statesCovered, state]
    setFormData({ ...formData, statesCovered: newStates, economicRegions: formData.economicRegions.filter(k => newStates.includes(String(k).split(':')[0])) })
  }

  function handleSpecialtyToggle(specialty) {
    const newSpecialties = formData.specialties.includes(specialty)
      ? formData.specialties.filter(s => s !== specialty)
      : [...formData.specialties, specialty]
    setFormData({...formData, specialties: newSpecialties})
  }

  const stats = {
    active: agents.filter(a => a.is_active).length,
    inactive: agents.filter(a => !a.is_active).length,
    buyers: Object.values(workload).reduce((n, w) => n + w.new + w.accepted, 0),
    viaBrokerFinder: agents.filter(a => viaBrokerFinder.has(a.id)).length,
    agreementsMissing: agents.filter(a => a.is_active && !a.referral_agreement_signed && !a.is_admin).length,
  }
  const coveredStates = [...new Set(agents.flatMap(a => a.states_covered || []))].sort()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent/Broker Management</h2>
          <p className="text-gray-600">Partner agents: coverage, referral agreements, buyers assigned, and how they joined</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" asChild>
            <label className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Import
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Agent
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          ['Active partners', stats.active, () => setShowStatus('active')],
          ['Inactive', stats.inactive, () => setShowStatus('inactive')],
          ['Open buyers assigned', stats.buyers, null],
          ['Joined via Broker Finder', stats.viaBrokerFinder, null],
          ['Agreements not received', stats.agreementsMissing, null],
        ].map(([label, n, onClick]) => (
          <Card key={label} className={onClick ? 'cursor-pointer hover:shadow' : ''} onClick={onClick || undefined}>
            <CardContent className="pt-6">
              <div className={`text-2xl font-bold ${label === 'Agreements not received' && n ? 'text-amber-700' : ''}`}>{n}</div>
              <p className="text-sm text-gray-600">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search name, email, phone, company, license, state or region"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select aria-label="Status" value={showStatus} onChange={e => setShowStatus(e.target.value)} className="px-3 py-2 border rounded-md text-sm">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All agents</option>
        </select>
        <select aria-label="State covered" value={stateFilter} onChange={e => setStateFilter(e.target.value)} className="px-3 py-2 border rounded-md text-sm">
          <option value="">All states</option>
          {coveredStates.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(searchQuery || stateFilter || showStatus !== 'active') && (
          <Button variant="outline" onClick={() => { setSearchQuery(''); setStateFilter(''); setShowStatus('active') }}>
            Clear
          </Button>
        )}
      </div>

      {/* Agent Form Modal */}
      {showForm && (
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <CardTitle>{editingAgent ? 'Edit Agent' : 'Add New Agent'}</CardTitle>
            <CardDescription>
              {editingAgent ? 'Update agent information' : 'Enter agent details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name *</label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    placeholder="Marc"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    placeholder="Spencer"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Company</label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  placeholder="Lightkeeper Realty"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="agent@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone *</label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="(910) 363-6147"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">License Number</label>
                  <Input
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
                    placeholder="153928"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">License State</label>
                  <select
                    value={formData.licenseState}
                    onChange={(e) => setFormData({...formData, licenseState: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="NC">North Carolina</option>
                    <option value="TN">Tennessee</option>
                    <option value="SC">South Carolina</option>
                    <option value="VA">Virginia</option>
                    <option value="GA">Georgia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Years Experience</label>
                  <Input
                    type="number"
                    value={formData.yearsExperience}
                    onChange={(e) => setFormData({...formData, yearsExperience: parseInt(e.target.value) || 0})}
                    placeholder="25"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">States Covered ({formData.statesCovered.length})</label>
                <div className="grid grid-cols-5 sm:grid-cols-9 gap-2 max-h-48 overflow-auto border rounded p-2">
                  {ALL_STATES.map(st => (
                    <label key={st.code} title={st.name} className="flex items-center gap-1 text-sm">
                      <input type="checkbox" checked={formData.statesCovered.includes(st.code)} onChange={() => handleStateToggle(st.code)} />
                      {st.code}
                    </label>
                  ))}
                </div>
              </div>

              {formData.statesCovered.some(st => regions.some(r => r.state === st)) && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Economic regions</label>
                  <p className="text-xs text-gray-500">Leave a state's regions unchecked to cover the whole state.</p>
                  {formData.statesCovered.filter(st => regions.some(r => r.state === st)).map(st => (
                    <div key={st} className="border rounded p-2">
                      <div className="text-sm font-medium mb-1">{st} — {formData.economicRegions.some(k => k.startsWith(`${st}:`)) ? `${formData.economicRegions.filter(k => k.startsWith(`${st}:`)).length} selected` : 'whole state'}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                        {regions.filter(r => r.state === st).map(r => {
                          const key = `${st}:${r.slug}`
                          return (
                            <label key={key} className="flex items-center gap-2 text-sm" title={r.counties.join(', ')}>
                              <input type="checkbox" checked={formData.economicRegions.includes(key)}
                                onChange={() => setFormData(d => ({ ...d, economicRegions: d.economicRegions.includes(key) ? d.economicRegions.filter(k => k !== key) : [...d.economicRegions, key] }))} />
                              {r.name}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={formData.referralAgreementSigned} onChange={e => setFormData({ ...formData, referralAgreementSigned: e.target.checked })} />
                Signed referral agreement received
              </label>

              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-3">
                <label className="flex items-center gap-3 font-semibold text-gray-900">
                  <input type="checkbox" checked={formData.autoReferralEnabled}
                    onChange={e => setFormData({ ...formData, autoReferralEnabled: e.target.checked })}
                    className="h-4 w-4" />
                  Automatically assign buyer referrals to this agent
                </label>
                <p className="text-sm text-gray-600">Admin controlled. Only selected states route automatically; normal coverage states above do not enable auto-referrals.</p>
                {formData.autoReferralEnabled && (
                  <>
                    <p className="text-sm font-medium">Auto-referral states ({formData.autoReferralStates.length})</p>
                    <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
                      {US_STATES.map(s => (
                        <label key={s.code} title={s.name} className="flex items-center gap-1 text-sm">
                          <input type="checkbox" checked={formData.autoReferralStates.includes(s.code)}
                            onChange={() => setFormData(d => ({
                              ...d,
                              autoReferralStates: d.autoReferralStates.includes(s.code)
                                ? d.autoReferralStates.filter(x => x !== s.code)
                                : [...d.autoReferralStates, s.code].sort()
                            }))} />
                          {s.code}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Specialties</label>
                <div className="flex flex-wrap gap-2">
                  {['HUD Homes', 'Government Foreclosures', 'FHA 203k Loans', 'First-Time Buyers', 'Investment Properties', 'Renovation Financing'].map(specialty => (
                    <Button
                      key={specialty}
                      type="button"
                      variant={formData.specialties.includes(specialty) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSpecialtyToggle(specialty)}
                    >
                      {specialty}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="25+ years helping people buy HUD homes across North Carolina"
                  rows={3}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isAdmin"
                  checked={formData.isAdmin}
                  onChange={(e) => setFormData({...formData, isAdmin: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="isAdmin" className="text-sm font-medium">Admin Access</label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : (editingAgent ? 'Update' : 'Add')} Agent
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Agents List */}
      <div className="grid grid-cols-1 gap-4">
        {shown.map((agent) => (
          <Card key={agent.id} className={`hover:shadow-lg transition-shadow ${agent.is_active ? '' : 'opacity-75'}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex gap-4 flex-1">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserCheck className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold">{agent.first_name} {agent.last_name}</h3>
                          {agent.is_admin && (
                            <Badge variant="destructive" className="text-xs">ADMIN</Badge>
                          )}
                          <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                            {agent.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {viaBrokerFinder.has(agent.id) ? 'Joined via Broker Finder' : agent.application_id ? 'Applied online' : 'Added by admin'}
                          </Badge>
                        </div>
                        <p className="text-gray-600 flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          {agent.company}
                        </p>
                        <div className="flex gap-4 text-sm text-gray-600 mt-1">
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {agent.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {agent.phone}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                      <div>
                        <span className="text-gray-600">States:</span>
                        <div className="font-semibold">{agent.states_covered?.join(', ') || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Experience:</span>
                        <div className="font-semibold">{agent.years_experience} years</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Buyers assigned:</span>
                        <div className="font-semibold">
                          {(workload[agent.id]?.new || 0) + (workload[agent.id]?.accepted || 0)} open
                          {workload[agent.id]?.new ? <span className="text-amber-700 font-normal"> ({workload[agent.id].new} new)</span> : null}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">License:</span>
                        <div className="font-semibold">{agent.license_state} {agent.license_number}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm flex flex-wrap gap-x-6 gap-y-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        Regions: {(agent.economic_regions || []).length
                          ? agent.economic_regions.map(k => `${regionName(k)} (${String(k).split(':')[0]})`).join(', ')
                          : 'whole state(s)'}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileCheck className={`h-4 w-4 ${agent.referral_agreement_signed ? 'text-green-600' : 'text-amber-600'}`} />
                        {agent.referral_agreement_signed
                          ? `Referral agreement received${agent.referral_agreement_date ? ` ${new Date(agent.referral_agreement_date).toLocaleDateString()}` : ''}`
                          : 'Referral agreement not received'}
                        {!agent.is_admin && (
                          <button type="button" className="ml-1 text-blue-700 underline text-xs" onClick={() => toggleAgreement(agent)}>
                            {agent.referral_agreement_signed ? 'Undo' : 'Mark received'}
                          </button>
                        )}
                      </span>
                    </div>
                    {(referrals[agent.id] || []).length > 0 && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-600">Broker Finder referrals accepted:</span>
                        <ul className="mt-1 space-y-1">
                          {referrals[agent.id].map(r => (
                            <li key={r.id} className="flex flex-wrap items-center gap-2">
                              <span>{[r.property_address, r.property_city, r.property_state].filter(Boolean).join(', ')}{r.case_number ? ` · #${r.case_number}` : ''} · {Number(r.fee_percent || 25)}%{r.responded_at ? ` · ${new Date(r.responded_at).toLocaleDateString()}` : ''}</span>
                              <button type="button" className="text-blue-700 underline text-xs" onClick={() => previewAgreement(r.id).catch(e => alert(e.message))}>Referral agreement</button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {agent.specialties && agent.specialties.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {agent.specialties.map(specialty => (
                          <Badge key={specialty} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {agent.bio && (
                      <p className="text-sm text-gray-600 mt-2">{agent.bio}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleResendInvitation(agent)}
                    title="Resend login invitation email"
                  >
                    <Send className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(agent)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {agent.is_active ? (
                    <Button variant="outline" size="sm" onClick={() => handleDelete(agent)} title="Deactivate">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => handleReactivate(agent)} title="Reactivate">
                      <RotateCcw className="h-4 w-4 text-green-700" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && agents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Loading agents...</p>
          </CardContent>
        </Card>
      )}

      {!loading && agents.length > 0 && shown.length === 0 && (
        <Card><CardContent className="py-8 text-center text-gray-600">No agents match these filters.</CardContent></Card>
      )}

      {!loading && agents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No agents found</p>
            <p className="text-sm text-gray-500 mb-4">Add Marc Spencer as your first HUD-registered agent</p>
            <Button onClick={handleAdd} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Agent
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AgentAdmin
