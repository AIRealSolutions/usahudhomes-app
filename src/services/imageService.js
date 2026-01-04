/**
 * Image Service
 * Handles image downloads, processing, and storage for property imports
 */

/**
 * Download image from URL and convert to base64
 * This allows storing images temporarily before uploading to storage
 */
export async function downloadImageAsBase64(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

/**
 * Download multiple images from URLs
 */
export async function downloadImages(imageUrls) {
  const results = [];
  
  for (const url of imageUrls) {
    try {
      const base64 = await downloadImageAsBase64(url);
      results.push({
        url,
        base64,
        success: true
      });
    } catch (error) {
      results.push({
        url,
        error: error.message,
        success: false
      });
    }
  }

  return results;
}

/**
 * Validate image URL
 */
export function isValidImageUrl(url) {
  try {
    const urlObj = new URL(url);
    const ext = urlObj.pathname.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  } catch {
    return false;
  }
}

/**
 * Extract image URLs from text
 */
export function extractImageUrls(text) {
  const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/gi;
  const matches = text.match(urlRegex);
  return matches || [];
}

/**
 * Process property images for import
 * Downloads images and prepares them for database storage
 */
export async function processPropertyImages(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) {
    return [];
  }

  console.log(`Processing ${imageUrls.length} property images...`);
  
  const validUrls = imageUrls.filter(isValidImageUrl);
  if (validUrls.length === 0) {
    console.warn('No valid image URLs found');
    return [];
  }

  const downloadedImages = await downloadImages(validUrls);
  const successfulImages = downloadedImages.filter(img => img.success);

  console.log(`Successfully downloaded ${successfulImages.length}/${imageUrls.length} images`);

  return successfulImages.map((img, index) => ({
    url: img.url,
    data: img.base64,
    is_primary: index === 0,
    display_order: index
  }));
}

/**
 * Upload image to Supabase storage
 * Note: This requires Supabase storage to be configured
 */
export async function uploadImageToStorage(file, propertyId) {
  // TODO: Implement Supabase storage upload
  // For now, we'll store images as base64 in the database
  // In production, you should upload to Supabase Storage or S3
  
  console.warn('Image upload to storage not yet implemented. Storing as base64.');
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({
        url: reader.result,
        storage_path: null
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Handle file upload from user's computer
 */
export async function handleFileUpload(file) {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('File must be an image'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Image must be less than 5MB'));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        data: reader.result
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Handle multiple file uploads
 */
export async function handleMultipleFileUploads(files) {
  const results = [];
  
  for (const file of files) {
    try {
      const result = await handleFileUpload(file);
      results.push({
        ...result,
        success: true
      });
    } catch (error) {
      results.push({
        name: file.name,
        error: error.message,
        success: false
      });
    }
  }

  return results;
}

export default {
  downloadImageAsBase64,
  downloadImages,
  isValidImageUrl,
  extractImageUrls,
  processPropertyImages,
  uploadImageToStorage,
  handleFileUpload,
  handleMultipleFileUploads
};
