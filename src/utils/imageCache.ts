/**
 * Image caching and loading utilities for Figma images
 */

interface CachedImage {
  url: string;
  timestamp: number;
  blob?: Blob;
}

class ImageCache {
  private cache = new Map<string, CachedImage>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if a cached image is still valid
   */
  private isValidCache(cached: CachedImage): boolean {
    return Date.now() - cached.timestamp < this.CACHE_DURATION;
  }

  /**
   * Get a cached image URL or return the original if not cached/expired
   */
  getCachedUrl(fillId: string, originalUrl: string): string {
    const cached = this.cache.get(fillId);
    
    if (cached && this.isValidCache(cached)) {
      if (cached.blob) {
        return URL.createObjectURL(cached.blob);
      }
      return cached.url;
    }

    // Cache the original URL
    this.cache.set(fillId, {
      url: originalUrl,
      timestamp: Date.now()
    });

    return originalUrl;
  }

  /**
   * Try to fetch and cache an image as a blob to avoid CORS issues
   */
  async fetchAndCacheImage(fillId: string, imageUrl: string): Promise<string> {
    try {
      // Try to fetch the image with credentials
      const response = await fetch(imageUrl, {
        mode: 'cors',
        credentials: 'omit'
      });

      if (response.ok) {
        const blob = await response.blob();
        const cachedImage: CachedImage = {
          url: imageUrl,
          timestamp: Date.now(),
          blob
        };
        
        this.cache.set(fillId, cachedImage);
        return URL.createObjectURL(blob);
      }
    } catch (error) {
      console.warn(`Failed to fetch image ${fillId}:`, error);
    }

    // Fallback to original URL
    return imageUrl;
  }

  /**
   * Clear expired cache entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= this.CACHE_DURATION) {
        if (cached.blob) {
          URL.revokeObjectURL(URL.createObjectURL(cached.blob));
        }
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    for (const [, cached] of this.cache.entries()) {
      if (cached.blob) {
        URL.revokeObjectURL(URL.createObjectURL(cached.blob));
      }
    }
    this.cache.clear();
  }
}

// Export singleton instance
export const imageCache = new ImageCache();

// Clean up expired cache entries every 5 minutes
setInterval(() => {
  imageCache.clearExpired();
}, 5 * 60 * 1000);