import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

const { data, error } = await supabase
  .from('bid_results')
  .select('*')
  .order('date_accepted', { ascending: false })

if (error) {
  console.error('Error:', error)
} else {
  console.log('Bid Results in Database:')
  console.log(JSON.stringify(data, null, 2))
  console.log(`\nTotal: ${data.length} records`)
}
