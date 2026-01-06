import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, Building, MapPin, Star, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { US_STATES } from '../../../data/referralAgreementTemplate'

const ReviewAndSubmitStep = ({ formData, errors }) => {
  const getStateName = (code) => {
    const state = US_STATES.find(s => s.code === code)
    return state ? state.name : code
  }

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-900">Almost Done!</p>
            <p className="text-sm text-green-800">
              Please review your information below. If everything looks correct, click "Submit Application" 
              to complete your registration.
            </p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Name</div>
              <div className="font-medium">{formData.firstName} {formData.lastName}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Phone</div>
              <div className="font-medium">{formData.phone}</div>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Email</div>
            <div className="font-medium">{formData.email}</div>
          </div>
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Business Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.company && (
            <div>
              <div className="text-sm text-gray-600">Company</div>
              <div className="font-medium">{formData.company}</div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">License Number</div>
              <div className="font-medium">{formData.licenseNumber}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">License State</div>
              <div className="font-medium">{getStateName(formData.licenseState)}</div>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Years of Experience</div>
            <div className="font-medium">{formData.yearsExperience} years</div>
          </div>
          {formData.bio && (
            <div>
              <div className="text-sm text-gray-600">Professional Bio</div>
              <div className="font-medium text-sm mt-1">{formData.bio}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Territory & Specialties */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Operating Territory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-sm text-gray-600 mb-2">
              States Covered ({formData.statesCovered.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.statesCovered.map(code => (
                <Badge key={code} variant="secondary">
                  {code}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Specialties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {formData.specialties.map(specialty => (
              <Badge key={specialty} variant="outline">
                {specialty}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Referral Agreement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Referral Agreement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Referral Fee</div>
              <div className="font-medium text-lg">{formData.referralFeePercentage}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Agreement Status</div>
              <div className="flex items-center gap-2">
                {formData.agreedToTerms ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-700">Agreed</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="font-medium text-red-700">Not Agreed</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Electronic Signature</div>
            <div className="font-serif text-lg mt-1">{formData.signature}</div>
          </div>
        </CardContent>
      </Card>

      {/* What Happens Next */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">What Happens Next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-blue-800">
          <div className="flex gap-3">
            <div className="font-bold">1.</div>
            <div>
              <strong>Email Verification:</strong> We'll send a verification email to {formData.email}. 
              Please click the link to verify your email address.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="font-bold">2.</div>
            <div>
              <strong>License Verification:</strong> Our team will verify your real estate license 
              with the {getStateName(formData.licenseState)} real estate commission.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="font-bold">3.</div>
            <div>
              <strong>Application Review:</strong> An administrator will review your application 
              within 1-2 business days.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="font-bold">4.</div>
            <div>
              <strong>Approval & Access:</strong> Once approved, you'll receive login credentials 
              and can start receiving HUD home leads immediately!
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <strong>Important:</strong> By submitting this application, you certify that all 
            information provided is accurate and complete. False or misleading information may 
            result in rejection of your application or termination of your partnership.
          </div>
        </div>
      </div>

      {/* Error Display */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <strong>Submission Error:</strong> {errors.submit}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReviewAndSubmitStep
