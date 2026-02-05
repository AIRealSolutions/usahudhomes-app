# Image Reference Fixes - Summary

## Date: February 4, 2026

## Overview
Fixed multiple issues causing HUD property images not to load properly in the admin area.

---

## Changes Made

### 1. Fixed PropertyDetailsAdmin Component
**File**: `src/components/admin/PropertyDetailsAdmin.jsx`

**Issues Fixed**:
- ❌ Used wrong field name: `property.image_url` (doesn't exist in schema)
- ❌ No fallback to construct URL from case number

**Changes**:
```javascript
// BEFORE (Line 6)
import { getImageUrl } from '../../utils/imageUtils'

// Line 171
const imageUrl = getImageUrl(property.image_url)

// AFTER
import { getImageUrl, getImageUrlFromCaseNumber } from '../../utils/imageUtils'

// Line 171-172
// Fix: Use correct field name (main_image) and add fallback to case number
const imageUrl = getImageUrl(property.main_image) || getImageUrlFromCaseNumber(property.case_number)
```

**Impact**: Property detail pages now correctly display images using the `main_image` field and fall back to constructing the URL from the case number if needed.

---

### 2. Fixed PropertyAdmin Component
**File**: `src/components/admin/PropertyAdmin.jsx`

**Issues Fixed**:
- ❌ Displayed images directly without using utility functions
- ❌ No fallback to case number
- ❌ No error handling for missing/broken images

**Changes**:

**Added imports** (Line 25):
```javascript
import { getImageUrl, getImageUrlFromCaseNumber } from '../../utils/imageUtils'
```

**Updated image display** (Lines 764-783):
```javascript
// BEFORE
<div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
  {property.main_image ? (
    <img src={property.main_image} alt={property.address} className="w-full h-full object-cover" />
  ) : (
    <Home className="h-12 w-12 text-gray-400" />
  )}
</div>

// AFTER
<div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
  {(property.main_image || property.case_number) ? (
    <>
      <img 
        src={getImageUrl(property.main_image) || getImageUrlFromCaseNumber(property.case_number)} 
        alt={property.address} 
        className="w-full h-full object-cover" 
        onError={(e) => {
          e.target.style.display = 'none'
          e.target.nextSibling.style.display = 'flex'
        }}
      />
      <div className="hidden w-full h-full items-center justify-center">
        <Home className="h-12 w-12 text-gray-400" />
      </div>
    </>
  ) : (
    <Home className="h-12 w-12 text-gray-400" />
  )}
</div>
```

**Impact**: 
- Property listing now uses utility functions to properly construct image URLs
- Falls back to case number if `main_image` is empty
- Gracefully handles broken images with error handling
- Shows placeholder icon if image fails to load

---

### 3. Enhanced Image Utility Functions
**File**: `src/utils/imageUtils.js`

**Issues Fixed**:
- ❌ No support for legacy local paths
- ❌ No error handling
- ❌ Hardcoded Supabase URL instead of using client

**Changes**:

**Updated `getImageUrl()` function** (Lines 35-63):
```javascript
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // Fix .jog extension first
  imagePath = fixImageExtension(imagePath);
  
  // If it's already a full URL, return it
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Handle local paths (legacy support) - NEW
  if (imagePath.startsWith('/property-images/') || imagePath.startsWith('property-images/')) {
    return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  }
  
  // Get public URL from Supabase Storage with error handling - ENHANCED
  try {
    const { data } = supabase.storage
      .from('USAHUDhomes')
      .getPublicUrl(imagePath);
    
    return data?.publicUrl || null;
  } catch (error) {
    console.error('Error getting image URL:', error);
    return null;
  }
};
```

**Updated `getImageUrlFromCaseNumber()` function** (Lines 70-85):
```javascript
export const getImageUrlFromCaseNumber = (caseNumber) => {
  if (!caseNumber) return null;
  const filename = caseNumberToFilename(caseNumber);
  
  // Use Supabase client instead of hardcoded URL - CHANGED
  try {
    const { data } = supabase.storage
      .from('USAHUDhomes')
      .getPublicUrl(filename);
    
    return data?.publicUrl || null;
  } catch (error) {
    console.error('Error constructing image URL from case number:', error);
    return null;
  }
};
```

**Impact**:
- Now supports legacy local images in `/public/property-images/`
- Better error handling with try-catch blocks
- Uses Supabase client for more reliable URL generation
- Logs errors to console for debugging

---

### 4. Created Database Audit Script
**File**: `scripts/audit_property_images.sql`

**Purpose**: SQL queries to identify properties with image issues

**Features**:
- Find properties with missing `main_image`
- Identify local file paths (legacy)
- Detect `.jog` extension typos
- Find non-standard extensions
- Show summary statistics
- Identify active properties without images (high priority)
- Optional fix queries (commented out for safety)

**Usage**: Run in Supabase SQL Editor

---

### 5. Created Node.js Audit & Fix Script
**File**: `scripts/audit_and_fix_images.js`

**Purpose**: Automated audit and fix tool for image references

**Features**:
- Audits all properties for image issues
- Checks if images exist in Supabase Storage
- Can automatically fix common issues:
  - Convert `.jog` to `.jpg`
  - Construct URLs from case numbers
  - Update database records
- Safe mode: audit only by default
- Requires `--fix` flag to make changes

**Usage**:
```bash
# Audit only
node scripts/audit_and_fix_images.js --audit

# Audit and fix
node scripts/audit_and_fix_images.js --fix
```

---

## Testing Recommendations

### 1. Visual Testing
- [ ] Open admin dashboard
- [ ] Navigate to Properties section
- [ ] Verify images display in property listing
- [ ] Click on a property to view details
- [ ] Verify image displays on detail page
- [ ] Test with properties that have:
  - Valid `main_image` URL
  - Empty `main_image` (should use case number)
  - Invalid/broken image URL (should show placeholder)

### 2. Console Testing
- [ ] Open browser DevTools Console
- [ ] Check for image loading errors (404s)
- [ ] Verify error messages are logged for debugging
- [ ] Ensure no JavaScript errors

### 3. Database Testing
- [ ] Run `scripts/audit_property_images.sql` in Supabase
- [ ] Review audit results
- [ ] Identify properties needing attention
- [ ] Optionally run fix queries

### 4. Automated Testing
- [ ] Run `node scripts/audit_and_fix_images.js --audit`
- [ ] Review audit report
- [ ] If issues found, run with `--fix` flag
- [ ] Re-run audit to verify fixes

---

## Known Limitations

1. **Legacy Images**: Images in `/public/property-images/` with non-standard naming (e.g., `387-111612-main.jpeg`) won't automatically match case numbers. These need manual migration.

2. **Storage Bucket Access**: Assumes Supabase Storage bucket `USAHUDhomes` is publicly accessible. If not, images won't load.

3. **Case Number Format**: Assumes case numbers follow format `XXX-XXXXXX`. Non-standard formats may not work with the filename conversion.

4. **Image Verification**: The Node.js script checks if images exist in storage, but doesn't verify they're actually valid image files.

---

## Next Steps

### Immediate
1. ✅ Deploy code changes to production
2. ✅ Run audit script to assess current state
3. ✅ Fix high-priority issues (active properties without images)

### Short-term
1. Migrate legacy images from `/public/property-images/` to Supabase Storage
2. Standardize all filenames to follow convention: `{case_number}.jpg`
3. Update database records with correct image references

### Long-term
1. Implement image upload validation (enforce naming convention)
2. Add image preview in admin forms
3. Create bulk image management tool
4. Set up automated image optimization (resize, compress)
5. Add image CDN for better performance

---

## Rollback Instructions

If issues occur, revert these files to previous versions:

```bash
git checkout HEAD~1 src/components/admin/PropertyDetailsAdmin.jsx
git checkout HEAD~1 src/components/admin/PropertyAdmin.jsx
git checkout HEAD~1 src/utils/imageUtils.js
```

---

## Support

For issues or questions:
1. Check browser console for error messages
2. Run audit script to diagnose database issues
3. Review this document for troubleshooting tips
4. Contact development team

---

## Changelog

**2026-02-04**: Initial fixes implemented
- Fixed PropertyDetailsAdmin field reference
- Enhanced PropertyAdmin with utility functions and error handling
- Improved image utility functions with legacy support
- Created audit and fix scripts
