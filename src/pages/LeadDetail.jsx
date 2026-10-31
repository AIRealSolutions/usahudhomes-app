import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useActiveClient } from '../contexts/ActiveClientContext';
import { consultationService } from '../services/database/consultationService';
import { listPicks, addPicks, markPicks, removePick } from '../services/propertyPicks';
import { suggestedReplies, labelFor } from '../services/leadReplies';
import { US_STATES } from '../utils/states';
import ClientActivity from '../components/broker/ClientActivity';
import { listProposals, PROPOSAL_STATUS } from '../services/offerProposals';
import { offerPagePath } from '../services/offerDocuments';
import {
  ArrowLeft, Edit2, Save, X, Mail, Phone, MessageSquare, Calendar, MapPin, Clock,
  User, FileText, Home, CheckCircle, Star, ThumbsUp, ThumbsDown, Trash2,
  Copy, Sparkles, DollarSign, StickyNote, ExternalLink, Loader, FileSignature, ChevronRight
} from 'lucide-react';

const EmailComposer = lazy(() => import('../components/broker/EmailComposer'));
const SMSComposer = lazy(() => import('../components/broker/SMSComposer'));
const BrokerPropertySearch = lazy(() => import('../components/broker/BrokerPropertySearch'));
const PropertyGallery = lazy(() => import('../components/PropertyGallery'));

const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'accepted', label: 'Accepted / working' },
  { value: 'scheduled', label: 'Showing scheduled' },
  { value: 'completed', label: 'Completed' },
];

const OUTCOMES = [
  { value: '', label: 'No outcome yet' },
  { value: 'bid_submitted', label: 'Bid submitted' },
  { value: 'under_contract', label: 'Under contract' },
  { value: 'closed', label: 'Closed / sold' },
  { value: 'not_interested', label: 'Not interested' },
  { value: 'unresponsive', label: 'Unresponsive' },
  { value: 'referred_out', label: 'Referred to another agent' },
];

const PICK_STATUS = {
  picked: { label: 'Not sent yet', cls: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Sent', cls: 'bg-blue-100 text-blue-800' },
  interested: { label: 'Interested', cls: 'bg-green-100 text-green-800' },
  not_interested: { label: 'Not for them', cls: 'bg-red-100 text-red-700' },
};

const ACTIVITY_LABELS = {
  email_sent: 'Email sent',
  sms_sent: 'Text sent',
  call_made: 'Call',
  email: 'Email sent',
  sms: 'Text sent',
  call: 'Call logged',
  note: 'Note',
  showing_scheduled: 'Showing scheduled',
  status_change: 'Status changed',
  outcome: 'Outcome updated',
  update: 'Details updated',
};

// Editable fields, grouped as they appear on the Overview tab
const CONTACT_FIELDS = [
  { key: 'first_name', label: 'First name' },
  { key: 'last_name', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'state', label: 'State', type: 'state' },
  { key: 'preferred_location', label: 'Preferred area' },
];

const PROFILE_FIELDS = [
  { key: 'timeline', label: 'Timeline' },
  { key: 'price_range_min', label: 'Price range from', type: 'money' },
  { key: 'price_range_max', label: 'Price range to', type: 'money' },
  { key: 'budget_max', label: 'Budget (max)', type: 'money' },
  { key: 'financing_type', label: 'Financing' },
  { key: 'pre_approved', label: 'Pre-approved', type: 'bool' },
  { key: 'down_payment', label: 'Down payment' },
  { key: 'credit_score_range', label: 'Credit score' },
  { key: 'buyer_type', label: 'Buyer type' },
  { key: 'experience_level', label: 'Experience' },
  { key: 'priority', label: 'Priority', type: 'priority' },
  { key: 'hear_about_us', label: 'Heard about us' },
];

const money = (v) => (v || v === 0 ? `$${Number(v).toLocaleString()}` : null);
const dateTime = (v) => (v ? new Date(v).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
const pretty = (v) => (v ? String(v).replace(/_/g, ' ') : null);
// Open offers first: submitted to HUD, then waiting on the broker, then the buyer
const OFFER_ORDER = ['submitted', 'accepted', 'changes_requested', 'sent', 'draft', 'declined', 'withdrawn'];

// Timeline values come from several forms
const TIMELINES = {
  '30_days': 'Within 30 days', '60_days': 'Within 60 days', '90_days': 'Within 90 days', no_rush: 'No rush',
  ongoing: 'Ongoing', immediate: 'Right away', '1_3_months': '1–3 months', '3_6_months': '3–6 months',
  '6_12_months': '6–12 months', just_browsing: 'Just browsing',
};

function displayValue(field, value) {
  if (value === null || value === undefined || value === '') return null;
  if (field.type === 'money') return money(value);
  if (field.type === 'bool') return value ? 'Yes' : 'No';
  if (field.type === 'state') return US_STATES.find(s => s.code === value)?.name || value;
  if (field.key === 'timeline') return TIMELINES[value] || pretty(value);
  return pretty(value);
}

function FieldGrid({ fields, lead, form, setForm, editing }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      {fields.map(f => {
        const shown = displayValue(f, lead[f.key]);
        return (
          <div key={f.key}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{f.label}</dt>
            <dd>
              {!editing ? (
                <span className={shown ? 'text-gray-900' : 'text-gray-400'}>{shown || 'Not provided'}</span>
              ) : f.type === 'state' ? (
                <select value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white">
                  <option value="">Select state</option>
                  {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              ) : f.type === 'bool' ? (
                <select value={form[f.key] ? 'yes' : 'no'} onChange={e => setForm({ ...form, [f.key]: e.target.value === 'yes' })} className="w-full px-3 py-2 border rounded-lg bg-white">
                  <option value="no">No / unknown</option>
                  <option value="yes">Yes</option>
                </select>
              ) : f.type === 'priority' ? (
                <select value={form[f.key] || 'medium'} onChange={e => setForm({ ...form, [f.key]: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              ) : (
                <input
                  type={f.type === 'money' ? 'number' : f.type || 'text'}
                  value={form[f.key] ?? ''}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function Card({ title, icon: CardIcon, action, children }) {
  const Icon = CardIcon;
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-blue-600" />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { start: startClientMode, refreshPicks: refreshClientPicks } = useActiveClient();

  const [lead, setLead] = useState(null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [picks, setPicks] = useState(null);
  const [offers, setOffers] = useState([]);
  const [composer, setComposer] = useState(null); // { kind: 'email'|'sms', subject?, body? }
  const [modal, setModal] = useState(null); // 'note' | 'call' | 'showing'
  const [modalText, setModalText] = useState('');
  const [showingAt, setShowingAt] = useState('');
  const [toast, setToast] = useState(null);
  const [showGallery, setShowGallery] = useState(false);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(t => (t === msg ? null : t)), 3500);
  };

  // users.name is a single field; first/last only exist on some older profiles
  const nameParts = String(profile?.name || '').trim().split(/\s+/).filter(Boolean);
  const sender = {
    first: profile?.first_name || nameParts[0] || 'your agent',
    full: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || nameParts.join(' ') || 'your agent',
    phone: profile?.phone || '',
    email: profile?.email || user?.email || '',
  };

  const fetchLead = useCallback(async () => {
    const { data, error } = await supabase
      .from('consultations')
      .select('*, customer:customers(*), property:properties(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) console.error('Error fetching lead:', error);
    if (data) {
      // Older leads keep the contact in customer_* or on the customer record
      const merged = {
        ...data,
        first_name: data.first_name || data.customer?.first_name || String(data.customer_name || '').split(' ')[0] || '',
        last_name: data.last_name || data.customer?.last_name || String(data.customer_name || '').split(' ').slice(1).join(' ') || '',
        email: data.email || data.customer_email || data.customer?.email || '',
        phone: data.phone || data.customer_phone || data.customer?.phone || '',
        state: data.state || data.customer?.state || '',
      };
      setLead(merged);
      setForm(merged);
      // While on this lead, every save or share across the site goes to this client
      startClientMode(merged);
      let prop = data.property;
      if (!prop && data.case_number) {
        const { data: byCase } = await supabase.from('properties').select('*').eq('case_number', data.case_number).maybeSingle();
        prop = byCase;
      }
      setProperty(prop || null);
    }
    setLoading(false);
  }, [id, startClientMode]);

  const fetchTimeline = useCallback(async () => {
    const [events, activity] = await Promise.all([
      supabase.from('consultation_events').select('id, event_type, notes, created_at').eq('consultation_id', id).order('created_at', { ascending: false }),
      supabase.from('activity_log').select('id, activity_type, activity_data, created_at').eq('consultation_id', id).order('created_at', { ascending: false }),
    ]);
    const items = [
      ...(events.data || []).map(e => ({ id: `e-${e.id}`, type: e.event_type, text: e.notes, at: e.created_at })),
      ...(activity.data || []).map(a => {
        const d = a.activity_data || {};
        const text = d.subject ? `${d.subject}${d.body ? `\n\n${d.body}` : ''}` : d.message || d.body || d.notes || (d.phone ? `Called ${d.phone}` : '');
        return { id: `a-${a.id}`, type: a.activity_type, text, at: a.created_at };
      }),
    ].sort((x, y) => new Date(y.at) - new Date(x.at));
    setTimeline(items);
  }, [id]);

  const fetchPicks = useCallback(async () => {
    try {
      setPicks(await listPicks(id));
      refreshClientPicks();
    } catch (e) {
      console.error('Could not load picks:', e);
      setPicks([]);
    }
  }, [id, refreshClientPicks]);

  useEffect(() => {
    fetchLead();
    fetchTimeline();
    fetchPicks();
    listProposals(id)
      .then(list => setOffers([...(list || [])].sort((a, b) => OFFER_ORDER.indexOf(a.status) - OFFER_ORDER.indexOf(b.status))))
      .catch(e => console.error('Could not load offers:', e));
  }, [id, fetchLead, fetchTimeline, fetchPicks]);

  const logEvent = async (type, notes) => {
    const { error } = await supabase.from('consultation_events').insert({
      consultation_id: id, event_type: type, notes, created_by: user?.email || null,
    });
    if (error) console.error('Error logging event:', error);
    fetchTimeline();
  };

  const updateLead = async (changes, eventType, eventNote) => {
    const { error } = await supabase.from('consultations').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      alert('Could not save: ' + error.message);
      return false;
    }
    setLead(l => ({ ...l, ...changes }));
    setForm(f => ({ ...f, ...changes }));
    if (eventType) await logEvent(eventType, eventNote);
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    const keys = [...CONTACT_FIELDS, ...PROFILE_FIELDS].map(f => f.key).concat('notes');
    const numberKeys = PROFILE_FIELDS.filter(f => f.type === 'money').map(f => f.key);
    const changes = {};
    for (const k of keys) {
      let v = form[k];
      if (numberKeys.includes(k)) v = v === '' || v === null || v === undefined ? null : Number(v);
      else if (typeof v === 'string') v = v.trim() || null;
      changes[k] = v ?? null;
    }
    // Lead cards read customer_* fields; keep them in step
    changes.customer_name = [changes.first_name, changes.last_name].filter(Boolean).join(' ') || null;
    changes.customer_email = changes.email;
    changes.customer_phone = changes.phone;
    const ok = await updateLead(changes, 'update', 'Lead details updated');
    setSaving(false);
    if (ok) {
      setEditing(false);
      flash('Saved');
    }
  };

  const callLead = async () => {
    if (!lead.phone) return;
    await consultationService.logCommunication(id, profile?.id, 'call_made', { phone: lead.phone });
    fetchTimeline();
    window.location.href = `tel:${lead.phone}`;
  };

  const submitModal = async () => {
    if (modal === 'showing') {
      if (!showingAt) return alert('Pick a date and time for the showing.');
      const when = new Date(showingAt);
      await updateLead(
        { status: 'scheduled', scheduled_at: when.toISOString(), scheduled_date: showingAt },
        'showing_scheduled',
        `Showing ${dateTime(when)}${property?.case_number ? ` for case #${property.case_number}` : ''}${modalText.trim() ? `\n${modalText.trim()}` : ''}`
      );
      flash('Showing scheduled');
    } else if (modal === 'call') {
      if (!modalText.trim()) return alert('Add a few words about the call.');
      await consultationService.logCommunication(id, profile?.id, 'call_made', { phone: lead.phone, notes: modalText.trim() });
      fetchTimeline();
      flash('Call logged');
    } else {
      if (!modalText.trim()) return alert('Write a note first.');
      await logEvent('note', modalText.trim());
      flash('Note added');
    }
    setModal(null);
    setModalText('');
    setShowingAt('');
  };

  const setPickStatus = async (pick, status) => {
    try {
      await markPicks([pick.id], status);
      setPicks(list => list.map(p => (p.id === pick.id ? { ...p, status } : p)));
    } catch (e) {
      alert(e.message);
    }
  };

  const deletePick = async (pick) => {
    try {
      await removePick(pick.id);
      setPicks(list => list.filter(p => p.id !== pick.id));
    } catch (e) {
      alert(e.message);
    }
  };

  const addHomes = async (homes, clearSelection) => {
    try {
      const [result] = await addPicks([id], homes);
      clearSelection?.();
      await fetchPicks();
      flash(`${result?.added || 0} added to ${lead.first_name || 'this client'}'s picks${result?.hasAccount ? ' and Saved Homes' : ''}`);
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-600"><Loader className="h-6 w-6 animate-spin mr-2" /> Loading lead…</div>;
  }
  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <p className="text-xl">Lead not found</p>
        <Link to="/broker-dashboard" className="text-blue-600 hover:underline">Back to the Broker Portal</Link>
      </div>
    );
  }

  const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unnamed lead';
  const statusLabel = STATUSES.find(s => s.value === lead.status)?.label || pretty(lead.status) || 'New';
  const outcomeLabel = OUTCOMES.find(o => o.value === (lead.outcome || ''))?.label;
  const replies = suggestedReplies({ lead, property, sender });
  const customerForComposer = { first_name: lead.first_name, last_name: lead.last_name, email: lead.email, phone: lead.phone };
  const lastContact = [lead.last_email_at, lead.last_sms_at, lead.last_call_at].filter(Boolean).sort().pop();
  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'homes', label: `Homes${picks?.length ? ` (${picks.length})` : ''}`, icon: Home },
    { id: 'respond', label: 'Respond & history', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <button
                onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/broker-dashboard'))}
                className="p-2 hover:bg-gray-100 rounded-lg mt-0.5"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 truncate">{fullName}</h1>
                <p className="text-sm text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">{statusLabel}</span>
                  {lead.outcome && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">{outcomeLabel}</span>}
                  <span>{labelFor(lead.consultation_type || lead.source)}</span>
                  <span>Came in {dateTime(lead.created_at)}</span>
                  {lastContact ? <span>Last contact {dateTime(lastContact)}</span> : <span className="text-orange-600 font-medium">Not contacted yet</span>}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={callLead} disabled={!lead.phone} className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 text-sm font-medium"><Phone className="h-4 w-4" /> Call</button>
              <button onClick={() => setComposer({ kind: 'sms' })} disabled={!lead.phone} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 text-sm font-medium"><MessageSquare className="h-4 w-4" /> Text</button>
              <button onClick={() => setComposer({ kind: 'email' })} disabled={!lead.email} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 text-sm font-medium"><Mail className="h-4 w-4" /> Email</button>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 py-3 border-b-2 font-medium whitespace-nowrap ${activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
                >
                  <Icon className="h-4 w-4" /> {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'overview' && (
              <>
                {offers.length > 0 && (
                  <Card
                    title={`Offers (${offers.length})`}
                    icon={FileSignature}
                    action={<Link to="/broker-dashboard?panel=client-offers" className="text-sm font-medium text-blue-700 hover:underline">All offers</Link>}
                  >
                    <ul className="divide-y divide-gray-100">
                      {offers.map(o => {
                        const status = PROPOSAL_STATUS[o.status] || {};
                        const where = [o.property?.address, o.property?.city].filter(Boolean).join(', ') || `Case #${o.case_number}`;
                        return (
                          <li key={o.id} className="py-2 first:pt-0 last:pb-0 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900">
                                {money(o.offer_price)}
                                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${status.tone || 'bg-gray-100 text-gray-700'}`}>{status.label || o.status}</span>
                              </p>
                              <p className="text-xs text-gray-500 truncate">{where} · updated {dateTime(o.updated_at)}</p>
                            </div>
                            <Link to={offerPagePath('proposal', o.id)} className="text-sm font-medium text-blue-700 hover:underline">Documents &amp; timeline</Link>
                            <Link to={`/broker-dashboard?panel=client-offers&offer=${o.id}`} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                              Open offer <ChevronRight className="h-4 w-4" />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                )}

                {/* What they asked for */}
                <Card title="What they asked for" icon={Sparkles}>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {property && (
                      <a href={`/property/${property.case_number}`} target="_blank" rel="noreferrer" className="sm:w-48 shrink-0 block rounded-lg overflow-hidden bg-gray-100 h-32">
                        {property.main_image
                          ? <img src={property.main_image} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Home className="h-10 w-10 text-gray-300" /></div>}
                      </a>
                    )}
                    <div className="min-w-0 space-y-2">
                      <p className="text-sm text-gray-600">
                        <strong className="text-gray-900">{labelFor(lead.consultation_type || lead.source)}</strong>
                        {lead.source && lead.source !== lead.consultation_type && <> · via {labelFor(lead.source)}</>}
                      </p>
                      {property ? (
                        <div>
                          <a href={`/property/${property.case_number}`} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 hover:underline inline-flex items-center gap-1">
                            {property.address}, {property.city}, {property.state} <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <p className="text-sm text-gray-600">
                            {[money(property.price), property.beds && `${property.beds} bd`, property.baths && `${property.baths} ba`, property.sq_ft && `${Number(property.sq_ft).toLocaleString()} sq ft`, property.status, `Case #${property.case_number}`].filter(Boolean).join(' · ')}
                          </p>
                          <button onClick={() => setShowGallery(true)} className="mt-1 text-sm font-medium text-blue-700 hover:underline">
                            See all photos / download
                          </button>
                        </div>
                      ) : lead.case_number ? (
                        <p className="text-sm text-gray-700">Case #{lead.case_number} (no longer listed)</p>
                      ) : (
                        <p className="text-sm text-gray-500">No specific home. Use the Homes tab to find some for them.</p>
                      )}
                      {lead.message ? (
                        <blockquote className="text-sm text-gray-800 bg-gray-50 border-l-4 border-blue-300 rounded p-3 whitespace-pre-wrap">"{lead.message}"</blockquote>
                      ) : (
                        <p className="text-sm text-gray-400">No message left.</p>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Contact */}
                <Card
                  title="Contact"
                  icon={User}
                  action={!editing ? (
                    <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline"><Edit2 className="h-4 w-4" /> Edit details</button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}</button>
                      <button onClick={() => { setEditing(false); setForm(lead); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"><X className="h-4 w-4" /> Cancel</button>
                    </div>
                  )}
                >
                  <FieldGrid fields={CONTACT_FIELDS} lead={lead} form={form} setForm={setForm} editing={editing} />
                  {!editing && (lead.email || lead.phone) && (
                    <button
                      onClick={() => { navigator.clipboard?.writeText([fullName, lead.email, lead.phone].filter(Boolean).join('\n')); flash('Contact copied'); }}
                      className="mt-4 flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy contact
                    </button>
                  )}
                </Card>

                {/* Buyer profile */}
                <Card title="Buyer profile & financing" icon={DollarSign}>
                  <FieldGrid fields={PROFILE_FIELDS} lead={lead} form={form} setForm={setForm} editing={editing} />
                  {lead.property_preferences && typeof lead.property_preferences === 'object' && (
                    <p className="mt-4 text-sm text-gray-700">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-2">Property preferences</span>
                      {Object.entries(lead.property_preferences).filter(([, v]) => v).map(([k, v]) => `${pretty(k)}: ${v}`).join(' · ') || 'None'}
                    </p>
                  )}
                </Card>

                {/* Notes */}
                <Card title="Notes" icon={StickyNote}>
                  {editing ? (
                    <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={5} className="w-full px-3 py-2 border rounded-lg" />
                  ) : (
                    <p className={`whitespace-pre-wrap ${lead.notes ? 'text-gray-900' : 'text-gray-400'}`}>{lead.notes || 'No notes yet. Use "Add note" on the right to keep a running log.'}</p>
                  )}
                </Card>

                {/* Site activity */}
                <ClientActivity consultationId={lead.id} defaultOpen />
              </>
            )}

            {activeTab === 'homes' && (
              <>
                <Card title={`Homes picked for ${lead.first_name || 'this client'}`} icon={Star}>
                  {!picks ? (
                    <p className="text-sm text-gray-500 flex items-center gap-2"><Loader className="h-4 w-4 animate-spin" /> Loading…</p>
                  ) : picks.length === 0 ? (
                    <p className="text-sm text-gray-500">No homes picked yet. Search below and add the ones that fit.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {picks.map(pick => {
                        const p = pick.property || {};
                        const st = PICK_STATUS[pick.status] || PICK_STATUS.picked;
                        return (
                          <li key={pick.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-16 h-12 rounded bg-gray-100 overflow-hidden shrink-0">
                                {p.main_image ? <img src={p.main_image} alt="" className="w-full h-full object-cover" /> : <Home className="w-6 h-6 m-3 text-gray-300" />}
                              </div>
                              <div className="min-w-0">
                                <a href={`/property/${pick.case_number}`} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline truncate block">
                                  {p.address ? `${p.address}, ${p.city}` : `Case #${pick.case_number}`}
                                </a>
                                <p className="text-xs text-gray-500">
                                  {[money(p.price), p.beds && `${p.beds} bd`, p.status, pick.note && `"${pick.note}"`].filter(Boolean).join(' · ')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}{pick.status === 'sent' && pick.sent_at ? ` ${new Date(pick.sent_at).toLocaleDateString()}` : ''}</span>
                              <button onClick={() => setPickStatus(pick, 'interested')} title="They're interested" className="p-1.5 rounded hover:bg-green-50 text-gray-500 hover:text-green-700"><ThumbsUp className="h-4 w-4" /></button>
                              <button onClick={() => setPickStatus(pick, 'not_interested')} title="Not for them" className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"><ThumbsDown className="h-4 w-4" /></button>
                              <button onClick={() => deletePick(pick)} title="Remove" className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {picks?.length > 0 && lead.email && (
                    <button
                      onClick={() => { const r = replies.find(x => x.id === 'picks'); setComposer({ kind: 'email', subject: r.subject, body: r.body }); }}
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700"
                    >
                      <Mail className="h-4 w-4" /> Email these homes
                    </button>
                  )}
                </Card>

                <Card title="Find more homes" icon={Home}>
                  <Suspense fallback={<p className="text-sm text-gray-500">Loading search…</p>}>
                    <BrokerPropertySearch
                      initialFilters={{
                        state: (lead.state || '').toUpperCase().slice(0, 2),
                        city: lead.preferred_location || '',
                        minPrice: lead.price_range_min || lead.budget_min || '',
                        maxPrice: lead.price_range_max || lead.budget_max || '',
                      }}
                      onAddToClients={addHomes}
                      actionLabel={`Save to ${lead.first_name || 'this client'}`}
                    />
                  </Suspense>
                  <p className="mt-3 text-xs text-gray-500">"Add to clients" here adds the homes straight to {lead.first_name || 'this client'}'s picks.</p>
                </Card>
              </>
            )}

            {activeTab === 'respond' && (
              <>
                <Card title="Suggested replies" icon={Sparkles}>
                  <p className="text-sm text-gray-600 -mt-2 mb-4">Pick one to open it ready to edit and send. Everything you send is logged below.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {replies.map(r => (
                      <div key={r.id} className="border border-gray-200 rounded-lg p-4 flex flex-col">
                        <p className="font-semibold text-gray-900">{r.title}</p>
                        <p className="text-xs text-gray-500 mb-3">{r.why}</p>
                        <p className="text-sm text-gray-700 line-clamp-3 flex-1">{r.body.split('\n').filter(Boolean)[1] || r.body}</p>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => setComposer({ kind: 'email', subject: r.subject, body: r.body })} disabled={!lead.email} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-40"><Mail className="h-4 w-4" /> Email</button>
                          <button onClick={() => setComposer({ kind: 'sms', body: r.sms })} disabled={!lead.phone} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-40"><MessageSquare className="h-4 w-4" /> Text</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="History" icon={Clock}>
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: 'Emails', count: lead.email_count, last: lead.last_email_at, icon: Mail, cls: 'text-blue-600' },
                      { label: 'Texts', count: lead.sms_count, last: lead.last_sms_at, icon: MessageSquare, cls: 'text-green-600' },
                      { label: 'Calls', count: lead.call_count, last: lead.last_call_at, icon: Phone, cls: 'text-purple-600' },
                    ].map(s => {
                      const Icon = s.icon;
                      return (
                        <div key={s.label} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 flex items-center gap-1"><Icon className={`h-3.5 w-3.5 ${s.cls}`} /> {s.label}</p>
                          <p className="text-xl font-bold">{s.count || 0}</p>
                          <p className="text-[11px] text-gray-500">{s.last ? `Last ${new Date(s.last).toLocaleDateString()}` : 'None yet'}</p>
                        </div>
                      );
                    })}
                  </div>
                  {timeline.length === 0 ? (
                    <p className="text-sm text-gray-500">Nothing logged yet.</p>
                  ) : (
                    <ol className="relative border-l-2 border-gray-200 ml-2 space-y-4">
                      {timeline.map(item => (
                        <li key={item.id} className="ml-4">
                          <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-white" />
                          <p className="text-xs text-gray-500">{dateTime(item.at)}</p>
                          <p className="font-medium text-gray-900">{ACTIVITY_LABELS[item.type] || pretty(item.type)}</p>
                          {item.text && <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">{item.text}</p>}
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>
              </>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <Card title="Next step" icon={CheckCircle}>
              <div className="space-y-2">
                <button onClick={() => setActiveTab('respond')} className="w-full flex items-center gap-3 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium"><Sparkles className="h-4 w-4" /> Choose a reply</button>
                <button onClick={() => { setModal('call'); setModalText(''); }} className="w-full flex items-center gap-3 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-sm font-medium"><Phone className="h-4 w-4" /> Log a call</button>
                <button onClick={() => { setModal('showing'); setModalText(''); }} className="w-full flex items-center gap-3 px-4 py-2.5 bg-amber-50 text-amber-800 rounded-lg hover:bg-amber-100 text-sm font-medium"><Calendar className="h-4 w-4" /> Schedule a showing</button>
                <button onClick={() => { setModal('note'); setModalText(''); }} className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium"><StickyNote className="h-4 w-4" /> Add a note</button>
                <button onClick={() => setActiveTab('homes')} className="w-full flex items-center gap-3 px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 text-sm font-medium"><Home className="h-4 w-4" /> Pick homes for them</button>
              </div>
            </Card>

            <Card title="Status" icon={FileText}>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Stage</label>
              <select
                value={STATUSES.some(s => s.value === lead.status) ? lead.status : ''}
                onChange={e => updateLead({ status: e.target.value }, 'status_change', `Status changed to ${STATUSES.find(s => s.value === e.target.value)?.label}`)}
                className="w-full px-3 py-2 border rounded-lg bg-white mb-4"
              >
                {!STATUSES.some(s => s.value === lead.status) && <option value="">{pretty(lead.status) || 'Choose…'}</option>}
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Outcome</label>
              <select
                value={lead.outcome || ''}
                onChange={e => updateLead({ outcome: e.target.value || null }, 'outcome', `Outcome: ${OUTCOMES.find(o => o.value === e.target.value)?.label}`)}
                className="w-full px-3 py-2 border rounded-lg bg-white"
              >
                {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {lead.scheduled_at && (
                <p className="mt-4 text-sm text-amber-800 bg-amber-50 rounded-lg p-2 flex items-center gap-2"><Calendar className="h-4 w-4" /> Showing {dateTime(lead.scheduled_at)}</p>
              )}
            </Card>

            <Card title="Lead info" icon={MapPin}>
              <dl className="space-y-2 text-sm">
                {[
                  ['Source', labelFor(lead.source || lead.consultation_type)],
                  ['Came in', dateTime(lead.created_at)],
                  ['Accepted', lead.accepted_at && dateTime(lead.accepted_at)],
                  ['Last updated', dateTime(lead.updated_at)],
                  ['Lead ID', lead.id.slice(0, 8)],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="font-medium text-gray-900 text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </aside>
        </div>
      </div>

      {/* Call / note / showing */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-3">
              {modal === 'showing' ? 'Schedule a showing' : modal === 'call' ? 'Log a call' : 'Add a note'}
            </h3>
            {modal === 'showing' && (
              <>
                <label htmlFor="showing-at" className="block text-sm font-medium text-gray-700 mb-1">Date and time</label>
                <input id="showing-at" type="datetime-local" value={showingAt} onChange={e => setShowingAt(e.target.value)} className="w-full px-3 py-2 border rounded-lg mb-3" />
              </>
            )}
            <textarea
              value={modalText}
              onChange={e => setModalText(e.target.value)}
              rows={4}
              placeholder={modal === 'showing' ? 'Optional: which home, where to meet…' : modal === 'call' ? 'What did you talk about? Next steps?' : 'Write a note…'}
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />
            <div className="flex gap-2">
              <button onClick={submitModal} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Email / text composers (templates, picked homes and logging built in) */}
      {composer && (
        <Suspense fallback={null}>
          {composer.kind === 'email' ? (
            <EmailComposer
              consultation={lead}
              customer={customerForComposer}
              property={property}
              initialSubject={composer.subject || ''}
              initialBody={composer.body || ''}
              onSend={() => { setComposer(null); fetchLead(); fetchTimeline(); fetchPicks(); }}
              onCancel={() => setComposer(null)}
            />
          ) : (
            <SMSComposer
              consultation={lead}
              customer={customerForComposer}
              property={property}
              initialMessage={composer.body || ''}
              onSend={() => { setComposer(null); fetchLead(); fetchTimeline(); fetchPicks(); }}
              onCancel={() => setComposer(null)}
            />
          )}
        </Suspense>
      )}

      {showGallery && property && (
        <Suspense fallback={null}>
          <PropertyGallery
            property={property}
            title={`${property.address}, ${property.city} · Case #${property.case_number}`}
            canDownload
            onClose={() => setShowGallery(false)}
          />
        </Suspense>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">{toast}</div>
      )}
    </div>
  );
}
