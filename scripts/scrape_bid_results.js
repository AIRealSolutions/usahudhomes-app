#!/usr/bin/env node

/**
 * HUD Bid Results Scraper
 * 
 * Scrapes bid results from hudhomestore.gov/bidresults by state
 * and imports them into the database.
 * 
 * Usage: node scripts/scrape_bid_results.js <state>
 * Example: node scripts/scrape_bid_results.js NC
 */

import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const state = process.argv[2] || 'NC'

console.log(`Starting bid results scraper for state: ${state}`)

async function scrapeBidResults(state) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()
    
    // Navigate to bid results page
    console.log('Navigating to HUD bid results page...')
    await page.goto('https://www.hudhomestore.gov/bidresults', {
      waitUntil: 'networkidle2',
      timeout: 60000
    })

    // Wait for page to load
    await page.waitForSelector('#cityStateZip', { timeout: 10000 })

    // Close any modal/popup if present
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const closed = await page.evaluate(() => {
        // Try to find and click the X button
        const xButton = document.querySelector('button.close, button[aria-label="Close"], .modal button[class*="close"]')
        if (xButton) {
          xButton.click()
          return true
        }
        // Try to find the OK button
        const buttons = Array.from(document.querySelectorAll('button'))
        const closeButton = buttons.find(b => b.textContent.includes("Don't Show") || b.textContent.includes('Ok'))
        if (closeButton) {
          closeButton.click()
          return true
        }
        return false
      })
      if (closed) {
        console.log('Closed modal popup')
        await new Promise(resolve => setTimeout(resolve, 1000))
      } else {
        console.log('No modal found or could not close it')
      }
    } catch (e) {
      console.log('Error handling modal:', e.message)
    }

    // Clear and enter state in search box
    console.log(`Searching for ${state} bid results...`)
    await page.click('#cityStateZip', { clickCount: 3 }) // Select all
    await page.type('#cityStateZip', state, { delay: 100 })
    
    // Wait a moment for autocomplete
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Click search button
    await page.click('#searchFilterBtn')
    
    // Wait for results to load - look for either results or "no results" message
    try {
      await page.waitForFunction(
        () => {
          const container = document.querySelector('#result-card-container')
          return container && (container.children.length > 0 || container.textContent.includes('No'))
        },
        { timeout: 15000 }
      )
    } catch (e) {
      console.log('Timeout waiting for results, checking what we got...')
    }
    
    // Give it a moment to fully render
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Debug: Save screenshot
    await page.screenshot({ path: '/home/ubuntu/bid_results_screenshot.png', fullPage: true })
    console.log('Saved screenshot to /home/ubuntu/bid_results_screenshot.png')

    // Extract bid results data
    console.log('Extracting bid results data...')
    
    const bidResults = await page.evaluate(() => {
      const results = []
      const container = document.querySelector('#result-card-container')
      
      if (!container) {
        console.log('No result container found')
        return results
      }
      
      const cards = container.querySelectorAll('li')
      console.log('Found', cards.length, 'result cards')
      
      cards.forEach((card, index) => {
        try {
          const result = {}
          
          // Get all text content
          const text = card.textContent
          
          // Extract case number - look for pattern like "387-620178"
          const caseMatch = text.match(/Case #\s*(\d{3}-\d{6})/i)
          if (caseMatch) {
            result.case_number = caseMatch[1]
          }
          
          // Extract net to HUD - look for dollar amount
          const netMatch = text.match(/Net to HUD\s*\$?([\d,]+\.?\d*)/i)
          if (netMatch) {
            result.net_to_hud = parseFloat(netMatch[1].replace(/,/g, ''))
          }
          
          // Extract property address - format: "Property Address 205 N MILLER ST Chadbourn, NC, 28431"
          const addressMatch = text.match(/Property Address\s+(.+?)\s+([A-Za-z][A-Za-z\s.]+),\s*([A-Z]{2}),?\s*(\d{5})/)
          if (addressMatch) {
            const fullStreet = addressMatch[1].trim()
            // Clean up any extra whitespace/newlines
            result.address = fullStreet.replace(/\s+/g, ' ').trim()
            result.city = addressMatch[2].trim().replace(/\s+/g, ' ')
            result.state = addressMatch[3].trim()
            result.zip_code = addressMatch[4].trim()
          }
          
          // Extract purchaser type
          const purchaserMatch = text.match(/Purchaser Type\s*([^\n]+)/i)
          if (purchaserMatch) {
            result.purchaser_type = purchaserMatch[1].trim()
          }
          
          // Extract dates
          const dateSubmittedMatch = text.match(/Date Submitted\s*(\d{2}\/\d{2}\/\d{4})/i)
          if (dateSubmittedMatch) {
            result.date_submitted = dateSubmittedMatch[1]
          }
          
          const dateOpenedMatch = text.match(/Date Opened\s*(\d{2}\/\d{2}\/\d{4})/i)
          if (dateOpenedMatch) {
            result.date_opened = dateOpenedMatch[1]
          }
          
          const dateAcceptedMatch = text.match(/Date Accepted\s*(\d{2}\/\d{2}\/\d{4})/i)
          if (dateAcceptedMatch) {
            result.date_accepted = dateAcceptedMatch[1]
          }
          
          // Extract broker name
          const brokerMatch = text.match(/Broker Name\s*([^\n]+)/i)
          if (brokerMatch) {
            result.broker_name = brokerMatch[1].trim()
          }
          
          if (result.case_number && result.net_to_hud) {
            results.push(result)
            console.log(`Extracted result ${index + 1}:`, JSON.stringify(result, null, 2))
          } else {
            console.log(`Skipped card ${index + 1}: missing case_number or net_to_hud`)
          }
        } catch (err) {
          console.error('Error extracting card data:', err)
        }
      })
      
      return results
    })

    console.log(`Found ${bidResults.length} bid results`)
    
    // Save extracted data for debugging
    fs.writeFileSync('/home/ubuntu/extracted_bid_results.json', JSON.stringify(bidResults, null, 2))
    console.log('Saved extracted data to /home/ubuntu/extracted_bid_results.json')
    
    return bidResults

  } catch (error) {
    console.error('Error scraping bid results:', error)
    throw error
  } finally {
    await browser.close()
  }
}

function parseDate(dateStr) {
  if (!dateStr) return null
  // Convert MM/DD/YYYY to YYYY-MM-DD
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
  }
  return null
}

async function importBidResults(bidResults) {
  console.log(`\nImporting ${bidResults.length} bid results into database...`)
  
  let imported = 0
  let updated = 0
  let errors = 0

  for (const result of bidResults) {
    try {
      // Check if broker exists, create if not
      let brokerId = null
      if (result.broker_name) {
        const { data: existingBroker } = await supabase
          .from('brokers')
          .select('id')
          .eq('name', result.broker_name)
          .single()

        if (existingBroker) {
          brokerId = existingBroker.id
        } else {
          const { data: newBroker, error: brokerError } = await supabase
            .from('brokers')
            .insert({ name: result.broker_name })
            .select('id')
            .single()

          if (brokerError) {
            console.error(`Error creating broker ${result.broker_name}:`, brokerError)
          } else {
            brokerId = newBroker.id
            console.log(`✓ Created new broker: ${result.broker_name}`)
          }
        }
      }

      // Estimate sale price from net to HUD (add ~6% for commissions/costs)
      const estimatedSalePrice = result.net_to_hud ? result.net_to_hud * 1.06 : null

      // Insert or update bid result
      const bidData = {
        case_number: result.case_number,
        address: result.address,
        city: result.city,
        state: result.state,
        zip_code: result.zip_code,
        net_to_hud: result.net_to_hud,
        estimated_sale_price: estimatedSalePrice,
        purchaser_type: result.purchaser_type,
        broker_name: result.broker_name,
        broker_id: brokerId,
        date_submitted: parseDate(result.date_submitted),
        date_opened: parseDate(result.date_opened),
        date_accepted: parseDate(result.date_accepted) || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      }

      // Check if it already exists
      const { data: existing } = await supabase
        .from('bid_results')
        .select('id')
        .eq('case_number', result.case_number)
        .single()

      const { error } = await supabase
        .from('bid_results')
        .upsert(bidData, { 
          onConflict: 'case_number'
        })

      if (error) {
        console.error(`✗ Error importing bid result ${result.case_number}:`, error.message)
        errors++
      } else {
        if (existing) {
          console.log(`↻ Updated: ${result.case_number} - ${result.address}`)
          updated++
        } else {
          console.log(`✓ Imported: ${result.case_number} - ${result.address}`)
          imported++
        }
      }

    } catch (err) {
      console.error(`✗ Error processing bid result ${result.case_number}:`, err.message)
      errors++
    }
  }

  console.log(`\n═══════════════════════════════════`)
  console.log(`Import Summary:`)
  console.log(`  ✓ New records: ${imported}`)
  console.log(`  ↻ Updated records: ${updated}`)
  console.log(`  ✗ Errors: ${errors}`)
  console.log(`═══════════════════════════════════`)
}

// Main execution
(async () => {
  try {
    const bidResults = await scrapeBidResults(state)
    
    if (bidResults.length === 0) {
      console.log('\n⚠ No bid results found')
      console.log('This could mean:')
      console.log('  1. No properties under contract in this state')
      console.log('  2. The search didn\'t work properly')
      console.log('  3. The page structure has changed')
      console.log('\nCheck the screenshot at /home/ubuntu/bid_results_screenshot.png')
      return
    }

    await importBidResults(bidResults)
    
    console.log('\n✓ Bid results scraping and import completed successfully!')
    
  } catch (error) {
    console.error('\n✗ Fatal error:', error)
    process.exit(1)
  }
})()
