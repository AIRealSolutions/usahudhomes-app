import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Mail, Phone } from 'lucide-react'

const PersonalInfoStep = ({ formData, updateFormData, errors }) => {
  const formatPhoneNumber = (value) => {
    // Remove all non-numeric characters
    const phoneNumber = value.replace(/\D/g, '')
    
    // Format as (XXX) XXX-XXXX
    if (phoneNumber.length <= 3) {
      return phoneNumber
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
    }
  }

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value)
    updateFormData('phone', formatted)
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Welcome!</strong> Let's start with your basic contact information. 
          This will be used to communicate with you about leads and your application status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Name */}
        <div className="space-y-2">
          <Label htmlFor="firstName" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            First Name *
          </Label>
          <Input
            id="firstName"
            type="text"
            placeholder="John"
            value={formData.firstName}
            onChange={(e) => updateFormData('firstName', e.target.value)}
            className={errors.firstName ? 'border-red-500' : ''}
          />
          {errors.firstName && (
            <p className="text-sm text-red-600">{errors.firstName}</p>
          )}
        </div>

        {/* Last Name */}
        <div className="space-y-2">
          <Label htmlFor="lastName" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Last Name *
          </Label>
          <Input
            id="lastName"
            type="text"
            placeholder="Smith"
            value={formData.lastName}
            onChange={(e) => updateFormData('lastName', e.target.value)}
            className={errors.lastName ? 'border-red-500' : ''}
          />
          {errors.lastName && (
            <p className="text-sm text-red-600">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Email Address *
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="john.smith@example.com"
          value={formData.email}
          onChange={(e) => updateFormData('email', e.target.value)}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email}</p>
        )}
        <p className="text-sm text-gray-500">
          We'll send your login credentials and lead notifications to this email
        </p>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Phone Number *
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="(555) 123-4567"
          value={formData.phone}
          onChange={handlePhoneChange}
          maxLength={14}
          className={errors.phone ? 'border-red-500' : ''}
        />
        {errors.phone && (
          <p className="text-sm text-red-600">{errors.phone}</p>
        )}
        <p className="text-sm text-gray-500">
          We may call you to verify your application or discuss urgent leads
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
        <p className="text-sm text-gray-700">
          <strong>Privacy Note:</strong> Your personal information will be kept confidential 
          and used only for lead distribution and communication purposes. We will never sell 
          or share your information with third parties.
        </p>
      </div>
    </div>
  )
}

export default PersonalInfoStep
