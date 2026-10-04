// Supabase Edge Function: Facebook Lead Ads Webhook
// Handles GET requests for webhook verification and POST requests
// to receive real-time lead notifications from Facebook Lead Ads.
// Fetches lead details from the Facebook Graph API and saves them
// to the 'consultations' and 'customer_events' tables in Supabase.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Securely load secrets from environment variables
const FACEBOOK_PAGE_ACCESS_TOKEN = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN")!;
const VERIFY_TOKEN = Deno.env.get("FACEBOOK_VERIFY_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// CORS headers for preflight requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Main request handler
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // =========================================================
  // GET: Facebook Webhook Verification
  // =========================================================
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified successfully!");
      return new Response(challenge, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    } else {
      console.error("Webhook verification failed. Token mismatch.");
      return new Response("Verify token mismatch", {
        status: 403,
        headers: corsHeaders,
      });
    }
  }

  // =========================================================
  // POST: Receive Lead Notifications from Facebook
  // =========================================================
  if (req.method === "POST") {
    try {
      const body = await req.json();

      if (!body.entry) {
        console.error("Invalid POST data received:", JSON.stringify(body));
        return new Response(
          JSON.stringify({ error: "Invalid payload: missing entry" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Process each lead notification
      const results: Array<{ leadId: string; status: string; error?: string }> = [];

      for (const entry of body.entry) {
        if (!entry.changes) continue;

        for (const change of entry.changes) {
          if (change.field === "leadgen") {
            const leadgenId = change.value?.leadgen_id;
            if (leadgenId) {
              const result = await processNewLead(leadgenId, change.value);
              results.push(result);
            }
          }
        }
      }

      console.log(`Processed ${results.length} lead(s):`, JSON.stringify(results));

      return new Response(
        JSON.stringify({ success: true, processed: results.length, results }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error processing webhook POST:", error.message);
      return new Response(
        JSON.stringify({ error: "Internal Server Error", message: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  // All other methods
  return new Response("Method not allowed", {
    status: 405,
    headers: corsHeaders,
  });
});

// =========================================================
// Process a single lead: fetch from Graph API, save to DB
// =========================================================
async function processNewLead(
  leadId: string,
  webhookValue?: Record<string, unknown>
): Promise<{ leadId: string; status: string; error?: string }> {
  console.log(`Processing new lead: ${leadId}`);

  try {
    // Fetch full lead data from Facebook Graph API
    const graphResponse = await fetch(
      `https://graph.facebook.com/v21.0/${leadId}/?access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
    );
    const leadData = await graphResponse.json();

    if (leadData.error) {
      const errMsg = `Graph API error: ${leadData.error.message}`;
      console.error(errMsg);
      return { leadId, status: "error", error: errMsg };
    }

    if (!leadData.field_data) {
      const errMsg = `No field_data in Graph API response: ${JSON.stringify(leadData)}`;
      console.error(errMsg);
      return { leadId, status: "error", error: errMsg };
    }

    // Transform field_data array into a key-value map
    const fields: Record<string, string> = {};
    for (const field of leadData.field_data) {
      fields[field.name] = field.values?.[0] ?? "";
    }

    console.log(`Lead fields:`, JSON.stringify(fields));

    // Initialize Supabase client with service role key (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // -------------------------------------------------------
    // Parse name
    // -------------------------------------------------------
    const fullName = fields.full_name || "";
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || fields.first_name || "";
    const lastName =
      nameParts.length > 1
        ? nameParts.slice(1).join(" ")
        : fields.last_name || "";

    // -------------------------------------------------------
    // Parse budget (handles formats like "$100,000 - $200,000")
    // -------------------------------------------------------
    const budgetRaw =
      fields["purchase_price_range?"] ||
      fields["Purchase Price Range?"] ||
      fields.budget ||
      "";
    const budget = parseBudget(budgetRaw);

    // -------------------------------------------------------
    // Parse location
    // -------------------------------------------------------
    const locationRaw =
      fields["areas_of_interest?"] ||
      fields["Areas of Interest?"] ||
      fields.city ||
      "";
    const location = parseLocation(locationRaw);

    // -------------------------------------------------------
    // Parse timeline
    // -------------------------------------------------------
    const timelineRaw =
      fields["time_frame_to_buy?"] ||
      fields["Time frame to buy?"] ||
      fields.timeline ||
      "";
    const timeline = parseTimeline(timelineRaw);

    // -------------------------------------------------------
    // Calculate priority
    // -------------------------------------------------------
    const priority = calculatePriority(timeline, budget.min);

    // -------------------------------------------------------
    // Clean contact info
    // -------------------------------------------------------
    const email = (fields.email || "").trim().toLowerCase();
    const phone = cleanPhoneNumber(fields.phone_number || fields.phone || "");

    // -------------------------------------------------------
    // Check for duplicate leads by email or phone
    // -------------------------------------------------------
    if (email || phone) {
      let duplicateQuery = supabase
        .from("consultations")
        .select("id, email, phone")
        .eq("source", "facebook_lead_ad_api");

      if (email && phone) {
        duplicateQuery = duplicateQuery.or(`email.eq.${email},phone.eq.${phone}`);
      } else if (email) {
        duplicateQuery = duplicateQuery.eq("email", email);
      } else {
        duplicateQuery = duplicateQuery.eq("phone", phone);
      }

      const { data: existing } = await duplicateQuery.limit(1);

      if (existing && existing.length > 0) {
        console.log(`Duplicate lead detected (existing ID: ${existing[0].id}). Skipping.`);
        return { leadId, status: "skipped_duplicate" };
      }
    }

    // -------------------------------------------------------
    // Build notes string with all original data
    // -------------------------------------------------------
    const noteParts: string[] = [];
    if (budgetRaw) noteParts.push(`Budget: ${budgetRaw}`);
    if (locationRaw) noteParts.push(`Location: ${locationRaw}`);
    if (timelineRaw) noteParts.push(`Timeline: ${timelineRaw}`);
    noteParts.push("Source: Facebook Lead Ad (Real-time API)");
    if (fields.campaign_name) noteParts.push(`Campaign: ${fields.campaign_name}`);
    const notes = noteParts.join("\n");

    // -------------------------------------------------------
    // Insert into consultations table
    // -------------------------------------------------------
    const consultationData = {
      customer_id: null,
      first_name: firstName,
      last_name: lastName,
      customer_name: `${firstName} ${lastName}`.trim(),
      email: email || null,
      customer_email: email || null,
      phone: phone || null,
      customer_phone: phone || null,
      budget_min: budget.min,
      budget_max: budget.max,
      preferred_location: location.city || null,
      state: location.state || null,
      timeline: timeline || null,
      notes: notes,
      source: "facebook_lead_ad_api",
      source_details: {
        leadgen_id: leadId,
        ad_id: leadData.ad_id || webhookValue?.ad_id || null,
        form_id: leadData.form_id || webhookValue?.form_id || null,
        page_id: webhookValue?.page_id || null,
        adgroup_id: webhookValue?.adgroup_id || null,
        created_time: leadData.created_time || webhookValue?.created_time || null,
        platform: leadData.platform || "fb",
        raw_fields: fields,
      },
      status: "new",
      priority: priority,
      consultation_type: "property_inquiry",
      consultation_date: new Date().toISOString(),
    };

    const { data: insertedData, error: insertError } = await supabase
      .from("consultations")
      .insert(consultationData)
      .select()
      .single();

    if (insertError) {
      const errMsg = `Error saving to consultations: ${insertError.message}`;
      console.error(errMsg);
      return { leadId, status: "error", error: errMsg };
    }

    console.log(`Lead saved to consultations: ${insertedData.id}`);

    // -------------------------------------------------------
    // Create automatic event in customer_events table
    // -------------------------------------------------------
    const eventContent = `Lead imported from Facebook Lead Ad (Real-time API).\n\nDetails:\n${Object.entries(fields)
      .map(([key, value]) => `  ${key}: ${value}`)
      .join("\n")}`;

    const { error: eventError } = await supabase
      .from("customer_events")
      .insert({
        customer_id: insertedData.customer_id,
        consultation_id: insertedData.id,
        event_type: "facebook_lead_imported",
        event_category: "onboarding",
        event_title: "Facebook Lead Imported (Real-time)",
        event_description: eventContent,
        event_data: {
          leadgen_id: leadId,
          ad_id: leadData.ad_id || null,
          form_id: leadData.form_id || null,
          platform: leadData.platform || "fb",
          created_time: leadData.created_time || null,
          original_data: {
            full_name: `${firstName} ${lastName}`.trim(),
            email: email,
            phone: phone,
            raw_budget: budgetRaw,
            raw_location: locationRaw,
            raw_timeline: timelineRaw,
          },
          parsed_data: {
            budget_min: budget.min,
            budget_max: budget.max,
            preferred_location: location.city,
            state: location.state,
            timeline: timeline,
            priority: priority,
          },
        },
        source: "system",
      });

    if (eventError) {
      console.error(`Error creating customer_event: ${eventError.message}`);
      // Non-fatal - the lead was already saved
    } else {
      console.log(`Event logged for consultation ${insertedData.id}`);
    }

    return { leadId, status: "success" };
  } catch (error) {
    console.error(`Failed to process lead ${leadId}:`, error.message);
    return { leadId, status: "error", error: error.message };
  }
}

// =========================================================
// Helper Functions
// =========================================================

function cleanPhoneNumber(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/^p:/, "");
  cleaned = cleaned.replace(/[^\d+]/g, "");
  if (cleaned && !cleaned.startsWith("+")) {
    cleaned = "+1" + cleaned;
  }
  return cleaned;
}

function parseBudget(budgetStr: string): { min: number | null; max: number | null } {
  if (!budgetStr) return { min: null, max: null };
  const cleaned = budgetStr.replace(/[",]/g, "").trim();
  if (/^(no|yes|don'?t know|any|n\/a)$/i.test(cleaned)) {
    return { min: null, max: null };
  }
  const numbers = cleaned.match(/\d+/g);
  if (!numbers || numbers.length === 0) return { min: null, max: null };
  const values = numbers.map((n) => parseInt(n, 10));
  if (values.length >= 2) {
    return { min: Math.min(...values), max: Math.max(...values) };
  }
  return { min: values[0], max: values[0] };
}

function parseLocation(locationStr: string): { city: string; state: string } {
  if (!locationStr) return { city: "", state: "" };
  const cleaned = locationStr.replace(/"/g, "").trim();
  if (/^any$/i.test(cleaned)) return { city: "", state: "" };
  const stateMatch = cleaned.match(/\b([A-Z]{2})\b/i);
  const state = stateMatch ? stateMatch[1].toUpperCase() : "";
  let city = cleaned;
  if (state) {
    city = cleaned.replace(new RegExp(`\\s*${state}\\s*$`, "i"), "").trim();
  }
  return { city, state };
}

function parseTimeline(timelineStr: string): string {
  if (!timelineStr) return "";
  const cleaned = timelineStr.replace(/"/g, "").trim().toLowerCase();
  if (/asap|immediately|now/i.test(cleaned)) return "ASAP";
  if (/1\s*-?\s*3\s*month/i.test(cleaned)) return "1-3 months";
  if (/3\s*-?\s*6\s*month/i.test(cleaned)) return "3-6 months";
  if (/6\s*month/i.test(cleaned)) return "6 months";
  if (/1\s*year/i.test(cleaned)) return "1 year";
  if (/60\s*day/i.test(cleaned)) return "60 days";
  return cleaned;
}

function calculatePriority(timeline: string, budgetMin: number | null): string {
  const tl = (timeline || "").toLowerCase();
  if (tl.includes("asap") || tl.includes("immediately")) return "high";
  if (budgetMin && budgetMin >= 200000) return "high";
  if (tl.includes("1") || tl.includes("60 day")) return "medium";
  if (tl.includes("6 month") || tl.includes("year")) return "low";
  return "medium";
}
