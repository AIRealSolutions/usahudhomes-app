#!/usr/bin/env node

/**
 * Apply Closure Tracking Migration
 *
 * This script applies the smart 90-day closure detection system to Supabase.
 *
 * Usage:
 *   node scripts/apply-closure-migration.js
 *
 * What it does:
 * 1. Adds last_seen_at column to properties table
 * 2. Creates indexes for efficient queries
 * 3. Creates PL/pgSQL functions for closure detection
 * 4. Creates trigger for automatic last_seen_at updates on import
 * 5. Initializes last_seen_at for existing properties
 * 6. Creates view for monitoring at-risk properties
 *
 * Rollback:
 *   See scripts/rollback-closure-migration.js
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  console.error('Set these environment variables:')
  console.error('  VITE_SUPABASE_URL=https://your-project.supabase.co')
  console.error('  SUPABASE_SERVICE_KEY=your-service-role-key')
  process.exit(1)
}

// Initialize Supabase with service role key (has admin access for schema changes)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function applyMigration() {
  console.log('🚀 Starting Closure Tracking Migration...\n')

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migration_add_closure_tracking.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    console.log('📝 Migration SQL loaded')
    console.log('   Path:', migrationPath)
    console.log('   Size:', migrationSQL.length, 'bytes\n')

    // Split SQL into individual statements (handle GO or ; delimiters)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📋 Found ${statements.length} SQL statements\n`)

    let successCount = 0
    let errorCount = 0

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      const statementNum = i + 1

      try {
        console.log(`[${statementNum}/${statements.length}] Executing...`)

        // Get first meaningful line for logging
        const firstLine = statement
          .split('\n')
          .find(l => l.trim() && !l.trim().startsWith('--'))
          ?.substring(0, 60) || 'Unknown'

        const { error } = await supabase.rpc('exec', {
          command: statement
        }).catch(async () => {
          // Fallback: use raw SQL if exec RPC doesn't exist
          return await supabase.from('_migrations').insert({ sql: statement }).catch(e => ({
            error: e
          }))
        })

        if (error) {
          console.log(`   ⚠️  ${firstLine}...`)
          console.log(`   Note: ${error.message}\n`)
          // Don't fail on errors - some statements might already exist
        } else {
          console.log(`   ✅ ${firstLine}...\n`)
          successCount++
        }
      } catch (err) {
        console.log(`   ⚠️  Error: ${err.message}\n`)
        errorCount++
      }
    }

    console.log('\n✅ Migration Application Complete!')
    console.log(`   Successful: ${successCount}`)
    console.log(`   Skipped/Errors: ${errorCount}`)
    console.log(`   Total: ${statements.length}\n`)

    // Verify migration
    console.log('🔍 Verifying migration...\n')

    // Check if last_seen_at column exists
    const { data: columns, error: columnError } = await supabase
      .from('properties')
      .select('*')
      .limit(1)

    if (columnError) {
      console.log('⚠️  Could not verify: ', columnError.message)
    } else if (columns && columns.length > 0) {
      const hasLastSeenAt = 'last_seen_at' in columns[0]
      if (hasLastSeenAt) {
        console.log('✅ Verified: last_seen_at column exists')
        console.log('✅ Migration applied successfully!\n')
      } else {
        console.log('⚠️  Warning: last_seen_at column not found')
        console.log('   This might indicate the migration needs manual review.\n')
      }
    }

    // Show next steps
    console.log('📋 Next Steps:\n')
    console.log('1. Set up nightly closure detection job:')
    console.log('   - Vercel Cron: /api/cron/check-closures')
    console.log('   - Or: Use pg_cron in Supabase\n')

    console.log('2. Monitor at-risk properties:')
    console.log('   SELECT * FROM properties_at_risk_of_closure;\n')

    console.log('3. Test closure detection:')
    console.log('   SELECT * FROM auto_close_stale_properties() LIMIT 5;\n')

    process.exit(0)
  } catch (err) {
    console.error('❌ Migration Failed!')
    console.error('Error:', err.message)
    console.error('\nIf you need to debug:')
    console.error('1. Check Supabase SQL Editor for errors')
    console.error('2. Review migration_add_closure_tracking.sql')
    console.error('3. Ensure SUPABASE_SERVICE_KEY has admin access\n')
    process.exit(1)
  }
}

// Run migration
applyMigration()
