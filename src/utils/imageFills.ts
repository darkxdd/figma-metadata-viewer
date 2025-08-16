import type { FigmaNode, Fill } from '../types/figma';

/**
 * Utility functions for working with image fills in Figma nodes
 */

/**
 * Check if a node has image fills
 */
export const hasImageFills = (node: FigmaNode): boolean => {
  if (!node.fills || node.fills.length === 0) {
    return false;
  }

  return node.fills.some(fill => 
    fill.type === 'IMAGE' && fill.visible !== false && fill.imageRef
  );
};

/**
 * Get all image fill IDs from a node
 */
export const getImageFillIds = (node: FigmaNode): string[] => {
  if (!node.fills || node.fills.length === 0) {
    return [];
  }

  return node.fills
    .filter(fill => fill.type === 'IMAGE' && fill.visible !== false && fill.imageRef)
    .map(fill => fill.imageRef!)
    .filter(Boolean);
};

/**
 * Get all image fills from a node
 */
export const getImageFills = (node: FigmaNode): Fill[] => {
  if (!node.fills || node.fills.length === 0) {
    return [];
  }

  return node.fills.filter(fill => 
    fill.type === 'IMAGE' && fill.visible !== false && fill.imageRef
  );
};

/**
 * Recursively find all nodes with image fills in a node tree
 */
export const findNodesWithImageFills = (node: FigmaNode): FigmaNode[] => {
  const nodesWithImageFills: FigmaNode[] = [];

  // Check current node
  if (hasImageFills(node)) {
    nodesWithImageFills.push(node);
  }

  // Recursively check children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      nodesWithImageFills.push(...findNodesWithImageFills(child));
    }
  }

  return nodesWithImageFills;
};

/**
 * Get a summary of image fills usage in a file
 */
export const getImageFillsSummary = (document: FigmaNode) => {
  const nodesWithImageFills = findNodesWithImageFills(document);
  const totalImageFills = nodesWithImageFills.reduce(
    (count, node) => count + getImageFills(node).length,
    0
  );

  return {
    nodesWithImageFills: nodesWithImageFills.length,
    totalImageFills,
    nodes: nodesWithImageFills
  };
};

/**
 * Check if an image fill URL is valid
 */
export const isValidImageFillUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' && parsedUrl.hostname.includes('figma');
  } catch {
    return false;
  }
};

/**
 * Extract all unique image references from a document
 */
export const extractImageReferences = (document: FigmaNode): string[] => {
  const imageRefs = new Set<string>();
  
  const extractFromNode = (node: FigmaNode) => {
    if (node.fills) {
      node.fills.forEach(fill => {
        if (fill.type === 'IMAGE' && fill.imageRef && fill.visible !== false) {
          imageRefs.add(fill.imageRef);
        }
      });
    }
    
    if (node.children) {
      node.children.forEach(extractFromNode);
    }
  };
  
  extractFromNode(document);
  return Array.from(imageRefs);
};

/**
 * Match image references from nodes with API response
 */
export const matchImageReferencesWithUrls = (
  document: FigmaNode, 
  apiImageUrls: Record<string, string>
): {
  matched: Record<string, string>;
  unmatched: string[];
  apiOnly: string[];
} => {
  const documentImageRefs = extractImageReferences(document);
  const apiImageRefs = Object.keys(apiImageUrls);
  
  const matched: Record<string, string> = {};
  const unmatched: string[] = [];
  
  documentImageRefs.forEach(ref => {
    if (apiImageUrls[ref]) {
      matched[ref] = apiImageUrls[ref];
    } else {
      unmatched.push(ref);
    }
  });
  
  const apiOnly = apiImageRefs.filter(ref => !documentImageRefs.includes(ref));
  
  return { matched, unmatched, apiOnly };
};