import type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";
import type { StyleId } from "../utils/enhancedCommon";

// Type aliases for backward compatibility
export type FigmaNode = FigmaDocumentNode;

export type StyleTypes =
  | SimplifiedTextStyle
  | SimplifiedFill[]
  | SimplifiedLayout
  | SimplifiedStroke
  | SimplifiedEffects
  | string;

export type GlobalVars = {
  styles: Record<StyleId, StyleTypes>;
};

export interface TraversalContext {
  globalVars: GlobalVars;
  currentDepth: number;
  parent?: FigmaNode;
}

export interface TraversalOptions {
  maxDepth?: number;
  nodeFilter?: (node: FigmaNode) => boolean;
}

/**
 * An extractor function that can modify a SimplifiedNode during traversal.
 *
 * @param node - The current Figma node being processed
 * @param result - SimplifiedNode object being built—this can be mutated inside the extractor
 * @param context - Traversal context including globalVars and parent info. This can also be mutated inside the extractor.
 */
export type ExtractorFn = (
  node: FigmaNode,
  result: SimplifiedNode,
  context: TraversalContext,
) => void;

export interface SimplifiedDesign {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  nodes: SimplifiedNode[];
  components: Record<string, SimplifiedComponentDefinition>;
  componentSets: Record<string, SimplifiedComponentSetDefinition>;
  globalVars: GlobalVars;
}

export interface SimplifiedNode {
  id: string;
  name: string;
  type: string; // e.g. FRAME, TEXT, INSTANCE, RECTANGLE, etc.
  // text
  text?: string;
  textStyle?: string;
  // appearance
  fills?: string;
  styles?: string;
  strokes?: string;
  effects?: string;
  opacity?: number;
  borderRadius?: string;
  // layout & alignment
  layout?: string;
  // for rect-specific strokes, etc.
  componentId?: string;
  componentProperties?: ComponentProperties[];
  // children
  children?: SimplifiedNode[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Text style related types
export interface SimplifiedTextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: string;
  textDecoration?: string;
  textTransform?: string;
  color?: string;
}

// Layout related types
export interface SimplifiedLayout {
  display?: string;
  position?: string;
  top?: string;
  left?: string;
  width?: string;
  height?: string;
  flexDirection?: string;
  alignItems?: string;
  justifyContent?: string;
  gap?: string;
  padding?: string;
  margin?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridGap?: string;
}

// Fill related types
export type SimplifiedFill = 
  | string // hex or rgba color
  | SimplifiedGradientFill
  | SimplifiedImageFill
  | SimplifiedPatternFill;

export interface SimplifiedGradientFill {
  type: "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND";
  gradient: string;
}

export interface SimplifiedImageFill {
  type: "IMAGE";
  imageRef: string;
  scaleMode: "FILL" | "FIT" | "TILE" | "STRETCH";
  scalingFactor?: number;
  backgroundSize?: string;
  backgroundRepeat?: string;
  isBackground?: boolean;
  objectFit?: string;
  imageDownloadArguments?: {
    needsCropping: boolean;
    requiresImageDimensions: boolean;
    cropTransform?: number[][];
    filenameSuffix?: string;
  };
}

export interface SimplifiedPatternFill {
  type: "PATTERN";
  patternSource: {
    type: "IMAGE-PNG";
    nodeId: string;
  };
  backgroundRepeat: string;
  backgroundSize: string;
  backgroundPosition: string;
}

// Stroke related types
export interface SimplifiedStroke {
  colors: SimplifiedFill[];
  strokeWeight?: string;
  strokeDashes?: number[];
  strokeWeights?: string;
}

// Effects related types
export interface SimplifiedEffects {
  boxShadow?: string;
  filter?: string;
  backdropFilter?: string;
  mixBlendMode?: string;
}

// Component related types
export interface ComponentProperties {
  name: string;
  value: string;
  type: string;
}

export interface SimplifiedComponentDefinition {
  id: string;
  name: string;
  description?: string;
  properties: ComponentProperties[];
}

export interface SimplifiedComponentSetDefinition {
  id: string;
  name: string;
  description?: string;
  variants: SimplifiedComponentDefinition[];
}