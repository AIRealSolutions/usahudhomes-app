import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkNCStatus() {
  console.log('Checking NC property statuses...\n')
  
  // Get NC properties with their statuses
  const { data: ncProps, error } = await supabase
    .from('properties')
    .select('case_number, address, city, status, is_active')
    .eq('state', 'NC')
    .eq('is_active', true)
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log(`Found ${ncProps.length} active NC properties\n`)
  
  // Group by status
  const statusCounts = {}
  ncProps.forEach(prop => {
    const status = prop.status || 'NULL'
    statusCounts[status] = (statusCounts[status] || 0) + 1
  })
  
  console.log('Status breakdown:')
  Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`)
  })
  
  console.log('\nSample properties:')
  ncProps.slice(0, 5).forEach(prop => {
    console.log(`  - ${prop.address}, ${prop.city} - Status: ${prop.status}`)
  })
}

checkNCStatus().catch(console.error)
