
### Property Inquiry Integration
- [x] Integrate property inquiry modal with referrals table
- [x] Add property-specific fields (case_number, address, price)
- [x] Mark property inquiries with source "property_inquiry"
- [ ] Test property inquiry form submission

### Admin Referral Management
- [x] Create admin referral dashboard component
- [x] Add referral list view with filtering (by status, source, state)
- [x] Add referral stats/metrics (total, unassigned, assigned, accepted, rejected)
- [x] Build assign-to-broker functionality
- [ ] Create referral detail view
- [ ] Add manual referral creation form
- [ ] Test admin workflow end-to-end

### Broker Referral Inbox
- [x] Create broker referral inbox component
- [x] Add referral list view with filtering
- [x] Build accept referral functionality (creates consultation)
- [x] Build reject referral functionality (with reason)
- [x] Add notification badge for pending referrals
- [x] Integrate with broker dashboard
- [ ] Test broker workflow end-to-end

### Admin Referral Management Enhancements
- [x] Add expandable lead detail view with complete information
- [x] Show all lead data fields (budget, timeline, message, etc.)
- [x] Add timeline/events log for each lead
- [x] Improve assign modal with broker details (active leads count, specialties)
- [ ] Add manual lead creation form
- [ ] Add bulk actions (assign multiple leads)
- [ ] Add export functionality
- [ ] Test complete admin workflow with real data

### Bug Fixes
- [x] Fix broker assignment - not recognizing brokers available in lead's state
- [x] Investigate states_covered field format (array vs string)
- [x] Add debugging info to assignment modal
- [ ] Test broker filtering with real broker data

### Admin Navigation Optimization
- [x] Remove debug info from referral assignment modal
- [x] Review admin dashboard for duplicate sections
- [x] Consolidate customers and leads sections
- [x] Ensure clear distinction between referrals (unassigned leads) and consultations (accepted leads)
- [x] Optimize admin quick actions layout

### Lead Assignment Bug
- [x] Investigate lead assignment failure
- [x] Check assignLead function for errors
- [x] Create notifications table migration
- [ ] Run notifications migration in Supabase
- [ ] Test assignment workflow end-to-end

### Lead Onboarding Workflow (Proper Process)

**Phase 1: Database Schema**
- [x] Create leads table (separate from referrals)
- [x] Create lead_events table for communication tracking
- [x] Create email_templates table for preset emails
- [x] Create onboarding_consents table for tracking all consents
- [x] Update customers table with onboarding fields
- [x] Update referrals table with customer link and binding flags
- [x] Seed default email templates
- [ ] Run migration in Supabase

**Phase 2: Lead Details Page & Communication**
- [ ] Build Lead Details Page with 2-column layout
- [ ] Add communication tools (Call, Text, Email buttons)
- [ ] Implement event logging system
- [ ] Create event timeline display
- [ ] Add notes system
- [ ] Add status management dropdown
- [ ] Build preset email template system
- [ ] Create email template selector modal
- [ ] Implement email sending with merge fields
- [ ] Add call logging modal
- [ ] Add text logging modal

**Phase 3: Opt-In & Onboarding**
- [ ] Build opt-in request email template with video embed
- [ ] Create opt-in landing page with video and accept/decline buttons
- [ ] Build customer onboarding form (multi-step)
- [ ] Add digital signature capture for buyer agency agreement
- [ ] Create consent tracking system (data sharing, communication, buyer agency)

**Phase 4: Admin Dashboard Updates**
- [ ] Update admin dashboard to show lead stages (new → opt-in sent → opted in → onboarded)
- [ ] Add "View Details" button for each lead
- [ ] Show lead status badges
- [ ] Add lead filtering by status

**Phase 5: Referral System Updates**
- [ ] Modify referral creation to require fully onboarded customer
- [ ] Add consent verification before broker assignment
- [ ] Update broker notification to include "binding referral" notice
- [ ] Add buyer agency agreement copy to broker dashboard

### Update Contact Forms to Use Leads Table
- [x] Update general contact form to save to leads table
- [x] Update property inquiry modal to save to leads table
- [x] Add automatic lead_events creation on form submission
- [ ] Add admin notification email on new lead (9103636147@verizon.net)
- [ ] Test contact form submission
- [ ] Test property inquiry submission

### Admin Section Structure
- [x] Design admin navigation with 3 main sections: Leads, Customers, Properties
- [x] Create Lead Management dashboard (all incoming leads)
- [x] Create Lead Details Page with communication tools and event timeline
- [ ] Create Customer Management dashboard (onboarded customers - master control)
- [ ] Create Customer Details Page with full broker action visibility
- [ ] Create Property Management dashboard
- [x] Update AdminDashboard with proper navigation to all sections
- [ ] Ensure Customer section shows all broker actions and events

### Property Management System
**Phase 1: Property Management Dashboard**
- [ ] Create property management dashboard (list all properties)
- [ ] Add property filtering (by state, status, price range)
- [ ] Add property search functionality
- [ ] Add property stats (total, active, sold, etc.)

**Phase 2: Property Details Page with Edit Features**
- [ ] Create admin property details page (/admin/properties/:caseNumber)
- [ ] Add edit mode for property information
- [ ] Add image upload/management
- [ ] Add property status management
- [ ] Add notes/internal comments section

**Phase 3: Social Media Sharing Features**
- [ ] Create social media share modal
- [ ] Add Facebook sharing with optimized content
- [ ] Add Instagram sharing with optimized content
- [ ] Add Twitter/X sharing with optimized content
- [ ] Add LinkedIn sharing with optimized content
- [ ] Generate platform-specific preview text
- [ ] Include property image, price, city, beds, baths
- [ ] Add contact number (9103636147) and USAHUDhomes.com
- [ ] Generate shareable link to public property page
- [ ] Add copy-to-clipboard functionality

**Phase 4: Integration**
- [ ] Add Property Management link to admin dashboard
- [ ] Create admin route /admin/properties
- [ ] Test property editing workflow
- [ ] Test social media sharing on each platform
