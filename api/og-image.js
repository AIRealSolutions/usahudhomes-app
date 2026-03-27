/**
 * /api/og-image.js
 *
 * Dynamic Open Graph image generator for USAHUDhomes.com property listings.
 *
 * Generates a 1200×630px PNG image for each property that includes:
 *  - The property photo (left 65%)
 *  - USAHUDhomes.com logo & branding (right panel)
 *  - Price, address, city/state
 *  - Beds, baths, sq ft stats
 *  - Owner-occupant incentive CTA banner
 *  - HUD HOME badge and case number
 *
 * Usage: GET /api/og-image?caseNumber=387-111612
 *
 * Referenced by /api/property-meta.js which injects the og:image tag.
 */

import { createClient } from '@supabase/supabase-js';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Supabase client ─────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// ── Load fonts once at module level (cached across warm invocations) ─────────
let fontRegular, fontBold;
try {
  fontRegular = fs.readFileSync(path.join(__dirname, 'fonts', 'Inter-Regular.woff'));
  fontBold    = fs.readFileSync(path.join(__dirname, 'fonts', 'Inter-Bold.woff'));
} catch (e) {
  console.error('[og-image] Font load error:', e.message);
}

// ── Load app icon as base64 data URI ─────────────────────────────────────────
let appIconBase64 = '';
try {
  const iconPath = path.join(__dirname, '..', 'dist', 'app-icon-small.png');
  appIconBase64 = 'data:image/png;base64,' + fs.readFileSync(iconPath).toString('base64');
} catch (e) {
  console.error('[og-image] Icon load error:', e.message);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price) {
  if (!price) return 'Price Available';
  return '$' + Number(price).toLocaleString('en-US');
}

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 3) + '...' : str;
}

function fixImageUrl(url) {
  if (!url) return null;
  if (url.endsWith('.jog')) return url.replace(/\.jog$/, '.jpg');
  return url;
}

/**
 * Fetches a remote image and returns it as a base64 data URI.
 * Returns null on failure so we can fall back to the no-image layout.
 */
async function fetchImageAsDataUri(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'USAHUDhomes-OG-Bot/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

// ── OG image layout builder ──────────────────────────────────────────────────

function buildElement({ address, city, state, price, beds, baths, sqft, imageDataUri, caseNumber }) {
  const displayPrice    = formatPrice(price);
  const displayAddress  = truncate(address || 'HUD Property', 45);
  const displayLocation = [city, state].filter(Boolean).join(', ');
  const displayBeds     = beds  != null ? String(beds)  : '—';
  const displayBaths    = baths != null ? String(baths) : '—';
  const displaySqft     = sqft  ? Number(sqft).toLocaleString() + ' sq ft' : null;

  return {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        fontFamily: 'Inter',
        position: 'relative',
        overflow: 'hidden',
        background: '#0f2744',
      },
      children: [

        // ── Left: property photo ────────────────────────────────────────────
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0, left: 0,
              width: '780px', height: '630px',
              overflow: 'hidden',
              display: 'flex',
            },
            children: imageDataUri ? [
              {
                type: 'img',
                props: {
                  src: imageDataUri,
                  style: { width: '780px', height: '630px', objectFit: 'cover', objectPosition: 'center' },
                },
              },
              // Gradient overlay for smooth transition to the right panel
              {
                type: 'div',
                props: {
                  style: {
                    position: 'absolute', top: 0, left: 0,
                    width: '100%', height: '100%',
                    background: 'linear-gradient(to right, rgba(0,0,0,0.05) 0%, rgba(15,39,68,0.9) 100%)',
                    display: 'flex',
                  },
                },
              },
            ] : [
              // Fallback when no image is available
              {
                type: 'div',
                props: {
                  style: {
                    width: '780px', height: '630px',
                    background: 'linear-gradient(135deg, #1a4a8a 0%, #0f2744 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  },
                  children: {
                    type: 'div',
                    props: {
                      style: { color: 'rgba(255,255,255,0.25)', fontSize: '120px', display: 'flex' },
                      children: '🏠',
                    },
                  },
                },
              },
            ],
          },
        },

        // ── Right: dark info panel ──────────────────────────────────────────
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0, right: 0,
              width: '460px', height: '630px',
              background: 'linear-gradient(180deg, #0f2744 0%, #1a3a6b 100%)',
              display: 'flex', flexDirection: 'column',
              padding: '36px 36px 28px 36px',
              boxSizing: 'border-box',
            },
            children: [

              // Logo row
              {
                type: 'div',
                props: {
                  style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' },
                  children: [
                    appIconBase64 ? {
                      type: 'img',
                      props: {
                        src: appIconBase64,
                        style: { width: '52px', height: '52px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)' },
                      },
                    } : null,
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex', flexDirection: 'column' },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: { color: '#ffffff', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.3px', display: 'flex' },
                              children: 'USAHUDhomes.com',
                            },
                          },
                          {
                            type: 'div',
                            props: {
                              style: { color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 400, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex' },
                              children: 'HUD Home Listing',
                            },
                          },
                        ],
                      },
                    },
                  ].filter(Boolean),
                },
              },

              // Price
              {
                type: 'div',
                props: {
                  style: { color: '#4ade80', fontSize: '46px', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: '16px', display: 'flex' },
                  children: displayPrice,
                },
              },

              // Address
              {
                type: 'div',
                props: {
                  style: { color: '#ffffff', fontSize: '22px', fontWeight: 700, lineHeight: 1.25, marginBottom: '6px', display: 'flex' },
                  children: displayAddress,
                },
              },

              // City, State
              {
                type: 'div',
                props: {
                  style: { color: 'rgba(255,255,255,0.65)', fontSize: '17px', fontWeight: 400, marginBottom: '28px', display: 'flex' },
                  children: displayLocation,
                },
              },

              // Divider
              {
                type: 'div',
                props: {
                  style: { width: '100%', height: '1px', background: 'rgba(255,255,255,0.15)', marginBottom: '24px', display: 'flex' },
                },
              },

              // Stats row: Beds / Baths / Sq Ft
              {
                type: 'div',
                props: {
                  style: { display: 'flex', gap: '16px', marginBottom: '28px' },
                  children: [
                    // Beds
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 16px', flex: 1 },
                        children: [
                          { type: 'div', props: { style: { color: '#ffffff', fontSize: '26px', fontWeight: 700, lineHeight: 1, display: 'flex' }, children: displayBeds } },
                          { type: 'div', props: { style: { color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px', display: 'flex' }, children: 'Beds' } },
                        ],
                      },
                    },
                    // Baths
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 16px', flex: 1 },
                        children: [
                          { type: 'div', props: { style: { color: '#ffffff', fontSize: '26px', fontWeight: 700, lineHeight: 1, display: 'flex' }, children: displayBaths } },
                          { type: 'div', props: { style: { color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px', display: 'flex' }, children: 'Baths' } },
                        ],
                      },
                    },
                    // Sq Ft (conditional)
                    displaySqft ? {
                      type: 'div',
                      props: {
                        style: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 12px', flex: 1 },
                        children: [
                          { type: 'div', props: { style: { color: '#ffffff', fontSize: '18px', fontWeight: 700, lineHeight: 1, display: 'flex' }, children: displaySqft } },
                          { type: 'div', props: { style: { color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px', display: 'flex' }, children: 'Sq Ft' } },
                        ],
                      },
                    } : null,
                  ].filter(Boolean),
                },
              },

              // Spacer
              { type: 'div', props: { style: { flex: 1, display: 'flex' } } },

              // CTA banner
              {
                type: 'div',
                props: {
                  style: {
                    background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: { color: '#ffffff', fontSize: '13px', fontWeight: 700, letterSpacing: '0.2px', display: 'flex' },
                        children: 'Owner Occupant Incentives  |  $100 Down FHA Loans',
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: { color: 'rgba(255,255,255,0.85)', fontSize: '12px', fontWeight: 400, display: 'flex' },
                        children: '3% Closing Cost Allowance  |  Owner-Occupant Bidding Priority  |  (910) 363-6147',
                      },
                    },
                  ],
                },
              },

            ],
          },
        },

        // ── "HUD HOME" badge (top-left of photo) ────────────────────────────
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: '24px', left: '24px',
              background: '#1d4ed8',
              color: '#ffffff',
              fontSize: '13px', fontWeight: 700,
              letterSpacing: '1.5px', textTransform: 'uppercase',
              padding: '6px 14px', borderRadius: '6px',
              display: 'flex',
            },
            children: 'HUD HOME',
          },
        },

        // ── Case number badge (bottom-left of photo) ─────────────────────────
        caseNumber ? {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: '24px', left: '24px',
              background: 'rgba(0,0,0,0.55)',
              color: 'rgba(255,255,255,0.75)',
              fontSize: '11px', fontWeight: 400,
              padding: '4px 10px', borderRadius: '4px',
              display: 'flex',
            },
            children: `Case #${caseNumber}`,
          },
        } : null,

      ].filter(Boolean),
    },
  };
}

// ── Vercel serverless handler ────────────────────────────────────────────────

export default async function handler(req, res) {
  const { caseNumber } = req.query;

  if (!caseNumber) {
    return res.status(400).send('Missing caseNumber parameter');
  }

  try {
    // Fetch property from Supabase
    const { data: property, error } = await supabase
      .from('properties')
      .select('case_number, address, city, state, price, beds, baths, sq_ft, main_image')
      .eq('case_number', caseNumber)
      .single();

    if (error || !property) {
      return res.status(404).send('Property not found');
    }

    // Resolve property image as a base64 data URI (required by satori for remote images)
    const rawImageUrl = fixImageUrl(property.main_image);
    const imageDataUri = rawImageUrl ? await fetchImageAsDataUri(rawImageUrl) : null;

    // Build the layout element tree
    const element = buildElement({
      address:      property.address,
      city:         property.city,
      state:        property.state,
      price:        property.price,
      beds:         property.beds,
      baths:        property.baths,
      sqft:         property.sq_ft,
      imageDataUri,
      caseNumber:   property.case_number,
    });

    // Render SVG via satori
    const svg = await satori(element, {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: fontRegular, weight: 400, style: 'normal' },
        { name: 'Inter', data: fontBold,    weight: 700, style: 'normal' },
      ],
    });

    // Convert SVG → PNG
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: 1200 },
      font: { loadSystemFonts: false },
    });
    const png = resvg.render().asPng();

    // Respond with the PNG
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Content-Length', png.length);
    return res.status(200).send(Buffer.from(png));

  } catch (err) {
    console.error('[og-image] Generation error:', err);
    return res.status(500).send('Error generating image');
  }
}
