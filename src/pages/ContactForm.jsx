import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { Home, Phone, Mail, MapPin, DollarSign, Calendar, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';

export default function ContactForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    state: '',
    budget_min: '',
    budget_max: '',
    timeline: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const US_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Puerto Rico', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee',
    'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  const TIMELINES = [
    { value: 'immediate', label: 'Immediately (0-30 days)' },
    { value: '1-3 months', label: '1-3 months' },
    { value: '3-6 months', label: '3-6 months' },
    { value: '6-12 months', label: '6-12 months' },
    { value: 'just browsing', label: 'Just browsing' }
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    if (!formData.state) newErrors.state = 'Please select a state';

    if (formData.budget_min && formData.budget_max) {
      const min = parseInt(formData.budget_min);
      const max = parseInt(formData.budget_max);
      if (min > max) {
        newErrors.budget_max = 'Maximum budget must be greater than minimum';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const { data, error } = await supabase
        .from('referrals')
        .insert({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          state: formData.state,
          budget_min: formData.budget_min ? parseInt(formData.budget_min) : null,
          budget_max: formData.budget_max ? parseInt(formData.budget_max) : null,
          timeline: formData.timeline || null,
          message: formData.message || null,
          source: 'website',
          status: 'unassigned'
        })
        .select()
        .single();

      if (error) throw error;

      navigate('/contact/thank-you', { 
        state: { 
          name: formData.first_name,
          referralId: data.id 
        } 
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Failed to submit form. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 rounded-full p-4">
              <Home className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Find Your Dream HUD Home
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Connect with a HUD-registered broker in your area. Fill out the form below and we'll match you with an experienced agent.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <form onSubmit={handleSubmit} className="space-y-8">
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{errors.submit}</p>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Mail className="h-6 w-6 mr-2 text-blue-600" />
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.first_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="John"
                  />
                  {errors.first_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.last_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Doe"
                  />
                  {errors.last_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="john.doe@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="(555) 123-4567"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <MapPin className="h-6 w-6 mr-2 text-blue-600" />
                Property Preferences
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred State *
                  </label>
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.state ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select a state...</option>
                    {US_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  {errors.state && (
                    <p className="mt-1 text-sm text-red-600">{errors.state}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="budget_min" className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Budget
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      id="budget_min"
                      name="budget_min"
                      value={formData.budget_min}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="50000"
                      min="0"
                      step="1000"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="budget_max" className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Budget
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      id="budget_max"
                      name="budget_max"
                      value={formData.budget_max}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.budget_max ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="200000"
                      min="0"
                      step="1000"
                    />
                  </div>
                  {errors.budget_max && (
                    <p className="mt-1 text-sm text-red-600">{errors.budget_max}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="timeline" className="block text-sm font-medium text-gray-700 mb-2">
                    When are you looking to buy?
                  </label>
                  <select
                    id="timeline"
                    name="timeline"
                    value={formData.timeline}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a timeframe...</option>
                    {TIMELINES.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <MessageSquare className="h-6 w-6 mr-2 text-blue-600" />
                Additional Information
              </h2>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Tell us more about what you're looking for (optional)
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Example: Looking for a 3-bedroom home with a garage..."
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <strong>Privacy Notice:</strong> Your information will be shared with a HUD-registered broker in your area. We respect your privacy and will never sell your information.
              </p>
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-12 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Connect Me With a Broker
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Phone className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Response</h3>
            <p className="text-gray-600">Get connected within 24 hours</p>
          </div>
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">HUD Certified</h3>
            <p className="text-gray-600">All brokers are HUD-registered</p>
          </div>
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Obligation</h3>
            <p className="text-gray-600">Free consultation, no commitment</p>
          </div>
        </div>
      </div>
    </div>
  );
}
