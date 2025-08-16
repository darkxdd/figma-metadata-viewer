// Core Figma API types based on the API documentation

export interface FigmaCredentials {
  fileId: string;
  accessToken: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Fill {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND' | 'IMAGE';
  color?: Color;
  opacity?: number;
  visible?: boolean;
  // Image fill specific properties
  imageRef?: string;
  scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  imageTransform?: number[][];
}

export interface Stroke {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND';
  color?: Color;
  opacity?: number;
  visible?: boolean;
}

export interface Effect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  color?: Color;
  offset?: { x: number; y: number };
  radius: number;
  visible?: boolean;
}

export interface TextStyle {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM';
  lineHeightPx?: number;
  letterSpacing?: number;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  children?: FigmaNode[];
  absoluteBoundingBox?: BoundingBox;
  fills?: Fill[];
  strokes?: Stroke[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  effects?: Effect[];
  opacity?: number;
  cornerRadius?: number;
  
  // Auto Layout properties
  layoutMode?: 'HORIZONTAL' | 'VERTICAL';
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX';
  layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL';
  layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL';
  
  // Text-specific properties
  characters?: string;
  style?: TextStyle;
  
  // Component-specific properties
  componentId?: string;
}

export interface Component {
  key: string;
  name: string;
  description: string;
}

export interface Style {
  key: string;
  name: string;
  description: string;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
}

export interface FigmaApiResponse {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document: FigmaNode;
  components: Record<string, Component>;
  styles: Record<string, Style>;
}

export interface FigmaImagesResponse {
  images: Record<string, string | null>;
  status?: number;
  err?: string;
}

export interface FigmaImageFillsResponse {
  images: Record<string, string>;
}

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