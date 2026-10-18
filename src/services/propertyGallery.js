/**
 * Property photo gallery: the photo list is fetched from HUD only when someone opens
 * the gallery (/api/hud?action=gallery), and photos are downloaded only on request.
 */

import { makeZip } from '../utils/zip'

export async function fetchGallery(caseNumber, { refresh = false } = {}) {
  const response = await fetch(`/api/hud?action=gallery&caseNumber=${encodeURIComponent(caseNumber)}${refresh ? '&refresh=1' : ''}`)
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.success) throw new Error(result.error || `Could not load photos (${response.status})`)
  return result.images || []
}

// The photo host usually allows direct downloads; the server pass-through covers the rest
async function photoBytes(url) {
  try {
    const direct = await fetch(url, { mode: 'cors' })
    if (direct.ok) return new Uint8Array(await direct.arrayBuffer())
  } catch {
    // blocked by the browser; fall through to the server copy
  }
  const proxied = await fetch(`/api/hud?action=gallery-image&url=${encodeURIComponent(url)}`)
  if (!proxied.ok) throw new Error(`Photo could not be downloaded (${proxied.status})`)
  return new Uint8Array(await proxied.arrayBuffer())
}

const extension = (url) => (String(url).split('?')[0].match(/\.(jpe?g|png|webp)$/i)?.[1] || 'jpg').toLowerCase()

function saveBlob(blob, filename) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(link.href), 10000)
}

/** Safe file-name stem, e.g. "387-123456-southport-nc" */
export const photoFileStem = (property) =>
  [property?.case_number, property?.city, property?.state]
    .filter(Boolean).join('-').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-')

/** Downloads one photo as its own file */
export async function downloadPhoto(url, filename) {
  const bytes = await photoBytes(url)
  saveBlob(new Blob([bytes], { type: `image/${extension(url) === 'jpg' ? 'jpeg' : extension(url)}` }), `${filename}.${extension(url)}`)
}

/**
 * Downloads several photos as one zip. onProgress(done, total) reports progress;
 * photos that fail are skipped and counted in the result.
 */
export async function downloadPhotosZip(urls, stem, onProgress) {
  const files = []
  let failed = 0
  for (let i = 0; i < urls.length; i++) {
    try {
      const data = await photoBytes(urls[i])
      files.push({ name: `${stem}-${String(i + 1).padStart(2, '0')}.${extension(urls[i])}`, data })
    } catch {
      failed++
    }
    onProgress?.(i + 1, urls.length)
  }
  if (!files.length) throw new Error('None of the photos could be downloaded.')
  saveBlob(makeZip(files), `${stem}-photos.zip`)
  return { saved: files.length, failed }
}
