import { supabase } from '../config/supabase';

/**
 * Get the public URL for an image stored in Supabase Storage
 * @param {string} imagePath - The path to the image (e.g., "properties/381_892971.jpg")
 * @returns {string|null} - The public URL or null if no path provided
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If it's already a full URL, return it
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Get public URL from Supabase Storage
  const { data } = supabase.storage
    .from('USAHUDhomes')
    .getPublicUrl(imagePath);
  
  return data?.publicUrl || null;
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
