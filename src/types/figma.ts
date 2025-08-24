// Enhanced Figma API types using official @figma/rest-api-spec with extensions
import type {
  Node as FigmaDocumentNode,
  GetFileResponse,
  GetImagesResponse,
  GetImageFillsResponse,
  Component as FigmaComponent,
  ComponentSet as FigmaComponentSet,
  ComponentPropertyType,
  Paint,
  Effect,
  RGBA as FigmaColor,
  Rectangle as FigmaBoundingBox,
  Transform,
  TypeStyle as FigmaTextStyle,
} from '@figma/rest-api-spec';

// Extended types for backward compatibility
export type FigmaNode = FigmaDocumentNode & {
  // Ensure common properties are always available for our use cases
  absoluteBoundingBox?: FigmaBoundingBox;
  children?: FigmaNode[];
  fills?: EnhancedPaint[];
  strokes?: EnhancedPaint[];
  effects?: EnhancedEffect[];
  style?: EnhancedTextStyle;
  characters?: string;
  componentId?: string;
  componentProperties?: Record<string, any>;
  // Frame and layout properties
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  itemSpacing?: number;
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX';
  layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL';
  layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL';
  layoutPositioning?: 'AUTO' | 'ABSOLUTE';
  overflowDirection?: ('HORIZONTAL' | 'VERTICAL')[];
  clipsContent?: boolean;
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
  // Additional properties for compatibility
  strokeWeight?: number;
  opacity?: number;
  constraints?: {
    horizontal: string;
    vertical: string;
  };
};

// Enhanced types for backward compatibility with additional properties
export type EnhancedPaint = Paint & {
  color?: FigmaColor;
  gradientTransform?: Transform;
};

export type EnhancedEffect = Effect & {
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
  color?: FigmaColor;
};

// Enhanced text style with all properties optional for compatibility
export type EnhancedTextStyle = FigmaTextStyle & {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeightPx?: number;
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
};

// Re-export core types from official spec
export type { 
  GetFileResponse as FigmaApiResponse,
  GetImagesResponse as FigmaImagesResponse,
  GetImageFillsResponse as FigmaImageFillsResponse,
  FigmaComponent as Component,
  FigmaComponentSet as ComponentSet,
  ComponentPropertyType,
  Paint as Fill,
  Paint as Stroke,
  Effect,
  FigmaColor as Color,
  FigmaBoundingBox as BoundingBox,
  Transform,
  FigmaTextStyle as TextStyle
};

// Our application-specific types
export interface FigmaCredentials {
  fileId: string;
  accessToken: string;
}

// Standard file data structure
export interface FigmaFileData {
  name: string;
  lastModified: string;
  document: FigmaNode;
}

// Component prop interfaces
export interface InputFormProps {
  onSubmit: (credentials: FigmaCredentials) => void;
  loading: boolean;
}

export interface MetadataDisplayProps {
  fileData: FigmaFileData;
  onNodeSelect?: (node: FigmaNode) => void;
}

export interface NodeDetailProps {
  node: FigmaNode;
  credentials?: FigmaCredentials;
  onCopy?: (data: string) => void;
}

export interface ImagePreviewProps {
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

export interface ImageFillsProps {
  credentials: FigmaCredentials;
  onLoad?: (imageFills: Record<string, string>) => void;
  onError?: (error: string) => void;
  className?: string;
}

// Application state types
export interface AppState {
  credentials?: FigmaCredentials;
  fileData?: FigmaFileData;
  loading: boolean;
  error?: string;
}

// API error types
export interface ApiError {
  message: string;
  status?: number;
  type: 'AUTHENTICATION' | 'NETWORK' | 'NOT_FOUND' | 'RATE_LIMIT' | 'UNKNOWN';
}

// Enhanced types for AI-optimized processing
import type {
  SimplifiedDesign,
  SimplifiedNode,
  GlobalVars,
  ExtractorFn,
  TraversalOptions,
} from '../extractors/types';

import type {
  DesignToken,
  DesignTokens,
} from '../utils/globalVariables';

// Enhanced Figma API responses
export interface EnhancedFigmaFileData {
  name: string;
  lastModified: string;
  thumbnailUrl?: string;
  document: FigmaNode;
  components?: Record<string, FigmaComponent>;
  componentSets?: Record<string, any>;
  // Enhanced data from extractors
  simplifiedDesign?: SimplifiedDesign;
  globalVars?: GlobalVars;
  designTokens?: DesignTokens;
}

// Enhanced metadata parser result
export interface EnhancedParsedNodeMetadata {
  originalMetadata: any;
  simplifiedNode: SimplifiedNode;
  designTokens: DesignToken[];
  cssVariables: Record<string, string>;
  extractionStats: {
    processingTime: number;
    extractorsUsed: string[];
    globalVariablesCreated: number;
    duplicatesAvoided: number;
  };
}

// Enhanced extraction options
export interface EnhancedExtractionOptions {
  extractors?: ExtractorFn[];
  traversalOptions?: TraversalOptions;
  generateDesignTokens?: boolean;
  generateGlobalVariables?: boolean;
  optimizeForPerformance?: boolean;
  includeLegacyFormat?: boolean;
}

// Enhanced API service options
export interface EnhancedFigmaServiceOptions {
  useEnhancedExtractors?: boolean;
  extractionOptions?: EnhancedExtractionOptions;
  cacheResults?: boolean;
  enableImageProcessing?: boolean;
  generateCSSVariables?: boolean;
}

// Re-export enhanced types for convenience
export type {
  SimplifiedDesign,
  SimplifiedNode,
  GlobalVars,
  ExtractorFn,
  TraversalOptions,
  DesignToken,
  DesignTokens,
};