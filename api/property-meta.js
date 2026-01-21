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
    const propertyDescription = escapeHtml(`$${property.list_price?.toLocaleString() || 'Price Available'} | ${property.bedrooms || 0} beds | ${property.bathrooms || 0} baths | HUD Home in ${property.city}, ${property.state}. Contact Lightkeeper Realty at 910-363-6147 for more information.`);
    
    // Fix image URL: convert .jog to .jpg
    let imageUrl = property.main_image || 'https://usahudhomes.com/default-property-image.jpg';
    if (imageUrl && imageUrl.endsWith('.jog')) {
      imageUrl = imageUrl.replace(/\.jog$/, '.jpg');
    }
    const propertyImage = escapeHtml(imageUrl);

    // Read the index.html file
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    let html = fs.readFileSync(indexPath, 'utf-8');

    // Create meta tags
    const metaTags = `
    <title>${propertyTitle}</title>
    <meta name="description" content="${propertyDescription}">
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="${propertyTitle}">
    <meta property="og:description" content="${propertyDescription}">
    <meta property="og:image" content="${propertyImage}">
    <meta property="og:url" content="${propertyUrl}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="USAHUDhomes.com">
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${propertyTitle}">
    <meta name="twitter:description" content="${propertyDescription}">
    <meta name="twitter:image" content="${propertyImage}">
    `;

    // Inject meta tags into the <head> section
    html = html.replace('</head>', `${metaTags}\n</head>`);

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).send('Internal server error');
  }
}
