/**
 * Gmail Helper Service
 * Generates Gmail compose URLs and handles Gmail integration
 */

/**
 * Generate Gmail compose URL with pre-filled content
 * Opens Gmail in a new window with recipient, subject, and body pre-filled
 */
export function generateGmailComposeUrl({ to, subject, body }) {
  const params = new URLSearchParams();
  
  if (to) params.append('to', to);
  if (subject) params.append('su', subject);
  if (body) params.append('body', body);
  
  return `https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`;
}

/**
 * Open Gmail compose window with pre-filled content
 */
export function openGmailCompose({ to, subject, body }) {
  const url = generateGmailComposeUrl({ to, subject, body });
  window.open(url, '_blank', 'noopener,noreferrer,width=800,height=600');
}

/**
 * Generate mailto link with pre-filled content
 * Alternative to Gmail for users with different default email clients
 */
export function generateMailtoLink({ to, subject, body }) {
  const params = new URLSearchParams();
  
  if (subject) params.append('subject', subject);
  if (body) params.append('body', body);
  
  const queryString = params.toString();
  return `mailto:${to}${queryString ? '?' + queryString : ''}`;
}

/**
 * Open default email client with pre-filled content
 */
export function openMailto({ to, subject, body }) {
  const link = generateMailtoLink({ to, subject, body });
  window.location.href = link;
}

/**
 * Format email content for Gmail
 * Converts HTML-like formatting to plain text with line breaks
 */
export function formatEmailForGmail(content) {
  return content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Create email signature
 */
export function createEmailSignature({ name, title, company, phone, website }) {
  const parts = [
    '\n\n---',
    name,
    title,
    company,
    phone ? `Phone: ${phone}` : null,
    website ? `Website: ${website}` : null
  ].filter(Boolean);
  
  return parts.join('\n');
}

/**
 * Add email signature to body
 */
export function addSignature(body, signature) {
  return body + signature;
}

/**
 * Parse email template with variables
 * Example: parseEmailTemplate("Hello {{name}}", { name: "John" }) => "Hello John"
 */
export function parseEmailTemplate(template, variables) {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, value);
  }
  
  return result;
}

/**
 * Create property list for email
 */
export function formatPropertiesForEmail(properties) {
  return properties.map((property, index) => {
    const parts = [
      `${index + 1}. ${property.address}, ${property.city}, ${property.state}`,
      `   Price: $${property.price?.toLocaleString()}`,
      property.bedrooms ? `   Bedrooms: ${property.bedrooms}` : null,
      property.bathrooms ? `   Bathrooms: ${property.bathrooms}` : null,
      property.square_feet ? `   Square Feet: ${property.square_feet.toLocaleString()}` : null,
      `   Case #: ${property.case_number}`,
      property.url ? `   View: ${property.url}` : null,
      ''
    ].filter(Boolean);
    
    return parts.join('\n');
  }).join('\n');
}

export default {
  generateGmailComposeUrl,
  openGmailCompose,
  generateMailtoLink,
  openMailto,
  formatEmailForGmail,
  createEmailSignature,
  addSignature,
  parseEmailTemplate,
  formatPropertiesForEmail
};
