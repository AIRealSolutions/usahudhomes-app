# Property Management System Documentation

## Overview

The Property Management System provides comprehensive tools for managing HUD property listings and promoting them through social media channels. This system is designed for admin users to efficiently manage property data and create platform-optimized social media content.

## Features

### 1. Property Management Dashboard (`/admin/properties`)

The main dashboard provides a comprehensive overview of all properties in the system.

#### Stats Overview
- **Total Properties**: Complete count of all properties in database
- **Active Listings**: Properties with "Available" status
- **Under Contract**: Properties currently under contract
- **Sold**: Properties that have been sold

#### Advanced Filtering
- **Search**: Search by address, city, or case number
- **State Filter**: Filter properties by state
- **Status Filter**: Filter by Available, Under Contract, or Sold
- **Price Range Filter**:
  - Under $50k
  - $50k - $100k
  - $100k - $200k
  - Over $200k

#### Property Grid Display
Each property card shows:
- Property image (or placeholder if no image)
- Status badge (color-coded)
- Price
- Location (city, state)
- Bedrooms and bathrooms
- Address
- Case number
- Action buttons:
  - **Edit**: Opens property details/edit page
  - **View**: Opens public property page in new tab
  - **Share**: Opens social media sharing modal

### 2. Property Details/Edit Page (`/admin/properties/:caseNumber`)

Comprehensive property management interface with edit capabilities.

#### View Mode
- Property image display
- Complete property details:
  - Address
  - Price
  - Status
  - Bedrooms
  - Bathrooms
  - City
  - State
  - Case number
  - Listed date
- Public URL with copy button
- Action buttons:
  - **Edit**: Enter edit mode
  - **Share**: Open social media sharing modal
  - **View Public**: Open public property page

#### Edit Mode
- Editable fields for all property information:
  - Address
  - Main image URL
  - Price
  - Status (dropdown: Available, Under Contract, Sold)
  - Bedrooms
  - Bathrooms
  - City
  - State
- **Save**: Saves changes to database
- **Cancel**: Discards changes and exits edit mode

### 3. Social Media Sharing Features

Platform-optimized content generation for promoting properties on social media.

#### Supported Platforms

##### Facebook
**Content includes:**
- Engaging headline with city and state
- Property price
- Bedrooms and bathrooms
- Owner-Occupant Incentives:
  - $100 down FHA Loans
  - 3% Closing Cost Paid
  - Repair Escrows up to $35,000 with 203k Loan
- Contact: 910.363.6147
- Website: USAHUDhomes.com
- Company info: Lightkeeper Realty - 25 years experience
- Direct link to property page

**Actions:**
- Copy to clipboard
- Direct share to Facebook

##### Instagram
**Content includes:**
- Eye-catching emoji-rich caption
- Property price and details
- Owner-Occupant Incentives
- Contact information
- Hashtags:
  - #HUDHomes
  - #RealEstate
  - #HomeOwnership
  - #FirstTimeHomeBuyer
  - #[State]RealEstate
  - #[City]Homes
  - #FHALoans
  - #AffordableHousing
  - #DreamHome
  - #HouseHunting
- "Link in bio" reference

**Actions:**
- Copy to clipboard (for manual posting)

**Note**: Instagram doesn't support direct sharing via URL, so content must be copied and pasted when creating post.

##### Twitter/X
**Content includes:**
- Concise format (optimized for 280 characters)
- Property location
- Price and basic details (beds/baths)
- Key incentives (abbreviated)
- Contact phone
- Website
- Property link

**Actions:**
- Copy to clipboard
- Direct tweet via Twitter intent URL

##### LinkedIn
**Content includes:**
- Professional tone
- "Investment Opportunity" angle
- Complete property details
- Full owner-occupant incentives list
- Company credentials and experience
- Contact information
- Property link

**Actions:**
- Copy to clipboard
- Direct share to LinkedIn

#### Social Media Sharing Modal

The sharing modal provides:
- Platform-specific content previews
- Copy-to-clipboard buttons with confirmation
- Direct share buttons (where supported)
- Professional formatting for each platform
- Consistent branding and contact information

## Access Control

- **Admin Only**: All property management features require admin access
- Access via Admin Dashboard → "Manage Properties" button
- Direct URL access: `/admin/properties`

## Integration Points

### Admin Dashboard
- "Manage Properties" button in Quick Actions section
- Purple-themed button to distinguish from other admin functions

### Navigation Flow
1. Admin Dashboard → Manage Properties
2. Property Management Dashboard → Select Property → Edit
3. Property Details Page → Share → Social Media Modal

### Public Property Pages
- Admin can view public property pages from management interface
- "View Public" button opens property in new tab
- Ensures consistency between admin view and public view

## Technical Details

### Database
- Uses existing `properties` table in Supabase
- Fields:
  - `id`: UUID primary key
  - `case_number`: Unique case number
  - `address`: Property address
  - `city`: City
  - `state`: State
  - `list_price`: Price (integer)
  - `bedrooms`: Number of bedrooms (integer)
  - `bathrooms`: Number of bathrooms (decimal)
  - `status`: Status (Available, Under Contract, Sold)
  - `main_image`: URL to property image
  - `created_at`: Timestamp

### Routes
- `/admin/properties` - Property Management Dashboard
- `/admin/properties/:caseNumber` - Property Details/Edit Page

### Components
- `src/components/admin/PropertyManagement.jsx` - Dashboard
- `src/pages/AdminPropertyDetails.jsx` - Details/Edit page

## Usage Guide

### Managing Properties

1. **Access Property Management**
   - Log in as admin
   - Go to Admin Dashboard
   - Click "Manage Properties"

2. **Search and Filter**
   - Use search box for quick lookup
   - Apply filters to narrow results
   - Click "Clear Filters" to reset

3. **Edit Property**
   - Click "Edit" button on property card
   - Or navigate to property details page
   - Click "Edit" button in header
   - Modify fields as needed
   - Click "Save" to save changes
   - Click "Cancel" to discard changes

4. **Update Property Image**
   - Enter edit mode
   - Paste image URL in "Image URL" field
   - Save changes
   - Image will display on property cards and detail page

### Sharing on Social Media

1. **Open Sharing Modal**
   - Navigate to property details page
   - Click "Share" button
   - Modal displays with all platform options

2. **Facebook Sharing**
   - Review pre-filled content
   - Click "Copy" to copy to clipboard
   - Or click "Share" to open Facebook share dialog
   - Paste content if using copy method
   - Property link is included automatically

3. **Instagram Sharing**
   - Click "Copy" to copy content
   - Open Instagram app or web
   - Create new post
   - Upload property image
   - Paste copied caption
   - Add property link to bio or story

4. **Twitter/X Sharing**
   - Review pre-filled tweet
   - Click "Copy" to copy to clipboard
   - Or click "Tweet" to open Twitter compose
   - Tweet includes property link

5. **LinkedIn Sharing**
   - Review professional content
   - Click "Copy" to copy to clipboard
   - Or click "Share" to open LinkedIn share dialog
   - Paste content if using copy method
   - Property link is included

### Best Practices

1. **Property Images**
   - Use high-quality images
   - Ensure images are properly hosted
   - Update image URLs if images change

2. **Property Status**
   - Keep status up-to-date
   - Update to "Under Contract" when offer accepted
   - Update to "Sold" when sale closes

3. **Social Media Posting**
   - Review content before posting
   - Customize if needed for specific audience
   - Post during peak engagement times
   - Include property image with posts
   - Monitor comments and respond promptly

4. **Content Customization**
   - Pre-filled content is optimized but can be edited
   - Maintain consistent branding
   - Keep contact information accurate
   - Ensure property links are working

## Owner-Occupant Incentives

The following incentives are highlighted in social media posts:

1. **$100 Down FHA Loans**
   - Extremely low down payment option
   - Makes homeownership accessible

2. **3% Closing Cost Paid**
   - Reduces upfront costs
   - Helps buyers save money

3. **Repair Escrows up to $35,000 with 203k Loan**
   - Allows buyers to purchase properties needing repairs
   - Repairs financed into mortgage

4. **Owner-Occupant Bidding Priority**
   - Owner-occupants get first priority
   - Exclusive bidding period before investors

## Contact Information

All social media posts include:
- **Phone**: 910.363.6147 (Marc Spencer)
- **Website**: USAHUDhomes.com
- **Company**: Lightkeeper Realty
- **Experience**: 25 years as Registered HUD Buyer's Agency

## Future Enhancements

Potential future additions:
- Bulk property import from HUD
- Scheduled social media posting
- Social media analytics
- Image upload directly to system
- Multiple property images
- Property comparison tool
- Export property data
- Print-ready property flyers
- Email property to client
- Property history tracking

## Support

For questions or issues:
- Contact: 9103636147@verizon.net
- Review database schema in migration files
- Check Supabase console for data issues
- Review browser console for JavaScript errors
