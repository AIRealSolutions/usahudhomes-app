/**
 * Vercel Serverless Function: /api/ai
 *
 * Proxies OpenAI chat completions so the API key never ships to the browser.
 * Signed-in brokers/admins only (Supabase Bearer token).
 *
 * Env: OPENAI_API_KEY (server-only — never prefix it with VITE_, which ships it to the browser),
 *      SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const MAX_TOKENS_CAP = 4000

async function requireStaff(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null
  const headers = { apikey: SUPABASE_SERVICE_KEY }
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { ...headers, Authorization: `Bearer ${token}` } })
  if (!userRes.ok) return null
  const { id } = await userRes.json()
  const rolesRes = await fetch(`${SUPABASE_URL}/rest/v1/users?select=role&id=eq.${id}&limit=1`, {
    headers: { ...headers, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
  })
  const role = rolesRes.ok ? (await rolesRes.json())?.[0]?.role : null
  return ['admin', 'broker'].includes(role) ? { id, role } : null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } })
  if (!(await requireStaff(req))) return res.status(401).json({ error: { message: 'Sign in as a broker or admin to use AI tools.' } })
  if (!OPENAI_API_KEY) return res.status(503).json({ error: { message: 'OpenAI is not configured on the server.' } })

  const { model, messages, temperature, max_tokens, response_format, top_p } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: { message: 'messages is required' } })
  }

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: typeof model === 'string' ? model : 'gpt-4o-mini',
      messages,
      ...(temperature !== undefined && { temperature }),
      ...(top_p !== undefined && { top_p }),
      ...(response_format && { response_format }),
      max_tokens: Math.min(Number(max_tokens) || 1500, MAX_TOKENS_CAP),
    }),
  })
  const data = await r.json().catch(() => ({ error: { message: 'Invalid response from OpenAI' } }))
  return res.status(r.status).json(data)
}
