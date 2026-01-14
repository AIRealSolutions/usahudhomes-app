import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { US_STATES } from '../utils/states';
import { 
  ArrowLeft, Edit2, Save, X, Mail, Phone, MessageSquare, 
  Calendar, DollarSign, MapPin, Clock, User, FileText,
  Send, Home, CheckCircle, XCircle
} from 'lucide-react';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [events, setEvents] = useState([]);
  const [properties, setProperties] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventType, setEventType] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState([]);

  // Form state for editing
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchLeadDetails();
    fetchEvents();
  }, [id]);

  useEffect(() => {
    if (lead && activeTab === 'properties') {
      fetchProperties();
    }
  }, [lead, activeTab]);

  const fetchLeadDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setLead(data);
      setFormData(data);
    } catch (error) {
      console.error('Error fetching lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('consultation_events')
        .select('*')
        .eq('consultation_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchProperties = async () => {
    if (!lead) return;
    
    setLoadingProperties(true);
    try {
      // Build query based on lead preferences
      let query = supabase
        .from('properties')
        .select('*')
        .eq('status', 'Available');

      // Filter by state if preferred location is specified
      if (lead.state) {
        query = query.eq('state', lead.state);
      } else if (lead.preferred_location) {
        // Try to match city
        query = query.ilike('city', `%${lead.preferred_location}%`);
      }

      // Filter by budget if specified
      if (lead.budget_min && lead.budget_max) {
        query = query
          .gte('list_price', lead.budget_min)
          .lte('list_price', lead.budget_max);
      } else if (lead.budget_max) {
        query = query.lte('list_price', lead.budget_max);
      }

      // Limit to 20 results
      query = query.limit(20);

      const { data, error } = await query;

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoadingProperties(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('consultations')
        .update(formData)
        .eq('id', id);

      if (error) throw error;

      // Log update event
      await logEvent('update', 'Lead information updated');

      setLead(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Failed to update lead');
    }
  };

  const logEvent = async (type, notes) => {
    try {
      // Insert into consultation_events table
      const { error: eventError } = await supabase
        .from('consultation_events')
        .insert({
          consultation_id: id,
          event_type: type,
          notes: notes
        });
      
      // Update consultation counters
      const updates = {};
      if (type === 'email') {
        updates.email_count = (lead.email_count || 0) + 1;
        updates.last_email_at = new Date().toISOString();
      } else if (type === 'sms') {
        updates.sms_count = (lead.sms_count || 0) + 1;
        updates.last_sms_at = new Date().toISOString();
      } else if (type === 'call') {
        updates.call_count = (lead.call_count || 0) + 1;
        updates.last_call_at = new Date().toISOString();
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('consultations')
          .update(updates)
          .eq('id', id);
        
        setLead({ ...lead, ...updates });
      }

      fetchEvents();
    } catch (error) {
      console.error('Error logging event:', error);
    }
  };

  const handleCommunication = (type) => {
    setEventType(type);
    setShowEventModal(true);
  };

  const submitEvent = async () => {
    await logEvent(eventType, eventNotes);
    setShowEventModal(false);
    setEventNotes('');
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('consultations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      await logEvent('status_change', `Status changed to ${newStatus}`);
      setLead({ ...lead, status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading lead details...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Lead not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">
                  {lead.first_name} {lead.last_name}
                </h1>
                <p className="text-gray-600">Lead ID: {lead.id.slice(0, 8)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData(lead);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex gap-8">
            {['details', 'properties', 'communications', 'events'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium capitalize ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'details' && (
              <>
                {/* Contact Information */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.first_name || ''}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      ) : (
                        <p className="text-gray-900">{lead.first_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.last_name || ''}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      ) : (
                        <p className="text-gray-900">{lead.last_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      ) : (
                        <p className="text-gray-900">{lead.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={formData.phone || ''}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      ) : (
                        <p className="text-gray-900">{lead.phone}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Preferences & Budget</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Budget Min
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={formData.budget_min || ''}
                          onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      ) : (
                        <p className="text-gray-900">${lead.budget_min?.toLocaleString() || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Budget Max
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={formData.budget_max || ''}
                          onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      ) : (
                        <p className="text-gray-900">${lead.budget_max?.toLocaleString() || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      {isEditing ? (
                        <select
                          value={formData.state || ''}
                          onChange={(e) => {
                            setFormData({ ...formData, state: e.target.value, city: '' });
                            setAvailableCities([]);
                          }}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="">Select State</option>
                          {US_STATES.map((state) => (
                            <option key={state.code} value={state.code}>
                              {state.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-gray-900">{lead.state || 'N/A'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Timeline
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.timeline || ''}
                          onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      ) : (
                        <p className="text-gray-900">{lead.timeline || 'N/A'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Notes</h2>
                  {isEditing ? (
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-900 whitespace-pre-wrap">{lead.notes || 'No notes'}</p>
                  )}
                </div>
              </>
            )}

            {activeTab === 'properties' && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold">AI Property Recommendations</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Based on: {lead.preferred_location || 'Any location'} • 
                      Budget: ${lead.budget_min?.toLocaleString() || '0'} - ${lead.budget_max?.toLocaleString() || 'Any'}
                    </p>
                  </div>
                  <button
                    onClick={fetchProperties}
                    disabled={loadingProperties}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {loadingProperties ? 'Searching...' : 'Refresh'}
                  </button>
                </div>

                {loadingProperties ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">Searching for properties...</p>
                  </div>
                ) : properties.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">No properties found matching criteria</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm text-gray-600">{properties.length} properties found</p>
                      {selectedProperties.length > 0 && (
                        <button
                          onClick={() => {
                            // TODO: Implement share selected properties
                            alert(`Share ${selectedProperties.length} properties with ${lead.first_name}`);
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Share Selected ({selectedProperties.length})
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {properties.map((property) => (
                        <div
                          key={property.id}
                          className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedProperties.includes(property.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProperties([...selectedProperties, property.id]);
                              } else {
                                setSelectedProperties(selectedProperties.filter(id => id !== property.id));
                              }
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg">
                                  {property.address}
                                </h3>
                                <p className="text-gray-600">
                                  {property.city}, {property.state} {property.zip}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-blue-600">
                                  ${property.list_price?.toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Case: {property.case_number}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <span>{property.bedrooms} bed</span>
                              <span>•</span>
                              <span>{property.bathrooms} bath</span>
                              <span>•</span>
                              <span>{property.square_feet?.toLocaleString()} sqft</span>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <a
                                href={`/property/${property.case_number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                              >
                                View Details
                              </a>
                              <button
                                onClick={() => {
                                  // TODO: Implement share single property
                                  alert(`Share property at ${property.address} with ${lead.first_name}`);
                                }}
                                className="px-3 py-1 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100"
                              >
                                Share
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'communications' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Communication History</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Emails Sent</p>
                        <p className="text-sm text-gray-600">
                          Last: {lead.last_email_at ? new Date(lead.last_email_at).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold">{lead.email_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">SMS Sent</p>
                        <p className="text-sm text-gray-600">
                          Last: {lead.last_sms_at ? new Date(lead.last_sms_at).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold">{lead.sms_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium">Calls Made</p>
                        <p className="text-sm text-gray-600">
                          Last: {lead.last_call_at ? new Date(lead.last_call_at).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold">{lead.call_count || 0}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'events' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Activity Timeline</h2>
                {events.length === 0 ? (
                  <p className="text-gray-600">No events logged yet</p>
                ) : (
                  <div className="space-y-4">
                    {events.map((event, index) => (
                      <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <Clock className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{event.event_type}</p>
                          <p className="text-sm text-gray-600">{event.notes}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(event.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Status</h3>
              <select
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleCommunication('email')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                >
                  <Mail className="h-5 w-5" />
                  Send Email
                </button>
                <button
                  onClick={() => handleCommunication('sms')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
                >
                  <MessageSquare className="h-5 w-5" />
                  Send SMS
                </button>
                <button
                  onClick={() => handleCommunication('call')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100"
                >
                  <Phone className="h-5 w-5" />
                  Log Call
                </button>
              </div>
            </div>

            {/* Lead Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Lead Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Source</p>
                  <p className="font-medium">{lead.source || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Priority</p>
                  <p className="font-medium capitalize">{lead.priority || 'Normal'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Created</p>
                  <p className="font-medium">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Last Updated</p>
                  <p className="font-medium">
                    {new Date(lead.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4 capitalize">Log {eventType}</h3>
            <textarea
              value={eventNotes}
              onChange={(e) => setEventNotes(e.target.value)}
              placeholder="Enter notes about this interaction..."
              rows={4}
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={submitEvent}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setEventNotes('');
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
