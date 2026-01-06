import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, RefreshCw, Home, Mail } from 'lucide-react'
import { agentApplicationService } from '../../services/agentApplicationService'

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState('verifying') // verifying, success, error
  const [message, setMessage] = useState('')
  const [applicationData, setApplicationData] = useState(null)

  useEffect(() => {
    if (token) {
      verifyEmail()
    } else {
      setStatus('error')
      setMessage('No verification token provided')
    }
  }, [token])

  const verifyEmail = async () => {
    setStatus('verifying')
    
    const result = await agentApplicationService.verifyEmail(token)
    
    if (result.success) {
      setStatus('success')
      setApplicationData(result.data)
      setMessage('Your email has been verified successfully!')
    } else {
      setStatus('error')
      setMessage(result.error || 'Verification failed')
    }
  }

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <RefreshCw className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verifying Your Email
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your email address...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Email Verified Successfully!
            </h1>
            <p className="text-lg text-gray-600">
              Thank you for verifying your email address, {applicationData?.firstName}
            </p>
          </div>

          {/* Status Card */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-green-900">Email Verified</div>
                    <div className="text-sm text-green-700">{applicationData?.email}</div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex gap-2">
                      <span>✓</span>
                      <span>Your application is now under review</span>
                    </li>
                    <li className="flex gap-2">
                      <span>•</span>
                      <span>We'll verify your real estate license with the state authority</span>
                    </li>
                    <li className="flex gap-2">
                      <span>•</span>
                      <span>An administrator will review your complete application</span>
                    </li>
                    <li className="flex gap-2">
                      <span>•</span>
                      <span>You'll receive an email notification once a decision is made (typically 1-2 business days)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Application Timeline</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Application Submitted</div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Email Verified</div>
                    <div className="text-sm text-gray-600">Just now</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">License Verification</div>
                    <div className="text-sm text-gray-600">In progress</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                      <span className="text-xs font-bold">4</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-500">Application Review</div>
                    <div className="text-sm text-gray-400">Pending</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                      <span className="text-xs font-bold">5</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-500">Approval & Access</div>
                    <div className="text-sm text-gray-400">Pending</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <Link to="/">
              <Button variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Go to Homepage
              </Button>
            </Link>
          </div>

          {/* Contact */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Questions? We're here to help!
            </p>
            <div className="flex justify-center gap-4 text-sm">
              <a href="mailto:support@usahudhomes.com" className="text-blue-600 hover:underline">
                support@usahudhomes.com
              </a>
              <span className="text-gray-400">|</span>
              <a href="tel:+19103636147" className="text-blue-600 hover:underline">
                (910) 363-6147
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verification Failed
          </h2>
          <p className="text-gray-600 mb-6">
            {message}
          </p>

          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Common reasons for verification failure:
            </p>
            <ul className="text-sm text-gray-600 text-left space-y-1">
              <li>• The verification link has expired (24-hour limit)</li>
              <li>• The link has already been used</li>
              <li>• The link is invalid or corrupted</li>
            </ul>
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-sm text-gray-700 font-medium">
              Need a new verification link?
            </p>
            <div className="flex flex-col gap-3">
              <Link to="/agent/resend-verification">
                <Button className="w-full">
                  <Mail className="w-4 h-4 mr-2" />
                  Request New Verification Email
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Homepage
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-600">
              Need help?{' '}
              <a href="mailto:support@usahudhomes.com" className="text-blue-600 hover:underline">
                Contact Support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default VerifyEmail
