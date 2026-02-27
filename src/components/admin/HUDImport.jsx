import React, { useState, useRef } from 'react'
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
  Sparkles,
  FileUp
} from 'lucide-react'
import { propertyService } from '../../services/database/index'

/**
 * HUD Import Component
 * 
 * Allows admins to import HUD properties from the scraper CSV/JSON output.
 * Supports all 14 fields from the HUD scraper:
 *   case_number, address, city, state, list_price, bedrooms, bathrooms, status,
 *   zip_code, county, bids_open, listing_period, main_image, image_url
 * 
 * Features:
 * - File upload (.csv, .json) or copy/paste
 * - Smart field mapping (scraper names → database schema)
 * - Preview before import
 * - Auto-marks same-state properties not in import as "pending"
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
  const [fileName, setFileName] = useState(null)
  const fileInputRef = useRef(null)

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

    // Check if it looks like CSV (has commas and newlines)
    if (trimmed.includes(',') && (trimmed.includes('\n') || trimmed.includes('\r'))) {
      return 'csv'
    }

    return null
  }

  /**
   * Parse CSV data into array of objects.
   * Handles quoted fields that may contain commas.
   */
  const parseCSV = (csvText) => {
    const lines = csvText.trim().split(/\r?\n/)
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row')
    }

    const headers = parseCSVLine(lines[0])
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = parseCSVLine(line)
      if (values.length >= headers.length) {
        const obj = {}
        headers.forEach((header, index) => {
          obj[header] = values[index] || ''
        })
        data.push(obj)
      }
    }

    return data
  }

  /**
   * Parse a single CSV line, respecting quoted fields.
   */
  const parseCSVLine = (line) => {
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"'
            i++ // skip escaped quote
          } else {
            inQuotes = false
          }
        } else {
          current += char
        }
      } else {
        if (char === '"') {
          inQuotes = true
        } else if (char === ',') {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
    }
    result.push(current.trim())
    return result
  }

  /**
   * Field mappings from various input names → database column names.
   * Covers both the scraper output names and common alternatives.
   */
  const FIELD_MAPPINGS = {
    // Case number
    'case_number': 'case_number',
    'casenumber': 'case_number',
    'case': 'case_number',
    'caseNumber': 'case_number',
    'Case Number': 'case_number',

    // Address
    'address': 'address',
    'street_address': 'address',
    'streetAddress': 'address',
    'Address': 'address',

    // City
    'city': 'city',
    'City': 'city',

    // State
    'state': 'state',
    'State': 'state',

    // Price — scraper uses "list_price", DB uses "price"
    'list_price': 'price',
    'price': 'price',
    'listPrice': 'price',
    'Price': 'price',
    'asking_price': 'price',
    'List Price': 'price',

    // Bedrooms — scraper uses "bedrooms", DB uses "beds"
    'bedrooms': 'beds',
    'beds': 'beds',
    'Bedrooms': 'beds',
    'Beds': 'beds',

    // Bathrooms — scraper uses "bathrooms", DB uses "baths"
    'bathrooms': 'baths',
    'baths': 'baths',
    'Bathrooms': 'baths',
    'Baths': 'baths',

    // Status
    'status': 'status',
    'Status': 'status',
    'listing_status': 'status',
    'status_tag': 'status',

    // ZIP code
    'zip_code': 'zip_code',
    'zip': 'zip_code',
    'zipcode': 'zip_code',
    'zipCode': 'zip_code',
    'Zip': 'zip_code',
    'Zip Code': 'zip_code',

    // County
    'county': 'county',
    'County': 'county',

    // Bids open date (new scraper field)
    'bids_open': 'bids_open',
    'bidsOpen': 'bids_open',
    'Bids Open': 'bids_open',

    // Listing period (new scraper field)
    'listing_period': 'listing_period',
    'listingPeriod': 'listing_period',
    'Listing Period': 'listing_period',

    // Main image filename
    'main_image': 'main_image',
    'mainImage': 'main_image',
    'Main Image': 'main_image',
    'image': 'main_image',

    // Image URL (new scraper field — original Cloudinary URL)
    'image_url': 'image_url',
    'imageUrl': 'image_url',
    'Image URL': 'image_url',

    // Existing DB fields that may appear in other sources
    'sq_ft': 'sq_ft',
    'sqft': 'sq_ft',
    'square_feet': 'sq_ft',
    'squareFeet': 'sq_ft',
    'Square Feet': 'sq_ft',
    'lot_size': 'lot_size',
    'lotSize': 'lot_size',
    'year_built': 'year_built',
    'yearBuilt': 'year_built',
    'bid_deadline': 'bid_deadline',
    'bidDeadline': 'bid_deadline',
    'deadline': 'bid_deadline',
    'Bid Deadline': 'bid_deadline',
    'property_type': 'property_type',
    'propertyType': 'property_type',
    'type': 'property_type',
    'Type': 'property_type',
    'description': 'description',
    'Description': 'description'
  }

  /**
   * Format a single property to match database schema
   */
  const formatProperty = (prop) => {
    const formatted = {
      status: 'AVAILABLE' // Default status
    }

    // Map fields using the lookup table
    Object.keys(prop).forEach(key => {
      const mappedKey = FIELD_MAPPINGS[key] || key.toLowerCase().replace(/\s+/g, '_')
      let value = prop[key]

      if (value === null || value === undefined || value === '') return

      // Clean and format values based on target field
      switch (mappedKey) {
        case 'price':
          if (typeof value === 'string') {
            value = parseFloat(value.replace(/[$,]/g, ''))
          }
          break

        case 'beds':
          if (typeof value === 'string') {
            value = parseInt(value, 10)
          }
          break

        case 'baths':
          if (typeof value === 'string') {
            value = parseFloat(value)
          }
          // Convert .1 notation to .5 (half bath)
          if (typeof value === 'number') {
            const intPart = Math.floor(value)
            const fracPart = Math.round((value - intPart) * 10) / 10
            if (fracPart === 0.1) {
              value = intPart + 0.5
            }
          }
          break

        case 'sq_ft':
        case 'year_built':
          if (typeof value === 'string') {
            value = parseInt(value, 10)
          }
          break

        case 'bid_deadline':
          if (typeof value === 'string') {
            const date = new Date(value)
            if (!isNaN(date.getTime())) {
              value = date.toISOString().split('T')[0]
            }
          }
          break

        case 'status':
          // Normalize status values
          if (typeof value === 'string') {
            const lower = value.toLowerCase()
            if (lower === 'available' || lower === 'new listing' || lower === 'price reduced') {
              value = 'AVAILABLE'
            } else if (lower === 'pending' || lower === 'under contract') {
              value = 'PENDING'
            } else if (lower === 'sold') {
              value = 'SOLD'
            } else {
              value = value.toUpperCase()
            }
          }
          break

        default:
          // Keep string values as-is
          break
      }

      formatted[mappedKey] = value
    })

    // Ensure required fields
    if (!formatted.case_number) {
      formatted.case_number = `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    return formatted
  }

  /**
   * Handle file upload
   */
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()

    reader.onload = (event) => {
      const content = event.target.result
      setRawData(content)

      // Detect type from extension or content
      if (file.name.endsWith('.json')) {
        setDataType('json')
      } else if (file.name.endsWith('.csv')) {
        setDataType('csv')
      } else {
        const type = detectDataType(content)
        setDataType(type)
      }
    }

    reader.readAsText(file)
  }

  /**
   * Handle data paste
   */
  const handlePaste = (e) => {
    const pastedData = e.target.value
    setRawData(pastedData)
    setFileName(null)
    
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
      setError('Please paste JSON or CSV data first, or upload a file')
      return
    }

    setIsFormatting(true)
    setError(null)

    try {
      let parsedData

      if (dataType === 'json') {
        parsedData = JSON.parse(rawData)
      } else if (dataType === 'csv') {
        parsedData = parseCSV(rawData)
      } else {
        throw new Error('Unknown data type')
      }

      // Ensure it's an array
      if (!Array.isArray(parsedData)) {
        parsedData = [parsedData]
      }

      // Format each property
      const formatted = parsedData.map(prop => formatProperty(prop))

      setFormattedData(formatted)
      setPreviewProperties(formatted.slice(0, 5)) // Show first 5
      setIsFormatting(false)
    } catch (err) {
      setError(`Failed to format data: ${err.message}`)
      setIsFormatting(false)
    }
  }

  /**
   * Import properties to database.
   * Also marks same-state properties not in the import as "pending".
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
        markedPending: 0,
        errors: []
      }

      // Collect case numbers and states from the import
      const importedCaseNumbers = new Set()
      const importedStates = new Set()

      formattedData.forEach(p => {
        if (p.case_number) importedCaseNumbers.add(p.case_number)
        if (p.state) importedStates.add(p.state.toUpperCase())
      })

      // Upsert each property
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

      // Mark same-state properties not in import as "pending"
      for (const state of importedStates) {
        try {
          const pendingCount = await propertyService.markMissingAsPending(state, Array.from(importedCaseNumbers))
          stats.markedPending += pendingCount
        } catch (err) {
          console.error(`Error marking pending for state ${state}:`, err)
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
    setFileName(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">HUD Property Import</h3>
        <p className="text-sm text-gray-600">
          Import properties from the HUD scraper CSV/JSON output. Supports all scraper fields including
          bids open date, listing period, and image URL. Properties in the same state not in the import
          will be marked as pending.
        </p>
      </div>

      {/* Step 1: Upload or Paste Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">1</span>
            Upload or Paste Data
          </CardTitle>
          <CardDescription>
            Upload a CSV/JSON file from the scraper, or paste data directly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File upload */}
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              onChange={handleFileUpload}
              className="hidden"
              id="hud-file-upload"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <FileUp className="w-4 h-4" />
              Upload File
            </Button>
            {fileName && (
              <span className="text-sm text-gray-600">
                {fileName}
              </span>
            )}
          </div>

          <div className="text-xs text-gray-400 text-center">— or paste data below —</div>

          <Textarea
            placeholder={`Paste CSV or JSON data here...\n\nExpected CSV header:\ncase_number,address,city,state,list_price,bedrooms,bathrooms,status,zip_code,county,bids_open,listing_period,main_image,image_url`}
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
              {rawData && (
                <span className="text-xs text-gray-500">
                  {rawData.trim().split(/\r?\n/).length - 1} data rows
                </span>
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
                Formatting...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Format &amp; Preview Data
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
            {/* Field mapping summary */}
            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <span className="font-semibold">Fields mapped:</span>{' '}
              {formattedData.length > 0 && Object.keys(formattedData[0]).filter(k => formattedData[0][k]).join(', ')}
            </div>

            <div className="space-y-3">
              {previewProperties.map((prop, index) => (
                <div key={index} className="p-3 border rounded-lg bg-gray-50">
                  <div className="font-semibold text-sm">
                    {prop.address || 'No address'}, {prop.city || 'N/A'}, {prop.state || 'N/A'} {prop.zip_code || ''}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Case: {prop.case_number} | Price: ${prop.price?.toLocaleString() || 'N/A'} | {' '}
                    {prop.beds || 'N/A'} beds, {prop.baths || 'N/A'} baths
                    {prop.county ? ` | ${prop.county}` : ''}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {prop.bids_open ? `Bids Open: ${prop.bids_open}` : ''}
                    {prop.listing_period ? ` | Period: ${prop.listing_period}` : ''}
                    {prop.main_image ? ` | Image: ${prop.main_image}` : ''}
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

            {/* State summary */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <span className="font-semibold">Note:</span> After import, existing properties in{' '}
              {[...new Set(formattedData.map(p => p.state).filter(Boolean))].join(', ')}{' '}
              that are NOT in this import will be marked as <strong>pending</strong>.
            </div>

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
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{importStats.added}</div>
                <div className="text-xs text-gray-600">Added</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{importStats.updated}</div>
                <div className="text-xs text-gray-600">Updated</div>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">{importStats.markedPending}</div>
                <div className="text-xs text-gray-600">Marked Pending</div>
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
