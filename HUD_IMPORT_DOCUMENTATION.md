# HUD Import Feature Documentation

## Overview

The HUD Import feature allows admins to import HUD properties by copying and pasting JSON or CSV data directly into the admin interface. The system uses AI-powered formatting to automatically map fields to the correct database schema.

## Features

### ✅ Copy/Paste Interface
- Paste JSON or CSV data directly into a textarea
- Automatic format detection
- No file upload required

### ✅ AI-Powered Formatting
- Intelligent field mapping
- Handles various field name formats (camelCase, snake_case, Title Case)
- Automatic data type conversion
- Price formatting (removes $, commas)
- Date parsing for bid deadlines
- Special handling for half baths (.1 → 0.5)

### ✅ Preview Before Import
- Shows first 5 properties
- Displays formatted data
- Total property count
- Review before committing

### ✅ Database Import
- Checks for existing properties by case number
- Updates existing properties
- Adds new properties
- Comprehensive error handling
- Import statistics

### ✅ Status Management
- New properties default to "AVAILABLE"
- Existing properties maintain their status
- Future enhancement: Mark missing properties as "UNDER CONTRACT"

## Usage

### Step 1: Access HUD Import
1. Login as admin
2. Go to Admin Dashboard
3. Click "Properties" tab
4. Click "HUD Import" button

### Step 2: Paste Data
1. Copy JSON or CSV data from any source
2. Paste into the textarea
3. System automatically detects format
4. Click "Format Data with AI"

### Step 3: Review
1. Preview formatted properties
2. Check field mappings
3. Verify data looks correct

### Step 4: Import
1. Click "Import to Database"
2. Wait for import to complete
3. View import statistics
4. Properties list automatically refreshes

## Supported Data Formats

### JSON Format

**Array of objects:**
```json
[
  {
    "case_number": "123-456789",
    "address": "123 Main St",
    "city": "Raleigh",
    "state": "NC",
    "zip_code": "27601",
    "county": "Wake",
    "price": 250000,
    "beds": 3,
    "baths": 2,
    "sq_ft": 1500,
    "bid_deadline": "2026-02-01"
  }
]
```

**Single object (will be converted to array):**
```json
{
  "case_number": "123-456789",
  "address": "123 Main St",
  ...
}
```

### CSV Format

**With headers:**
```csv
case_number,address,city,state,zip_code,price,beds,baths
123-456789,123 Main St,Raleigh,NC,27601,250000,3,2
234-567890,456 Oak Ave,Durham,NC,27701,180000,2,1
```

**Note:** First row must be headers

## Field Mapping

The AI automatically maps common field name variations to the database schema:

| Input Variations | Database Field |
|-----------------|----------------|
| case_number, caseNumber, Case Number, case | case_number |
| address, street_address, streetAddress | address |
| city, City | city |
| state, State | state |
| zip, zip_code, zipcode, zipCode, Zip | zip_code |
| county, County | county |
| price, list_price, listPrice, asking_price | price |
| beds, bedrooms, Beds, Bedrooms | beds |
| baths, bathrooms, Baths, Bathrooms | baths |
| sq_ft, sqft, square_feet, squareFeet | sq_ft |
| bid_deadline, bidDeadline, deadline | bid_deadline |
| status, Status, listing_status | status |
| property_type, propertyType, type, Type | property_type |

## Data Transformations

### Automatic Conversions

1. **Prices:** Removes `$` and commas
   - Input: `"$250,000"` → Output: `250000`

2. **Numbers:** Converts string numbers to floats
   - Input: `"3"` → Output: `3`

3. **Half Baths:** Converts `.1` to `0.5`
   - Input: `0.1` → Output: `0.5`

4. **Dates:** Parses various date formats
   - Input: `"2026-02-01"` → Output: `"2026-02-01"`
   - Input: `"2/1/2026"` → Output: `"2026-02-01"`

5. **Status:** Defaults to "AVAILABLE" if not provided

### Required Fields

Only **case_number** is truly required. If missing, a temporary case number will be generated:
- Format: `TEMP-{timestamp}-{random}`
- Example: `TEMP-1736349600000-abc123def`

## Import Logic

### Duplicate Handling

1. **Check Existing:** Queries database by `case_number`
2. **If Exists:** Updates the existing property
3. **If New:** Adds as new property
4. **Status Preserved:** Existing properties keep their current status

### Error Handling

- Each property is imported individually
- Errors don't stop the entire import
- Failed properties are tracked with error messages
- Import statistics show success/failure counts

## Import Statistics

After import, you'll see:

| Metric | Description |
|--------|-------------|
| **Added** | New properties inserted |
| **Updated** | Existing properties modified |
| **Failed** | Properties that couldn't be imported |
| **Errors** | List of specific error messages |

## Example Workflows

### Workflow 1: Import from HUD Website

1. Visit hudhomestore.gov
2. Search for properties in your state
3. Copy the property data (manually or via scraper)
4. Format as JSON or CSV
5. Paste into HUD Import
6. Review and import

### Workflow 2: Import from Spreadsheet

1. Open your Excel/Google Sheets file
2. Select and copy the data (including headers)
3. Paste into HUD Import
4. System detects CSV format
5. Review and import

### Workflow 3: Import from API

1. Call an external API to get property data
2. Copy the JSON response
3. Paste into HUD Import
4. System detects JSON format
5. Review and import

## Tips & Best Practices

### ✅ Do's

- **Include headers** in CSV data
- **Use consistent field names** across imports
- **Preview before importing** to catch issues
- **Check import statistics** after each import
- **Keep case numbers unique** to avoid duplicates

### ❌ Don'ts

- **Don't paste HTML** or formatted text
- **Don't mix JSON and CSV** in one paste
- **Don't skip the preview** step
- **Don't import without case numbers** (unless temporary is okay)
- **Don't paste malformed data** (validate first)

## Troubleshooting

### "Failed to format data"

**Cause:** Invalid JSON or CSV format

**Solution:**
- Check for missing quotes in JSON
- Ensure CSV has proper commas
- Verify no special characters breaking format

### "No data to import"

**Cause:** Formatting step wasn't completed

**Solution:**
- Click "Format Data with AI" before importing
- Ensure data is pasted in textarea

### "Import failed: [error message]"

**Cause:** Database connection or permission issue

**Solution:**
- Check Supabase connection
- Verify admin permissions
- Check database logs

### Properties not appearing

**Cause:** Import succeeded but list not refreshed

**Solution:**
- Close and reopen the modal
- Refresh the page
- Check import statistics for actual count

## Future Enhancements

### Planned Features

1. **Status Management**
   - Mark properties not in import as "UNDER CONTRACT"
   - Restore previously "UNDER CONTRACT" properties to "AVAILABLE"

2. **Image Import**
   - Support image URLs in data
   - Automatic image download
   - Image storage in Supabase

3. **Bulk Operations**
   - Delete all properties for a state
   - Update status for multiple properties
   - Batch status changes

4. **Validation**
   - Pre-import data validation
   - Field format checking
   - Required field enforcement

5. **History**
   - Import history tracking
   - Rollback capability
   - Audit logs

## Technical Details

### Component Location
`/src/components/admin/HUDImport.jsx`

### Dependencies
- React 18
- Lucide React (icons)
- Shadcn UI (components)
- Supabase (database)

### Database Service
Uses `propertyService` from `/src/services/database/index.js`

### Methods Used
- `getPropertyByCaseNumber()` - Check for existing properties
- `addProperty()` - Insert new properties
- `updateProperty()` - Update existing properties

## Security Considerations

### Access Control
- ✅ Admin-only feature
- ✅ Requires authentication
- ✅ Protected by role-based access

### Data Validation
- ✅ Format detection
- ✅ Type conversion
- ✅ Error handling
- ⚠️ No SQL injection risk (using Supabase ORM)

### Best Practices
- Always review data before importing
- Don't import untrusted data sources
- Verify case numbers are legitimate
- Check for duplicate properties

## Support

### Getting Help

If you encounter issues:

1. Check this documentation
2. Review import statistics for error messages
3. Check browser console for errors
4. Verify Supabase connection
5. Contact system administrator

### Common Questions

**Q: Can I import properties from multiple states at once?**  
A: Yes, the data can include properties from any state.

**Q: What happens if I import the same property twice?**  
A: The system will update the existing property instead of creating a duplicate.

**Q: Can I undo an import?**  
A: Not currently. You'll need to manually delete or update properties.

**Q: How many properties can I import at once?**  
A: There's no hard limit, but we recommend batches of 50-100 for best performance.

**Q: Does this replace the HUD Sync feature?**  
A: No, HUD Sync is for automated scraping. HUD Import is for manual data entry from any source.

## Version History

### v1.0 (January 8, 2026)
- Initial release
- JSON and CSV support
- AI-powered field mapping
- Preview before import
- Import statistics
- Error handling

---

**Last Updated:** January 8, 2026  
**Status:** ✅ Production Ready
