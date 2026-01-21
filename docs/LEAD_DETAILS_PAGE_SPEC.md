# Lead Details Page Specification

## Purpose
Provide admin with a comprehensive view of each lead and tools to communicate, track interactions, and move leads through the onboarding process.

## Page Layout

### Header Section
```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Leads                                             │
│                                                              │
│ John Smith                                    [Under Review]│
│ Lead #12345 • Received Jan 20, 2026 at 2:30 PM             │
│                                                              │
│ [📞 Call]  [💬 Text]  [✉️ Email]  [+ Add Note]            │
└─────────────────────────────────────────────────────────────┘
```

### Main Content (2-Column Layout)

#### Left Column (Lead Information)

**Contact Information Card**
```
┌─────────────────────────────────────┐
│ Contact Information                  │
├─────────────────────────────────────┤
│ Name: John Smith                     │
│ Email: john@example.com              │
│ Phone: (910) 363-6147                │
│ State: North Carolina                │
└─────────────────────────────────────┘
```

**Property Interest Card** (if property-specific lead)
```
┌─────────────────────────────────────┐
│ Property Interest                    │
├─────────────────────────────────────┤
│ Address: 123 Main St, Raleigh, NC   │
│ Price: $150,000                      │
│ Case #: 482-123456                   │
│ [View Property →]                    │
└─────────────────────────────────────┘
```

**Preferences Card**
```
┌─────────────────────────────────────┐
│ Preferences                          │
├─────────────────────────────────────┤
│ Budget: $100,000 - $200,000          │
│ Timeline: 1-3 months                 │
│ Message: "Looking for a 3BR home..." │
└─────────────────────────────────────┘
```

**Lead Source Card**
```
┌─────────────────────────────────────┐
│ Lead Source                          │
├─────────────────────────────────────┤
│ Source: Property Inquiry             │
│ Received: Jan 20, 2026 2:30 PM      │
│ IP Address: 192.168.1.1              │
└─────────────────────────────────────┘
```

#### Right Column (Actions & Timeline)

**Quick Actions Card**
```
┌─────────────────────────────────────┐
│ Quick Actions                        │
├─────────────────────────────────────┤
│ Send Preset Email:                   │
│ [Send Opt-In Request] ⭐             │
│ [Request More Info]                  │
│ [Schedule Call]                      │
│ [Send Property Recommendations]      │
│ [Custom Email...]                    │
│                                      │
│ Status:                              │
│ [Change Status ▼]                    │
│                                      │
│ Other:                               │
│ [Archive Lead]                       │
│ [Mark as Spam]                       │
└─────────────────────────────────────┘
```

**Event Timeline Card**
```
┌─────────────────────────────────────┐
│ Event Timeline                       │
├─────────────────────────────────────┤
│ 📧 Email sent: "Opt-In Request"      │
│    Jan 20, 2026 3:15 PM              │
│    by Marc Spencer                   │
│                                      │
│ 📞 Call made                         │
│    Jan 20, 2026 2:45 PM              │
│    by Marc Spencer                   │
│    Note: "Left voicemail"            │
│                                      │
│ 📝 Note added                        │
│    Jan 20, 2026 2:35 PM              │
│    by Marc Spencer                   │
│    "Qualified lead, good budget"     │
│                                      │
│ 📥 Lead received                     │
│    Jan 20, 2026 2:30 PM              │
│    Source: Property Inquiry          │
└─────────────────────────────────────┘
```

## Communication Tools

### Call Button
**Action:** Opens phone dialer with lead's phone number
**Implementation:** 
```html
<a href="tel:+19103636147" class="call-button">
  📞 Call
</a>
```
**Event Log:** Clicking button prompts admin to log call result:
- Modal appears: "Log Call Result"
- Options: "Answered", "Voicemail", "No Answer", "Busy"
- Note field: Optional notes about call
- Saves to event timeline

### Text/SMS Button
**Action:** Opens SMS composer
**Implementation:**
```html
<a href="sms:+19103636147" class="sms-button">
  💬 Text
</a>
```
**Event Log:** Clicking button prompts admin to log text:
- Modal appears: "Log Text Message"
- Text field: What was sent
- Saves to event timeline

### Email Button
**Action:** Opens email composer OR preset email selector
**Implementation:**
- Click opens dropdown menu
- Options: "Compose Custom Email" or select preset template
- If custom: Opens mailto link
- If preset: Opens template selector modal

**Event Log:** Automatically logs when preset email is sent

## Preset Email Templates

### Template Structure
Each template has:
- **Name**: Display name in dropdown
- **Subject**: Email subject line
- **Body**: Email content with merge fields
- **Attachments**: Optional files (e.g., PDFs)
- **Video**: Optional embedded video

### Merge Fields
Templates can use these placeholders:
- `{{first_name}}` - Lead's first name
- `{{last_name}}` - Lead's last name
- `{{email}}` - Lead's email
- `{{phone}}` - Lead's phone
- `{{property_address}}` - Property address (if applicable)
- `{{opt_in_link}}` - Unique opt-in URL

### Default Templates

**1. Send Opt-In Request** ⭐ (Primary action)
```
Subject: Welcome to USAHUDhomes.com - Start Your Home Buying Journey

Hi {{first_name}},

Thank you for your interest in finding your perfect HUD home!

We'd love to help you through the home buying process. Before we can 
connect you with one of our licensed real estate agents, please watch 
this short video to understand how we work:

[VIDEO EMBEDDED HERE]

Ready to get started? Click below to begin your onboarding:

[Start My Journey →] {{opt_in_link}}

Questions? Call us at (910) 363-6147 or reply to this email.

Best regards,
Lightkeeper Realty Team
```

**2. Request More Information**
```
Subject: We'd love to learn more about your home search

Hi {{first_name}},

Thanks for reaching out! To better assist you, could you provide 
a bit more information about what you're looking for?

- What's your budget range?
- Which areas are you interested in?
- When are you looking to purchase?
- Any specific features you need?

Reply to this email or give us a call at (910) 363-6147.

Looking forward to helping you!

Best,
Lightkeeper Realty Team
```

**3. Schedule Phone Call**
```
Subject: Let's schedule a call to discuss your home search

Hi {{first_name}},

I'd love to chat with you about your home buying goals!

When would be a good time for a quick 15-minute call?

You can:
- Reply with your availability
- Call me directly at (910) 363-6147
- Book a time here: [CALENDAR LINK]

Talk soon!

Best,
Lightkeeper Realty Team
```

**4. Send Property Recommendations**
```
Subject: HUD Homes That Match Your Criteria

Hi {{first_name}},

Based on your preferences, I found some great HUD homes you might like:

[PROPERTY CARDS HERE - Admin selects 3-5 properties]

View all available properties: https://usahudhomes.com/search

Want to schedule a viewing? Reply to this email or call (910) 363-6147.

Best,
Lightkeeper Realty Team
```

## Event Logging System

### Event Types
- `lead_received` - Lead first captured
- `call_made` - Phone call attempt
- `text_sent` - SMS sent
- `email_sent` - Email sent
- `note_added` - Admin added note
- `status_changed` - Status updated
- `email_opened` - Lead opened email (if tracking enabled)
- `link_clicked` - Lead clicked link in email
- `video_viewed` - Lead watched video

### Event Data Structure
```javascript
{
  id: uuid,
  lead_id: uuid,
  event_type: string,
  event_data: {
    // Varies by type
    subject: "Email subject",
    template: "opt_in_request",
    note: "Admin note text",
    from_status: "new_lead",
    to_status: "under_review"
  },
  created_by: uuid, // Admin user ID
  created_at: timestamp
}
```

### Timeline Display
- Reverse chronological order (newest first)
- Icon for each event type
- Timestamp (relative: "2 hours ago" or absolute)
- Admin name who performed action
- Event details
- Expandable for more info

## Status Management

### Available Statuses
1. **New Lead** (blue) - Just received, not reviewed
2. **Under Review** (yellow) - Admin is reviewing
3. **Contacted** (purple) - Admin has reached out
4. **Opt-In Sent** (orange) - Onboarding email sent
5. **Opted In** (green) - Lead accepted opt-in
6. **Onboarding** (teal) - Filling out onboarding form
7. **Onboarded** (green) - Ready for referral creation
8. **Opted Out** (red) - Lead declined
9. **Archived** (gray) - No longer active

### Status Change
- Dropdown in Quick Actions
- Select new status
- Optional: Add note explaining change
- Logs to event timeline

## Notes System

### Add Note
- Click "+ Add Note" button
- Modal appears with text area
- Optional: Tag note (e.g., "Follow-up needed", "Hot lead", "Budget concern")
- Saves to event timeline

### Note Display
- Shows in timeline with 📝 icon
- Admin name and timestamp
- Full note text
- Tags displayed as badges

## Database Requirements

### `leads` Table
```sql
- id (uuid)
- first_name
- last_name
- email
- phone
- state
- budget_min
- budget_max
- timeline
- message
- property_case_number (nullable)
- property_address (nullable)
- property_price (nullable)
- source (website, property_inquiry, facebook, manual)
- status (enum)
- ip_address
- created_at
- updated_at
```

### `lead_events` Table
```sql
- id (uuid)
- lead_id (fk)
- event_type
- event_data (jsonb)
- created_by (fk to agents)
- created_at
```

### `email_templates` Table
```sql
- id (uuid)
- name
- subject
- body (html)
- merge_fields (jsonb)
- video_url (nullable)
- is_active
- created_at
- updated_at
```

## Technical Implementation

### Frontend Components
- `LeadDetailPage.jsx` - Main page component
- `LeadInfoCard.jsx` - Lead information display
- `CommunicationTools.jsx` - Call/Text/Email buttons
- `PresetEmailSelector.jsx` - Email template dropdown
- `EventTimeline.jsx` - Event history display
- `AddNoteModal.jsx` - Note creation modal
- `LogCallModal.jsx` - Call logging modal

### Backend API Endpoints
- `GET /api/leads/:id` - Get lead details
- `GET /api/leads/:id/events` - Get event timeline
- `POST /api/leads/:id/events` - Log new event
- `PUT /api/leads/:id/status` - Update status
- `POST /api/leads/:id/send-email` - Send preset email
- `GET /api/email-templates` - Get all templates
- `POST /api/leads/:id/notes` - Add note

## Next Steps
1. Create database migrations
2. Build LeadDetailPage component
3. Implement communication logging
4. Create email template system
5. Build preset email sender
6. Add event timeline display
