# Lead Onboarding Workflow

## Overview

This document defines the complete workflow for processing leads from initial contact through to binding broker referrals.

## Critical Requirements

1. **Leads are NOT customers** - They must complete onboarding first
2. **Consent is mandatory** - Customers must explicitly opt-in and agree to work with agents
3. **Buyer Agency Agreement required** - Legal agreement must be signed before referral
4. **Binding referrals** - Once assigned, agents are committed to the customer
5. **Video-based opt-in** - Initial request includes explanatory video

## Complete Workflow

### Stage 1: Lead Capture
**Sources:**
- Website contact form
- Property inquiry forms
- Facebook Lead Ads
- Manual entry by admin

**Data Collected:**
- Name, email, phone
- State/location preferences
- Budget range (optional)
- Timeline (optional)
- Property interest (if specific)

**Status:** `new_lead`

**Storage:** `leads` table

---

### Stage 2: Admin Review & Communication
**Trigger:** New lead appears in admin dashboard

**Admin Dashboard Shows:**
- All new leads with status badges
- Lead source (website, property inquiry, Facebook)
- Basic contact info preview
- "View Details" button for each lead

**Lead Details Page Includes:**

**Lead Information Section:**
- Full name, email, phone, state
- Property interest (if specific)
- Budget range, timeline
- Source and received date
- Current status badge

**Communication Tools:**
- 📞 **Call** button - Click to dial (opens phone app with number)
- 💬 **Text/SMS** button - Opens SMS composer
- ✉️ **Email** button - Opens email composer
- All communication creates event log entry

**Preset Email Templates:**
- "Send Opt-In Request" (with video)
- "Request More Information"
- "Schedule Phone Call"
- "Property Recommendations"
- Custom email option

**Event Timeline:**
- Lead received (timestamp)
- All communications (calls, texts, emails)
- Status changes
- Notes added by admin

**Quick Actions:**
- Add note
- Change status
- Send preset email
- Archive lead

**Admin Actions:**
1. Reviews lead information
2. Can call, text, or email directly from page
3. All communications are logged automatically
4. When ready, clicks "Send Opt-In Request" to send onboarding email

**Status:** `under_review` → `opt_in_sent` (when email sent)

---

### Stage 3: Opt-In Request Email
**Trigger:** Admin clicks "Send Opt-In Request" on lead details page

**Process:**
1. Admin clicks "Send Opt-In Request" on lead
2. System sends email with:
   - Welcome message
   - **Video explaining the process** (HUD home buying process, Lightkeeper Realty services)
   - Link to opt-in page
   - What to expect next

**Video Content:**
- Introduction to HUD homes
- Benefits of working with registered buyer's agent
- Overview of Lightkeeper Realty services
- The onboarding process explained
- What consent means
- Call to action: "Start Your Journey"

**Status:** `opt_in_sent`

**Tracking:**
- Opt-in email sent timestamp
- Email open tracking (if available)
- Video view tracking (if available)

---

### Stage 4: Customer Opt-In
**Trigger:** Lead clicks link in opt-in email

**Opt-In Page Includes:**
- Video embedded at top
- Brief text explanation
- "Yes, I want to work with USAHUDhomes.com and Lightkeeper Realty" button
- Privacy policy and terms links
- Option to decline

**If Accepted:**
- Status changes to `opted_in`
- Timestamp recorded
- Redirects to onboarding form

**If Declined:**
- Status changes to `opted_out`
- Lead is archived
- Optional: Ask for reason

---

### Stage 5: Customer Onboarding
**Trigger:** Lead opts in and is redirected to onboarding

**Onboarding Form Collects:**

**Personal Information:**
- Full legal name (as it appears on ID)
- Date of birth
- Current address
- Email (pre-filled)
- Phone (pre-filled)

**Property Preferences:**
- Preferred states (multi-select)
- Preferred cities/counties
- Budget range (required)
- Number of bedrooms/bathrooms
- Property type preferences
- Must-have features
- Timeline for purchase

**Financial Information:**
- Pre-qualification status
- Lender information (if pre-qualified)
- First-time homebuyer? (Yes/No)
- Will you need financing? (Yes/No/Not sure)

**Consent & Agreements:**
1. **Data Sharing Consent**
   - "I consent to USAHUDhomes.com sharing my information with licensed real estate agents"
   - Checkbox + timestamp

2. **Communication Consent**
   - "I consent to being contacted by phone, email, and text by Lightkeeper Realty and assigned agents"
   - Checkbox + timestamp

3. **Buyer Agency Agreement** (Digital signature required)
   - Full agreement text displayed
   - "I have read and agree to the Buyer Agency Agreement"
   - Digital signature field
   - Date field (auto-filled)
   - IP address captured
   - Timestamp recorded

**Status after completion:** `onboarded`

**Storage:** Creates record in `customers` table with all onboarding data

---

### Stage 6: Admin Review & Referral Creation
**Trigger:** Customer completes onboarding

**Admin Dashboard Shows:**
- New onboarded customers awaiting referral
- All onboarding data visible
- Consent timestamps
- Signed buyer agency agreement

**Admin Actions:**
1. Reviews customer information
2. Verifies all consents are in place
3. Creates referral by clicking "Create Referral"
4. System creates record in `referrals` table with:
   - Link to customer record
   - All customer preferences
   - Consent verification flags
   - Ready for broker assignment

**Status:** `referral_created`

---

### Stage 7: Broker Assignment
**Trigger:** Admin assigns referral to broker

**Requirements:**
- Customer must be fully onboarded
- All consents must be signed
- Buyer agency agreement must be signed

**Process:**
1. Admin selects broker licensed in customer's preferred state
2. System verifies broker qualifications
3. Referral is assigned
4. Broker receives notification with:
   - Customer information
   - Property preferences
   - Consent confirmation
   - Buyer agency agreement copy
   - "This is a binding referral" notice

**Status:** `assigned`

---

### Stage 8: Broker Acceptance
**Trigger:** Broker reviews referral in their inbox

**Broker Can:**
1. **Accept** - Commits to working with customer
   - Creates consultation record
   - Status changes to `accepted`
   - Customer is notified
   - Broker receives full customer details

2. **Reject** - Declines referral with reason
   - Must provide reason
   - Status changes to `rejected`
   - Referral returns to admin for reassignment

**Binding Agreement:**
- Once accepted, broker is committed
- Cannot abandon customer without valid reason
- Tracked in system for accountability

---

### Stage 9: Active Consultation
**Status:** `active_consultation`

**Storage:** `consultations` table

**Broker Actions:**
- Schedule property viewings
- Submit bids on behalf of customer
- Communicate progress
- Track events and notes
- Move through sales pipeline

---

## Database Schema Requirements

### `leads` Table
- All initial lead capture data
- Status tracking (new_lead, opt_in_sent, opted_in, opted_out)
- Source tracking
- Timestamps

### `customers` Table
- Full onboarding data
- Personal information
- Property preferences
- Financial information
- Consent timestamps
- Buyer agency agreement signature
- Digital signature data (IP, timestamp)

### `referrals` Table
- Links to customer record
- Assignment data
- Status tracking (referral_created, assigned, accepted, rejected)
- Broker assignment info
- Binding agreement flag

### `consultations` Table
- Active customer-broker relationships
- Event tracking
- Communication logs
- Sales pipeline stages

### `onboarding_consents` Table (New)
- Customer ID
- Consent type (data_sharing, communication, buyer_agency)
- Consent text (full agreement text)
- Agreed at timestamp
- IP address
- Digital signature (if applicable)

---

## Key Differences from Current System

**Current (Wrong):**
- Leads go directly to referrals
- No opt-in process
- No onboarding
- No consent collection
- No buyer agency agreement

**Correct (This Document):**
- Leads → Opt-in → Onboarding → Customer → Referral → Assignment
- Video-based opt-in request
- Complete onboarding form
- Multiple consent checkpoints
- Digital buyer agency agreement
- Binding referrals only after all steps complete

---

## Next Steps

1. Create database migrations for new tables
2. Build opt-in request email system with video
3. Create opt-in landing page
4. Build customer onboarding form
5. Update admin dashboard to show lead stages
6. Modify referral system to require onboarded customers
7. Add consent verification checks
8. Create broker notification system for binding referrals
