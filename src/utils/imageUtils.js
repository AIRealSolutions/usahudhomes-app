import { supabase } from '../config/supabase';

/**
 * Fix image URL by converting .jog extension to .jpg
 * @param {string} imageUrl - The original image URL
 * @returns {string} - Fixed image URL
 */
export const fixImageExtension = (imageUrl) => {
  if (!imageUrl) return imageUrl;
  
  // Convert .jog to .jpg
  if (imageUrl.endsWith('.jog')) {
    return imageUrl.replace(/\.jog$/, '.jpg');
  }
  
  return imageUrl;
};

/**
 * Convert case number to storage filename format
 * Case numbers use hyphens (333-333333) but storage files use underscores (333_333333.jpg)
 * @param {string} caseNumber - The case number (e.g., "333-333333")
 * @returns {string} - Storage filename (e.g., "333_333333.jpg")
 */
export const caseNumberToFilename = (caseNumber) => {
  if (!caseNumber) return null;
  return caseNumber.replace(/-/g, '_') + '.jpg';
};

/**
 * Get the public URL for an image stored in Supabase Storage
 * @param {string} imagePath - The path to the image (e.g., "properties/381_892971.jpg") or case number
 * @returns {string|null} - The public URL or null if no path provided
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // Fix .jog extension first
  imagePath = fixImageExtension(imagePath);
  
  // If it's already a full URL, return it
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Handle local paths (legacy support)
  if (imagePath.startsWith('/property-images/') || imagePath.startsWith('property-images/')) {
    // Return as-is for local public folder images
    return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  }
  
  // Get public URL from Supabase Storage
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

/**
 * Get image URL from case number
 * @param {string} caseNumber - The property case number (e.g., "333-333333")
 * @returns {string|null} - The full image URL
 */
export const getImageUrlFromCaseNumber = (caseNumber) => {
  if (!caseNumber) return null;
  const filename = caseNumberToFilename(caseNumber);
  
  // Use Supabase client to get public URL (more reliable)
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

/**
 * Get image URL with fallback to placeholder
 * @param {string} imagePath - The path to the image
 * @param {string} fallback - Fallback URL if image path is invalid
 * @returns {string} - The image URL or fallback
 */
export const getImageUrlWithFallback = (imagePath, fallback = null) => {
  return getImageUrl(imagePath) || fallback;
};
