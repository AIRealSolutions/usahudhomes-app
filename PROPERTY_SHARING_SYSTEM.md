# Property Sharing System Documentation

## Overview

The Property Sharing System is a comprehensive solution for real estate brokers to share HUD properties with leads across multiple channels while tracking all engagement metrics and follow-up actions.

## Features

### 🔍 Property Selection
- **Search & Filter**: Search by address, city, case number, or ZIP code
- **Advanced Filters**: Filter by state, price range, bedrooms, property type
- **Multi-Select**: Select multiple properties to share at once
- **Visual Cards**: Property cards with images, prices, and key details
- **Smart Limits**: Optional maximum selection limits

### 📤 Multi-Channel Sharing
- **Email**: Professional email templates with property details and images
- **SMS**: Short message format with tracking links
- **Social Media**: Facebook, Instagram, WhatsApp (coming soon)
- **Direct Link**: Generate shareable tracking links

### 📊 Event Tracking
- **View Tracking**: Track when leads view shared properties
- **Click Tracking**: Monitor link clicks and engagement
- **Email Opens**: Track email open rates
- **Device Info**: Capture device type and browser information
- **Location Data**: Optional city/state/country tracking

### 📈 Analytics Dashboard
- **Engagement Metrics**: Views, clicks, open rates
- **Response Tracking**: Interested, not interested, showing scheduled
- **Timeline View**: Visual timeline of all interactions
- **Lead Insights**: Track which properties generate most interest
- **Performance Stats**: Response rates, conversion metrics

### 🎯 Lead Management
- **Interest Tracking**: Record lead interest levels for each property
- **Follow-Up Actions**: Schedule showings, track offers
- **Property Collections**: Create curated lists for specific clients
- **Response Management**: Record and track lead responses

## Architecture

### Components

#### 1. PropertySelector.jsx
**Purpose**: Search, filter, and select properties to share

**Key Features**:
- Real-time search across multiple fields
- Advanced filtering (state, price, bedrooms, type)
- Multi-select with visual feedback
- Responsive grid layout
- Mock data fallback for demo mode

**Props**:
```javascript
{
  onSelectProperties: (properties) => void,  // Callback when selection changes
  selectedProperties: Array,                  // Currently selected properties
  maxSelection: Number                        // Optional max selection limit
}
```

#### 2. PropertyShareModal.jsx
**Purpose**: Configure and send property shares via multiple channels

**Key Features**:
- Channel selection (email, SMS, social media, link)
- Customizable subject and message
- Auto-generated templates based on property data
- Recipient information display
- Real-time validation
- Success/error feedback

**Props**:
```javascript
{
  isOpen: Boolean,                           // Modal visibility
  onClose: () => void,                       // Close callback
  properties: Array,                         // Properties to share
  lead: Object,                              // Lead information
  agent: Object,                             // Agent information
  onShareComplete: (results) => void         // Success callback
}
```

#### 3. PropertyShareAnalytics.jsx
**Purpose**: Display sharing history and engagement metrics

**Key Features**:
- Summary statistics cards
- Time range filtering (7/30/90 days, all time)
- Detailed share list with engagement data
- Expandable timeline view
- Response status badges
- Share method indicators

**Props**:
```javascript
{
  leadId: String,                            // Optional: Filter by lead
  agentId: String                            // Optional: Filter by agent
}
```

### Services

#### propertyShareService.js
**Purpose**: Backend service for all property sharing operations

**Key Methods**:

```javascript
// Share a single property
shareProperty({
  agentId,
  customerId,
  consultationId,
  propertyId,
  caseNumber,
  shareMethod,
  message,
  subject,
  customerEmail,
  customerPhone,
  customerName,
  agentName,
  propertyAddress,
  propertyPrice
})

// Share multiple properties as a collection
sharePropertyCollection({
  agentId,
  customerId,
  consultationId,
  name,
  description,
  propertyIds,
  caseNumbers,
  shareMethod,
  message
})

// Track property view
trackView(shareToken, viewData)

// Track property click
trackClick(shareToken, clickData)

// Record lead response
recordResponse(shareId, responseStatus, notes)

// Get analytics for agent
getShareAnalytics(agentId, filters)

// Get shares for specific lead
getLeadShares(customerId)
```

## Database Schema

### Tables

#### 1. property_shares
Tracks all property shares with engagement metrics

**Columns**:
- `id` (UUID, PK)
- `agent_id` (UUID, FK → agents)
- `customer_id` (UUID, FK → customers)
- `consultation_id` (UUID, FK → consultations)
- `property_id` (UUID, FK → properties)
- `case_number` (VARCHAR)
- `share_method` (VARCHAR) - email, sms, facebook, instagram, whatsapp, link
- `message` (TEXT)
- `subject` (VARCHAR)
- `share_link` (VARCHAR)
- `share_token` (VARCHAR, UNIQUE)
- `viewed_at` (TIMESTAMP)
- `view_count` (INTEGER)
- `last_viewed_at` (TIMESTAMP)
- `clicked_at` (TIMESTAMP)
- `click_count` (INTEGER)
- `last_clicked_at` (TIMESTAMP)
- `response_status` (VARCHAR) - interested, not_interested, showing_scheduled, offer_made, no_response
- `response_notes` (TEXT)
- `responded_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `is_deleted` (BOOLEAN)

**Indexes**:
- agent_id, customer_id, property_id, consultation_id
- share_token (for tracking)
- created_at (for sorting)

#### 2. property_share_events
Logs all interactions with shared properties

**Columns**:
- `id` (UUID, PK)
- `share_id` (UUID, FK → property_shares)
- `event_type` (VARCHAR) - shared, view, click, email_open, email_click, sms_click, inquiry, showing_request
- `event_data` (JSONB)
- `ip_address` (VARCHAR)
- `user_agent` (TEXT)
- `device_type` (VARCHAR)
- `referrer` (TEXT)
- `city` (VARCHAR)
- `state` (VARCHAR)
- `country` (VARCHAR)
- `created_at` (TIMESTAMP)

**Indexes**:
- share_id, event_type, created_at

#### 3. property_collections
Curated property lists for specific clients

**Columns**:
- `id` (UUID, PK)
- `agent_id` (UUID, FK → agents)
- `customer_id` (UUID, FK → customers)
- `consultation_id` (UUID, FK → consultations)
- `name` (VARCHAR)
- `description` (TEXT)
- `property_ids` (UUID[])
- `case_numbers` (VARCHAR[])
- `is_shared` (BOOLEAN)
- `shared_at` (TIMESTAMP)
- `share_link` (VARCHAR)
- `share_token` (VARCHAR, UNIQUE)
- `view_count` (INTEGER)
- `last_viewed_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `is_deleted` (BOOLEAN)

#### 4. lead_property_interests
Tracks which properties leads are interested in

**Columns**:
- `id` (UUID, PK)
- `customer_id` (UUID, FK → customers)
- `consultation_id` (UUID, FK → consultations)
- `property_id` (UUID, FK → properties)
- `case_number` (VARCHAR)
- `interest_level` (VARCHAR) - high, medium, low, not_interested, unknown
- `notes` (TEXT)
- `showing_requested` (BOOLEAN)
- `showing_scheduled_at` (TIMESTAMP)
- `offer_made` (BOOLEAN)
- `offer_amount` (DECIMAL)
- `source` (VARCHAR) - shared_property, search, recommendation, inquiry
- `source_share_id` (UUID, FK → property_shares)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `is_deleted` (BOOLEAN)

### Views

#### property_share_analytics
Aggregated analytics for reporting

Combines data from:
- property_shares
- property_share_events
- customers
- agents

Provides:
- Total views and clicks per share
- Last engagement timestamps
- Customer and agent information
- Response status

## Integration

### AI Agent Assistant Integration

The property sharing system is fully integrated into the AI Agent Assistant tab:

1. **Quick Action Button**: "Share Properties" button in the AI Agent card
2. **Property Selector Modal**: Opens when clicking the share button
3. **Share Configuration**: Configure message and channel
4. **Analytics Display**: Shows sharing history and engagement metrics

### Workflow

```
1. Broker clicks "Share Properties" in AI Agent
   ↓
2. Property Selector modal opens
   ↓
3. Broker searches/filters and selects properties
   ↓
4. Broker clicks "Continue to Share"
   ↓
5. Share modal opens with selected properties
   ↓
6. Broker chooses channel (email/SMS/etc.)
   ↓
7. Broker customizes message
   ↓
8. Broker clicks "Share"
   ↓
9. System creates share records in database
   ↓
10. System sends via selected channel
   ↓
11. System generates tracking links
   ↓
12. Analytics dashboard updates
   ↓
13. Lead receives property information
   ↓
14. System tracks all engagement (views, clicks)
   ↓
15. Broker sees real-time analytics
```

## Usage Examples

### Example 1: Share Single Property via Email

```javascript
import { propertyShareService } from './services/propertyShareService'

const result = await propertyShareService.shareProperty({
  agentId: 'agent-123',
  customerId: 'customer-456',
  consultationId: 'consult-789',
  propertyId: 'prop-abc',
  caseNumber: 'SC-123-456789',
  shareMethod: 'email',
  message: 'Hi John, I found this perfect HUD home for you!',
  subject: 'Your Dream Home Awaits',
  customerEmail: 'john@example.com',
  customerName: 'John Doe',
  agentName: 'Jane Smith',
  propertyAddress: '123 Main St',
  propertyPrice: '$185,000'
})

if (result.success) {
  console.log('Share link:', result.shareLink)
  console.log('Tracking token:', result.shareToken)
}
```

### Example 2: Track Property View

```javascript
// When lead opens the shared link
const result = await propertyShareService.trackView(
  shareToken,
  {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    deviceType: 'mobile'
  }
)
```

### Example 3: Get Analytics

```javascript
const analytics = await propertyShareService.getShareAnalytics(
  'agent-123',
  {
    startDate: '2026-01-01',
    endDate: '2026-01-31'
  }
)

console.log('Total shares:', analytics.stats.totalShares)
console.log('Total views:', analytics.stats.totalViews)
console.log('Response rate:', analytics.stats.responseRate)
```

## Deployment

### Prerequisites

1. **Supabase Database**: PostgreSQL database with tables created
2. **Environment Variables**: Supabase URL and API key configured
3. **Email Service**: Resend or SendGrid configured (optional)
4. **SMS Service**: Twilio configured (optional)

### Steps

1. **Apply Database Migration**:
   ```bash
   # In Supabase SQL Editor, run:
   # database/migration_property_sharing.sql
   ```

2. **Verify Tables Created**:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE 'property_%';
   ```

3. **Deploy to Vercel**:
   ```bash
   git add .
   git commit -m "Add property sharing system"
   git push origin master
   # Vercel auto-deploys from GitHub
   ```

4. **Test the System**:
   - Login as broker
   - Navigate to lead detail page
   - Click "Share Properties" in AI Agent tab
   - Select properties and share
   - Verify tracking works

## Testing

### Manual Testing Checklist

- [ ] Property selector loads properties
- [ ] Search filters work correctly
- [ ] Multi-select works
- [ ] Share modal opens with selected properties
- [ ] Email channel works
- [ ] SMS channel works (if configured)
- [ ] Tracking links are generated
- [ ] Analytics dashboard displays data
- [ ] View tracking works
- [ ] Click tracking works
- [ ] Response recording works

### Test Data

Mock properties are included in PropertySelector.jsx for testing without database connection.

## Future Enhancements

### Planned Features

1. **Social Media Integration**:
   - Facebook Messenger API
   - Instagram Direct API
   - WhatsApp Business API

2. **Advanced Analytics**:
   - Heat maps of property interest
   - Predictive lead scoring
   - A/B testing for messages

3. **Automation**:
   - Auto-share matching properties
   - Scheduled follow-ups
   - Drip campaigns

4. **Mobile App**:
   - Native iOS/Android apps
   - Push notifications
   - Offline mode

5. **AI Enhancements**:
   - AI-generated property descriptions
   - Smart message personalization
   - Optimal send time prediction

## Support

### Common Issues

**Issue**: Properties not loading
**Solution**: Check Supabase connection and verify `properties` table exists

**Issue**: Sharing fails
**Solution**: Verify agent and customer IDs are valid UUIDs

**Issue**: Tracking not working
**Solution**: Check share_token is being generated and stored correctly

**Issue**: Analytics showing no data
**Solution**: Ensure property_share_events are being logged

### Contact

For technical support or questions:
- Email: marcspencer28461@gmail.com
- GitHub: https://github.com/AIRealSolutions/usahudhomes-app

## License

Proprietary - USA HUD Homes Platform
© 2026 AI Real Solutions

---

**Version**: 1.0.0  
**Last Updated**: January 6, 2026  
**Author**: AI Real Solutions Development Team
