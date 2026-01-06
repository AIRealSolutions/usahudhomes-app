import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Mail, Clock, FileText, Home, RefreshCw } from 'lucide-react'
import { agentApplicationService } from '../../services/agentApplicationService'

const ApplicationSubmitted = () => {
  const [searchParams] = useSearchParams()
  const applicationId = searchParams.get('id')
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  useEffect(() => {
    if (applicationId) {
      loadApplication()
    }
  }, [applicationId])

  const loadApplication = async () => {
    const result = await agentApplicationService.getApplication(applicationId)
    if (result.success) {
      setApplication(result.data)
    }
    setLoading(false)
  }

  const handleResendEmail = async () => {
    if (!application) return

    setResendingEmail(true)
    setResendMessage('')

    const result = await agentApplicationService.resendVerificationEmail(application.email)
    
    if (result.success) {
      setResendMessage('Verification email sent! Please check your inbox.')
    } else {
      setResendMessage('Failed to send email. Please try again or contact support.')
    }

    setResendingEmail(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your application...</p>
        </div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="text-red-600 mb-4">
              <FileText className="w-16 h-16 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Not Found</h2>
            <p className="text-gray-600 mb-6">
              We couldn't find your application. Please check your email for the application link.
            </p>
            <Link to="/">
              <Button>
                <Home className="w-4 h-4 mr-2" />
                Go to Homepage
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Application Submitted Successfully!
          </h1>
          <p className="text-lg text-gray-600">
            Thank you for applying to become a HUD Home Lead Partner
          </p>
        </div>

        {/* Application Details */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600">Application ID</div>
                <div className="font-mono text-sm bg-gray-100 px-3 py-2 rounded">
                  {application.id}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Name</div>
                  <div className="font-medium">{application.first_name} {application.last_name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Email</div>
                  <div className="font-medium">{application.email}</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Status</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    application.email_verified 
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {application.email_verified ? 'Email Verified' : 'Pending Email Verification'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              What Happens Next?
            </h2>

            <div className="space-y-6">
              {/* Step 1: Email Verification */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    application.email_verified 
                      ? 'bg-green-100 text-green-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {application.email_verified ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <span className="font-bold">1</span>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {application.email_verified ? '✓ Email Verified' : 'Verify Your Email'}
                  </h3>
                  {!application.email_verified ? (
                    <>
                      <p className="text-sm text-gray-600 mb-3">
                        We've sent a verification email to <strong>{application.email}</strong>. 
                        Please click the link in the email to verify your address.
                      </p>
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleResendEmail}
                          disabled={resendingEmail}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          {resendingEmail ? 'Sending...' : 'Resend Email'}
                        </Button>
                        {resendMessage && (
                          <span className="text-sm text-gray-600">{resendMessage}</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-green-700">
                      Your email has been verified successfully!
                    </p>
                  )}
                </div>
              </div>

              {/* Step 2: License Verification */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                    <span className="font-bold">2</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">License Verification</h3>
                  <p className="text-sm text-gray-600">
                    Our team will verify your real estate license with the state regulatory authority. 
                    This typically takes 1-2 business days.
                  </p>
                </div>
              </div>

              {/* Step 3: Application Review */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                    <span className="font-bold">3</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Application Review</h3>
                  <p className="text-sm text-gray-600">
                    An administrator will review your complete application and make a decision 
                    within 1-2 business days after license verification.
                  </p>
                </div>
              </div>

              {/* Step 4: Approval & Access */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                    <span className="font-bold">4</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Approval & Dashboard Access</h3>
                  <p className="text-sm text-gray-600">
                    Once approved, you'll receive an email with your broker dashboard login credentials 
                    and can start receiving HUD home leads immediately!
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Information */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-3">Important Information</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex gap-2">
                <span>•</span>
                <span>Check your email (including spam folder) for the verification link</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>The verification link expires in 24 hours</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>You'll receive email updates at each stage of the review process</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Typical approval time is 2-3 business days</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 mb-4">
            Questions about your application?
          </p>
          <div className="flex justify-center gap-4">
            <a href="mailto:support@usahudhomes.com" className="text-blue-600 hover:underline text-sm">
              support@usahudhomes.com
            </a>
            <span className="text-gray-400">|</span>
            <a href="tel:+19103636147" className="text-blue-600 hover:underline text-sm">
              (910) 363-6147
            </a>
          </div>
        </div>

        {/* Home Button */}
        <div className="mt-8 text-center">
          <Link to="/">
            <Button variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Return to Homepage
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ApplicationSubmitted
