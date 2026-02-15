import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/database'

export default function BidResultsAdmin() {
  const [bidResults, setBidResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending') // pending, closed, all
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({
    case_number: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    net_to_hud: '',
    broker_name: '',
    purchaser_type: 'Investor',
    date_accepted: '',
    status: 'pending'
  })

  useEffect(() => {
    fetchBidResults()
  }, [filter])

  const fetchBidResults = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('bid_results')
        .select(`
          *,
          brokers (
            name,
            email,
            phone,
            lead_status
          )
        `)
        .order('date_accepted', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setBidResults(data || [])
    } catch (error) {
      console.error('Error fetching bid results:', error)
      alert('Error loading bid results: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (bidResult) => {
    setEditingId(bidResult.id)
    setEditForm({
      status: bidResult.status || 'pending',
      actual_sale_price: bidResult.actual_sale_price || '',
      date_closed: bidResult.date_closed || '',
      closing_notes: bidResult.closing_notes || '',
      is_our_referral: bidResult.is_our_referral || false
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async (id) => {
    setSaving(true)
    try {
      const updateData = {
        status: editForm.status,
        actual_sale_price: editForm.actual_sale_price || null,
        date_closed: editForm.date_closed || null,
        closing_notes: editForm.closing_notes || null,
        is_our_referral: editForm.is_our_referral,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('bid_results')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      alert('Bid result updated successfully!')
      setEditingId(null)
      setEditForm({})
      fetchBidResults()
    } catch (error) {
      console.error('Error updating bid result:', error)
      alert('Error updating bid result: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      closed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.toUpperCase() || 'PENDING'}
      </span>
    )
  }

  const calculateDaysPending = (dateAccepted) => {
    if (!dateAccepted) return 'N/A'
    const days = Math.floor((new Date() - new Date(dateAccepted)) / (1000 * 60 * 60 * 24))
    return `${days} days`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading bid results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Bid Results Management</h1>
        <p className="mt-2 text-gray-600">
          Manage properties under contract and track successful deals
        </p>
      </div>

      {/* Add New Button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          {showAddForm ? 'Cancel' : '+ Add New Bid Result'}
        </button>
      </div>

      {/* Add New Form */}
      {showAddForm && (
        <div className="mb-6 bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Add New Bid Result</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Case Number *
              </label>
              <input
                type="text"
                value={addForm.case_number}
                onChange={(e) => setAddForm({ ...addForm, case_number: e.target.value })}
                placeholder="e.g., 387-620178"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Broker Name *
              </label>
              <input
                type="text"
                value={addForm.broker_name}
                onChange={(e) => setAddForm({ ...addForm, broker_name: e.target.value })}
                placeholder="e.g., ABC Realty"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <input
                type="text"
                value={addForm.address}
                onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                placeholder="e.g., 123 Main St"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <input
                type="text"
                value={addForm.city}
                onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                placeholder="e.g., Charlotte"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State *
              </label>
              <input
                type="text"
                value={addForm.state}
                onChange={(e) => setAddForm({ ...addForm, state: e.target.value.toUpperCase() })}
                placeholder="e.g., NC"
                maxLength="2"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zip Code *
              </label>
              <input
                type="text"
                value={addForm.zip_code}
                onChange={(e) => setAddForm({ ...addForm, zip_code: e.target.value })}
                placeholder="e.g., 28202"
                maxLength="10"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Original List Price
              </label>
              <input
                type="number"
                value={addForm.original_list_price || ''}
                onChange={(e) => setAddForm({ ...addForm, original_list_price: e.target.value })}
                placeholder="e.g., 120000"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Net to HUD *
              </label>
              <input
                type="number"
                value={addForm.net_to_hud}
                onChange={(e) => setAddForm({ ...addForm, net_to_hud: e.target.value })}
                placeholder="e.g., 100000"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchaser Type *
              </label>
              <select
                value={addForm.purchaser_type}
                onChange={(e) => setAddForm({ ...addForm, purchaser_type: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="Investor">Investor</option>
                <option value="Owner-Occupant">Owner-Occupant</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Accepted *
              </label>
              <input
                type="date"
                value={addForm.date_accepted}
                onChange={(e) => setAddForm({ ...addForm, date_accepted: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={addForm.status}
                onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-2">
            <button
              onClick={() => {
                setShowAddForm(false)
                setAddForm({
                  case_number: '',
                  address: '',
                  city: '',
                  state: '',
                  zip_code: '',
                  net_to_hud: '',
                  broker_name: '',
                  purchaser_type: 'Investor',
                  date_accepted: '',
                  status: 'pending'
                })
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!addForm.case_number || !addForm.address || !addForm.city || !addForm.state || !addForm.zip_code || !addForm.net_to_hud || !addForm.broker_name || !addForm.date_accepted) {
                  alert('Please fill in all required fields')
                  return
                }

                setSaving(true)
                try {
                  // Check if broker exists, create if not
                  const { data: existingBroker } = await supabase
                    .from('brokers')
                    .select('id')
                    .eq('name', addForm.broker_name)
                    .single()

                  let brokerId = existingBroker?.id

                  if (!brokerId) {
                    const { data: newBroker, error: brokerError } = await supabase
                      .from('brokers')
                      .insert({ name: addForm.broker_name })
                      .select('id')
                      .single()

                    if (brokerError) throw brokerError
                    brokerId = newBroker.id
                  }

                  // Calculate estimated sale price
                  const estimatedSalePrice = parseFloat(addForm.net_to_hud) * 1.06

                  // Insert bid result
                  const { error } = await supabase
                    .from('bid_results')
                    .insert({
                      case_number: addForm.case_number,
                      address: addForm.address,
                      city: addForm.city,
                      state: addForm.state,
                      zip_code: addForm.zip_code,
                      net_to_hud: parseFloat(addForm.net_to_hud),
                      estimated_sale_price: estimatedSalePrice,
                      original_list_price: addForm.original_list_price ? parseFloat(addForm.original_list_price) : null,
                      broker_name: addForm.broker_name,
                      broker_id: brokerId,
                      purchaser_type: addForm.purchaser_type,
                      date_accepted: addForm.date_accepted,
                      status: addForm.status
                    })

                  if (error) throw error

                  alert('Bid result added successfully!')
                  setShowAddForm(false)
                  setAddForm({
                    case_number: '',
                    address: '',
                    city: '',
                    state: '',
                    zip_code: '',
                    net_to_hud: '',
                    broker_name: '',
                    purchaser_type: 'Investor',
                    date_accepted: '',
                    status: 'pending'
                  })
                  fetchBidResults()
                } catch (error) {
                  console.error('Error adding bid result:', error)
                  alert('Error adding bid result: ' + error.message)
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Bid Result'}
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setFilter('pending')}
            className={`${
              filter === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Pending ({bidResults.filter(b => b.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('closed')}
            className={`${
              filter === 'closed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Closed ({bidResults.filter(b => b.status === 'closed').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`${
              filter === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            All ({bidResults.length})
          </button>
        </nav>
      </div>

      {/* Bid Results Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Case #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Broker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Original List
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net to HUD
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sale Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bidResults.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    No bid results found for this filter
                  </td>
                </tr>
              ) : (
                bidResults.map((result) => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    {editingId === result.id ? (
                      // Edit Mode
                      <>
                        <td colSpan="8" className="px-6 py-4">
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="font-semibold text-lg mb-4">
                              Edit: {result.address}, {result.city}, {result.state}
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Status
                                </label>
                                <select
                                  value={editForm.status}
                                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="closed">Closed</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Actual Sale Price
                                </label>
                                <input
                                  type="number"
                                  value={editForm.actual_sale_price}
                                  onChange={(e) => setEditForm({ ...editForm, actual_sale_price: e.target.value })}
                                  placeholder="Enter actual sale price"
                                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Date Closed
                                </label>
                                <input
                                  type="date"
                                  value={editForm.date_closed}
                                  onChange={(e) => setEditForm({ ...editForm, date_closed: e.target.value })}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                              </div>

                              <div>
                                <label className="flex items-center space-x-2 mt-6">
                                  <input
                                    type="checkbox"
                                    checked={editForm.is_our_referral}
                                    onChange={(e) => setEditForm({ ...editForm, is_our_referral: e.target.checked })}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-sm font-medium text-gray-700">Our Referral</span>
                                </label>
                              </div>

                              <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Closing Notes
                                </label>
                                <textarea
                                  value={editForm.closing_notes}
                                  onChange={(e) => setEditForm({ ...editForm, closing_notes: e.target.value })}
                                  placeholder="Add notes about the closing..."
                                  rows="3"
                                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                              </div>
                            </div>

                            <div className="mt-4 flex justify-end space-x-2">
                              <button
                                onClick={cancelEdit}
                                disabled={saving}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => saveEdit(result.id)}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                              >
                                {saving ? 'Saving...' : 'Save Changes'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </>
                    ) : (
                      // View Mode
                      <>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{result.address}</div>
                            <div className="text-gray-500">
                              {result.city}, {result.state} {result.zip_code}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {result.case_number}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{result.broker_name}</div>
                            {result.is_our_referral && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Our Referral
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {result.original_list_price ? (
                            <span className="font-medium text-blue-600">
                              {formatCurrency(result.original_list_price)}
                            </span>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-medium text-red-600">
                            {formatCurrency(result.net_to_hud)}
                          </span>
                          <div className="text-xs text-gray-500">Confidential</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {result.actual_sale_price ? (
                            <span className="font-medium text-green-600">
                              {formatCurrency(result.actual_sale_price)}
                            </span>
                          ) : (
                            <span className="text-gray-400">Not entered</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(result.status)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div>Accepted: {formatDate(result.date_accepted)}</div>
                          {result.date_closed && (
                            <div>Closed: {formatDate(result.date_closed)}</div>
                          )}
                          {result.status === 'pending' && (
                            <div className="text-xs text-yellow-600">
                              {calculateDaysPending(result.date_accepted)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => startEdit(result)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {bidResults.filter(b => b.status === 'pending').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Closed</div>
          <div className="text-2xl font-bold text-green-600">
            {bidResults.filter(b => b.status === 'closed').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Our Referrals</div>
          <div className="text-2xl font-bold text-purple-600">
            {bidResults.filter(b => b.is_our_referral).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Volume</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(
              bidResults
                .filter(b => b.actual_sale_price)
                .reduce((sum, b) => sum + parseFloat(b.actual_sale_price), 0)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
