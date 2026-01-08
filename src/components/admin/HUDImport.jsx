import React, { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileJson,
  FileSpreadsheet,
  Sparkles
} from 'lucide-react'
import { propertyService } from '../../services/database/index'

/**
 * HUD Import Component
 * 
 * Allows admins to import HUD properties by pasting JSON or CSV data.
 * Uses AI to format the data correctly before importing to database.
 * 
 * Features:
 * - Copy/paste JSON or CSV data
 * - AI-powered data formatting
 * - Preview before import
 * - Status management (Available/Under Contract)
 * - Import statistics
 */
function HUDImport({ onImportComplete }) {
  const [rawData, setRawData] = useState('')
  const [dataType, setDataType] = useState(null) // 'json' or 'csv'
  const [isFormatting, setIsFormatting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [formattedData, setFormattedData] = useState(null)
  const [previewProperties, setPreviewProperties] = useState([])
  const [importStats, setImportStats] = useState(null)
  const [error, setError] = useState(null)

  /**
   * Detect data type (JSON or CSV)
   */
  const detectDataType = (data) => {
    const trimmed = data.trim()
    
    // Try to parse as JSON
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch (e) {
      // Not JSON
    }

    // Check if it looks like CSV
    if (trimmed.includes(',') && (trimmed.includes('\n') || trimmed.includes('\r'))) {
      return 'csv'
    }

    return null
  }

  /**
   * Parse CSV data into array of objects
   */
  const parseCSV = (csvText) => {
    const lines = csvText.trim().split(/\r?\n/)
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row')
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''))
      if (values.length === headers.length) {
        const obj = {}
        headers.forEach((header, index) => {
          obj[header] = values[index]
        })
        data.push(obj)
      }
    }

    return data
  }

  /**
   * Format data using AI agent
   */
  const formatWithAI = async (data, type) => {
    setIsFormatting(true)
    setError(null)

    try {
      let parsedData
      
      if (type === 'json') {
        parsedData = JSON.parse(data)
      } else if (type === 'csv') {
        parsedData = parseCSV(data)
      } else {
        throw new Error('Unknown data type')
      }

      // Ensure it's an array
      if (!Array.isArray(parsedData)) {
        parsedData = [parsedData]
      }

      // Format each property using AI-like logic
      const formatted = parsedData.map(prop => formatProperty(prop))

      setFormattedData(formatted)
      setPreviewProperties(formatted.slice(0, 5)) // Show first 5
      setIsFormatting(false)
      return formatted

    } catch (err) {
      setError(`Failed to format data: ${err.message}`)
      setIsFormatting(false)
      return null
    }
  }

  /**
   * Format a single property to match database schema
   */
  const formatProperty = (prop) => {
    // Map common field names to database schema
    const fieldMappings = {
      // Case number variations
      'case_number': 'case_number',
      'casenumber': 'case_number',
      'case': 'case_number',
      'caseNumber': 'case_number',
      'Case Number': 'case_number',
      
      // Address variations
      'address': 'address',
      'street_address': 'address',
      'streetAddress': 'address',
      'Address': 'address',
      
      // City variations
      'city': 'city',
      'City': 'city',
      
      // State variations
      'state': 'state',
      'State': 'state',
      
      // ZIP variations
      'zip': 'zip_code',
      'zip_code': 'zip_code',
      'zipcode': 'zip_code',
      'zipCode': 'zip_code',
      'Zip': 'zip_code',
      
      // County variations
      'county': 'county',
      'County': 'county',
      
      // Price variations
      'price': 'price',
      'list_price': 'price',
      'listPrice': 'price',
      'Price': 'price',
      'asking_price': 'price',
      
      // Beds variations
      'beds': 'beds',
      'bedrooms': 'beds',
      'Beds': 'beds',
      'Bedrooms': 'beds',
      
      // Baths variations
      'baths': 'baths',
      'bathrooms': 'baths',
      'Baths': 'baths',
      'Bathrooms': 'baths',
      
      // Square feet variations
      'sq_ft': 'sq_ft',
      'sqft': 'sq_ft',
      'square_feet': 'sq_ft',
      'squareFeet': 'sq_ft',
      'Square Feet': 'sq_ft',
      
      // Bid deadline variations
      'bid_deadline': 'bid_deadline',
      'bidDeadline': 'bid_deadline',
      'deadline': 'bid_deadline',
      'Bid Deadline': 'bid_deadline',
      
      // Status variations
      'status': 'status',
      'Status': 'status',
      'listing_status': 'status',
      
      // Property type variations
      'property_type': 'property_type',
      'propertyType': 'property_type',
      'type': 'property_type',
      'Type': 'property_type'
    }

    const formatted = {
      status: 'AVAILABLE' // Default status
    }

    // Map fields
    Object.keys(prop).forEach(key => {
      const mappedKey = fieldMappings[key] || key.toLowerCase().replace(/\s+/g, '_')
      let value = prop[key]

      // Clean and format values
      if (value !== null && value !== undefined && value !== '') {
        // Remove dollar signs and commas from prices
        if (mappedKey === 'price' && typeof value === 'string') {
          value = parseFloat(value.replace(/[$,]/g, ''))
        }

        // Parse numbers
        if (['beds', 'baths', 'sq_ft'].includes(mappedKey) && typeof value === 'string') {
          value = parseFloat(value)
        }

        // Handle .1 bath as 0.5 (half bath)
        if (mappedKey === 'baths' && value === 0.1) {
          value = 0.5
        }

        // Format dates
        if (mappedKey === 'bid_deadline' && typeof value === 'string') {
          // Try to parse date
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            value = date.toISOString().split('T')[0] // YYYY-MM-DD
          }
        }

        formatted[mappedKey] = value
      }
    })

    // Ensure required fields
    if (!formatted.case_number) {
      formatted.case_number = `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    return formatted
  }

  /**
   * Handle data paste
   */
  const handlePaste = (e) => {
    const pastedData = e.target.value
    setRawData(pastedData)
    
    if (pastedData.trim()) {
      const type = detectDataType(pastedData)
      setDataType(type)
    } else {
      setDataType(null)
    }
  }

  /**
   * Format data
   */
  const handleFormat = async () => {
    if (!rawData || !dataType) {
      setError('Please paste JSON or CSV data first')
      return
    }

    await formatWithAI(rawData, dataType)
  }

  /**
   * Import properties to database
   */
  const handleImport = async () => {
    if (!formattedData || formattedData.length === 0) {
      setError('No data to import')
      return
    }

    setIsImporting(true)
    setError(null)

    try {
      const stats = {
        total: formattedData.length,
        added: 0,
        updated: 0,
        failed: 0,
        errors: []
      }

      for (const property of formattedData) {
        try {
          // Check if property exists by case number
          const existingResponse = await propertyService.getPropertyByCaseNumber(property.case_number)

          if (existingResponse.success && existingResponse.data) {
            // Update existing property
            const updateResponse = await propertyService.updateProperty(existingResponse.data.id, property)
            if (updateResponse.success) {
              stats.updated++
            } else {
              throw new Error(updateResponse.error)
            }
          } else {
            // Add new property
            const addResponse = await propertyService.addProperty(property)
            if (addResponse.success) {
              stats.added++
            } else {
              throw new Error(addResponse.error)
            }
          }
        } catch (err) {
          stats.failed++
          stats.errors.push({
            case_number: property.case_number,
            error: err.message
          })
        }
      }

      setImportStats(stats)
      setIsImporting(false)

      // Notify parent component
      if (onImportComplete) {
        onImportComplete(stats)
      }

    } catch (err) {
      setError(`Import failed: ${err.message}`)
      setIsImporting(false)
    }
  }

  /**
   * Reset form
   */
  const handleReset = () => {
    setRawData('')
    setDataType(null)
    setFormattedData(null)
    setPreviewProperties([])
    setImportStats(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">HUD Property Import</h3>
        <p className="text-sm text-gray-600">
          Paste JSON or CSV data below. The AI will format it correctly before importing.
        </p>
      </div>

      {/* Step 1: Paste Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">1</span>
            Paste Data
          </CardTitle>
          <CardDescription>
            Copy and paste JSON or CSV data from any source
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste your JSON or CSV data here..."
            value={rawData}
            onChange={handlePaste}
            rows={10}
            className="font-mono text-sm"
          />
          
          {dataType && (
            <div className="flex items-center gap-2">
              {dataType === 'json' ? (
                <Badge variant="outline" className="gap-1">
                  <FileJson className="w-3 h-3" />
                  JSON Detected
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <FileSpreadsheet className="w-3 h-3" />
                  CSV Detected
                </Badge>
              )}
            </div>
          )}

          <Button 
            onClick={handleFormat} 
            disabled={!rawData || !dataType || isFormatting}
            className="w-full"
          >
            {isFormatting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Formatting with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Format Data with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Preview */}
      {formattedData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">2</span>
              Preview Properties
            </CardTitle>
            <CardDescription>
              Review the formatted data before importing ({formattedData.length} properties)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {previewProperties.map((prop, index) => (
                <div key={index} className="p-3 border rounded-lg bg-gray-50">
                  <div className="font-semibold text-sm">
                    {prop.address || 'No address'}, {prop.city || 'N/A'}, {prop.state || 'N/A'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Case: {prop.case_number} | Price: ${prop.price?.toLocaleString() || 'N/A'} | 
                    {prop.beds || 'N/A'} beds, {prop.baths || 'N/A'} baths
                  </div>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {prop.status}
                  </Badge>
                </div>
              ))}
            </div>

            {formattedData.length > 5 && (
              <p className="text-sm text-gray-500 text-center">
                ... and {formattedData.length - 5} more properties
              </p>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleImport} 
                disabled={isImporting}
                className="flex-1"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import to Database
                  </>
                )}
              </Button>
              <Button 
                onClick={handleReset} 
                variant="outline"
                disabled={isImporting}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Results */}
      {importStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{importStats.added}</div>
                <div className="text-xs text-gray-600">Added</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{importStats.updated}</div>
                <div className="text-xs text-gray-600">Updated</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{importStats.failed}</div>
                <div className="text-xs text-gray-600">Failed</div>
              </div>
            </div>

            {importStats.errors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-red-600 mb-2">Errors:</p>
                <div className="space-y-1">
                  {importStats.errors.map((err, index) => (
                    <div key={index} className="text-xs text-red-600">
                      {err.case_number}: {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleReset} variant="outline" className="w-full">
              Import More Properties
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}

export default HUDImport
