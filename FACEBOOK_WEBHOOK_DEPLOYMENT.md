# Facebook Lead Ads Webhook — Supabase Edge Function Deployment Guide

**Date:** February 15, 2026

This document provides step-by-step instructions for deploying the `facebook-webhook` Supabase Edge Function, which enables real-time capture of leads from Facebook Lead Ads into the `consultations` table.

## Overview

The Edge Function handles two types of requests:

| Request Type | Purpose |
|:---|:---|
| **GET** | Facebook webhook verification handshake — responds with the `hub.challenge` value when the verify token matches |
| **POST** | Receives real-time lead notifications, fetches full lead details from the Facebook Graph API, and saves them to the `consultations` and `customer_events` tables |

The function is located at `supabase/functions/facebook-webhook/index.ts`.

## Prerequisites

Before deploying, ensure you have the following:

1. **Supabase CLI** installed — run `npm install -g supabase` or follow the [official installation guide](https://supabase.com/docs/guides/cli/getting-started).
2. **Supabase access token** — generate one at [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens).
3. **Facebook Page Access Token** — a never-expiring Page Access Token with `leads_retrieval`, `pages_manage_ads`, and `pages_read_engagement` permissions.
4. The `migration_add_lead_fields.sql` migration must already be applied to your database (adds `first_name`, `last_name`, `email`, `phone`, `source`, `source_details`, etc. to the `consultations` table).

## Step 1: Link Your Supabase Project

```bash
supabase login
supabase link --project-ref lpqjndfjbenolhneqzec
```

## Step 2: Set Secrets (Environment Variables)

The Edge Function requires the following secrets. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available to Edge Functions, so you only need to set the Facebook-specific secrets:

```bash
supabase secrets set FACEBOOK_VERIFY_TOKEN=ZVhCybXeHsDHcpOZx4pyPDpMbWFJ52XtGwa5xp43Qug

supabase secrets set FACEBOOK_PAGE_ACCESS_TOKEN=EAAcUsVX7CPsBQrVgic6s3ZCGtGaG3sLoWb1F6HLRuvZCk0YTGZC0CaHWRZCScd6tojm8OytjxvjV3Y9cIzzWZC8bY9oSk2yUlA61NJGFCQac8wNHej0lzjEnZBv25ZBIHJUgtFtpdKPZBhkSlwntweZBhLtSRq0P6yXFt15ne7512RPrWzcObxEVWpS90ZClkH1ux05AZDZD
```

> **Important:** If you need to rotate the Facebook Page Access Token later, simply run the `supabase secrets set` command again with the new value.

## Step 3: Deploy the Edge Function

```bash
supabase functions deploy facebook-webhook --no-verify-jwt
```

The `--no-verify-jwt` flag is required because Facebook sends webhook requests without a Supabase JWT. The function implements its own authentication via the verify token.

After deployment, the function URL will be:

```
https://lpqjndfjbenolhneqzec.supabase.co/functions/v1/facebook-webhook
```

## Step 4: Configure the Webhook in Facebook

1. Go to your [Facebook App Dashboard](https://developers.facebook.com/apps/) and select your app.
2. Navigate to **Webhooks** in the left sidebar.
3. Select **Page** and click **Subscribe to this object**.
4. Enter the following values:

| Field | Value |
|:---|:---|
| **Callback URL** | `https://lpqjndfjbenolhneqzec.supabase.co/functions/v1/facebook-webhook` |
| **Verify Token** | `ZVhCybXeHsDHcpOZx4pyPDpMbWFJ52XtGwa5xp43Qug` |

5. Subscribe to the **`leadgen`** field.
6. Click **Verify and Save**.

## Step 5: Subscribe Your Facebook Page

Make a POST request to subscribe your Page to leadgen events:

```bash
curl -X POST "https://graph.facebook.com/v21.0/{YOUR_PAGE_ID}/subscribed_apps?subscribed_fields=leadgen&access_token={YOUR_PAGE_ACCESS_TOKEN}"
```

Replace `{YOUR_PAGE_ID}` with your Facebook Page ID and `{YOUR_PAGE_ACCESS_TOKEN}` with the token set in Step 2.

## Step 6: Test the Integration

1. Go to the [Facebook Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing/).
2. Select your Page and a Lead Form.
3. Click **Create Lead** to generate a test lead.
4. Check the Supabase Edge Function logs:

```bash
supabase functions logs facebook-webhook
```

5. Verify the lead appears in the `consultations` table in the Supabase Dashboard.

## How the Function Works

The function follows this processing pipeline for each incoming lead:

1. **Receive notification** — Facebook sends a POST with the `leadgen_id`.
2. **Fetch lead details** — The function calls the Graph API (`GET /v21.0/{leadgen_id}/`) to retrieve the full lead data including all form fields.
3. **Parse and transform** — Contact info, budget, location, and timeline are parsed from the raw field data using the same logic as the existing CSV import service.
4. **Duplicate check** — The function checks for existing leads with the same email or phone in the `consultations` table (filtered by `source = 'facebook_lead_ad_api'`).
5. **Save to database** — The lead is inserted into the `consultations` table with `source = 'facebook_lead_ad_api'` (distinguishing it from CSV imports which use `facebook_lead_ad`).
6. **Log event** — An automatic event is created in the `customer_events` table with all original lead data for audit purposes.

## Database Fields Populated

The following fields are populated in the `consultations` table:

| Field | Source |
|:---|:---|
| `first_name`, `last_name` | Parsed from `full_name` field |
| `customer_name` | Combined first + last name |
| `email`, `customer_email` | From `email` field |
| `phone`, `customer_phone` | From `phone_number` field (cleaned) |
| `budget_min`, `budget_max` | Parsed from budget/price range field |
| `preferred_location` | Parsed from areas of interest field |
| `state` | Extracted 2-letter state code |
| `timeline` | Normalized timeline value |
| `priority` | Auto-calculated (high/medium/low) |
| `source` | `facebook_lead_ad_api` |
| `source_details` | Full JSON with leadgen_id, ad_id, form_id, raw fields |
| `status` | `new` |
| `consultation_type` | `property_inquiry` |

## Troubleshooting

**Webhook verification fails:** Ensure the `FACEBOOK_VERIFY_TOKEN` secret matches exactly what you entered in the Facebook App Dashboard. Check for trailing spaces or newlines.

**Leads not appearing:** Check the Edge Function logs with `supabase functions logs facebook-webhook`. Common issues include an expired or invalid Facebook Page Access Token, or missing Graph API permissions.

**Duplicate leads skipped:** The function checks for duplicates by email and phone within `source = 'facebook_lead_ad_api'` entries. If a lead was previously imported via CSV (`source = 'facebook_lead_ad'`), it will not be detected as a duplicate.

**Graph API errors:** Ensure your Facebook App has the `leads_retrieval` permission approved. Test leads created via the Lead Ads Testing Tool should work even during the app review process.
