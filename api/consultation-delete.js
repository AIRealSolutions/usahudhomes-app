/**
 * Vercel Serverless Function: DELETE /api/consultation-delete
 *
 * Soft-deletes one or more consultations using the Supabase service-role key,
 * bypassing RLS so brokers can remove leads from their panel.
 *
 * Body: { id: string }          — single delete
 *   or: { ids: string[] }       — bulk delete
 *
 * Returns: { success: true, deleted: number }
 */

const SUPABASE_URL        = process.env.SUPABASE_URL        || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!SUPABASE_SERVICE_KEY) {
    return res.status(500).json({
      error: 'SUPABASE_SERVICE_KEY is not configured in Vercel environment variables.',
    })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const ids  = body.ids ? body.ids : body.id ? [body.id] : []

  if (!ids.length) {
    return res.status(400).json({ error: 'No id or ids provided' })
  }

  const headers = {
    'apikey':        SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation',
  }

  const now = new Date().toISOString()
  let deleted = 0
  const errors = []

  for (const id of ids) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/consultations?id=eq.${encodeURIComponent(id)}`,
        {
          method:  'PATCH',
          headers,
          body: JSON.stringify({
            is_deleted: true,
            deleted_at: now,
            updated_at: now,
          }),
        }
      )
      if (r.ok) {
        deleted++
      } else {
        const err = await r.json()
        errors.push({ id, error: err?.message || r.statusText })
      }
    } catch (e) {
      errors.push({ id, error: e.message })
    }
  }

  if (errors.length > 0 && deleted === 0) {
    return res.status(500).json({ success: false, errors })
  }

  return res.status(200).json({ success: true, deleted, errors: errors.length ? errors : undefined })
}
