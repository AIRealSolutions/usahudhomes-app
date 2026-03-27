import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Social media crawler user agents
const CRAWLER_USER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'SkypeUriPreview'
];

function isCrawler(userAgent) {
  if (!userAgent) return false;
  return CRAWLER_USER_AGENTS.some(bot => userAgent.includes(bot));
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Removes all existing OG / Twitter meta tags and the <title> from the HTML
 * so we can inject clean, property-specific ones without duplicates.
 */
function stripGenericMetaTags(html) {
  // Remove existing <title>...</title>
  html = html.replace(/<title>[^<]*<\/title>/gi, '');
  // Remove all og: meta tags
  html = html.replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '');
  // Remove all twitter: meta tags (both property= and name= variants)
  html = html.replace(/<meta\s+(?:property|name)="twitter:[^"]*"[^>]*>/gi, '');
  // Remove generic description meta tag (we'll inject the property-specific one)
  html = html.replace(/<meta\s+name="description"[^>]*>/gi, '');
  // Remove fb:app_id (we'll re-add it in the injected block)
  html = html.replace(/<meta\s+property="fb:app_id"[^>]*>/gi, '');
  return html;
}

export default async function handler(req, res) {
  const { caseNumber } = req.query;
  const userAgent = req.headers['user-agent'] || '';

  // If not a crawler, serve the regular index.html
  if (!isCrawler(userAgent)) {
    try {
      const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
      const html = fs.readFileSync(indexPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } catch (error) {
      return res.status(500).send('Error loading page');
    }
  }

  // For crawlers, fetch property data and inject meta tags
  try {
    // Fetch property data from Supabase
    const { data: property, error } = await supabase
      .from('properties')
      .select('*')
      .eq('case_number', caseNumber)
      .single();

    if (error || !property) {
      return res.status(404).send('Property not found');
    }

    // Build meta tag values
    const propertyUrl = `https://usahudhomes.com/property/${property.case_number}`;
    const propertyTitle = escapeHtml(`${property.address} - ${property.city}, ${property.state}`);
    const propertyDescription = escapeHtml(
      `${property.price ? '$' + Number(property.price).toLocaleString() : 'Price Available'} | ` +
      `${property.beds || 0} beds | ${property.baths || 0} baths | ` +
      `HUD Home in ${property.city}, ${property.state}. ` +
      `$100 Down FHA Loans, 3% Closing Cost Allowance, Owner-Occupant Bidding Priority. ` +
      `Contact Lightkeeper Realty at (910) 363-6147.`
    );

    // ── Dynamic OG image URL ──────────────────────────────────────────────────
    // Points to /api/og-image which generates a branded 1200×630 PNG with the
    // property photo, price, address, beds/baths, and USAHUDhomes.com branding.
    const ogImageUrl = `https://usahudhomes.com/api/og-image?caseNumber=${encodeURIComponent(property.case_number)}`;

    // Read and strip the generic meta tags from index.html
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    let html = fs.readFileSync(indexPath, 'utf-8');
    html = stripGenericMetaTags(html);

    // Inject property-specific meta tags at the top of <head>
    const metaTags = `
    <title>${propertyTitle} | USAHUDhomes.com</title>
    <meta name="description" content="${propertyDescription}">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${propertyUrl}">
    <meta property="og:site_name" content="USAHUDhomes.com">
    <meta property="og:title" content="${propertyTitle}">
    <meta property="og:description" content="${propertyDescription}">
    <meta property="og:image" content="${ogImageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/png">
    <meta property="fb:app_id" content="1993076721256699">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="${propertyUrl}">
    <meta name="twitter:title" content="${propertyTitle}">
    <meta name="twitter:description" content="${propertyDescription}">
    <meta name="twitter:image" content="${ogImageUrl}">
    <meta name="twitter:image:alt" content="${propertyTitle}">
    `;

    // Inject right after <head>
    html = html.replace('<head>', `<head>\n${metaTags}`);

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.status(200).send(html);
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).send('Internal server error');
  }
}
