import { createClient } from '@supabase/supabase-js'
import { latestVideos, videoTitle, videoDescription, thumbnailUrl, watchPageUrl } from './_video.js'

// Google video sitemap: one entry per listing video, pointing at its watch page.
// https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps

function x(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).send('Method Not Allowed')
  }
  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Supabase environment variables are not configured')
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    const videos = await latestVideos(supabase)
    const cases = [...videos.keys()]
    const properties = []
    for (let i = 0; i < cases.length; i += 200) {
      const { data, error } = await supabase
        .from('properties')
        .select('case_number, city, state, price, beds, baths, status, is_active, updated_at')
        .in('case_number', cases.slice(i, i + 200))
      if (error) throw error
      properties.push(...(data || []))
    }

    // Only homes still on the market, like the main sitemap
    const entries = properties
      .filter(p => p.is_active !== false && String(p.status || '').toUpperCase() !== 'UNDER CONTRACT')
      .map(p => {
        const job = videos.get(p.case_number)
        const published = new Date(job.completed_at || job.updated_at || job.created_at).toISOString()
        return `
  <url>
    <loc>${x(watchPageUrl(p.case_number))}</loc>
    <video:video>
      <video:thumbnail_loc>${x(thumbnailUrl(p))}</video:thumbnail_loc>
      <video:title>${x(videoTitle(job, p).slice(0, 100))}</video:title>
      <video:description>${x(videoDescription(job, p).slice(0, 2048))}</video:description>
      <video:content_loc>${x(job.s3_url)}</video:content_loc>${job.duration_sec ? `
      <video:duration>${Math.max(1, Math.round(job.duration_sec))}</video:duration>` : ''}
      <video:publication_date>${published}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
    </video:video>
  </url>`
      }).join('')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">${entries}
</urlset>
`
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).send(req.method === 'HEAD' ? '' : xml)
  } catch (error) {
    console.error('[video-sitemap]', error)
    return res.status(500).send('Unable to generate video sitemap')
  }
}
