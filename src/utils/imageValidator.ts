/**
 * Utility functions for validating and testing image URLs
 */

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  details: {
    isHttps: boolean;
    isFigmaUrl: boolean;
    hasValidExtension: boolean;
    canFetch: boolean;
  };
}

/**
 * Validate an image URL and test if it can be loaded
 */
export async function validateImageUrl(url: string): Promise<ImageValidationResult> {
  const result: ImageValidationResult = {
    isValid: false,
    details: {
      isHttps: false,
      isFigmaUrl: false,
      hasValidExtension: false,
      canFetch: false
    }
  };

  try {
    const parsedUrl = new URL(url);
    
    // Check if HTTPS
    result.details.isHttps = parsedUrl.protocol === 'https:';
    
    // Check if Figma URL
    result.details.isFigmaUrl = parsedUrl.hostname.includes('figma');
    
    // Check for valid image extensions or Figma-style URLs
    const pathname = parsedUrl.pathname.toLowerCase();
    result.details.hasValidExtension = 
      pathname.includes('.png') || 
      pathname.includes('.jpg') || 
      pathname.includes('.jpeg') || 
      pathname.includes('.gif') || 
      pathname.includes('.webp') ||
      result.details.isFigmaUrl; // Figma URLs might not have extensions
    
    // Try to fetch the URL
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors' // Avoid CORS issues for testing
      });
      result.details.canFetch = true;
    } catch (fetchError) {
      // Try with a simple GET request as fallback
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });
        result.details.canFetch = true;
      } catch (imgError) {
        result.details.canFetch = false;
        result.error = `Cannot load image: ${imgError}`;
      }
    }
    
    // Determine if valid
    result.isValid = result.details.isHttps && result.details.hasValidExtension;
    
  } catch (error) {
    result.error = `Invalid URL: ${error}`;
  }

  return result;
}

/**
 * Test multiple image URLs and return validation results
 */
export async function validateImageUrls(urls: Record<string, string>): Promise<Record<string, ImageValidationResult>> {
  const results: Record<string, ImageValidationResult> = {};
  
  const validationPromises = Object.entries(urls).map(async ([fillId, url]) => {
    const validation = await validateImageUrl(url);
    results[fillId] = validation;
  });
  
  await Promise.all(validationPromises);
  
  return results;
}