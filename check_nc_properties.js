import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkNCProperties() {
  console.log('Checking properties by state...\n')
  
  // Get count by state
  const { data: allProps, error: allError } = await supabase
    .from('properties')
    .select('state, is_active')
    .eq('is_active', true)
  
  if (allError) {
    console.error('Error fetching all properties:', allError)
    return
  }
  
  // Group by state
  const stateCounts = {}
  allProps.forEach(prop => {
    const state = prop.state || 'UNKNOWN'
    stateCounts[state] = (stateCounts[state] || 0) + 1
  })
  
  console.log('Properties by state:')
  Object.entries(stateCounts).sort().forEach(([state, count]) => {
    console.log(`  ${state}: ${count}`)
  })
  
  console.log('\n--- Checking NC properties specifically ---\n')
  
  // Get NC properties
  const { data: ncProps, error: ncError } = await supabase
    .from('properties')
    .select('*')
    .eq('state', 'NC')
    .eq('is_active', true)
    .limit(5)
  
  if (ncError) {
    console.error('Error fetching NC properties:', ncError)
    return
  }
  
  console.log(`Found ${ncProps.length} NC properties (showing first 5):`)
  ncProps.forEach(prop => {
    console.log(`  - ${prop.address}, ${prop.city}, ${prop.state} - $${prop.price}`)
  })
  
  // Check if there's a case sensitivity issue
  console.log('\n--- Checking for case variations ---\n')
  const { data: ncLower, error: ncLowerError } = await supabase
    .from('properties')
    .select('count')
    .ilike('state', 'nc')
    .eq('is_active', true)
  
  console.log(`Properties with state ilike 'nc': ${ncLower?.length || 0}`)
}

checkNCProperties().catch(console.error)
