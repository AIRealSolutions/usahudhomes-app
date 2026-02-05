#!/usr/bin/env node

/**
 * Property Image Audit and Fix Script
 * USAHUDhomes Database
 * 
 * This script audits property images and can optionally fix common issues
 * 
 * Usage:
 *   node scripts/audit_and_fix_images.js --audit        # Audit only
 *   node scripts/audit_and_fix_images.js --fix          # Audit and fix issues
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

// Utility: Convert case number to filename format
function caseNumberToFilename(caseNumber) {
  if (!caseNumber) return null
  return caseNumber.replace(/-/g, '_') + '.jpg'
}

// Utility: Check if image exists in Supabase Storage
async function checkImageExists(filename) {
  try {
    const { data, error } = await supabase.storage
      .from('USAHUDhomes')
      .list('', {
        limit: 1,
        search: filename
      })
    
    return data && data.length > 0
  } catch (error) {
    return false
  }
}

// Main audit function
async function auditPropertyImages() {
  console.log('🔍 Starting Property Image Audit...\n')

  // Fetch all properties
  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, case_number, address, city, state, main_image, status, is_active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error fetching properties:', error)
    return
  }

  console.log(`📊 Total Properties: ${properties.length}\n`)

  // Issue categories
  const issues = {
    missing: [],
    localPath: [],
    jogExtension: [],
    hyphenInFilename: [],
    activeWithoutImage: [],
    imageNotFound: []
  }

  // Audit each property
  for (const property of properties) {
    const { case_number, main_image, status, is_active } = property

    // Check for missing image
    if (!main_image || main_image === '') {
      issues.missing.push(property)
      
      if (is_active && ['AVAILABLE', 'BIDS OPEN', 'PRICE REDUCED'].includes(status)) {
        issues.activeWithoutImage.push(property)
      }
      continue
    }

    // Check for local path
    if (main_image.includes('/property-images/') || main_image.startsWith('property-images/')) {
      issues.localPath.push(property)
    }

    // Check for .jog extension
    if (main_image.endsWith('.jog')) {
      issues.jogExtension.push(property)
    }

    // Check for hyphens in filename (should be underscores)
    if (main_image.includes('-') && !main_image.startsWith('http')) {
      issues.hyphenInFilename.push(property)
    }

    // Check if image exists in Supabase Storage
    if (!main_image.startsWith('http')) {
      const exists = await checkImageExists(main_image)
      if (!exists) {
        issues.imageNotFound.push(property)
      }
    }
  }

  // Report findings
  console.log('📋 AUDIT RESULTS\n')
  console.log(`❌ Missing main_image: ${issues.missing.length}`)
  console.log(`📁 Local file paths: ${issues.localPath.length}`)
  console.log(`🔤 .jog extension (typo): ${issues.jogExtension.length}`)
  console.log(`➖ Hyphens in filename: ${issues.hyphenInFilename.length}`)
  console.log(`🚨 Active without image: ${issues.activeWithoutImage.length}`)
  console.log(`🔍 Image not found in storage: ${issues.imageNotFound.length}`)
  console.log()

  // Show details for high-priority issues
  if (issues.activeWithoutImage.length > 0) {
    console.log('🚨 HIGH PRIORITY: Active Properties Without Images')
    console.log('=' .repeat(60))
    issues.activeWithoutImage.slice(0, 10).forEach(p => {
      console.log(`  Case: ${p.case_number} | ${p.address}, ${p.city}, ${p.state}`)
    })
    if (issues.activeWithoutImage.length > 10) {
      console.log(`  ... and ${issues.activeWithoutImage.length - 10} more`)
    }
    console.log()
  }

  return issues
}

// Fix function
async function fixPropertyImages(issues) {
  console.log('\n🔧 Starting Image Fixes...\n')

  let fixedCount = 0

  // Fix .jog extensions
  if (issues.jogExtension.length > 0) {
    console.log(`Fixing ${issues.jogExtension.length} .jog extensions...`)
    for (const property of issues.jogExtension) {
      const newImage = property.main_image.replace('.jog', '.jpg')
      const { error } = await supabase
        .from('properties')
        .update({ main_image: newImage })
        .eq('id', property.id)
      
      if (!error) {
        fixedCount++
        console.log(`  ✅ Fixed: ${property.case_number}`)
      } else {
        console.log(`  ❌ Error: ${property.case_number} - ${error.message}`)
      }
    }
  }

  // Construct image URLs from case numbers for missing images
  if (issues.missing.length > 0) {
    console.log(`\nConstructing image URLs for ${issues.missing.length} properties...`)
    for (const property of issues.missing) {
      if (!property.case_number) continue
      
      const filename = caseNumberToFilename(property.case_number)
      
      // Check if image exists in storage
      const exists = await checkImageExists(filename)
      if (exists) {
        const { error } = await supabase
          .from('properties')
          .update({ main_image: filename })
          .eq('id', property.id)
        
        if (!error) {
          fixedCount++
          console.log(`  ✅ Fixed: ${property.case_number} -> ${filename}`)
        } else {
          console.log(`  ❌ Error: ${property.case_number} - ${error.message}`)
        }
      } else {
        console.log(`  ⚠️  Skipped: ${property.case_number} - Image not found in storage`)
      }
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} properties`)
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const shouldFix = args.includes('--fix')

  const issues = await auditPropertyImages()

  if (shouldFix) {
    console.log('\n⚠️  Running fixes in 3 seconds... (Ctrl+C to cancel)')
    await new Promise(resolve => setTimeout(resolve, 3000))
    await fixPropertyImages(issues)
  } else {
    console.log('ℹ️  To fix issues, run: node scripts/audit_and_fix_images.js --fix')
  }

  console.log('\n✅ Audit complete!')
}

main().catch(console.error)
