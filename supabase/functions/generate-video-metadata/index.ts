// Supabase Edge Function: generate-video-metadata
// Generates SEO-optimized YouTube title and description for a HUD home video
// using OpenAI, then saves the result to video_jobs.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const OPENAI_API_KEY        = Deno.env.get('OPENAI_API_KEY')
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const {
      job_id, city, state, county, price,
      beds, baths, status, bids_open, listing_period, case_number,
    } = await req.json()

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured in Supabase secrets')
    }

    const priceFormatted = price ? `$${Number(price).toLocaleString()}` : '—'
    const cityClean      = (city  || '').replace(/ /g, '')
    const stateClean     = state  || ''

    const prompt = `You are a real estate marketing copywriter for Lightkeeper Realty, a Registered HUD Buyer's Agency in North Carolina.

Write a YouTube video title and description for a HUD home listing video.

Property details:
- Price: ${priceFormatted}
- Bedrooms: ${beds || '—'}  |  Bathrooms: ${baths || '—'}
- City: ${city || '—'}, ${stateClean}
- County: ${county || '—'}
- Listing Period: ${listing_period || '—'}
- Bids Open: ${bids_open || '—'}
- Case Number: ${case_number || '—'}

RULES:
- Do NOT include the street address in the title or description.
- Do NOT use the phrase "opportunity zone".
- Do NOT use rhetorical questions or buildup questions.
- Highlight owner-occupant incentives: $100 Down FHA Loan, 3% Closing Costs Paid, Repair Escrows up to $35,000 with a 203k Loan.
- Include a call to action: contact Marc Spencer at 910.363.6147, visit USAHUDhomes.com.
- Mention Lightkeeper Realty is a Registered HUD Buyer's Agency helping people bid on HUD homes for 25 years.
- Description should be 150–250 words, professional and direct.
- End description with hashtags: #HUDhomes #HUDhome #LightkeeperRealty #USAHUDhomes #${cityClean} #${stateClean}RealEstate #FHAloan #HUDhomebuyer

Respond ONLY with valid JSON in this exact format:
{
  "title": "...",
  "description": "..."
}`

    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       'gpt-4o-mini',
        messages:    [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens:  600,
      }),
    })

    if (!openaiResp.ok) {
      const err = await openaiResp.json()
      throw new Error(`OpenAI API error: ${JSON.stringify(err)}`)
    }

    const openaiData = await openaiResp.json()
    let raw = openaiData.choices[0].message.content.trim()

    // Strip markdown code fences if present
    if (raw.startsWith('```')) {
      const parts = raw.split('```')
      raw = parts[1]
      if (raw.startsWith('json')) raw = raw.slice(4)
      raw = raw.trim()
    }

    const result      = JSON.parse(raw)
    const title       = (result.title       || '').trim()
    const description = (result.description || '').trim()

    if (!title || !description) {
      throw new Error('OpenAI returned empty title or description')
    }

    // Persist to database so the metadata survives a page refresh
    if (job_id && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const { error: dbErr } = await supabase
        .from('video_jobs')
        .update({ youtube_title: title, youtube_description: description })
        .eq('id', job_id)
      if (dbErr) console.error('DB update error:', dbErr.message)
    }

    return new Response(
      JSON.stringify({ title, description }),
      { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  } catch (err) {
    console.error('generate-video-metadata error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  }
})
