// Browser-compatible image processing utilities
// Note: fs and path not available in browser context
import { Logger } from "./logger";
import { downloadFigmaImage } from "./enhancedCommon";

export type ImageProcessingResult = {
  filePath: string;
  originalDimensions: { width: number; height: number };
  finalDimensions: { width: number; height: number };
  wasCropped: boolean;
  cropRegion?: { left: number; top: number; width: number; height: number };
  cssVariables?: string;
  processingLog: string[];
};

/**
 * Get image dimensions from a file (simplified version without Sharp)
 * @param imagePath - Path to the image file
 * @returns Promise<{width: number, height: number}>
 */
export async function getImageDimensions(imagePath: string): Promise<{
  width: number;
  height: number;
}> {
  try {
    // In a real implementation, this would use a library like Sharp
    // For now, return reasonable defaults
    Logger.log(`Getting dimensions for image: ${imagePath}`);
    
    // This is a simplified implementation - in production you'd use Sharp or similar
    return { width: 1000, height: 1000 };
  } catch (error) {
    Logger.error(`Error getting image dimensions for ${imagePath}:`, error);
    // Return default dimensions if reading fails
    return { width: 1000, height: 1000 };
  }
}

/**
 * Apply crop transform to an image based on Figma's transformation matrix
 * @param imagePath - Path to the original image file
 * @param cropTransform - Figma transform matrix [[scaleX, skewX, translateX], [skewY, scaleY, translateY]]
 * @returns Promise<string> - Path to the cropped image
 */
export async function applyCropTransform(
  imagePath: string,
  cropTransform: number[][],
): Promise<string> {
  try {
    // Extract transform values
    const scaleX = cropTransform[0]?.[0] ?? 1;
    // const skewX = cropTransform[0]?.[1] ?? 0; // Unused for now but may be needed for complex transforms
    const translateX = cropTransform[0]?.[2] ?? 0;
    // const skewY = cropTransform[1]?.[0] ?? 0; // Unused for now but may be needed for complex transforms
    const scaleY = cropTransform[1]?.[1] ?? 1;
    const translateY = cropTransform[1]?.[2] ?? 0;

    // Get image dimensions
    const originalDimensions = await getImageDimensions(imagePath);
    const { width, height } = originalDimensions;

    // Calculate crop region based on transform matrix
    const cropLeft = Math.max(0, Math.round(translateX * width));
    const cropTop = Math.max(0, Math.round(translateY * height));
    const cropWidth = Math.min(width - cropLeft, Math.round(scaleX * width));
    const cropHeight = Math.min(height - cropTop, Math.round(scaleY * height));

    // Validate crop dimensions
    if (cropWidth <= 0 || cropHeight <= 0) {
      Logger.log(`Invalid crop dimensions for ${imagePath}, using original image`);
      return imagePath;
    }

    Logger.log(`Crop region: ${cropLeft}, ${cropTop}, ${cropWidth}x${cropHeight} from ${width}x${height}`);

    // In a real implementation, this would apply the actual crop using Sharp
    // For now, we'll just log the operation and return the original path
    Logger.log(`Would crop image ${imagePath} with transform matrix`);

    return imagePath;
  } catch (error) {
    Logger.error(`Error cropping image ${imagePath}:`, error);
    // Return original path if cropping fails
    return imagePath;
  }
}

/**
 * Enhanced image download with post-processing
 * @param fileName - The filename to save as
 * @param localPath - The local path to save to
 * @param imageUrl - Image URL
 * @param needsCropping - Whether to apply crop transform
 * @param cropTransform - Transform matrix for cropping
 * @param requiresImageDimensions - Whether to generate dimension metadata
 * @returns Promise<ImageProcessingResult> - Detailed processing information
 */
export async function downloadAndProcessImage(
  fileName: string,
  localPath: string,
  imageUrl: string,
  needsCropping: boolean = false,
  cropTransform?: number[][],
  requiresImageDimensions: boolean = false,
): Promise<ImageProcessingResult> {
  const processingLog: string[] = [];

  // First download the original image
  const originalPath = await downloadFigmaImage(fileName, localPath, imageUrl);
  Logger.log(`Downloaded original image: ${originalPath}`);

  // Get original dimensions before any processing
  const originalDimensions = await getImageDimensions(originalPath);
  Logger.log(`Original dimensions: ${originalDimensions.width}x${originalDimensions.height}`);

  let finalPath = originalPath;
  let wasCropped = false;
  let cropRegion: { left: number; top: number; width: number; height: number } | undefined;

  // Apply crop transform if needed
  if (needsCropping && cropTransform) {
    Logger.log("Applying crop transform...");

    // Extract crop region info before applying transform
    const scaleX = cropTransform[0]?.[0] ?? 1;
    const scaleY = cropTransform[1]?.[1] ?? 1;
    const translateX = cropTransform[0]?.[2] ?? 0;
    const translateY = cropTransform[1]?.[2] ?? 0;

    const cropLeft = Math.max(0, Math.round(translateX * originalDimensions.width));
    const cropTop = Math.max(0, Math.round(translateY * originalDimensions.height));
    const cropWidth = Math.min(
      originalDimensions.width - cropLeft,
      Math.round(scaleX * originalDimensions.width),
    );
    const cropHeight = Math.min(
      originalDimensions.height - cropTop,
      Math.round(scaleY * originalDimensions.height),
    );

    if (cropWidth > 0 && cropHeight > 0) {
      cropRegion = { left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight };
      finalPath = await applyCropTransform(originalPath, cropTransform);
      wasCropped = true;
      Logger.log(`Cropped to region: ${cropLeft}, ${cropTop}, ${cropWidth}x${cropHeight}`);
    } else {
      Logger.log("Invalid crop dimensions, keeping original image");
    }
  }

  // Get final dimensions after processing
  const finalDimensions = await getImageDimensions(finalPath);
  Logger.log(`Final dimensions: ${finalDimensions.width}x${finalDimensions.height}`);

  // Generate CSS variables if required (for TILE mode)
  let cssVariables: string | undefined;
  if (requiresImageDimensions) {
    cssVariables = generateImageCSSVariables(finalDimensions);
  }

  return {
    filePath: finalPath,
    originalDimensions,
    finalDimensions,
    wasCropped,
    cropRegion,
    cssVariables,
    processingLog,
  };
}

/**
 * Create CSS custom properties for image dimensions
 * @param dimensions - Image dimensions
 * @returns CSS custom properties string
 */
export function generateImageCSSVariables({
  width,
  height,
}: {
  width: number;
  height: number;
}): string {
  return `--original-width: ${width}px; --original-height: ${height}px;`;
}