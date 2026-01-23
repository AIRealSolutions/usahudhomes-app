import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { 
  ArrowLeft, Phone, Mail, MessageSquare, Calendar, MapPin, 
  DollarSign, Home, User, Clock, FileText, Send, X, Check,
  AlertCircle, CheckCircle, Edit2, Save, Trash2
} from 'lucide-react';

export default function LeadDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [events, setEvents] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [callResult, setCallResult] = useState('');
  const [textMessage, setTextMessage] = useState('');

  const STATUS_OPTIONS = [
    { value: 'new_lead', label: 'New Lead', color: 'yellow' },
    { value: 'under_review', label: 'Under Review', color: 'blue' },
    { value: 'contacted', label: 'Contacted', color: 'purple' },
    { value: 'opt_in_sent', label: 'Opt-In Sent', color: 'orange' },
    { value: 'opted_in', label: 'Opted In', color: 'green' },
    { value: 'onboarding', label: 'Onboarding', color: 'indigo' },
    { value: 'onboarded', label: 'Onboarded', color: 'emerald' },
    { value: 'archived', label: 'Archived', color: 'gray' }
  ];

  useEffect(() => {
    fetchLeadDetails();
    fetchEvents();
    fetchEmailTemplates();
  }, [id]);

  const fetchLeadDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setLead(data);
      setNewStatus(data.status);
    } catch (error) {
      console.error('Error fetching lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_events')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchEmailTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setEmailTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const logEvent = async (eventType, eventData = {}) => {
    try {
      const { error } = await supabase
        .from('lead_events')
        .insert({
          lead_id: id,
          event_type: eventType,
          event_data: eventData
        });

      if (error) throw error;
      await fetchEvents();
    } catch (error) {
      console.error('Error logging event:', error);
    }
  };

  const handleStatusChange = async () => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      await logEvent('status_changed', {
        from: lead.status,
        to: newStatus
      });

      setLead({ ...lead, status: newStatus });
      setEditingStatus(false);
      alert('Status updated successfully!');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleDeleteLead = async () => {
    const leadName = `${lead.first_name} ${lead.last_name}`.trim();
    const confirmed = confirm(`Are you sure you want to delete ${leadName}? This action cannot be undone.`);
    
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Lead deleted successfully!');
      navigate('/admin/leads');
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Failed to delete lead: ' + error.message);
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;

    try {
      await logEvent('note_added', { note: note.trim() });
      setNote('');
      setShowNoteModal(false);
      alert('Note added successfully!');
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note');
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      alert('Please fill in subject and body');
      return;
    }

    try {
      await logEvent('email_sent', {
        subject: emailSubject,
        body: emailBody,
        template: selectedTemplate?.name
      });

      // TODO: Integrate with actual email sending service
      alert('Email logged successfully! (Email sending integration pending)');
      setShowEmailModal(false);
      setEmailSubject('');
      setEmailBody('');
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to log email');
    }
  };

  const handleLogCall = async () => {
    if (!callResult.trim()) {
      alert('Please enter call result');
      return;
    }

    try {
      await logEvent('call_made', {
        result: callResult,
        phone: lead.phone
      });

      alert('Call logged successfully!');
      setShowCallModal(false);
      setCallResult('');
    } catch (error) {
      console.error('Error logging call:', error);
      alert('Failed to log call');
    }
  };

  const handleLogText = async () => {
    if (!textMessage.trim()) {
      alert('Please enter message');
      return;
    }

    try {
      await logEvent('text_sent', {
        message: textMessage,
        phone: lead.phone
      });

      alert('Text logged successfully!');
      setShowTextModal(false);
      setTextMessage('');
    } catch (error) {
      console.error('Error logging text:', error);
      alert('Failed to log text');
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setEmailSubject(template.subject);
    
    // Replace merge fields
    let body = template.body;
    body = body.replace(/\{\{first_name\}\}/g, lead.first_name || '');
    body = body.replace(/\{\{last_name\}\}/g, lead.last_name || '');
    body = body.replace(/\{\{email\}\}/g, lead.email || '');
    body = body.replace(/\{\{state\}\}/g, lead.state || '');
    body = body.replace(/\{\{property_address\}\}/g, lead.property_address || '');
    
    setEmailBody(body);
  };

  const getStatusColor = (status) => {
    const statusObj = STATUS_OPTIONS.find(s => s.value === status);
    return statusObj?.color || 'gray';
  };

  const formatEventType = (type) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getEventIcon = (type) => {
    const icons = {
      lead_received: <CheckCircle className="h-4 w-4" />,
      call_made: <Phone className="h-4 w-4" />,
      email_sent: <Mail className="h-4 w-4" />,
      text_sent: <MessageSquare className="h-4 w-4" />,
      note_added: <FileText className="h-4 w-4" />,
      status_changed: <Edit2 className="h-4 w-4" />
    };
    return icons[type] || <Clock className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading lead details...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">Lead not found</div>
      </div>
    );
  }

  const statusColor = getStatusColor(lead.status);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/leads')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leads
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {lead.first_name} {lead.last_name}
            </h1>
            <p className="text-gray-600 mt-1 flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              {lead.state}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {editingStatus ? (
              <div className="flex items-center gap-2">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleStatusChange}
                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Save className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setEditingStatus(false);
                    setNewStatus(lead.status);
                  }}
                  className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingStatus(true)}
                className={`px-4 py-2 rounded-full text-sm font-semibold bg-${statusColor}-100 text-${statusColor}-800 flex items-center gap-2 hover:bg-${statusColor}-200`}
              >
                {STATUS_OPTIONS.find(s => s.value === lead.status)?.label}
                <Edit2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Lead Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Communication Tools */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Communication Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <a
                href={`tel:${lead.phone}`}
                onClick={() => setShowCallModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Phone className="h-4 w-4" />
                Call
              </a>
              <button
                onClick={() => setShowTextModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <MessageSquare className="h-4 w-4" />
                Text
              </button>
              <button
                onClick={() => setShowEmailModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Mail className="h-4 w-4" />
                Email
              </button>
              <button
                onClick={() => setShowNoteModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <FileText className="h-4 w-4" />
                Add Note
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleDeleteLead}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 w-full"
              >
                <Trash2 className="h-4 w-4" />
                Delete Lead
              </button>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 mr-3" />
                <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
                  {lead.email}
                </a>
              </div>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-400 mr-3" />
                <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                  {lead.phone}
                </a>
              </div>
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-700">{lead.state}</span>
              </div>
            </div>
          </div>

          {/* Property Interest */}
          {(lead.property_address || lead.budget_min) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Property Interest</h2>
              {lead.property_address ? (
                <div className="space-y-3">
                  <div className="flex items-start">
                    <Home className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">{lead.property_address}</div>
                      {lead.property_price && (
                        <div className="text-gray-600 flex items-center mt-1">
                          <DollarSign className="h-4 w-4 mr-1" />
                          {lead.property_price.toLocaleString()}
                        </div>
                      )}
                      {lead.property_case_number && (
                        <Link
                          to={`/property/${lead.property_case_number}`}
                          className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                        >
                          View Property →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {lead.budget_min && lead.budget_max && (
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-gray-700">
                        Budget: ${lead.budget_min.toLocaleString()} - ${lead.budget_max.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {lead.timeline && (
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-gray-700">Timeline: {lead.timeline}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Message */}
          {lead.message && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Message</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{lead.message}</p>
            </div>
          )}

          {/* Event Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Activity Timeline</h2>
            {events.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No activity yet</p>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-${getStatusColor(lead.status)}-100 flex items-center justify-center text-${getStatusColor(lead.status)}-600`}>
                      {getEventIcon(event.event_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {formatEventType(event.event_type)}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(event.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {event.event_data && Object.keys(event.event_data).length > 0 && (
                        <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                          {event.event_data.note && <p>{event.event_data.note}</p>}
                          {event.event_data.subject && <p><strong>Subject:</strong> {event.event_data.subject}</p>}
                          {event.event_data.result && <p><strong>Result:</strong> {event.event_data.result}</p>}
                          {event.event_data.message && <p><strong>Message:</strong> {event.event_data.message}</p>}
                          {event.event_data.from && event.event_data.to && (
                            <p><strong>Status:</strong> {formatEventType(event.event_data.from)} → {formatEventType(event.event_data.to)}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Metadata */}
        <div className="space-y-6">
          {/* Lead Source */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Lead Information</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Source</span>
                <div className="mt-1">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    lead.source === 'website' ? 'bg-blue-100 text-blue-800' :
                    lead.source === 'property_inquiry' ? 'bg-green-100 text-green-800' :
                    lead.source === 'facebook' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {lead.source.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Received</span>
                <div className="mt-1 text-gray-900">
                  {new Date(lead.created_at).toLocaleDateString()}
                  <div className="text-sm text-gray-500">
                    {new Date(lead.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              {lead.updated_at && lead.updated_at !== lead.created_at && (
                <div>
                  <span className="text-sm text-gray-500">Last Updated</span>
                  <div className="mt-1 text-gray-900">
                    {new Date(lead.updated_at).toLocaleDateString()}
                    <div className="text-sm text-gray-500">
                      {new Date(lead.updated_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => setShowEmailModal(true)}
                className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-left flex items-center"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Opt-In Request
              </button>
              <button
                onClick={() => navigate('/admin/leads')}
                className="w-full px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-left flex items-center"
              >
                <User className="h-4 w-4 mr-2" />
                Assign to Broker
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Send Email</h2>
                <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Template Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Template (Optional)
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {emailTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className={`p-3 border rounded-lg text-left hover:bg-gray-50 ${
                        selectedTemplate?.id === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-gray-500">{template.subject}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Email subject"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Email body"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendEmail}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Send Email
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Log Call</h2>
                <button onClick={() => setShowCallModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-gray-600 mb-2">Calling: {lead.phone}</p>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Call Result
                </label>
                <textarea
                  value={callResult}
                  onChange={(e) => setCallResult(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="What happened during the call?"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCallModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogCall}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Log Call
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text Modal */}
      {showTextModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Log Text Message</h2>
                <button onClick={() => setShowTextModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-gray-600 mb-2">Texting: {lead.phone}</p>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={textMessage}
                  onChange={(e) => setTextMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="What did you text?"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowTextModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogText}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Log Text
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Add Note</h2>
                <button onClick={() => setShowNoteModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a note about this lead..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowNoteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNote}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
