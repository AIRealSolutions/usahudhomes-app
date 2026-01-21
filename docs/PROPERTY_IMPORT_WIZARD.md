# Property Import Wizard Documentation

## Overview

The Property Import Wizard is a powerful tool for bulk importing and updating HUD property listings from JSON or CSV files. It provides state-specific import capabilities with intelligent property management that preserves data integrity across different states.

---

## Key Features

### 🎯 Smart Import Logic

The wizard implements sophisticated state-specific import logic:

1. **Add New Properties**: Properties in the import file that don't exist in the database are added as new records
2. **Update Existing Properties**: Properties that already exist (matched by case_number) are updated with new data
3. **Mark as Pending**: Properties in the selected state that are NOT in the import file are automatically marked as "Pending"
4. **Preserve Other States**: Properties from other states are completely unaffected by the import

### 📁 File Format Support

- **JSON**: Array of property objects
- **CSV**: Standard comma-separated values with headers

### 🔍 Data Validation

- Required field validation
- Data type checking (numbers, strings)
- State matching verification
- Duplicate detection
- Comprehensive error reporting

### 📊 Multi-Step Interface

1. **Step 1: Upload** - Select state and upload file
2. **Step 2: Preview** - Review parsed data in table format
3. **Step 3: Confirm** - See import summary and confirm changes
4. **Step 4: Results** - View detailed import results

---

## Access the Import Wizard

### From Property Management Dashboard

1. Log in to the admin dashboard
2. Navigate to **Property Management**
3. Click the green **"Import Properties"** button in the top-right corner

### Direct URL

Navigate directly to: `https://usahudhomes.com/admin/properties/import`

---

## Step-by-Step Guide

### Step 1: Upload File

#### Select State
Choose the state for which you're importing properties. **Important**: Only properties in this state will be affected by the import.

Available states:
- NC (North Carolina)
- TN (Tennessee)
- SC, VA, GA, FL, AL, MS, LA, TX

#### Choose File
Click "Choose a file" or drag and drop a JSON or CSV file.

**Supported formats:**
- `.json` - JSON array of property objects
- `.csv` - Comma-separated values with headers

#### Validation
The wizard automatically validates your file:
- Checks for required fields
- Validates data types
- Verifies state matches selection
- Reports any errors before proceeding

**If validation fails:**
- Review the error messages
- Fix the issues in your file
- Upload the corrected file

### Step 2: Preview Data

#### Review Parsed Data
The wizard displays your data in a table format showing:
- Case Number
- Address
- City
- Price
- Bedrooms
- Bathrooms
- Status

**Preview shows:**
- First 10 records (if more than 10)
- Total record count
- Selected state

#### Verify Data
Check that:
- All data parsed correctly
- Values are in the correct columns
- No obvious errors or missing data

**Actions:**
- **Back**: Return to Step 1 to upload a different file
- **Next**: Proceed to analyze changes

### Step 3: Confirm Import

#### Import Summary

The wizard analyzes your import and shows:

**New Properties** (Green)
- Properties that will be added to the database
- Count of new records

**Updated Properties** (Blue)
- Existing properties that will be updated
- Count of records to update
- Matched by case_number

**Pending Properties** (Yellow)
- Properties in the selected state NOT in your import file
- Will be marked as "Pending" status
- Count of properties affected
- List of properties (up to 20 shown)

#### Important Notes

The confirmation screen displays critical information:
- Only affects properties in the selected state
- Shows exact counts for each category
- Lists properties that will be marked as "Pending"
- Other states remain unaffected

#### Review Pending Properties

Pay special attention to the "Pending Properties" list:
- These are properties currently in your database
- They are NOT in your import file
- They will be marked as "Pending" (not deleted)
- Only properties in the selected state

**Common reasons for pending properties:**
- Property sold and removed from HUD listing
- Property no longer available
- Property moved to different status

**Actions:**
- **Back**: Return to preview
- **Confirm and Import**: Execute the import

### Step 4: Results

#### Success Summary

After import completes, you'll see:

**Import Statistics:**
- New Properties Added (count)
- Properties Updated (count)
- Marked as Pending (count)

**Success Message:**
- Confirms import completed
- Shows state that was updated

#### Error Handling

If any errors occurred:
- Errors are listed with details
- Successful operations still complete
- Review errors and retry if needed

**Actions:**
- **Import Another File**: Start a new import
- **View Properties**: Return to Property Management dashboard

---

## File Format Specifications

### Required Fields

Every property record MUST include:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `case_number` | String | Unique HUD case number | "387-123456" |
| `address` | String | Property street address | "123 Main St" |
| `city` | String | City name | "Raleigh" |
| `state` | String | State code (must match selected state) | "NC" |

### Optional Fields

Additional fields you can include:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `list_price` | Number | Listing price in dollars | 125000 |
| `bedrooms` | Number | Number of bedrooms | 3 |
| `bathrooms` | Number | Number of bathrooms (decimal allowed) | 2.5 |
| `status` | String | Property status | "Available", "Under Contract", "Sold" |
| `main_image` | String | URL to property image | "https://..." |
| `property_type` | String | Type of property | "Single Family", "Condo" |
| `square_feet` | Number | Interior square footage | 1800 |
| `lot_size` | String | Lot size description | "0.25 acres" |
| `year_built` | Number | Year property was built | 1995 |
| `description` | String | Property description | "Beautiful home..." |

---

## JSON Format Example

### Single Property
```json
[
  {
    "case_number": "387-123456",
    "address": "123 Main St",
    "city": "Raleigh",
    "state": "NC",
    "list_price": 125000,
    "bedrooms": 3,
    "bathrooms": 2,
    "status": "Available",
    "main_image": "https://example.com/image.jpg",
    "property_type": "Single Family",
    "square_feet": 1800,
    "lot_size": "0.25 acres",
    "year_built": 1995,
    "description": "Beautiful 3BR/2BA home in great condition"
  }
]
```

### Multiple Properties
```json
[
  {
    "case_number": "387-123456",
    "address": "123 Main St",
    "city": "Raleigh",
    "state": "NC",
    "list_price": 125000,
    "bedrooms": 3,
    "bathrooms": 2,
    "status": "Available"
  },
  {
    "case_number": "387-789012",
    "address": "456 Oak Ave",
    "city": "Durham",
    "state": "NC",
    "list_price": 95000,
    "bedrooms": 2,
    "bathrooms": 1,
    "status": "Available"
  },
  {
    "case_number": "387-345678",
    "address": "789 Pine St",
    "city": "Charlotte",
    "state": "NC",
    "list_price": 150000,
    "bedrooms": 4,
    "bathrooms": 2.5,
    "status": "Under Contract"
  }
]
```

### Minimal Required Fields Only
```json
[
  {
    "case_number": "387-123456",
    "address": "123 Main St",
    "city": "Raleigh",
    "state": "NC"
  }
]
```

---

## CSV Format Example

### With All Fields
```csv
case_number,address,city,state,list_price,bedrooms,bathrooms,status,main_image,property_type,square_feet,lot_size,year_built,description
387-123456,123 Main St,Raleigh,NC,125000,3,2,Available,https://example.com/image.jpg,Single Family,1800,0.25 acres,1995,Beautiful home
387-789012,456 Oak Ave,Durham,NC,95000,2,1,Available,https://example.com/image2.jpg,Condo,1200,N/A,2005,Great condo
387-345678,789 Pine St,Charlotte,NC,150000,4,2.5,Under Contract,https://example.com/image3.jpg,Single Family,2200,0.5 acres,1988,Spacious home
```

### Minimal Required Fields Only
```csv
case_number,address,city,state
387-123456,123 Main St,Raleigh,NC
387-789012,456 Oak Ave,Durham,NC
387-345678,789 Pine St,Charlotte,NC
```

### With Common Fields
```csv
case_number,address,city,state,list_price,bedrooms,bathrooms,status
387-123456,123 Main St,Raleigh,NC,125000,3,2,Available
387-789012,456 Oak Ave,Durham,NC,95000,2,1,Available
387-345678,789 Pine St,Charlotte,NC,150000,4,2.5,Under Contract
```

---

## Download Sample Files

The Import Wizard provides built-in sample file downloads:

### JSON Sample
Click **"Download JSON Sample"** button in Step 1 to download a sample JSON file with one property record including all fields.

### CSV Sample
Click **"Download CSV Sample"** button in Step 1 to download a sample CSV file with headers and one property record.

**Use these samples as templates:**
1. Download the sample file
2. Replace the sample data with your actual property data
3. Keep the same structure and field names
4. Upload to the wizard

---

## Common Use Cases

### 1. Weekly HUD Listing Update

**Scenario**: You receive weekly HUD listing updates for North Carolina properties.

**Process:**
1. Export HUD data to CSV or JSON
2. Open Import Wizard
3. Select state: **NC**
4. Upload the file
5. Review preview
6. Confirm import
7. **Result**: 
   - New NC properties are added
   - Existing NC properties are updated
   - NC properties not in the file are marked "Pending"
   - TN properties are unaffected

### 2. Adding New State Properties

**Scenario**: You're expanding to Tennessee and have a list of TN properties.

**Process:**
1. Prepare TN property data file
2. Open Import Wizard
3. Select state: **TN**
4. Upload the file
5. **Result**:
   - All TN properties are added as new
   - No existing properties updated (first import)
   - NC properties remain unchanged

### 3. Updating Specific Properties

**Scenario**: Several properties have price changes or status updates.

**Process:**
1. Create file with ONLY the properties that changed
2. Include updated fields (price, status, etc.)
3. Select appropriate state
4. Upload file
5. **Result**:
   - Only listed properties are updated
   - Other properties in that state are marked "Pending"
   - **Important**: If you only want to update specific properties without marking others as pending, include ALL current properties in your import file

### 4. Full State Refresh

**Scenario**: Complete refresh of all properties in a state.

**Process:**
1. Get complete current listing from HUD
2. Export all active properties to file
3. Select state
4. Upload file
5. **Result**:
   - All current properties updated
   - New properties added
   - Sold/removed properties marked "Pending"
   - Clean, current state listing

---

## Best Practices

### Before Import

1. **Backup Data**: Although the import is safe, consider noting current property counts
2. **Verify State**: Double-check you've selected the correct state
3. **Clean Data**: Remove any test or invalid records from your file
4. **Check Format**: Ensure field names match exactly (case-sensitive)
5. **Test Small First**: Try importing a small file first to verify format

### During Import

1. **Review Preview**: Always check the preview table in Step 2
2. **Check Counts**: Verify the counts in Step 3 make sense
3. **Review Pending List**: Look at properties that will be marked "Pending"
4. **Confirm State**: Verify the state shown is correct

### After Import

1. **Review Results**: Check the success counts match expectations
2. **Verify Data**: Spot-check a few properties in Property Management
3. **Check Pending**: Review properties marked as "Pending"
4. **Update Status**: Manually update any "Pending" properties that should have different status

### Data Quality

1. **Consistent Formatting**: Keep address formats consistent
2. **Valid States**: Use 2-letter state codes (NC, TN, etc.)
3. **Numeric Fields**: Ensure prices, beds, baths are numbers
4. **Status Values**: Use standard status values: "Available", "Under Contract", "Sold", "Pending"
5. **Case Numbers**: Ensure case numbers are unique and formatted correctly

---

## Troubleshooting

### Validation Errors

**Error: "Missing required field"**
- **Cause**: A row is missing case_number, address, city, or state
- **Solution**: Add the missing field to all rows

**Error: "State does not match selected state"**
- **Cause**: A property's state field doesn't match the state you selected
- **Solution**: Either change the state selection or fix the data

**Error: "must be a number"**
- **Cause**: Non-numeric value in list_price, bedrooms, bathrooms, etc.
- **Solution**: Remove non-numeric characters or leave field empty

### File Parsing Errors

**Error: "JSON must be an array"**
- **Cause**: JSON file is not formatted as an array
- **Solution**: Wrap properties in square brackets: `[{...}, {...}]`

**Error: "CSV must have headers"**
- **Cause**: CSV file missing header row
- **Solution**: Add header row with field names

### Import Errors

**Error: "Error inserting new properties"**
- **Cause**: Database constraint violation (duplicate case_number, etc.)
- **Solution**: Check for duplicate case numbers in your file

**Error: "Error updating properties"**
- **Cause**: Database error during update
- **Solution**: Review error message, check data validity

### Common Mistakes

**Mistake**: All properties marked as "Pending" after import
- **Cause**: State mismatch - imported properties have different state code
- **Solution**: Verify state field in data matches selected state exactly

**Mistake**: No properties updated
- **Cause**: Case numbers don't match existing records
- **Solution**: Verify case_number format matches database exactly

**Mistake**: Wrong state properties affected
- **Cause**: Selected wrong state in Step 1
- **Solution**: Always verify state selection before confirming import

---

## Technical Details

### Database Operations

The import wizard performs these operations in order:

1. **Fetch Existing Properties**
   ```sql
   SELECT * FROM properties WHERE state = 'NC'
   ```

2. **Insert New Properties**
   ```sql
   INSERT INTO properties (case_number, address, city, state, ...)
   VALUES (...)
   ```

3. **Update Existing Properties**
   ```sql
   UPDATE properties 
   SET address = ?, city = ?, list_price = ?, ...
   WHERE case_number = ?
   ```

4. **Mark as Pending**
   ```sql
   UPDATE properties 
   SET status = 'Pending'
   WHERE case_number IN (...)
   AND state = 'NC'
   ```

### Matching Logic

Properties are matched by **case_number**:
- **Exact match**: Property is updated
- **No match**: Property is added as new
- **In database but not in import**: Marked as "Pending"

### State Isolation

All operations are state-specific:
```sql
WHERE state = 'NC'
```

This ensures:
- Only selected state is affected
- Other states remain unchanged
- No cross-state contamination

---

## Frequently Asked Questions

### Q: What happens to properties marked as "Pending"?

**A**: They remain in the database with status changed to "Pending". They are not deleted. You can:
- View them in Property Management (filter by "Pending" status)
- Manually change their status if needed
- They'll be updated if included in a future import

### Q: Can I import multiple states at once?

**A**: No. Imports are state-specific to ensure data integrity. To import multiple states:
1. Import first state
2. Return to wizard
3. Import second state
4. Repeat as needed

### Q: What if I make a mistake?

**A**: Properties are updated, not deleted. You can:
- Run another import with correct data
- Manually edit properties in Property Management
- Update "Pending" properties back to "Available" if needed

### Q: Can I undo an import?

**A**: There's no automatic undo, but you can:
- Run a new import with previous data
- Manually update affected properties
- Change "Pending" properties back to their original status

### Q: How long does an import take?

**A**: Depends on file size:
- Small (< 50 properties): A few seconds
- Medium (50-200 properties): 10-30 seconds
- Large (200+ properties): 30-60 seconds

### Q: What's the maximum file size?

**A**: The wizard can handle:
- JSON: Up to 1000 properties
- CSV: Up to 1000 rows
- File size: Up to 5MB

For larger imports, split into multiple files.

### Q: Do I need to include all fields?

**A**: No. Only these fields are required:
- case_number
- address
- city
- state

All other fields are optional.

### Q: What happens if a case_number appears twice in my file?

**A**: The wizard will show a validation error. Each case_number must be unique within the import file.

### Q: Can I change the status of properties during import?

**A**: Yes. Include a "status" field in your import file with the desired status:
- "Available"
- "Under Contract"
- "Sold"
- "Pending"

### Q: Will images be imported?

**A**: Yes, if you include a "main_image" field with a valid image URL. The URL should be publicly accessible.

---

## Support

### Need Help?

If you encounter issues:

1. **Review this documentation** - Most questions are answered here
2. **Check validation errors** - The wizard provides detailed error messages
3. **Try sample files** - Download and test with sample files first
4. **Contact support** - Email 9103636147@verizon.net

### Reporting Issues

When reporting issues, include:
- State you were importing
- File format (JSON or CSV)
- Number of records
- Error message (if any)
- Screenshot of the error

---

## Version History

### Version 1.0.0 (January 2026)
- Initial release
- Multi-step import wizard
- JSON and CSV support
- State-specific import logic
- Validation and error reporting
- Sample file downloads
- Import summary and results

---

## Related Documentation

- [Property Management System](./PROPERTY_MANAGEMENT_SYSTEM.md)
- [Social Media Quick Guide](./SOCIAL_MEDIA_QUICK_GUIDE.md)

---

**Last Updated**: January 20, 2026  
**Status**: Production Ready  
**Version**: 1.0.0
