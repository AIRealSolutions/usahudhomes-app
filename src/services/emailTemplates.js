/**
 * Saved email templates (email_templates table) for the Compose Email screens.
 * Emails are sent as plain text, so templates are edited and stored as text with
 * {{merge_field}} placeholders. Older HTML templates are converted on read.
 */

import { supabase } from '../config/supabase'

export const SITE_URL = 'https://www.usahudhomes.com'

// Fields a template can use, grouped for the editor's insert buttons
export const MERGE_FIELDS = [
  { key: 'first_name',           label: 'First name',      group: 'Lead',     sample: 'Jane' },
  { key: 'last_name',            label: 'Last name',       group: 'Lead',     sample: 'Smith' },
  { key: 'full_name',            label: 'Full name',       group: 'Lead',     sample: 'Jane Smith' },
  { key: 'email',                label: 'Email',           group: 'Lead',     sample: 'jane@example.com' },
  { key: 'phone',                label: 'Phone',           group: 'Lead',     sample: '(910) 555-1234' },
  { key: 'state',                label: 'State',           group: 'Lead',     sample: 'NC' },
  { key: 'property_address',     label: 'Property address', group: 'Property', sample: '123 Main St, New Bern, NC' },
  { key: 'property_case_number', label: 'HUD case #',      group: 'Property', sample: '387-123456' },
  { key: 'property_price',       label: 'Price',           group: 'Property', sample: '$125,000' },
  { key: 'agent_name',           label: 'Your name',       group: 'You',      sample: 'Marc Spencer' },
  { key: 'agent_phone',          label: 'Your phone',      group: 'You',      sample: '(910) 363-6147' },
  { key: 'agent_email',          label: 'Your email',      group: 'You',      sample: 'marcspencer28461@gmail.com' },
  { key: 'video_url',            label: 'Template video',  group: 'Links',    sample: 'https://www.youtube.com/watch?v=…' },
  { key: 'opt_in_link',          label: 'Opt-in link',     group: 'Links',    sample: `${SITE_URL}/alerts` },
  { key: 'site_url',             label: 'Website',         group: 'Links',    sample: SITE_URL },
]

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&rarr;': '→' }

/** Converts an HTML template body to readable plain text; plain text passes through. */
export function templateToText(body) {
  const src = String(body || '')
  if (!/<\/?[a-z][^>]*>/i.test(src)) return src.replace(/\r\n/g, '\n')
  return src
    .replace(/\r\n/g, '\n')
    .replace(/<source[^>]*src="([^"]*)"[^>]*>/gi, '\n$1\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
      const label = text.replace(/<[^>]+>/g, '').trim().replace(/\s*(→|&rarr;|»)$/, '')
      return label && label !== href ? `${label}: ${href}` : href
    })
    .replace(/<\/li>\s*/gi, '')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|ul|ol|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/gi, m => ENTITIES[m.toLowerCase()] ?? m)
    .split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Field names used in a subject/body, e.g. ['first_name', 'video_url'] */
export function fieldsUsed(...texts) {
  const found = new Set()
  for (const t of texts) for (const m of String(t || '').matchAll(/\{\{\s*(\w+)\s*\}\}/g)) found.add(m[1])
  return [...found]
}

/**
 * Values for every merge field from a lead/customer, the sender and the template.
 * @param {Object} ctx - { lead, sender: { name, phone, email }, template }
 */
export function mergeValues({ lead = {}, sender = {}, template = {} } = {}) {
  const first = lead.first_name || String(lead.name || lead.customer_name || '').split(' ')[0] || ''
  const last = lead.last_name || String(lead.name || lead.customer_name || '').split(' ').slice(1).join(' ') || ''
  const price = lead.property_price ?? lead.price
  return {
    first_name: first || 'there', // "Hi there," when the name is unknown
    last_name: last,
    full_name: [first, last].filter(Boolean).join(' '),
    email: lead.email || lead.customer_email || '',
    phone: lead.phone || lead.customer_phone || '',
    state: lead.state || '',
    property_address: lead.property_address || lead.address || '',
    property_case_number: lead.property_case_number || lead.case_number || '',
    property_price: price ? `$${Number(price).toLocaleString()}` : '',
    agent_name: sender.name || '',
    agent_phone: sender.phone || '',
    agent_email: sender.email || '',
    video_url: template.video_url || '',
    opt_in_link: `${SITE_URL}/alerts`,
    site_url: SITE_URL,
  }
}

/** Replaces {{fields}} with values. Known fields with no value become empty; unknown ones are left visible. */
export function fillTemplate(text, values) {
  return String(text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => (key in values ? values[key] : m))
}

/** Subject and body ready for the compose box */
export function applyTemplate(template, ctx) {
  const values = mergeValues({ ...ctx, template })
  return {
    subject: fillTemplate(template.subject, values),
    body: fillTemplate(templateToText(template.body), values).replace(/\n{3,}/g, '\n\n'),
  }
}

export const sampleValues = () =>
  Object.fromEntries(MERGE_FIELDS.map(f => [f.key, f.sample]))

// ─── Database ────────────────────────────────────────────────────────────────

export async function listTemplates({ activeOnly = false } = {}) {
  let query = supabase.from('email_templates').select('*')
  if (activeOnly) query = query.eq('is_active', true)
  const { data, error } = await query.order('is_primary', { ascending: false }).order('name')
  if (error) throw error
  return data || []
}

export async function saveTemplate(template) {
  const row = {
    name: template.name.trim(),
    description: template.description?.trim() || null,
    subject: template.subject.trim(),
    body: template.body,
    merge_fields: fieldsUsed(template.subject, template.body),
    video_url: template.video_url?.trim() || null,
    is_primary: !!template.is_primary,
    is_active: template.is_active !== false,
    updated_at: new Date().toISOString(),
  }
  const query = template.id
    ? supabase.from('email_templates').update(row).eq('id', template.id)
    : supabase.from('email_templates').insert(row)
  const { data, error } = await query.select().single()
  if (error) throw error

  // Only one template is the default
  if (data.is_primary) {
    await supabase.from('email_templates').update({ is_primary: false }).neq('id', data.id).eq('is_primary', true)
  }
  return data
}

export async function deleteTemplate(id) {
  const { error } = await supabase.from('email_templates').delete().eq('id', id)
  if (error) throw error
}
