import type { FigmaNode } from "../types/figma";
import { hasValue, isStrokeWeights } from "../utils/identity";
import { generateCSSShorthand } from "../utils/enhancedCommon";
import { isVisible } from "../utils/enhancedCommon";

export type CSSRGBAColor = `rgba(${number}, ${number}, ${number}, ${number})`;
export type CSSHexColor = `#${string}`;

export interface ColorValue {
  hex: CSSHexColor;
  opacity: number;
}

export type EnhancedSimplifiedImageFill = {
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

export type EnhancedSimplifiedGradientFill = {
  type: "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND";
  gradient: string;
  angle?: number;
  stops?: Array<{ color: string; position: number }>;
};

export type EnhancedSimplifiedPatternFill = {
  type: "PATTERN";
  patternSource: {
    type: "IMAGE-PNG";
    nodeId: string;
  };
  backgroundRepeat: string;
  backgroundSize: string;
  backgroundPosition: string;
};

export type EnhancedSimplifiedFill =
  | EnhancedSimplifiedImageFill
  | EnhancedSimplifiedGradientFill
  | EnhancedSimplifiedPatternFill
  | CSSRGBAColor
  | CSSHexColor;

export type EnhancedSimplifiedStroke = {
  colors: EnhancedSimplifiedFill[];
  strokeWeight?: string;
  strokeDashes?: number[];
  strokeWeights?: string;
  strokeAlign?: string;
  strokeCap?: string;
  strokeJoin?: string;
};

/**
 * Parse Figma paint to enhanced simplified fill format
 */
export function parseEnhancedPaint(raw: any, hasChildren: boolean = false): EnhancedSimplifiedFill {
  if (raw.type === "IMAGE") {
    return parseImagePaint(raw, hasChildren);
  } else if (raw.type === "SOLID") {
    return parseSolidPaint(raw);
  } else if (raw.type === "PATTERN") {
    return parsePatternPaint(raw);
  } else if (isGradientType(raw.type)) {
    return parseGradientPaint(raw);
  } else {
    // Fallback to solid color
    return "#000000";
  }
}

/**
 * Parse image paint with enhanced processing options
 */
function parseImagePaint(raw: any, hasChildren: boolean): EnhancedSimplifiedImageFill {
  const baseImageFill: EnhancedSimplifiedImageFill = {
    type: "IMAGE",
    imageRef: raw.imageRef || "",
    scaleMode: raw.scaleMode || "FILL",
    scalingFactor: raw.scalingFactor,
  };

  // Determine if this should be treated as background image
  const isBackground = hasChildren || baseImageFill.scaleMode === "TILE";

  // Apply scale mode translation
  const { css, processing } = translateScaleMode(
    baseImageFill.scaleMode,
    isBackground,
    raw.scalingFactor,
  );

  // Handle image transform if present
  let finalProcessing = processing;
  if (raw.imageTransform) {
    const transformProcessing = handleImageTransform(raw.imageTransform);
    finalProcessing = {
      ...processing,
      ...transformProcessing,
      requiresImageDimensions:
        processing.requiresImageDimensions || transformProcessing.requiresImageDimensions,
    };
  }

  return {
    ...baseImageFill,
    ...css,
    imageDownloadArguments: finalProcessing,
  };
}

/**
 * Parse solid color paint
 */
function parseSolidPaint(raw: any): CSSRGBAColor | CSSHexColor {
  if (!raw.color) return "#000000";

  const { hex, opacity } = convertColor(raw.color, raw.opacity);
  
  if (opacity === 1) {
    return hex;
  } else {
    return formatRGBAColor(raw.color, opacity);
  }
}

/**
 * Parse pattern paint
 */
function parsePatternPaint(raw: any): EnhancedSimplifiedPatternFill {
  let backgroundRepeat = "repeat";
  
  let horizontal = "left";
  switch (raw.horizontalAlignment) {
    case "START":
      horizontal = "left";
      break;
    case "CENTER":
      horizontal = "center";
      break;
    case "END":
      horizontal = "right";
      break;
  }

  let vertical = "top";
  switch (raw.verticalAlignment) {
    case "START":
      vertical = "top";
      break;
    case "CENTER":
      vertical = "center";
      break;
    case "END":
      vertical = "bottom";
      break;
  }

  return {
    type: "PATTERN",
    patternSource: {
      type: "IMAGE-PNG",
      nodeId: raw.sourceNodeId || "",
    },
    backgroundRepeat,
    backgroundSize: `${Math.round((raw.scalingFactor || 1) * 100)}%`,
    backgroundPosition: `${horizontal} ${vertical}`,
  };
}

/**
 * Parse gradient paint with enhanced processing
 */
function parseGradientPaint(raw: any): EnhancedSimplifiedGradientFill {
  const gradientType = raw.type as "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND";
  
  return {
    type: gradientType,
    gradient: convertGradientToCss(raw),
    angle: calculateGradientAngle(raw),
    stops: extractGradientStops(raw),
  };
}

/**
 * Convert Figma color to hex and opacity
 */
function convertColor(color: any, opacity: number = 1): ColorValue {
  if (!color) {
    return { hex: "#000000", opacity: 1 };
  }

  const r = Math.round((color.r || 0) * 255);
  const g = Math.round((color.g || 0) * 255);
  const b = Math.round((color.b || 0) * 255);
  
  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}` as CSSHexColor;
  const finalOpacity = opacity !== undefined ? opacity : (color.a !== undefined ? color.a : 1);

  return { hex, opacity: finalOpacity };
}

/**
 * Format RGBA color string
 */
function formatRGBAColor(color: any, opacity: number = 1): CSSRGBAColor {
  if (!color) return "rgba(0, 0, 0, 1)" as CSSRGBAColor;

  const r = Math.round((color.r || 0) * 255);
  const g = Math.round((color.g || 0) * 255);
  const b = Math.round((color.b || 0) * 255);
  const a = opacity !== undefined ? opacity : (color.a !== undefined ? color.a : 1);

  return `rgba(${r}, ${g}, ${b}, ${a})` as CSSRGBAColor;
}

/**
 * Build enhanced simplified strokes from a Figma node
 */
export function buildEnhancedSimplifiedStrokes(
  n: FigmaNode,
  hasChildren: boolean = false,
): EnhancedSimplifiedStroke {
  const strokes: EnhancedSimplifiedStroke = { colors: [] };

  if (hasValue("strokes", n) && Array.isArray(n.strokes) && n.strokes.length) {
    strokes.colors = n.strokes
      .filter(isVisible)
      .map((stroke) => parseEnhancedPaint(stroke, hasChildren));
  }

  if (hasValue("strokeWeight", n) && typeof n.strokeWeight === "number" && n.strokeWeight > 0) {
    strokes.strokeWeight = `${n.strokeWeight}px`;
  }

  if (hasValue("strokeDashes", n) && Array.isArray(n.strokeDashes) && n.strokeDashes.length) {
    strokes.strokeDashes = n.strokeDashes as number[];
  }

  if (hasValue("individualStrokeWeights", n, isStrokeWeights)) {
    strokes.strokeWeights = generateCSSShorthand(n.individualStrokeWeights as any);
  }

  // Enhanced stroke properties
  if (hasValue("strokeAlign", n)) {
    strokes.strokeAlign = convertStrokeAlign(n.strokeAlign as string);
  }

  if (hasValue("strokeCap", n)) {
    strokes.strokeCap = convertStrokeCap(n.strokeCap as string);
  }

  if (hasValue("strokeJoin", n)) {
    strokes.strokeJoin = convertStrokeJoin(n.strokeJoin as string);
  }

  return strokes;
}

/**
 * Check if type is a gradient type
 */
function isGradientType(type: string): boolean {
  return ["GRADIENT_LINEAR", "GRADIENT_RADIAL", "GRADIENT_ANGULAR", "GRADIENT_DIAMOND"].includes(type);
}

/**
 * Translate scale mode to CSS properties and processing metadata
 */
function translateScaleMode(
  scaleMode: "FILL" | "FIT" | "TILE" | "STRETCH",
  isBackground: boolean,
  scalingFactor?: number,
): {
  css: Partial<EnhancedSimplifiedImageFill>;
  processing: NonNullable<EnhancedSimplifiedImageFill["imageDownloadArguments"]>;
} {
  switch (scaleMode) {
    case "FILL":
      return {
        css: isBackground
          ? { backgroundSize: "cover", backgroundRepeat: "no-repeat", isBackground: true }
          : { objectFit: "cover", isBackground: false },
        processing: { needsCropping: false, requiresImageDimensions: false },
      };

    case "FIT":
      return {
        css: isBackground
          ? { backgroundSize: "contain", backgroundRepeat: "no-repeat", isBackground: true }
          : { objectFit: "contain", isBackground: false },
        processing: { needsCropping: false, requiresImageDimensions: false },
      };

    case "TILE":
      return {
        css: {
          backgroundRepeat: "repeat",
          backgroundSize: scalingFactor
            ? `calc(var(--original-width) * ${scalingFactor}) calc(var(--original-height) * ${scalingFactor})`
            : "auto",
          isBackground: true,
        },
        processing: { needsCropping: false, requiresImageDimensions: true },
      };

    case "STRETCH":
      return {
        css: isBackground
          ? { backgroundSize: "100% 100%", backgroundRepeat: "no-repeat", isBackground: true }
          : { objectFit: "fill", isBackground: false },
        processing: { needsCropping: false, requiresImageDimensions: false },
      };

    default:
      return {
        css: {},
        processing: { needsCropping: false, requiresImageDimensions: false },
      };
  }
}

/**
 * Handle image transform for cropping
 */
function handleImageTransform(imageTransform: number[][]): NonNullable<EnhancedSimplifiedImageFill["imageDownloadArguments"]> {
  const transformHash = generateTransformHash(imageTransform);
  return {
    needsCropping: true,
    requiresImageDimensions: false,
    cropTransform: imageTransform,
    filenameSuffix: transformHash,
  };
}

/**
 * Generate transform hash for filename suffix
 */
function generateTransformHash(transform: number[][]): string {
  const values = transform.flat();
  const hash = values.reduce((acc, val) => {
    const str = val.toString();
    for (let i = 0; i < str.length; i++) {
      acc = ((acc << 5) - acc + str.charCodeAt(i)) & 0xffffffff;
    }
    return acc;
  }, 0);

  return Math.abs(hash).toString(16).substring(0, 6);
}

/**
 * Convert gradient to CSS
 */
function convertGradientToCss(gradient: any): string {
  if (!gradient.gradientStops || !Array.isArray(gradient.gradientStops)) {
    return "linear-gradient(0deg, #000000 0%, #ffffff 100%)";
  }

  const stops = gradient.gradientStops.map((stop: any) => {
    const color = formatRGBAColor(stop.color, stop.color?.a);
    const position = Math.round(stop.position * 100);
    return `${color} ${position}%`;
  }).join(", ");

  const angle = calculateGradientAngle(gradient);

  switch (gradient.type) {
    case "GRADIENT_LINEAR":
      return `linear-gradient(${angle}deg, ${stops})`;
    case "GRADIENT_RADIAL":
      return `radial-gradient(circle, ${stops})`;
    case "GRADIENT_ANGULAR":
      return `conic-gradient(from ${angle}deg, ${stops})`;
    case "GRADIENT_DIAMOND":
      return `conic-gradient(from ${angle}deg, ${stops})`;
    default:
      return `linear-gradient(${angle}deg, ${stops})`;
  }
}

/**
 * Calculate gradient angle from Figma gradient data
 */
function calculateGradientAngle(gradient: any): number {
  if (!gradient.gradientTransform) return 0;

  // Simple angle calculation - in practice this would be more complex
  const transform = gradient.gradientTransform;
  if (transform && transform[0] && transform[1]) {
    const angle = Math.atan2(transform[1][0], transform[0][0]) * (180 / Math.PI);
    return Math.round(angle);
  }

  return 0;
}

/**
 * Extract gradient stops for enhanced processing
 */
function extractGradientStops(gradient: any): Array<{ color: string; position: number }> {
  if (!gradient.gradientStops || !Array.isArray(gradient.gradientStops)) {
    return [];
  }

  return gradient.gradientStops.map((stop: any) => ({
    color: formatRGBAColor(stop.color, stop.color?.a),
    position: stop.position,
  }));
}

/**
 * Convert Figma stroke align to CSS equivalent
 */
function convertStrokeAlign(align: string): string {
  switch (align) {
    case "INSIDE":
      return "inside";
    case "OUTSIDE":
      return "outside";
    case "CENTER":
    default:
      return "center";
  }
}

/**
 * Convert Figma stroke cap to CSS equivalent
 */
function convertStrokeCap(cap: string): string {
  switch (cap) {
    case "ROUND":
      return "round";
    case "SQUARE":
      return "square";
    case "NONE":
    default:
      return "butt";
  }
}

/**
 * Convert Figma stroke join to CSS equivalent
 */
function convertStrokeJoin(join: string): string {
  switch (join) {
    case "ROUND":
      return "round";
    case "BEVEL":
      return "bevel";
    case "MITER":
    default:
      return "miter";
  }
}