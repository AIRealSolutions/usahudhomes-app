import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Home,
  DollarSign,
  MapPin,
  Calendar,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/**
 * HUD Sync Admin Component
 * Web interface for scraping and importing HUD properties
 */
export default function HUDSyncAdmin() {
  const [states, setStates] = useState([])
  const [selectedState, setSelectedState] = useState('NC')
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [importing, setImporting] = useState(false)
  
  // Scrape results
  const [scrapedData, setScrapedData] = useState(null)
  const [jobId, setJobId] = useState(null)
  
  // Import results
  const [importStats, setImportStats] = useState(null)
  
  // UI states
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showReview, setShowReview] = useState(false)

  useEffect(() => {
    loadStates()
  }, [])

  async function loadStates() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/hud/states`)
      const data = await response.json()
      if (data.success) {
        setStates(data.states)
      }
    } catch (err) {
      console.error('Error loading states:', err)
    }
  }

  async function handleScrape() {
    if (!selectedState) {
      setError('Please select a state')
      return
    }

    setScraping(true)
    setError(null)
    setSuccess(null)
    setScrapedData(null)
    setJobId(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/hud/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state: selectedState })
      })

      const data = await response.json()

      if (data.success) {
        setScrapedData(data)
        setJobId(data.job_id)
        setShowReview(true)
        setSuccess(`Successfully scraped ${data.statistics.total} properties from ${selectedState}`)
      } else {
        setError(data.error || 'Failed to scrape properties')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setScraping(false)
    }
  }

  async function handleImport(dryRun = false) {
    if (!jobId) {
      setError('No scraping job found. Please scrape first.')
      return
    }

    setImporting(true)
    setError(null)
    setSuccess(null)
    setImportStats(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/hud/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          job_id: jobId,
          dry_run: dryRun
        })
      })

      const data = await response.json()

      if (data.success) {
        setImportStats(data.statistics)
        if (dryRun) {
          setSuccess('Dry run completed successfully. No changes were made to the database.')
        } else {
          setSuccess(`Successfully imported properties! New: ${data.statistics.new_properties}, Updated: ${data.statistics.updated_properties}`)
          setShowReview(false)
        }
      } else {
        setError(data.error || 'Failed to import properties')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  function formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">HUD Property Sync</h2>
        <p className="text-muted-foreground">
          Scrape and import HUD properties from hudhomestore.gov
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Scrape Section */}
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Scrape Properties</CardTitle>
          <CardDescription>
            Select a state and scrape HUD properties from the official website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
                <SelectContent>
                  {states.map(state => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name} ({state.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleScrape} 
              disabled={scraping || !selectedState}
              className="min-w-[150px]"
            >
              {scraping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Scrape Properties
                </>
              )}
            </Button>
          </div>

          {scraping && (
            <div className="text-sm text-muted-foreground">
              <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
              This may take 20-30 seconds...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Section */}
      {showReview && scrapedData && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Review Properties</CardTitle>
            <CardDescription>
              Review the scraped properties before importing to database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{scrapedData.statistics.total}</div>
                  <p className="text-xs text-muted-foreground">Total Properties</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">
                    {scrapedData.statistics.new_listings}
                  </div>
                  <p className="text-xs text-muted-foreground">New Listings</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-600">
                    {scrapedData.statistics.price_reduced}
                  </div>
                  <p className="text-xs text-muted-foreground">Price Reduced</p>
                </CardContent>
              </Card>
            </div>

            {/* Property List */}
            <div className="space-y-2">
              <h4 className="font-semibold">Properties Preview (First 5)</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {scrapedData.properties.slice(0, 5).map((property, index) => (
                  <Card key={property.case_number} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold">{property.address}</h5>
                          {property.is_new_listing && (
                            <Badge variant="default" className="bg-green-600">NEW</Badge>
                          )}
                          {property.is_price_reduced && (
                            <Badge variant="default" className="bg-blue-600">REDUCED</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <MapPin className="inline h-3 w-3 mr-1" />
                          {property.city}, {property.state} {property.zip_code}
                        </p>
                        <div className="flex gap-4 text-sm">
                          <span>
                            <Home className="inline h-3 w-3 mr-1" />
                            {property.beds} beds, {property.baths} baths
                          </span>
                          <span className="text-muted-foreground">
                            Case: {property.case_number}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">{formatPrice(property.price)}</div>
                        {property.bid_deadline && (
                          <p className="text-xs text-muted-foreground">
                            <Calendar className="inline h-3 w-3 mr-1" />
                            Bids: {property.bid_deadline}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              {scrapedData.properties.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  ... and {scrapedData.properties.length - 5} more properties
                </p>
              )}
            </div>

            {/* Import Actions */}
            <div className="flex gap-4">
              <Button 
                onClick={() => handleImport(true)} 
                disabled={importing}
                variant="outline"
                className="flex-1"
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Test Import (Dry Run)
                  </>
                )}
              </Button>
              <Button 
                onClick={() => handleImport(false)} 
                disabled={importing}
                className="flex-1"
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import to Database
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importStats && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>
              Summary of the import operation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">
                    {importStats.new_properties}
                  </div>
                  <p className="text-xs text-muted-foreground">New Properties</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-600">
                    {importStats.updated_properties}
                  </div>
                  <p className="text-xs text-muted-foreground">Updated</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-purple-600">
                    {importStats.restored_properties}
                  </div>
                  <p className="text-xs text-muted-foreground">Restored</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-orange-600">
                    {importStats.marked_under_contract}
                  </div>
                  <p className="text-xs text-muted-foreground">Under Contract</p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h5 className="font-semibold mb-2">What happened?</h5>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✅ {importStats.new_properties} new properties added to database</li>
                <li>🔄 {importStats.updated_properties} existing properties updated</li>
                <li>↩️ {importStats.restored_properties} properties restored from "Under Contract" to "Available"</li>
                <li>🏠 {importStats.marked_under_contract} properties marked as "Under Contract" (not in current listing)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Step 1:</strong> Select a state and click "Scrape Properties" to fetch current HUD listings</p>
          <p><strong>Step 2:</strong> Review the scraped properties and their details</p>
          <p><strong>Step 3:</strong> Test with "Dry Run" to see what changes will be made (optional)</p>
          <p><strong>Step 4:</strong> Click "Import to Database" to save the properties</p>
          <p className="pt-2"><strong>Status Management:</strong></p>
          <ul className="list-disc list-inside pl-4 space-y-1">
            <li>Properties in the import → Marked as "Available"</li>
            <li>Properties NOT in the import → Marked as "Under Contract"</li>
            <li>Previously "Under Contract" properties that reappear → Restored to "Available"</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
