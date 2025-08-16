import { useState, useEffect, useCallback } from 'react';
import type { FigmaCredentials } from '../types/figma';
import { getFigmaImageFills, getFigmaFileMetadata } from '../services/figmaApi';
import { imageCache } from '../utils/imageCache';
import { matchImageReferencesWithUrls, findNodesWithImageFills } from '../utils/imageFills';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import './ImageFills.css';

interface ImageFillsProps {
  credentials: FigmaCredentials;
  onLoad?: (imageFills: Record<string, string>) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function ImageFills({
  credentials,
  onLoad,
  onError,
  className = ''
}: ImageFillsProps) {
  const [imageFills, setImageFills] = useState<Record<string, string> | null>(null);
  const [processedImageUrls, setProcessedImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadStates, setImageLoadStates] = useState<Record<string, 'loading' | 'loaded' | 'error'>>({});

  // Fetch image fills from Figma API
  const fetchImageFills = useCallback(async () => {
    if (!credentials.fileId || !credentials.accessToken) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get both image fills and file metadata to match references
      const [fills, fileMetadata] = await Promise.all([
        getFigmaImageFills(credentials),
        getFigmaFileMetadata(credentials)
      ]);
      
      console.log('Received image fills:', fills);
      
      // Match image references from document with API URLs
      const matchResult = matchImageReferencesWithUrls(fileMetadata.document, fills);
      const actualImageFills = matchResult.matched;
      
      console.log('Matched image fills:', {
        total: Object.keys(fills).length,
        matched: Object.keys(actualImageFills).length,
        unmatched: matchResult.unmatched.length,
        matchResult
      });
      
      // If no direct image fills are available, try rendering nodes with image fills
      if (Object.keys(actualImageFills).length === 0 && matchResult.unmatched.length > 0) {
        console.log('No direct image fills found, trying node rendering approach...');
        
        const nodesWithImageFills = findNodesWithImageFills(fileMetadata.document);
        if (nodesWithImageFills.length > 0) {
          // Render the first few nodes that have image fills
          const nodeIds = nodesWithImageFills.slice(0, 10).map(node => node.id);
          const { getFigmaNodeImages } = await import('../services/figmaApi');
          const nodeImages = await getFigmaNodeImages(credentials, nodeIds, 'png', 1);
          
          // Create a mapping using node info instead of image references
          const nodeBasedImageFills: Record<string, string> = {};
          for (const [nodeId, imageUrl] of Object.entries(nodeImages)) {
            if (imageUrl) {
              const node = nodesWithImageFills.find(n => n.id === nodeId);
              const displayName = node ? `${node.name} (${node.type})` : nodeId;
              nodeBasedImageFills[displayName] = imageUrl;
            }
          }
          
          console.log('Node-based image fills:', nodeBasedImageFills);
          setImageFills(nodeBasedImageFills);
          
          // Initialize loading states for node-based images
          const initialStates: Record<string, 'loading' | 'loaded' | 'error'> = {};
          const processedUrls: Record<string, string> = {};
          
          for (const [nodeKey, imageUrl] of Object.entries(nodeBasedImageFills)) {
            initialStates[nodeKey] = 'loading';
            
            try {
              const processedUrl = await imageCache.fetchAndCacheImage(nodeKey, imageUrl);
              processedUrls[nodeKey] = processedUrl;
            } catch (error) {
              console.warn(`Failed to process node image ${nodeKey}:`, error);
              processedUrls[nodeKey] = imageUrl;
            }
          }
          
          setProcessedImageUrls(processedUrls);
          setImageLoadStates(initialStates);
          onLoad?.(nodeBasedImageFills);
          return;
        }
      }
      
      setImageFills(actualImageFills);
      
      // Initialize loading states for all images
      const initialStates: Record<string, 'loading' | 'loaded' | 'error'> = {};
      const processedUrls: Record<string, string> = {};
      
      // Process each image URL through the cache
      for (const [fillId, imageUrl] of Object.entries(actualImageFills)) {
        initialStates[fillId] = 'loading';
        
        // Try to get a cached or processed URL
        try {
          const processedUrl = await imageCache.fetchAndCacheImage(fillId, imageUrl);
          processedUrls[fillId] = processedUrl;
        } catch (error) {
          console.warn(`Failed to process image ${fillId}:`, error);
          processedUrls[fillId] = imageUrl; // Fallback to original
        }
      }
      
      setProcessedImageUrls(processedUrls);
      setImageLoadStates(initialStates);
      
      onLoad?.(actualImageFills);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load image fills';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [credentials, onLoad, onError]);

  useEffect(() => {
    fetchImageFills();
  }, [fetchImageFills]);

  // Handle individual image load success
  const handleImageLoad = (fillId: string) => {
    setImageLoadStates(prev => ({
      ...prev,
      [fillId]: 'loaded'
    }));
  };

  // Handle individual image load error
  const handleImageError = (fillId: string, imageUrl: string) => {
    console.log(`Failed to load image fill ${fillId}:`, imageUrl);
    setImageLoadStates(prev => ({
      ...prev,
      [fillId]: 'error'
    }));
  };

  // Retry function
  const handleRetry = () => {
    setError(null);
    setImageFills(null);
    setProcessedImageUrls({});
    setImageLoadStates({});
    fetchImageFills();
  };

  const containerClasses = `image-fills-container ${className}`.trim();

  // Show loading state
  if (loading) {
    return (
      <div className={containerClasses}>
        <div className="image-fills-loading">
          <LoadingSpinner size="medium" message="Loading image fills..." />
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !imageFills) {
    return (
      <div className={containerClasses}>
        <div className="image-fills-error">
          <ErrorMessage 
            error={error} 
            onRetry={handleRetry}
          />
        </div>
      </div>
    );
  }

  // Show empty state
  if (!imageFills || Object.keys(imageFills).length === 0) {
    return (
      <div className={containerClasses}>
        <div className="image-fills-empty">
          <span className="empty-icon">🖼️</span>
          <span className="empty-text">No image fills found in this file</span>
        </div>
      </div>
    );
  }

  // Show image fills
  return (
    <div className={containerClasses}>
      <div className="image-fills-header">
        <h3>Image Fills ({Object.keys(imageFills).length})</h3>
        <p className="image-fills-description">
          {Object.keys(imageFills).some(key => key.includes('(')) 
            ? 'Rendered nodes containing image fills' 
            : 'Images used as fills in this Figma file'}
        </p>
      </div>

      <div className="image-fills-grid">
        {Object.entries(imageFills).map(([fillId, originalUrl]) => {
          const processedUrl = processedImageUrls[fillId] || originalUrl;
          
          return (
            <div key={fillId} className="image-fill-item">
              <div className="image-fill-preview">
                {imageLoadStates[fillId] === 'loading' && (
                  <div className="image-fill-loading">
                    <LoadingSpinner size="small" />
                  </div>
                )}
                
                {imageLoadStates[fillId] === 'error' && (
                  <div className="image-fill-error-state">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">Failed to load</span>
                    <button 
                      className="retry-button"
                      onClick={() => {
                        setImageLoadStates(prev => ({ ...prev, [fillId]: 'loading' }));
                        // Force reload the image
                        const img = document.querySelector(`img[data-fill-id="${fillId}"]`) as HTMLImageElement;
                        if (img) {
                          img.src = img.src + '?retry=' + Date.now();
                        }
                      }}
                    >
                      Retry
                    </button>
                  </div>
                )}

                <img
                  src={processedUrl}
                  alt={`Image fill ${fillId}`}
                  data-fill-id={fillId}
                  className={`image-fill-image ${imageLoadStates[fillId] || 'loading'}`}
                  onLoad={() => handleImageLoad(fillId)}
                  onError={() => handleImageError(fillId, processedUrl)}
                  loading="lazy"
                />
              </div>

              <div className="image-fill-info">
                <div className="image-fill-id">
                  <label>{fillId.includes('(') ? 'Node:' : 'Fill ID:'}</label>
                  <span className="monospace">{fillId}</span>
                </div>
                <div className="image-fill-url">
                  <label>Image URL:</label>
                  <a 
                    href={originalUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="image-url-link"
                  >
                    View Image
                  </a>
                </div>
                {processedUrl !== originalUrl && (
                  <div className="image-fill-processed">
                    <label>Status:</label>
                    <span className="processed-indicator">Cached</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}