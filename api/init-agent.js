/**
 * Vercel Serverless Function: Initialize Marc Spencer as Agent
 * This is a one-time setup endpoint to add the primary agent
 */

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check for authorization (simple secret key)
    const authHeader = req.headers.authorization
    const SECRET_KEY = process.env.INIT_SECRET_KEY || 'your-secret-key-here'
    
    if (authHeader !== `Bearer ${SECRET_KEY}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Marc Spencer's agent data
    const marcSpencerData = {
      first_name: 'Marc',
      last_name: 'Spencer',
      email: 'marcspencer28461@gmail.com',
      phone: '9103636147',
      company: 'Lightkeeper Realty',
      license_number: '153928',
      license_state: 'NC',
      specialties: ['HUD Homes', 'Government Foreclosures', 'First-Time Buyers'],
      states_covered: ['NC'],
      years_experience: 25,
      bio: '25+ years helping people buy HUD homes across North Carolina',
      profile_image: null,
      is_admin: true,
      is_active: true,
      total_listings: 0,
      total_sales: 0
    }

    // Check if agent already exists
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('*')
      .eq('email', marcSpencerData.email)
      .single()

    if (existingAgent) {
      return res.status(200).json({
        success: true,
        message: 'Agent already exists',
        data: existingAgent
      })
    }

    // Insert Marc Spencer as agent
    const { data, error } = await supabase
      .from('agents')
      .insert([marcSpencerData])
      .select()
      .single()

    if (error) {
      console.error('Error creating agent:', error)
      return res.status(500).json({
        error: 'Failed to create agent',
        details: error.message
      })
    }

    console.log('Agent created successfully:', data.id)
    return res.status(200).json({
      success: true,
      message: 'Agent created successfully',
      data: data
    })

  } catch (error) {
    console.error('Error in init-agent function:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}
