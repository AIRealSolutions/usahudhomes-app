import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  // Get a sample property to see current fields
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  if (data && data.length > 0) {
    console.log('Current properties table fields:')
    console.log(Object.keys(data[0]).sort().join('\n'))
  }
}

checkSchema().catch(console.error)
