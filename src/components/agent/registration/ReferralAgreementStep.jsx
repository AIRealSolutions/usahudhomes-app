import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, AlertCircle, CheckCircle, Download, Eye } from 'lucide-react'
import { getReferralAgreementText, getAgreementSummary } from '../../../data/referralAgreementTemplate'

const ReferralAgreementStep = ({ formData, updateFormData, errors }) => {
  const [showFullAgreement, setShowFullAgreement] = useState(false)
  const agreementText = getReferralAgreementText(formData)
  const summary = getAgreementSummary(formData.referralFeePercentage)

  const downloadAgreement = () => {
    const blob = new Blob([agreementText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `HUD_Referral_Agreement_${formData.firstName}_${formData.lastName}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Referral Agreement:</strong> Please review the terms of our lead referral 
          partnership. This agreement outlines how we'll work together, the referral fee 
          structure, and your responsibilities as a partner agent.
        </p>
      </div>

      {/* Agreement Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">{summary.title}</h3>
          </div>

          <div className="space-y-4">
            {summary.points.map((point, index) => (
              <div key={index} className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">{point.title}</div>
                  <div className="text-sm text-gray-600">{point.description}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Referral Fee */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-300 rounded-lg p-6">
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-2">Your Referral Fee</div>
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {formData.referralFeePercentage}%
          </div>
          <div className="text-sm text-gray-700">
            of your gross commission on successful closings
          </div>
          <div className="mt-4 text-xs text-gray-600">
            Example: If you earn $6,000 commission, you pay ${(6000 * formData.referralFeePercentage / 100).toFixed(2)} referral fee
          </div>
        </div>
      </div>

      {/* Full Agreement */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Full Agreement</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowFullAgreement(!showFullAgreement)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {showFullAgreement ? 'Hide' : 'Read'} Full Agreement
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadAgreement}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        {showFullAgreement && (
          <div className="border rounded-lg p-6 bg-white max-h-[500px] overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm font-mono text-gray-700">
              {agreementText}
            </pre>
          </div>
        )}
      </div>

      {/* Agreement Checkbox */}
      <div className="space-y-4">
        <div
          className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            formData.agreedToTerms
              ? 'bg-green-50 border-green-500'
              : errors.agreedToTerms
              ? 'bg-red-50 border-red-500'
              : 'bg-white border-gray-300 hover:border-gray-400'
          }`}
          onClick={() => updateFormData('agreedToTerms', !formData.agreedToTerms)}
        >
          <Checkbox
            checked={formData.agreedToTerms}
            onCheckedChange={(checked) => updateFormData('agreedToTerms', checked)}
            className="mt-1 pointer-events-none"
          />
          <div className="flex-1">
            <Label className="cursor-pointer font-medium">
              I have read and agree to the HUD Home Lead Referral Agreement *
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              By checking this box, you acknowledge that you have read, understood, and agree 
              to be bound by all terms and conditions of the referral agreement, including the 
              {formData.referralFeePercentage}% referral fee structure.
            </p>
          </div>
        </div>

        {errors.agreedToTerms && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-600">{errors.agreedToTerms}</p>
          </div>
        )}
      </div>

      {/* Electronic Signature */}
      <div className="space-y-3">
        <Label htmlFor="signature" className="text-base font-semibold">
          Electronic Signature *
        </Label>
        <p className="text-sm text-gray-600">
          Type your name exactly as it appears on your real estate license. By signing, you are 
          providing your electronic signature and agreeing to the terms of this agreement. 
          This has the same legal effect as a handwritten signature.
        </p>

        <Input
          id="signature"
          type="text"
          placeholder="Name as it appears on your real estate license"
          value={formData.signature}
          onChange={(e) => updateFormData('signature', e.target.value)}
          className={`text-lg font-serif ${errors.signature ? 'border-red-500' : ''}`}
        />

        {errors.signature && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-600">{errors.signature}</p>
          </div>
        )}

        {formData.signature && 
         formData.signature.toLowerCase().includes(formData.firstName.toLowerCase()) && 
         formData.signature.toLowerCase().includes(formData.lastName.toLowerCase()) && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">
              Signature verified: {formData.signature}
            </p>
          </div>
        )}
      </div>

      {/* Legal Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <strong>Legal Notice:</strong> This is a legally binding agreement. By signing, 
            you agree to pay the specified referral fee on all successful transactions resulting 
            from leads we provide. Please review the full agreement carefully and consult with 
            your broker or attorney if you have any questions.
          </div>
        </div>
      </div>

      {/* RESPA Compliance Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs text-gray-600">
          <strong>RESPA Compliance:</strong> This referral fee arrangement complies with the 
          Real Estate Settlement Procedures Act (RESPA) Section 8. No fees are charged to 
          consumers. The referral fee is paid by the agent from their earned commission and 
          represents compensation for lead generation and marketing services provided.
        </p>
      </div>
    </div>
  )
}

export default ReferralAgreementStep
