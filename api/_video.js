// Shared helpers for listing videos in Google Search: the watch page's
// structured data (api/video-meta.js) and the video sitemap (api/video-sitemap.js).

export const SITE_URL = 'https://www.usahudhomes.com'

export function watchPageUrl(caseNumber) {
  return `${SITE_URL}/video/${encodeURIComponent(caseNumber)}`
}

export function thumbnailUrl(property) {
  const v = encodeURIComponent(String(property?.updated_at || '').replace(/\D/g, '').slice(0, 14))
  return `${SITE_URL}/api/og-image?caseNumber=${encodeURIComponent(property.case_number)}&v=${v}`
}

// 59.9 → "PT1M0S"
export function isoDuration(seconds) {
  const s = Math.max(1, Math.round(Number(seconds) || 0))
  return `PT${Math.floor(s / 60) ? `${Math.floor(s / 60)}M` : ''}${s % 60}S`
}

function money(price) {
  return price ? `$${Number(price).toLocaleString('en-US')}` : ''
}

// Title and description never include the street address (it stays behind the login).
// Written here (not the YouTube title) so search results never show old bid dates or "new"/"now".
export function videoTitle(job, property) {
  const price = money(property?.price)
  const beds = property?.beds != null ? `${property.beds} Bed ` : ''
  return `${beds}HUD Home Video Tour in ${property?.city}, ${property?.state}${price ? ` – ${price}` : ''}`
}

// Written here rather than reusing the YouTube description, so the wording on our own
// site is always Fair Housing–safe and current (no phone-first or "perfect for" lines).
export function videoDescription(job, property) {
  const beds = property?.beds != null ? `${property.beds} bed` : ''
  const baths = property?.baths != null ? `${property.baths} bath` : ''
  const facts = [beds, baths].filter(Boolean).join(', ')
  return `Video tour of a ${facts ? `${facts} ` : ''}HUD home in ${property?.city}, ${property?.state}` +
    `${property?.price ? ` listed at ${money(property.price)}` : ''}. Compare HUD homes with free tools and ` +
    `connect with a HUD buyer's agency at USAHUDhomes.com.`
}

// Newest finished video for each listing, keyed by case number.
export async function latestVideos(supabase, caseNumbers = null) {
  const out = new Map()
  const pageSize = 1000
  for (let start = 0; ; start += pageSize) {
    let q = supabase
      .from('video_jobs')
      .select('case_number, s3_url, youtube_title, youtube_description, youtube_url, duration_sec, completed_at, updated_at, created_at')
      .eq('status', 'done')
      .not('s3_url', 'is', null)
      .order('created_at', { ascending: false })
      .range(start, start + pageSize - 1)
    if (caseNumbers) q = q.in('case_number', caseNumbers)
    const { data, error } = await q
    if (error) throw error
    for (const row of data || []) {
      if (!out.has(row.case_number)) out.set(row.case_number, row)
    }
    if (!data || data.length < pageSize) break
  }
  return out
}

export function videoObject(job, property) {
  const page = watchPageUrl(property.case_number)
  return {
    '@type': 'VideoObject',
    '@id': `${page}#video`,
    name: videoTitle(job, property),
    description: videoDescription(job, property),
    thumbnailUrl: [thumbnailUrl(property)],
    uploadDate: new Date(job.completed_at || job.updated_at || job.created_at).toISOString(),
    duration: job.duration_sec ? isoDuration(job.duration_sec) : undefined,
    contentUrl: job.s3_url,
    url: page,
    publisher: {
      '@type': 'Organization',
      name: 'USAHUDhomes.com',
      url: `${SITE_URL}/`,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` }
    },
    sameAs: job.youtube_url || undefined
  }
}
