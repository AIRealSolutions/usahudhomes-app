/**
 * Nightly Closure Detection Job
 *
 * Endpoint: /api/cron/check-closures
 * Trigger: Vercel Cron (daily at 2 AM UTC)
 * Purpose: Auto-close properties that haven't been seen for 90+ days
 *          (unless they have active CRM engagement)
 *
 * Configuration in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/check-closures",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Verify this is called by Vercel Cron
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Simple auth: check Vercel's cron header (optional but recommended)
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    console.log('🌙 Starting nightly closure detection job...')

    // Initialize Supabase with service key (admin access)
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in environment')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Call the auto_close_stale_properties() function
    const { data: closedProperties, error } = await supabase.rpc('auto_close_stale_properties')

    if (error) {
      console.error('❌ Error running closure detection:', error)
      throw error
    }

    const closureCount = closedProperties?.length || 0
    console.log(`✅ Closure detection complete: ${closureCount} properties closed`)

    // Log closure details
    if (closureCount > 0) {
      console.log('\n📋 Properties Closed:')
      closedProperties.forEach(p => {
        console.log(`   - ${p.case_number}: ${p.reason}`)
      })

      // Send notification email/Slack about closures
      await notifyClosures(closedProperties)
    }

    // Get summary stats
    const { count: activeCount } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    const { count: atRiskCount } = await supabase
      .from('properties_at_risk_of_closure')
      .select('*', { count: 'exact', head: true })

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      closureCount,
      activeProperties: activeCount,
      atRiskProperties: atRiskCount,
      closedProperties: closedProperties || []
    })
  } catch (error) {
    console.error('❌ Closure detection job failed:', error.message)

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

/**
 * Send notifications about closed properties
 * (Email to Marc, Slack alert, etc.)
 */
async function notifyClosures(closedProperties) {
  try {
    // Example: Send email notification
    if (process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL) {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      const propertyList = closedProperties
        .map(p => `• ${p.case_number}: ${p.address || 'No address'}`)
        .join('\n')

      await resend.emails.send({
        from: 'noreply@usahudhomes.com',
        to: process.env.NOTIFY_EMAIL,
        subject: `[USAHUDhomes] ${closedProperties.length} Properties Auto-Closed`,
        html: `
          <h2>Nightly Closure Detection Report</h2>
          <p>The following properties were auto-closed after 90+ days with no CRM engagement:</p>
          <pre>${propertyList}</pre>
          <p>Time: ${new Date().toISOString()}</p>
          <p>Review at: <a href="https://www.usahudhomes.com">USAHUDhomes.com</a></p>
        `
      })
    }

    // Example: Send to Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      const message = {
        text: `🚨 ${closedProperties.length} properties auto-closed (90+ day no-contact)`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Property Closure Report*\n${closedProperties.length} properties closed after 90+ days of inactivity\n\nTime: <!date^${Math.floor(Date.now() / 1000)}^{date_pretty} at {time_secs}|${new Date().toISOString()}>`
            }
          },
          ...closedProperties.slice(0, 5).map(p => ({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `• *${p.case_number}*`
            }
          }))
        ]
      }

      if (closedProperties.length > 5) {
        message.blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `... and ${closedProperties.length - 5} more`
          }
        })
      }

      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      })
    }
  } catch (err) {
    console.warn('⚠️  Notification sending failed:', err.message)
    // Don't throw - job succeeded, just notification failed
  }
}

/**
 * Manual Testing:
 *
 * curl -X POST https://www.usahudhomes.com/api/cron/check-closures \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET" \
 *   -H "Content-Type: application/json"
 */
