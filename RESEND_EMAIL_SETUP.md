# Resend Email Integration Setup

This document explains how to configure Resend for sending agent onboarding emails.

## Overview

The agent onboarding system uses **Resend** (resend.com) to send transactional emails:
- ✅ Email verification links
- 🎉 Approval notifications
- ❌ Rejection notifications
- 🔄 Resend verification emails

## Architecture

```
Frontend (emailService.js)
    ↓
Vercel Serverless Function (/api/send-agent-email.js)
    ↓
Resend API (api.resend.com)
    ↓
Recipient's Email
```

## Setup Instructions

### 1. Get Your Resend API Key

1. Go to [resend.com](https://resend.com)
2. Sign up or log in to your account
3. Navigate to **API Keys** in the dashboard
4. Click **Create API Key**
5. Give it a name (e.g., "USA HUD Homes Production")
6. Copy the API key (starts with `re_`)

### 2. Add Domain to Resend

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain: `usahudhomes.com`
4. Follow the DNS verification steps:
   - Add the provided DNS records to your domain
   - Wait for verification (usually 5-10 minutes)
5. Once verified, you can send from `@usahudhomes.com`

### 3. Configure Environment Variables

#### For Local Development:

Create a `.env.local` file in the project root:

```bash
# Resend API Key
RESEND_API_KEY=re_your_actual_api_key_here

# Other environment variables...
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

#### For Vercel Production:

1. Go to your Vercel dashboard
2. Select your project (usahudhomes-app)
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name:** `RESEND_API_KEY`
   - **Value:** `re_your_actual_api_key_here`
   - **Environment:** Production, Preview, Development (select all)
5. Click **Save**
6. Redeploy your application

### 4. Update Email Addresses

The system uses these email addresses:

**From Address:** `noreply@usahudhomes.com`
- This is the sender address for all agent emails
- Must be verified in Resend

**Reply-To Address:** `marcspencer28461@gmail.com`
- Recipients can reply to this address
- No verification needed

To change these, edit `/api/send-agent-email.js`:

```javascript
const FROM_EMAIL = 'noreply@usahudhomes.com'  // Change this
const REPLY_TO_EMAIL = 'marcspencer28461@gmail.com'  // Change this
```

## Testing

### Test in Development

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to `/agent/register` and submit a test application

3. Check the browser console for email logs

4. Check Resend dashboard → **Logs** to see sent emails

### Test Email Types

#### 1. Verification Email
- Submit a new agent application
- Check the email sent to the applicant

#### 2. Resend Verification
- Go to `/agent/resend-verification`
- Enter the email from step 1
- Check for new verification email

#### 3. Approval Email
- Log in as admin
- Go to Admin Dashboard → Agent Applications
- Approve an application
- Check the approval email

#### 4. Rejection Email
- Reject an application with a reason
- Check the rejection email

## Email Templates

All email templates are in `/src/services/emailService.js`:

- `generateAgentVerificationEmailHTML()` - Verification email
- `generateAgentApprovalEmailHTML()` - Approval email
- `generateAgentRejectionEmailHTML()` - Rejection email

Each template includes:
- ✅ Professional HTML design
- 📱 Mobile-responsive layout
- 🎨 USA HUD Homes branding
- 📝 Plain text fallback

## Troubleshooting

### Email Not Sending

**Check 1: API Key**
```bash
# In Vercel dashboard, verify RESEND_API_KEY is set
# Should start with "re_"
```

**Check 2: Domain Verification**
- Go to Resend dashboard → Domains
- Ensure `usahudhomes.com` shows as "Verified"
- If not, check DNS records

**Check 3: Serverless Function Logs**
- Go to Vercel dashboard → Deployments
- Click on latest deployment → Functions
- Check `/api/send-agent-email` logs for errors

**Check 4: Resend Logs**
- Go to Resend dashboard → Logs
- Check for failed email attempts
- Look for error messages

### Common Errors

#### "Email service not configured"
- RESEND_API_KEY is not set in environment variables
- Solution: Add it in Vercel settings and redeploy

#### "Domain not verified"
- Sending from unverified domain
- Solution: Verify domain in Resend dashboard

#### "Invalid API key"
- API key is incorrect or expired
- Solution: Generate new API key in Resend

#### "Rate limit exceeded"
- Sending too many emails too quickly
- Solution: Resend free tier has limits, upgrade if needed

## Rate Limits

**Resend Free Tier:**
- 100 emails/day
- 3,000 emails/month

**Resend Pro Tier ($20/month):**
- 50,000 emails/month
- No daily limit

For production use with many agents, consider upgrading to Pro.

## Email Deliverability

To improve email deliverability:

1. **SPF Record:** Add to DNS
   ```
   v=spf1 include:_spf.resend.com ~all
   ```

2. **DKIM:** Automatically configured by Resend

3. **DMARC:** Add to DNS (optional)
   ```
   v=DMARC1; p=none; rua=mailto:marcspencer28461@gmail.com
   ```

4. **Warm Up Domain:** Start with low volume, gradually increase

## Monitoring

### Resend Dashboard
- View sent emails
- Check delivery status
- Monitor bounce/complaint rates
- View click/open rates (if tracking enabled)

### Application Logs
- Emails are logged to localStorage for debugging
- Check browser console for email sending logs
- Vercel function logs show server-side errors

## Support

**Resend Support:**
- Documentation: https://resend.com/docs
- Support: support@resend.com

**Application Support:**
- Marc Spencer: (910) 363-6147
- Email: marcspencer28461@gmail.com

## Security Notes

⚠️ **Never commit `.env` or `.env.local` files to Git**

✅ **Always use environment variables for API keys**

✅ **Rotate API keys periodically**

✅ **Use different API keys for development and production**

---

## Quick Reference

### Files Modified
- `/api/send-agent-email.js` - Serverless function for sending emails
- `/src/services/emailService.js` - Email service with templates
- `/src/services/agentApplicationService.js` - Application workflow

### Environment Variables
- `RESEND_API_KEY` - Your Resend API key (required)

### Email Addresses
- From: `noreply@usahudhomes.com`
- Reply-To: `marcspencer28461@gmail.com`

### API Endpoint
- `/api/send-agent-email` - POST endpoint for sending emails

---

**Last Updated:** January 6, 2026
