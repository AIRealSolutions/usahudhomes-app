import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building, Award, Calendar, FileText } from 'lucide-react'
import { US_STATES } from '../../../data/referralAgreementTemplate'

const BusinessInfoStep = ({ formData, updateFormData, errors }) => {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Professional Credentials:</strong> Please provide your real estate license 
          information. We'll verify your license status with the state regulatory authority.
        </p>
      </div>

      {/* Company Name (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="company" className="flex items-center gap-2">
          <Building className="w-4 h-4" />
          Brokerage/Company Name
        </Label>
        <Input
          id="company"
          type="text"
          placeholder="ABC Realty Group (Optional)"
          value={formData.company}
          onChange={(e) => updateFormData('company', e.target.value)}
        />
        <p className="text-sm text-gray-500">
          If you're affiliated with a brokerage, enter the company name
        </p>
      </div>

      {/* Legal Name */}
      <div className="space-y-2">
        <Label htmlFor="legalName" className="flex items-center gap-2">
          <Award className="w-4 h-4" />
          Legal Name (as it appears on your real estate license) *
        </Label>
        <Input
          id="legalName"
          type="text"
          placeholder="e.g., John Michael Smith Jr."
          value={formData.legalName}
          onChange={(e) => updateFormData('legalName', e.target.value)}
          className={errors.legalName ? 'border-red-500' : ''}
        />
        {errors.legalName && (
          <p className="text-sm text-red-600">{errors.legalName}</p>
        )}
        <p className="text-sm text-gray-500">
          Enter your full name exactly as it appears on your real estate license
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* License Number */}
        <div className="space-y-2">
          <Label htmlFor="licenseNumber" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Real Estate License Number *
          </Label>
          <Input
            id="licenseNumber"
            type="text"
            placeholder="e.g., 123456"
            value={formData.licenseNumber}
            onChange={(e) => updateFormData('licenseNumber', e.target.value.toUpperCase())}
            className={errors.licenseNumber ? 'border-red-500' : ''}
          />
          {errors.licenseNumber && (
            <p className="text-sm text-red-600">{errors.licenseNumber}</p>
          )}
        </div>

        {/* License State */}
        <div className="space-y-2">
          <Label htmlFor="licenseState" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Primary License State *
          </Label>
          <Select
            value={formData.licenseState}
            onValueChange={(value) => updateFormData('licenseState', value)}
          >
            <SelectTrigger className={errors.licenseState ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {US_STATES.map((state) => (
                <SelectItem key={state.code} value={state.code}>
                  {state.name} ({state.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.licenseState && (
            <p className="text-sm text-red-600">{errors.licenseState}</p>
          )}
        </div>
      </div>

      {/* Years of Experience */}
      <div className="space-y-2">
        <Label htmlFor="yearsExperience" className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Years of Real Estate Experience *
        </Label>
        <Input
          id="yearsExperience"
          type="number"
          min="0"
          max="50"
          placeholder="e.g., 5"
          value={formData.yearsExperience}
          onChange={(e) => updateFormData('yearsExperience', parseInt(e.target.value) || 0)}
          className={errors.yearsExperience ? 'border-red-500' : ''}
        />
        {errors.yearsExperience && (
          <p className="text-sm text-red-600">{errors.yearsExperience}</p>
        )}
        <p className="text-sm text-gray-500">
          Include all years working as a licensed real estate professional
        </p>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Professional Bio (Optional)
        </Label>
        <Textarea
          id="bio"
          placeholder="Tell us about your experience, achievements, and what makes you a great agent for HUD home buyers..."
          value={formData.bio}
          onChange={(e) => updateFormData('bio', e.target.value)}
          rows={5}
          maxLength={1000}
        />
        <div className="flex justify-between text-sm text-gray-500">
          <span>This will be shown to potential clients when we refer leads to you</span>
          <span>{formData.bio.length}/1000</span>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
        <p className="text-sm text-yellow-800">
          <strong>License Verification:</strong> We will verify your license status with your 
          state's real estate commission. Please ensure the information you provide matches 
          your official license records.
        </p>
      </div>
    </div>
  )
}

export default BusinessInfoStep
