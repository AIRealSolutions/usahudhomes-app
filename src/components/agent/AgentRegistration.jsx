import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, ArrowRight, ArrowLeft, Building, FileText, Shield } from 'lucide-react'
import PersonalInfoStep from './registration/PersonalInfoStep'
import BusinessInfoStep from './registration/BusinessInfoStep'
import StatesAndSpecialtiesStep from './registration/StatesAndSpecialtiesStep'
import ReferralAgreementStep from './registration/ReferralAgreementStep'
import ReviewAndSubmitStep from './registration/ReviewAndSubmitStep'

const STEPS = [
  { id: 1, title: 'Personal Info', icon: Building, description: 'Your contact information' },
  { id: 2, title: 'Business Details', icon: FileText, description: 'License and experience' },
  { id: 3, title: 'Territory & Specialties', icon: Shield, description: 'Where you operate' },
  { id: 4, title: 'Referral Agreement', icon: FileText, description: 'Terms and conditions' },
  { id: 5, title: 'Review & Submit', icon: CheckCircle, description: 'Confirm your application' }
]

const AgentRegistration = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    // Personal Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    
    // Business Info
    company: '',
    licenseNumber: '',
    licenseState: '',
    yearsExperience: 0,
    bio: '',
    
    // Territory & Specialties
    statesCovered: [],
    specialties: [],
    
    // Referral Agreement
    referralFeePercentage: 25.00,
    agreedToTerms: false,
    signature: '',
    
    // Metadata
    ipAddress: ''
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const validateStep = (step) => {
    const newErrors = {}

    switch (step) {
      case 1: // Personal Info
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
        if (!formData.email.trim()) {
          newErrors.email = 'Email is required'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Please enter a valid email address'
        }
        if (!formData.phone.trim()) {
          newErrors.phone = 'Phone number is required'
        } else if (!/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(formData.phone.replace(/\s/g, ''))) {
          newErrors.phone = 'Please enter a valid phone number'
        }
        break

      case 2: // Business Info
        if (!formData.licenseNumber.trim()) newErrors.licenseNumber = 'License number is required'
        if (!formData.licenseState) newErrors.licenseState = 'License state is required'
        if (formData.yearsExperience < 0) newErrors.yearsExperience = 'Years of experience cannot be negative'
        break

      case 3: // Territory & Specialties
        if (formData.statesCovered.length === 0) {
          newErrors.statesCovered = 'Please select at least one state where you operate'
        }
        if (formData.specialties.length === 0) {
          newErrors.specialties = 'Please select at least one specialty'
        }
        break

      case 4: // Referral Agreement
        if (!formData.agreedToTerms) {
          newErrors.agreedToTerms = 'You must agree to the referral agreement to continue'
        }
        if (!formData.signature.trim()) {
          newErrors.signature = 'Please type your full name to sign the agreement'
        } else if (formData.signature.toLowerCase() !== `${formData.firstName} ${formData.lastName}`.toLowerCase()) {
          newErrors.signature = 'Signature must match your full name'
        }
        break

      default:
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return
    }

    setIsSubmitting(true)

    try {
      // Get user's IP address for audit trail
      const ipResponse = await fetch('https://api.ipify.org?format=json')
      const ipData = await ipResponse.json()
      formData.ipAddress = ipData.ip

      // Import and call the agent application service
      const { agentApplicationService } = await import('../../services/database')
      const result = await agentApplicationService.submitApplication(formData)

      if (result.success) {
        // Navigate to success page with application ID
        navigate(`/agent/application-submitted?id=${result.data.id}`)
      } else {
        setErrors({ submit: result.error || 'Failed to submit application. Please try again.' })
      }
    } catch (error) {
      console.error('Error submitting application:', error)
      setErrors({ submit: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const progress = (currentStep / STEPS.length) * 100

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <PersonalInfoStep
            formData={formData}
            updateFormData={updateFormData}
            errors={errors}
          />
        )
      case 2:
        return (
          <BusinessInfoStep
            formData={formData}
            updateFormData={updateFormData}
            errors={errors}
          />
        )
      case 3:
        return (
          <StatesAndSpecialtiesStep
            formData={formData}
            updateFormData={updateFormData}
            errors={errors}
          />
        )
      case 4:
        return (
          <ReferralAgreementStep
            formData={formData}
            updateFormData={updateFormData}
            errors={errors}
          />
        )
      case 5:
        return (
          <ReviewAndSubmitStep
            formData={formData}
            errors={errors}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Become a HUD Home Lead Partner
          </h1>
          <p className="text-lg text-gray-600">
            Join our network of licensed real estate professionals and receive qualified HUD home buyer leads
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id

              return (
                <div key={step.id} className="flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <StepIcon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="text-center hidden sm:block">
                      <div className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-400 hidden md:block">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className="flex-1 h-1 bg-gray-200 mt-6 mx-2">
                      <div
                        className={`h-full transition-all ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                        style={{ width: isCompleted ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <Progress value={progress} className="h-2" />
          <div className="text-center mt-2 text-sm text-gray-600">
            Step {currentStep} of {STEPS.length}
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
            <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Render current step */}
            {renderStep()}

            {/* Error Message */}
            {errors.submit && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{errors.submit}</p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1 || isSubmitting}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              {currentStep < STEPS.length ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSubmitting}
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  <CheckCircle className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Questions? Contact us at{' '}
            <a href="mailto:support@usahudhomes.com" className="text-blue-600 hover:underline">
              support@usahudhomes.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default AgentRegistration
