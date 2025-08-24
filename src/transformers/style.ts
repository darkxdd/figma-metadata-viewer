import type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";
import { hasValue, isStrokeWeights } from "../utils/identity";
import { generateCSSShorthand } from "../utils/enhancedCommon";

// Type aliases for backward compatibility
export type FigmaNode = FigmaDocumentNode;

export type CSSRGBAColor = `rgba(${number}, ${number}, ${number}, ${number})`;
export type CSSHexColor = `#${string}`;

export interface ColorValue {
  hex: CSSHexColor;
  opacity: number;
}

export type SimplifiedImageFill = {
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
};

export type SimplifiedGradientFill = {
  type: "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND";
  gradient: string;
};

export type SimplifiedPatternFill = {
  type: "PATTERN";
  patternSource: {
    type: "IMAGE-PNG";
    nodeId: string;
  };
  backgroundRepeat: string;
  backgroundSize: string;
  backgroundPosition: string;
};

export type SimplifiedFill =
  | SimplifiedImageFill
  | SimplifiedGradientFill
  | SimplifiedPatternFill
  | CSSRGBAColor
  | CSSHexColor;

export type SimplifiedStroke = {
  colors: SimplifiedFill[];
  strokeWeight?: string;
  strokeDashes?: number[];
  strokeWeights?: string;
};

/**
 * Convert RGBA color to CSS format
 */
export function formatRGBAColor(color: any): CSSRGBAColor {
  const r = Math.round((color.r || 0) * 255);
  const g = Math.round((color.g || 0) * 255);
  const b = Math.round((color.b || 0) * 255);
  const a = Number((color.a || 1).toFixed(3));
  
  return `rgba(${r}, ${g}, ${b}, ${a})` as CSSRGBAColor;
}

/**
 * Convert RGBA color to hex format
 */
export function formatHexColor(color: any): CSSHexColor {
  const r = Math.round((color.r || 0) * 255);
  const g = Math.round((color.g || 0) * 255);
  const b = Math.round((color.b || 0) * 255);
  
  const hex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  return `#${hex}` as CSSHexColor;
}

/**
 * Parse a Figma paint object into a simplified fill
 */
export function parsePaint(paint: any, hasChildren: boolean): SimplifiedFill {
  if (!paint.visible) {
    return "transparent" as CSSRGBAColor;
  }

  switch (paint.type) {
    case "SOLID":
      if (paint.opacity === 1) {
        return formatHexColor(paint.color);
      } else {
        return formatRGBAColor({
          ...paint.color,
          a: paint.opacity
        });
      }

    case "GRADIENT_LINEAR":
    case "GRADIENT_RADIAL":
    case "GRADIENT_ANGULAR":
    case "GRADIENT_DIAMOND":
      return {
        type: paint.type,
        gradient: buildGradientCSS(paint)
      };

    case "IMAGE":
      return {
        type: "IMAGE",
        imageRef: paint.imageRef || "",
        scaleMode: paint.scaleMode || "FILL",
        scalingFactor: paint.scalingFactor,
        ...translateScaleMode(paint.scaleMode || "FILL", hasChildren, paint.scalingFactor)
      };

    default:
      return "transparent" as CSSRGBAColor;
  }
}

/**
 * Build gradient CSS from Figma gradient data
 */
function buildGradientCSS(gradient: any): string {
  if (!gradient.gradientStops || gradient.gradientStops.length === 0) {
    return "transparent";
  }

  const stops = gradient.gradientStops
    .map((stop: any) => {
      const color = formatRGBAColor(stop.color);
      const position = Math.round(stop.position * 100);
      return `${color} ${position}%`;
    })
    .join(", ");

  switch (gradient.type) {
    case "GRADIENT_LINEAR":
      // Convert Figma's gradient transform to CSS angle
      const angle = calculateLinearGradientAngle(gradient.gradientTransform);
      return `linear-gradient(${angle}deg, ${stops})`;
    
    case "GRADIENT_RADIAL":
      return `radial-gradient(circle, ${stops})`;
    
    case "GRADIENT_ANGULAR":
      return `conic-gradient(${stops})`;
    
    default:
      return `linear-gradient(${stops})`;
  }
}

/**
 * Calculate linear gradient angle from Figma's transform matrix
 */
function calculateLinearGradientAngle(transform?: number[][]): number {
  if (!transform || transform.length < 2) return 0;
  
  // Figma uses a 2x3 transform matrix
  const dx = transform[0][0];
  const dy = transform[1][0];
  
  // Convert to CSS angle (0deg = top, 90deg = right)
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  angle = (angle + 90) % 360;
  
  return Math.round(angle);
}

/**
 * Translate Figma scale modes to CSS properties
 */
function translateScaleMode(
  scaleMode: "FILL" | "FIT" | "TILE" | "STRETCH",
  hasChildren: boolean,
  scalingFactor?: number,
): Partial<SimplifiedImageFill> {
  const isBackground = hasChildren;

  switch (scaleMode) {
    case "FILL":
      return isBackground
        ? { backgroundSize: "cover", backgroundRepeat: "no-repeat", isBackground: true }
        : { objectFit: "cover", isBackground: false };

    case "FIT":
      return isBackground
        ? { backgroundSize: "contain", backgroundRepeat: "no-repeat", isBackground: true }
        : { objectFit: "contain", isBackground: false };

    case "TILE":
      return {
        backgroundRepeat: "repeat",
        backgroundSize: scalingFactor
          ? `calc(var(--original-width) * ${scalingFactor}) calc(var(--original-height) * ${scalingFactor})`
          : "auto",
        isBackground: true,
      };

    case "STRETCH":
      return isBackground
        ? { backgroundSize: "100% 100%", backgroundRepeat: "no-repeat", isBackground: true }
        : { objectFit: "fill", isBackground: false };

    default:
      return {};
  }
}

/**
 * Build simplified strokes from Figma node
 */
export function buildSimplifiedStrokes(node: FigmaNode, hasChildren: boolean): SimplifiedStroke {
  const strokes: SimplifiedStroke = {
    colors: [],
  };

  if (hasValue("strokes", node) && Array.isArray(node.strokes)) {
    strokes.colors = node.strokes
      .filter(stroke => stroke.visible !== false)
      .map(stroke => parsePaint(stroke, hasChildren));
  }

  if (hasValue("strokeWeight", node) && typeof node.strokeWeight === "number") {
    strokes.strokeWeight = `${node.strokeWeight}px`;
  }

  if (hasValue("strokeDashes", node) && Array.isArray(node.strokeDashes)) {
    strokes.strokeDashes = node.strokeDashes;
  }

  if (hasValue("individualStrokeWeights", node, isStrokeWeights)) {
    const weights = node.individualStrokeWeights;
    strokes.strokeWeights = generateCSSShorthand({
      top: weights.top || 0,
      right: weights.right || 0,
      bottom: weights.bottom || 0,
      left: weights.left || 0,
    }, { suffix: "px" });
  }

  return strokes;
}