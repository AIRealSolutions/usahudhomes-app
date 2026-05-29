// Supabase Edge Function: upload-to-youtube
// Downloads a completed video from Supabase Storage and uploads it to YouTube
// using the YouTube Data API v3 resumable upload protocol.
//
// Required Supabase secrets:
//   YOUTUBE_CLIENT_ID      — OAuth 2.0 client ID from Google Cloud Console
//   YOUTUBE_CLIENT_SECRET  — OAuth 2.0 client secret
//   YOUTUBE_REFRESH_TOKEN  — Long-lived refresh token obtained via OAuth flow
//   SUPABASE_URL           — (auto-set by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY — (auto-set by Supabase)
//
// To obtain YOUTUBE_REFRESH_TOKEN, run scripts/3_bulk_upload.py once with
// --dry-run — it will open a browser auth flow and save token.json, then
// copy the refresh_token value into Supabase secrets.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const YOUTUBE_CLIENT_ID      = Deno.env.get('YOUTUBE_CLIENT_ID')
const YOUTUBE_CLIENT_SECRET  = Deno.env.get('YOUTUBE_CLIENT_SECRET')
const YOUTUBE_REFRESH_TOKEN  = Deno.env.get('YOUTUBE_REFRESH_TOKEN')
const SUPABASE_URL           = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const YOUTUBE_TAGS = [
  'HUD home', 'HUD homes', 'HUD home for sale', 'FHA loan', '100 down FHA',
  'Lightkeeper Realty', 'USAHUDhomes', 'HUD buyer agent', 'real estate',
  'foreclosure', 'government home', '203k loan', 'owner occupant',
]

async function getYouTubeAccessToken(): Promise<string> {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      client_id:     YOUTUBE_CLIENT_ID!,
      client_secret: YOUTUBE_CLIENT_SECRET!,
      refresh_token: YOUTUBE_REFRESH_TOKEN!,
      grant_type:    'refresh_token',
    }),
  })

  if (!resp.ok) {
    const err = await resp.json()
    throw new Error(`YouTube OAuth token refresh failed: ${JSON.stringify(err)}`)
  }

  const data = await resp.json()
  if (!data.access_token) {
    throw new Error('YouTube OAuth response missing access_token')
  }
  return data.access_token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    // Validate YouTube credentials are configured
    if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) {
      throw new Error(
        'YouTube OAuth credentials not configured. ' +
        'Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and YOUTUBE_REFRESH_TOKEN ' +
        'in Supabase project secrets.',
      )
    }

    const { job_id } = await req.json()
    if (!job_id) throw new Error('job_id is required')

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Load job with property details
    const { data: job, error: jobErr } = await supabase
      .from('video_jobs')
      .select('id, s3_url, youtube_title, youtube_description, case_number, properties(city, state)')
      .eq('id', job_id)
      .single()

    if (jobErr || !job) throw new Error(`Job not found: ${jobErr?.message ?? 'no data'}`)
    if (!job.s3_url)          throw new Error('Video file not ready — s3_url is missing')
    if (!job.youtube_title)   throw new Error('Generate AI metadata before uploading to YouTube')

    // Exchange refresh token for a short-lived access token
    const accessToken = await getYouTubeAccessToken()

    // Download the video from Supabase Storage
    const videoResp = await fetch(job.s3_url)
    if (!videoResp.ok) {
      throw new Error(`Failed to download video from storage: ${videoResp.status} ${videoResp.statusText}`)
    }
    const videoBytes = await videoResp.arrayBuffer()

    // Build YouTube video metadata
    const videoMetadata = {
      snippet: {
        title:       (job.youtube_title       || '').slice(0, 100),
        description: job.youtube_description  || '',
        tags:        YOUTUBE_TAGS,
        categoryId:  '22', // People & Blogs
      },
      status: {
        privacyStatus:            'public',
        selfDeclaredMadeForKids:  false,
      },
    }

    // Step 1: Initiate a resumable upload session
    const initResp = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method:  'POST',
        headers: {
          'Authorization':          `Bearer ${accessToken}`,
          'Content-Type':           'application/json',
          'X-Upload-Content-Type':  'video/mp4',
          'X-Upload-Content-Length': String(videoBytes.byteLength),
        },
        body: JSON.stringify(videoMetadata),
      },
    )

    if (!initResp.ok) {
      const errBody = await initResp.text()
      throw new Error(`Failed to start YouTube upload session: ${initResp.status} ${errBody}`)
    }

    const uploadUri = initResp.headers.get('Location')
    if (!uploadUri) throw new Error('YouTube did not return an upload URI')

    // Step 2: Upload the video data
    const uploadResp = await fetch(uploadUri, {
      method:  'PUT',
      headers: {
        'Content-Type':   'video/mp4',
        'Content-Length': String(videoBytes.byteLength),
      },
      body: videoBytes,
    })

    if (!uploadResp.ok) {
      const errBody = await uploadResp.text()
      throw new Error(`YouTube video upload failed: ${uploadResp.status} ${errBody}`)
    }

    const uploadResult = await uploadResp.json()
    const videoId      = uploadResult.id as string
    if (!videoId) throw new Error('YouTube did not return a video ID')

    const youtubeUrl = `https://youtu.be/${videoId}`

    // Persist YouTube details to database
    await supabase
      .from('video_jobs')
      .update({
        youtube_video_id:   videoId,
        youtube_url:        youtubeUrl,
        uploaded_to_youtube: true,
        uploaded_at:        new Date().toISOString(),
      })
      .eq('id', job_id)

    return new Response(
      JSON.stringify({ video_id: videoId, youtube_url: youtubeUrl }),
      { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  } catch (err) {
    console.error('upload-to-youtube error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  }
})
