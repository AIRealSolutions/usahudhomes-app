import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { agentApplicationService } from '../../services/agentApplicationService'

const ResendVerification = () => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle, loading, success, error
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email) {
      setStatus('error')
      setMessage('Please enter your email address')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const result = await agentApplicationService.resendVerificationEmail(email)
      
      if (result.success) {
        setStatus('success')
        setMessage('Verification email sent! Please check your inbox.')
      } else {
        setStatus('error')
        setMessage(result.error || 'Failed to send verification email')
      }
    } catch (error) {
      setStatus('error')
      setMessage('An unexpected error occurred. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Home
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-center">Resend Verification Email</CardTitle>
            <CardDescription className="text-center">
              Enter your email address to receive a new verification link
            </CardDescription>
          </CardHeader>

          <CardContent>
            {status === 'success' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-green-900">Email Sent!</div>
                    <div className="text-sm text-green-700">{message}</div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">What to do next:</h4>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• Check your email inbox for the verification link</li>
                    <li>• Check your spam/junk folder if you don't see it</li>
                    <li>• Click the verification link within 24 hours</li>
                    <li>• Contact support if you still don't receive it</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <Button onClick={() => setStatus('idle')} variant="outline" className="w-full">
                    Send to Different Email
                  </Button>
                  <Link to="/">
                    <Button variant="ghost" className="w-full">
                      Go to Homepage
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === 'loading'}
                    required
                  />
                  <p className="text-sm text-gray-600">
                    Enter the email address you used when applying
                  </p>
                </div>

                {status === 'error' && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800">{message}</div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Verification Email
                    </>
                  )}
                </Button>

                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Already verified?{' '}
                    <Link to="/login" className="text-blue-600 hover:underline font-medium">
                      Log in here
                    </Link>
                  </p>
                </div>
              </form>
            )}

            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-600 text-center">
                Need help?{' '}
                <a href="mailto:marcspencer28461@gmail.com" className="text-blue-600 hover:underline">
                  Contact Support
                </a>
                {' '}or call{' '}
                <a href="tel:+19103636147" className="text-blue-600 hover:underline">
                  (910) 363-6147
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 p-4 bg-white border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Why verify your email?</h4>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• Confirms your identity and contact information</li>
            <li>• Allows us to send you important updates about your application</li>
            <li>• Required before we can review your application</li>
            <li>• Protects your account security</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default ResendVerification
