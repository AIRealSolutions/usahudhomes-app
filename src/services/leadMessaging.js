import { supabase } from '../config/supabase'

export async function postNotification(action, payload) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return { success: false, error: 'Your session expired. Please sign in again.' }
  }
  try {
    const response = await fetch(`/api/notifications?action=${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify(payload)
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok && result.success === undefined) {
      return { success: false, error: `Server error (${response.status}). Please try again.` }
    }
    return result
  } catch {
    return { success: false, error: 'Could not reach the server. Check your connection and try again.' }
  }
}

const isPhone = () =>
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.maxTouchPoints > 1 && window.matchMedia('(max-width: 900px)').matches)

export function smsLink(phone, body) {
  const digits = String(phone || '').replace(/[^\d+]/g, '')
  // "?&body=" is understood by both iOS and Android Messages.
  return `sms:${digits}?&body=${encodeURIComponent(body || '')}`
}

/** Sends an email to a lead from the server (Gmail). Resolves { success, error? }. */
export function sendLeadEmail({ to, subject, body }) {
  return postNotification('lead-email', { to, subject, body })
}

/**
 * Texts a lead. Uses Twilio when it is configured on the server; otherwise opens the
 * phone's Messages app, or on a computer copies the message so it can be sent from a phone.
 * Resolves { success, via: 'twilio' | 'phone' | 'copied', error? }.
 */
export async function sendLeadText({ to, body }) {
  if (!String(to || '').replace(/\D/g, '')) {
    return { success: false, error: 'This lead has no phone number.' }
  }
  const result = await postNotification('lead-sms', { to, body })
  if (result.success) return { success: true, via: 'twilio' }
  if (result.configured !== false) return { success: false, error: result.error }

  if (isPhone()) {
    window.location.href = smsLink(to, body)
    return { success: true, via: 'phone' }
  }
  try {
    await navigator.clipboard.writeText(body)
  } catch {
    // Clipboard can be blocked; the alert below still shows the number.
  }
  window.alert(
    `Texting from the website isn't switched on yet.\n\n` +
    `The message was copied. Text it to ${to} from your phone, ` +
    `or open this page on your phone and tap Send to open Messages.`
  )
  return { success: true, via: 'copied' }
}

/**
 * Tells the admins a public form saved a new lead (email/text). Works for
 * signed-out visitors: the server looks the lead up by id and only announces
 * recent leads, once. Never throws; a failed notice shouldn't block the form.
 */
export async function notifyLeadSubmitted(leadId) {
  try {
    await fetch('/api/notifications?action=lead-submitted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId }),
      keepalive: true,
    })
  } catch (err) {
    console.error('Lead notification failed:', err)
  }
}
