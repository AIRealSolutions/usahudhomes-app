-- ============================================
-- Property Image Audit Script
-- USAHUDhomes Database
-- ============================================
-- Purpose: Identify properties with missing or problematic image references
-- Run this in Supabase SQL Editor to diagnose image loading issues

-- 1. Properties with missing main_image
SELECT 
    case_number,
    address,
    city,
    state,
    main_image,
    'Missing main_image' as issue
FROM properties
WHERE main_image IS NULL OR main_image = ''
ORDER BY created_at DESC;

-- 2. Properties with local file paths (legacy)
SELECT 
    case_number,
    address,
    city,
    state,
    main_image,
    'Local file path detected' as issue
FROM properties
WHERE main_image LIKE '/property-images/%' 
   OR main_image LIKE 'property-images/%'
ORDER BY created_at DESC;

-- 3. Properties with .jog extension (typo)
SELECT 
    case_number,
    address,
    city,
    state,
    main_image,
    'Incorrect .jog extension' as issue
FROM properties
WHERE main_image LIKE '%.jog'
ORDER BY created_at DESC;

-- 4. Properties with non-standard extensions
SELECT 
    case_number,
    address,
    city,
    state,
    main_image,
    'Non-standard extension' as issue
FROM properties
WHERE main_image IS NOT NULL 
  AND main_image != ''
  AND main_image NOT LIKE '%.jpg'
  AND main_image NOT LIKE '%.jpeg'
  AND main_image NOT LIKE '%.png'
  AND main_image NOT LIKE '%.webp'
  AND main_image NOT LIKE 'http%'
ORDER BY created_at DESC;

-- 5. Summary statistics
SELECT 
    COUNT(*) as total_properties,
    COUNT(main_image) as properties_with_image,
    COUNT(*) - COUNT(main_image) as properties_without_image,
    ROUND(100.0 * COUNT(main_image) / COUNT(*), 2) as percentage_with_image
FROM properties;

-- 6. Image reference patterns
SELECT 
    CASE 
        WHEN main_image IS NULL OR main_image = '' THEN 'Empty/NULL'
        WHEN main_image LIKE 'http%' THEN 'Full URL'
        WHEN main_image LIKE '/property-images/%' THEN 'Local path'
        WHEN main_image LIKE '%.jog' THEN 'Typo (.jog)'
        WHEN main_image LIKE '%.jpg' THEN 'Filename only (.jpg)'
        WHEN main_image LIKE '%.jpeg' THEN 'Filename only (.jpeg)'
        WHEN main_image LIKE '%.webp' THEN 'Filename only (.webp)'
        ELSE 'Other'
    END as image_pattern,
    COUNT(*) as count
FROM properties
GROUP BY image_pattern
ORDER BY count DESC;

-- 7. Properties with hyphens in filenames (should be underscores)
SELECT 
    case_number,
    address,
    city,
    state,
    main_image,
    'Filename contains hyphens (should be underscores)' as issue
FROM properties
WHERE main_image LIKE '%-%'
  AND main_image NOT LIKE 'http%'
  AND main_image IS NOT NULL
  AND main_image != ''
ORDER BY created_at DESC;

-- 8. Active properties without images (high priority)
SELECT 
    case_number,
    address,
    city,
    state,
    status,
    price,
    'Active property missing image' as issue
FROM properties
WHERE (main_image IS NULL OR main_image = '')
  AND is_active = true
  AND status IN ('AVAILABLE', 'BIDS OPEN', 'PRICE REDUCED')
ORDER BY price DESC;

-- ============================================
-- OPTIONAL: Fix Scripts (Run carefully!)
-- ============================================

-- Fix .jog extensions to .jpg
-- UNCOMMENT TO RUN:
-- UPDATE properties 
-- SET main_image = REPLACE(main_image, '.jog', '.jpg')
-- WHERE main_image LIKE '%.jog';

-- Construct image URLs from case numbers for empty main_image
-- UNCOMMENT TO RUN:
-- UPDATE properties 
-- SET main_image = REPLACE(case_number, '-', '_') || '.jpg'
-- WHERE (main_image IS NULL OR main_image = '')
--   AND case_number IS NOT NULL;

-- Note: After running fixes, verify images are actually accessible
-- by checking the Supabase Storage bucket
