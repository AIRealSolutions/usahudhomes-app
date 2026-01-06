# Agent Onboarding System - Implementation Guide

## Overview

This document provides complete implementation instructions for the Agent Onboarding System that allows real estate agents to register, agree to referral terms, and get approved to receive HUD home leads.

## System Components

### 1. Database Schema
**File:** `database/migration_agent_onboarding.sql`

**New Tables:**
- `agent_applications` - Stores agent registration applications
- `referral_agreements` - Stores signed referral agreements
- `agent_verification_logs` - Audit trail for all verification actions

**Modified Tables:**
- `agents` - Added fields for onboarding tracking

**To Apply:**
```bash
# Run this SQL migration in your Supabase dashboard or via CLI
psql -h your-supabase-host -U postgres -d postgres -f database/migration_agent_onboarding.sql
```

### 2. Frontend Components

#### Registration Flow
- `src/components/agent/AgentRegistration.jsx` - Main multi-step registration form
- `src/components/agent/registration/PersonalInfoStep.jsx` - Step 1: Personal information
- `src/components/agent/registration/BusinessInfoStep.jsx` - Step 2: License and business details
- `src/components/agent/registration/StatesAndSpecialtiesStep.jsx` - Step 3: Territory selection
- `src/components/agent/registration/ReferralAgreementStep.jsx` - Step 4: Agreement signing
- `src/components/agent/registration/ReviewAndSubmitStep.jsx` - Step 5: Review and submit

#### Status Pages
- `src/components/agent/ApplicationSubmitted.jsx` - Success page after submission
- `src/components/agent/VerifyEmail.jsx` - Email verification page

#### Admin Interface
- `src/components/admin/AgentApplicationsAdmin.jsx` - Admin panel for reviewing applications

### 3. Backend Services
- `src/services/agentApplicationService.js` - Complete application workflow service
- `src/data/referralAgreementTemplate.js` - Referral agreement template and data

## Implementation Steps

### Step 1: Database Setup

1. **Apply Database Migration**
   ```sql
   -- In Supabase SQL Editor, run:
   \i database/migration_agent_onboarding.sql
   ```

2. **Verify Tables Created**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('agent_applications', 'referral_agreements', 'agent_verification_logs');
   ```

3. **Set Up Row Level Security (RLS)**
   ```sql
   -- Enable RLS on new tables
   ALTER TABLE agent_applications ENABLE ROW LEVEL SECURITY;
   ALTER TABLE referral_agreements ENABLE ROW LEVEL SECURITY;
   ALTER TABLE agent_verification_logs ENABLE ROW LEVEL SECURITY;

   -- Policy: Admins can view all applications
   CREATE POLICY "Admins can view applications" ON agent_applications
   FOR SELECT USING (
     EXISTS (
       SELECT 1 FROM agents 
       WHERE agents.email = auth.jwt() ->> 'email' 
       AND agents.is_admin = true
     )
   );

   -- Policy: Admins can update applications
   CREATE POLICY "Admins can update applications" ON agent_applications
   FOR UPDATE USING (
     EXISTS (
       SELECT 1 FROM agents 
       WHERE agents.email = auth.jwt() ->> 'email' 
       AND agents.is_admin = true
     )
   );

   -- Policy: Anyone can insert applications (public registration)
   CREATE POLICY "Anyone can submit applications" ON agent_applications
   FOR INSERT WITH CHECK (true);
   ```

### Step 2: Install Required UI Components

The system uses shadcn/ui components. Ensure these are installed:

```bash
# If not already installed, add these components:
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add select
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add label
```

### Step 3: Update Routing

Add these routes to your `src/App.jsx` or routing configuration:

```jsx
import AgentRegistration from './components/agent/AgentRegistration'
import ApplicationSubmitted from './components/agent/ApplicationSubmitted'
import VerifyEmail from './components/agent/VerifyEmail'
import AgentApplicationsAdmin from './components/admin/AgentApplicationsAdmin'

// Add these routes:
<Route path="/agent/register" element={<AgentRegistration />} />
<Route path="/agent/application-submitted" element={<ApplicationSubmitted />} />
<Route path="/agent/verify-email" element={<VerifyEmail />} />

// In admin dashboard routes:
<Route path="/admin/agent-applications" element={<AgentApplicationsAdmin />} />
```

### Step 4: Update Database Service Exports

Update `src/services/database/index.js` to export the new service:

```javascript
export { agentApplicationService } from '../agentApplicationService'
```

### Step 5: Configure Email Service

The system sends emails for:
- Email verification
- Application approval
- Application rejection

Ensure your `src/services/emailService.js` has a working `sendEmail` function:

```javascript
export async function sendEmail({ to, subject, html }) {
  // Your email implementation (SendGrid, AWS SES, etc.)
  // Example with SendGrid:
  const sgMail = require('@sendgrid/mail')
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  
  await sgMail.send({
    to,
    from: 'noreply@usahudhomes.com',
    subject,
    html
  })
}
```

### Step 6: Add Navigation Links

Add a "Become a Partner" link to your main navigation:

```jsx
<Link to="/agent/register">
  <Button>Become a Lead Partner</Button>
</Link>
```

Add "Agent Applications" to admin dashboard navigation:

```jsx
{user.isAdmin && (
  <Link to="/admin/agent-applications">
    <Button variant="ghost">
      <FileText className="w-4 h-4 mr-2" />
      Agent Applications
    </Button>
  </Link>
)}
```

### Step 7: Environment Variables

Add these environment variables if using external services:

```env
# Email Service (if using SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key

# Or if using SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Application URL (for email links)
VITE_APP_URL=https://usahudhomes.com
```

## Testing the System

### 1. Test Agent Registration

1. Navigate to `/agent/register`
2. Fill out all 5 steps:
   - Personal Info
   - Business Details
   - States & Specialties
   - Referral Agreement
   - Review & Submit
3. Verify you receive success page
4. Check email for verification link

### 2. Test Email Verification

1. Click verification link from email
2. Should see success page
3. Application status should change to "under_review"

### 3. Test Admin Approval

1. Log in as admin
2. Navigate to `/admin/agent-applications`
3. View pending applications
4. Click "View" to see details
5. Click "Approve" or "Reject"
6. Verify applicant receives email notification

### 4. Test Broker Dashboard Access

1. After approval, agent should receive login credentials
2. Agent logs in
3. Should have access to broker dashboard at `/broker-dashboard`
4. Can view and manage leads

## Customization

### Modify Referral Fee Percentage

Edit `src/data/referralAgreementTemplate.js`:

```javascript
export const DEFAULT_REFERRAL_FEE = 25.00 // Change to your desired percentage
```

### Customize Agreement Text

Edit the `getReferralAgreementText()` function in `src/data/referralAgreementTemplate.js` to modify legal terms.

### Add/Remove States

Edit the `US_STATES` array in `src/data/referralAgreementTemplate.js`.

### Add/Remove Specialties

Edit the `AGENT_SPECIALTIES` array in `src/data/referralAgreementTemplate.js`.

## Security Considerations

1. **Email Verification**: Tokens expire after 24 hours
2. **Admin Only**: Only admins can approve/reject applications
3. **Audit Trail**: All actions are logged in `agent_verification_logs`
4. **RESPA Compliance**: Referral agreement includes RESPA compliance language
5. **Data Privacy**: Personal information is encrypted in transit and at rest

## Troubleshooting

### Email Verification Not Working

- Check email service configuration
- Verify SMTP credentials or API keys
- Check spam folder
- Ensure verification link hasn't expired (24 hours)

### Applications Not Appearing in Admin Panel

- Verify RLS policies are correctly set
- Check user has `is_admin = true` in agents table
- Verify database connection

### Agent Can't Access Broker Dashboard After Approval

- Verify agent record was created in `agents` table
- Check `onboarding_completed = true`
- Verify authentication service recognizes agent role

## Support

For issues or questions:
- Email: support@usahudhomes.com
- Phone: (910) 363-6147

## Version History

- **v1.0** (January 2026) - Initial release
  - Multi-step registration form
  - Email verification
  - Admin approval workflow
  - Referral agreement signing
  - Complete audit trail
