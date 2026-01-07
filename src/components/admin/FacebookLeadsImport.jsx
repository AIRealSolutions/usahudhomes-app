import React, { useState } from 'react'
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Download, Users, Loader } from 'lucide-react'
import { facebookLeadsImportService } from '../../services/facebookLeadsImportService'

/**
 * FacebookLeadsImport Component
 * Allows admins to import leads from Facebook Lead Ads CSV exports
 */
const FacebookLeadsImport = ({ onImportComplete }) => {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [step, setStep] = useState('upload') // upload, preview, importing, complete
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [assignAgent, setAssignAgent] = useState('')

  const handleFileSelect = async (event) => {
    const selectedFile = event.target.files[0]
    if (!selectedFile) return

    // Validate file type
    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }

    setFile(selectedFile)
    
    // Generate preview
    setStep('preview')
    const previewResult = await facebookLeadsImportService.previewImport(selectedFile)
    
    if (previewResult.success) {
      setPreview(previewResult)
    } else {
      alert(`Error parsing CSV: ${previewResult.error}`)
      setStep('upload')
      setFile(null)
    }
  }

  const handleImport = async () => {
    if (!preview || !preview.leads) return

    setStep('importing')
    setImporting(true)

    try {
      const result = await facebookLeadsImportService.importLeads(
        preview.leads,
        {
          skipDuplicates: skipDuplicates,
          assignToAgent: assignAgent || null,
          defaultStatus: 'new'
        }
      )

      setImportResult(result.results)
      setStep('complete')

      // Notify parent component
      if (onImportComplete) {
        onImportComplete(result.results)
      }
    } catch (error) {
      console.error('Import error:', error)
      alert(`Import failed: ${error.message}`)
      setStep('preview')
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setPreview(null)
    setImportResult(null)
    setStep('upload')
    setSkipDuplicates(true)
    setAssignAgent('')
  }

  const formatPhone = (phone) => {
    if (!phone) return 'N/A'
    // Format: +1 (234) 567-8900
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  const formatBudget = (min, max) => {
    if (!min && !max) return 'Not specified'
    if (min === max) return `$${min.toLocaleString()}`
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`
    if (min) return `$${min.toLocaleString()}+`
    if (max) return `Up to $${max.toLocaleString()}`
    return 'Not specified'
  }

  return (
    <div className="facebook-leads-import">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white bg-opacity-20 p-3 rounded-lg">
            <Upload className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Import Facebook Leads</h2>
            <p className="text-blue-100 mt-1">
              Upload CSV export from Facebook Lead Ads
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-b-lg border border-t-0 border-gray-200">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors">
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Upload Facebook Leads CSV
              </h3>
              <p className="text-gray-600 mb-4">
                Select the CSV file exported from Facebook Lead Ads
              </p>
              <label className="inline-block">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <span className="px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 inline-flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Choose CSV File
                </span>
              </label>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">📋 How to Export from Facebook:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Go to Facebook Ads Manager</li>
                <li>Navigate to "Leads Center" or your Lead Form</li>
                <li>Click "Download" button</li>
                <li>Select date range and click "Export"</li>
                <li>Upload the downloaded CSV file here</li>
              </ol>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && preview && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold text-blue-900">{preview.count}</div>
                    <div className="text-sm text-blue-700">Total Leads</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-green-900">{preview.validation.valid}</div>
                    <div className="text-sm text-green-700">Valid</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold text-red-900">{preview.validation.invalid}</div>
                    <div className="text-sm text-red-700">Invalid</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Warnings */}
            {preview.validation.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-900 mb-2">Validation Warnings:</h4>
                    <ul className="space-y-1 text-sm text-yellow-800">
                      {preview.validation.warnings.slice(0, 5).map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                      {preview.validation.warnings.length > 5 && (
                        <li className="text-yellow-600">
                          ... and {preview.validation.warnings.length - 5} more warnings
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Import Options */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-gray-900">Import Options</h4>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="skipDuplicates"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="skipDuplicates" className="text-sm text-gray-700">
                  Skip duplicate leads (by email or phone)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Agent (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Agent ID (leave blank for unassigned)"
                  value={assignAgent}
                  onChange={(e) => setAssignAgent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Preview Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h4 className="font-semibold text-gray-900">Preview (First 10 Leads)</h4>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Email</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Phone</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Budget</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Location</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Timeline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {preview.leads.slice(0, 10).map((lead, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {lead.first_name} {lead.last_name}
                        </td>
                        <td className="px-4 py-3">{lead.email || 'N/A'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatPhone(lead.phone)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatBudget(lead.budget_min, lead.budget_max)}
                        </td>
                        <td className="px-4 py-3">
                          {lead.preferred_location || 'N/A'}
                          {lead.state && `, ${lead.state}`}
                        </td>
                        <td className="px-4 py-3">{lead.timeline || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                onClick={handleReset}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={preview.validation.valid === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Import {preview.validation.valid} Leads
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div className="py-12 text-center">
            <Loader className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Importing Leads...
            </h3>
            <p className="text-gray-600">
              Please wait while we import your Facebook leads into the system.
            </p>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && importResult && (
          <div className="space-y-6">
            {/* Success Message */}
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Import Complete!
              </h3>
              <p className="text-gray-600">
                Your Facebook leads have been imported successfully.
              </p>
            </div>

            {/* Results Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-900">{importResult.success}</div>
                <div className="text-sm text-green-700 mt-1">Successfully Imported</div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-yellow-900">{importResult.skipped}</div>
                <div className="text-sm text-yellow-700 mt-1">Skipped (Duplicates)</div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-red-900">{importResult.failed}</div>
                <div className="text-sm text-red-700 mt-1">Failed</div>
              </div>
            </div>

            {/* Errors */}
            {importResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 mb-2">Import Errors:</h4>
                <ul className="space-y-1 text-sm text-red-800">
                  {importResult.errors.map((error, index) => (
                    <li key={index}>
                      • {error.lead}: {error.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Import More Leads
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FacebookLeadsImport
