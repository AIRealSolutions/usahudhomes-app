import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  const sql = fs.readFileSync('/home/ubuntu/usahudhomes-app/database/migrations/add_sold_properties_fields.sql', 'utf8')
  
  console.log('Applying migration...\n')
  
  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'))
  
  for (const statement of statements) {
    if (!statement) continue
    
    console.log(`Executing: ${statement.substring(0, 100)}...`)
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement })
    
    if (error) {
      console.error('Error:', error)
      // Try direct query
      const { data: data2, error: error2 } = await supabase.from('properties').select('id').limit(1)
      if (error2) {
        console.error('Cannot execute SQL. Need to use Supabase dashboard.')
        console.log('\nPlease run this migration manually in Supabase SQL Editor:')
        console.log(sql)
        return
      }
    } else {
      console.log('✓ Success')
    }
  }
}

applyMigration().catch(console.error)
