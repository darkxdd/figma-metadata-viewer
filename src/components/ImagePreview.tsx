import { useState, useEffect, useRef, useCallback } from 'react';
import type { FigmaCredentials } from '../types/figma';
import { getFigmaNodeImages } from '../services/figmaApi';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import './ImagePreview.css';

interface ImagePreviewProps {
  nodeId: string;
  credentials: FigmaCredentials;
  scale?: number;
  format?: 'png' | 'jpg' | 'svg' | 'pdf';
  lazy?: boolean;
  className?: string;
  alt?: string;
  onLoad?: (imageUrl: string) => void;
  onError?: (error: string) => void;
}

export default function ImagePreview({
  nodeId,
  credentials,
  scale = 1,
  format = 'png',
  lazy = true,
  className = '',
  alt = 'Node preview',
  onLoad,
  onError
}: ImagePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before the element is visible
        threshold: 0.1
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isVisible]);

  // Fetch image when visible
  const fetchImage = useCallback(async () => {
    if (!isVisible || imageUrl || loading) return;

    setLoading(true);
    setError(null);

    try {
      const images = await getFigmaNodeImages(
        credentials,
        [nodeId],
        format,
        scale
      );

      const url = images[nodeId];
      if (url) {
        setImageUrl(url);
        onLoad?.(url);
      } else {
        const errorMsg = 'Failed to render image for this node';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load image';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [isVisible, imageUrl, loading, credentials, nodeId, format, scale, onLoad, onError]);

  useEffect(() => {
    fetchImage();
  }, [fetchImage]);

  // Handle image load success
  const handleImageLoad = () => {
    // Image loaded successfully, nothing special to do
  };

  // Handle image load error
  const handleImageError = () => {
    const errorMsg = 'Failed to load rendered image';
    setError(errorMsg);
    onError?.(errorMsg);
  };

  // Retry function
  const handleRetry = () => {
    setError(null);
    setImageUrl(null);
    fetchImage();
  };

  const containerClasses = `image-preview-container ${className}`.trim();

  return (
    <div ref={containerRef} className={containerClasses}>
      {loading && (
        <div className="image-preview-loading">
          <LoadingSpinner size="small" message="Rendering..." />
        </div>
      )}

      {error && !loading && (
        <div className="image-preview-error">
          <ErrorMessage 
            error={error} 
            onRetry={handleRetry}
          />
        </div>
      )}

      {imageUrl && !loading && !error && (
        <div className="image-preview-wrapper">
          <img
            ref={imgRef}
            src={imageUrl}
            alt={alt}
            className="image-preview"
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading={lazy ? 'lazy' : 'eager'}
          />
        </div>
      )}

      {!loading && !error && !imageUrl && isVisible && (
        <div className="image-preview-placeholder">
          <span className="placeholder-icon">🖼️</span>
          <span className="placeholder-text">No preview available</span>
        </div>
      )}
    </div>
  );
}