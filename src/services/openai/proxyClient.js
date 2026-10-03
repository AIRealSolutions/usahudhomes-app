import { supabase } from '../../config/supabase'

/**
 * Drop-in stand-in for the OpenAI SDK's chat.completions.create that calls /api/ai,
 * so the OpenAI key stays on the server.
 */
async function create(params) {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`
    },
    body: JSON.stringify(params)
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error?.message || `AI request failed (${response.status})`)
  }
  return data
}

const client = { chat: { completions: { create } } }

export function getAIClient() {
  return client
}
