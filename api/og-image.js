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

// ── App icon embedded as base64 data URI (avoids filesystem path issues on Vercel) ───
const appIconBase64 = 'data:image/png;base64,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';

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
