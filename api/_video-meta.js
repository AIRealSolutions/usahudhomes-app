import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { latestVideos, videoObject, videoTitle, videoDescription, thumbnailUrl, watchPageUrl, SITE_URL } from './_video.js'

// Video watch page (/video/:caseNumber) as search engines and link previews see it:
// the app shell with the video already in the page, plus VideoObject structured data.

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://lpqjndfjbenolhneqzec.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

async function loadIndexHtml(req) {
  try {
    return fs.readFileSync(path.join(__dirname, '..', 'dist', 'index.html'), 'utf-8')
  } catch {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.usahudhomes.com'
    const r = await fetch(`https://${host}/index.html`, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) throw new Error(`index.html HTTP ${r.status}`)
    return r.text()
  }
}

function stripGenericTags(html) {
  return html
    .replace(/<title>[^<]*<\/title>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+(?:property|name)="twitter:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/<meta\s+name="robots"[^>]*>/gi, '')
    .replace(/<meta\s+property="fb:app_id"[^>]*>/gi, '')
}

export default async function handler(req, res) {
  const { caseNumber } = req.query
  try {
    let html = await loadIndexHtml(req)
    if (!caseNumber || !SUPABASE_KEY) {
      res.setHeader('Content-Type', 'text/html')
      return res.status(200).send(html)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
    const [{ data: property }, videos] = await Promise.all([
      supabase.from('properties')
        .select('case_number, city, state, zip_code, price, beds, baths, sq_ft, status, is_active, updated_at')
        .eq('case_number', caseNumber).maybeSingle(),
      latestVideos(supabase, [caseNumber])
    ])
    const job = videos.get(caseNumber)
    if (!property || !job) {
      res.setHeader('Content-Type', 'text/html')
      res.setHeader('X-Robots-Tag', 'noindex')
      return res.status(404).send(html)
    }

    const page = watchPageUrl(property.case_number)
    const title = videoTitle(job, property)
    const description = videoDescription(job, property)
    const thumb = thumbnailUrl(property)
    const listingUrl = `${SITE_URL}/property/${encodeURIComponent(property.case_number)}`
    const structured = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        videoObject(job, property),
        {
          '@type': 'WebPage',
          '@id': page,
          url: page,
          name: title,
          description,
          primaryImageOfPage: thumb,
          isPartOf: { '@type': 'WebSite', name: 'USAHUDhomes.com', url: `${SITE_URL}/` }
        }
      ]
    }).replace(/</g, '\\u003c')

    const head = `
    <title>${esc(title)} | USAHUDhomes.com</title>
    <meta name="description" content="${esc(description.slice(0, 300))}">
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
    <link rel="canonical" href="${page}">
    <script type="application/ld+json">${structured}</script>
    <meta property="og:type" content="video.other">
    <meta property="og:url" content="${page}">
    <meta property="og:site_name" content="USAHUDhomes.com">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description.slice(0, 300))}">
    <meta property="og:image" content="${thumb}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:video" content="${esc(job.s3_url)}">
    <meta property="og:video:secure_url" content="${esc(job.s3_url)}">
    <meta property="og:video:type" content="video/mp4">
    <meta property="og:video:width" content="1080">
    <meta property="og:video:height" content="1920">
    <meta property="fb:app_id" content="1993076721256699">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description.slice(0, 200))}">
    <meta name="twitter:image" content="${thumb}">
    `

    // The same video the app shows, already in the HTML (React replaces it on load)
    const body = `
      <main style="max-width:480px;margin:0 auto;padding:16px;font-family:system-ui,sans-serif">
        <h1 style="font-size:22px">${esc(title)}</h1>
        <video src="${esc(job.s3_url)}" poster="${thumb}" controls playsinline preload="metadata"
               width="1080" height="1920" style="width:100%;height:auto;background:#000"></video>
        <p>${esc(description)}</p>
        <p><a href="${listingUrl}">View the listing</a> · <a href="${SITE_URL}/">USAHUDhomes.com</a></p>
      </main>`

    html = stripGenericTags(html)
      .replace('<head>', `<head>\n${head}`)
      .replace('<div id="root"></div>', `<div id="root">${body}</div>`)

    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300')
    return res.status(200).send(html)
  } catch (error) {
    console.error('[video-meta]', error)
    return res.status(500).send('Internal server error')
  }
}
