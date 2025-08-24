import type { FigmaNode } from "../types/figma";
import { hasValue } from "../utils/identity";

export type EnhancedSimplifiedEffects = {
  boxShadow?: string;
  filter?: string;
  backdropFilter?: string;
  textShadow?: string;
  mixBlendMode?: string;
  opacity?: number;
  // Enhanced properties for better CSS generation
  dropShadow?: string;
  innerShadow?: string;
  blur?: string;
  backgroundBlur?: string;
};

/**
 * Build simplified effects information from a Figma node
 * Integrates with our existing effect processor for enhanced functionality
 */
export function buildEnhancedSimplifiedEffects(n: FigmaNode): EnhancedSimplifiedEffects {
  if (!hasValue("effects", n)) return {};
  
  const effects = (n.effects as any[]).filter((e) => e.visible !== false);
  const result: EnhancedSimplifiedEffects = {};

  // Process shadows
  const dropShadows = effects
    .filter((e) => e.type === "DROP_SHADOW")
    .map(simplifyDropShadow);

  const innerShadows = effects
    .filter((e) => e.type === "INNER_SHADOW")
    .map(simplifyInnerShadow);

  // Combine shadows
  const allShadows = [...dropShadows, ...innerShadows];
  if (allShadows.length > 0) {
    const shadowValue = allShadows.join(", ");
    if (n.type === "TEXT") {
      result.textShadow = shadowValue;
    } else {
      result.boxShadow = shadowValue;
    }
    
    // Also store individual shadow types for enhanced processing
    if (dropShadows.length > 0) {
      result.dropShadow = dropShadows.join(", ");
    }
    if (innerShadows.length > 0) {
      result.innerShadow = innerShadows.join(", ");
    }
  }

  // Process blur effects
  const layerBlurs = effects
    .filter((e) => e.type === "LAYER_BLUR")
    .map(simplifyBlur);

  const backgroundBlurs = effects
    .filter((e) => e.type === "BACKGROUND_BLUR")
    .map(simplifyBlur);

  if (layerBlurs.length > 0) {
    result.filter = layerBlurs.join(" ");
    result.blur = layerBlurs.join(" ");
  }

  if (backgroundBlurs.length > 0) {
    result.backdropFilter = backgroundBlurs.join(" ");
    result.backgroundBlur = backgroundBlurs.join(" ");
  }

  // Handle opacity
  if (hasValue("opacity", n) && typeof n.opacity === "number" && n.opacity !== 1) {
    result.opacity = n.opacity;
  }

  // Handle blend mode
  if (hasValue("blendMode", n) && n.blendMode !== "NORMAL") {
    result.mixBlendMode = convertBlendMode(n.blendMode as string);
  }

  return result;
}

/**
 * Simplify drop shadow effect to CSS box-shadow value
 */
function simplifyDropShadow(effect: any): string {
  const x = effect.offset?.x || 0;
  const y = effect.offset?.y || 0;
  const blur = effect.radius || 0;
  const spread = effect.spread || 0;
  const color = formatEffectColor(effect.color);

  return `${x}px ${y}px ${blur}px ${spread}px ${color}`;
}

/**
 * Simplify inner shadow effect to CSS box-shadow value
 */
function simplifyInnerShadow(effect: any): string {
  const x = effect.offset?.x || 0;
  const y = effect.offset?.y || 0;
  const blur = effect.radius || 0;
  const spread = effect.spread || 0;
  const color = formatEffectColor(effect.color);

  return `inset ${x}px ${y}px ${blur}px ${spread}px ${color}`;
}

/**
 * Simplify blur effect to CSS filter value
 */
function simplifyBlur(effect: any): string {
  const radius = effect.radius || 0;
  return `blur(${radius}px)`;
}

/**
 * Format effect color to CSS-compatible format
 */
function formatEffectColor(color: any): string {
  if (!color) return "rgba(0, 0, 0, 0.1)";

  const r = Math.round((color.r || 0) * 255);
  const g = Math.round((color.g || 0) * 255);
  const b = Math.round((color.b || 0) * 255);
  const a = color.a !== undefined ? color.a : 1;

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Convert Figma blend mode to CSS mix-blend-mode
 */
function convertBlendMode(blendMode: string): string {
  const blendModeMap: Record<string, string> = {
    "NORMAL": "normal",
    "MULTIPLY": "multiply",
    "SCREEN": "screen",
    "OVERLAY": "overlay",
    "DARKEN": "darken",
    "LIGHTEN": "lighten",
    "COLOR_DODGE": "color-dodge",
    "COLOR_BURN": "color-burn",
    "HARD_LIGHT": "hard-light",
    "SOFT_LIGHT": "soft-light",
    "DIFFERENCE": "difference",
    "EXCLUSION": "exclusion",
    "HUE": "hue",
    "SATURATION": "saturation",
    "COLOR": "color",
    "LUMINOSITY": "luminosity",
  };

  return blendModeMap[blendMode] || "normal";
}

/**
 * Enhanced effect processing that provides more granular control
 */
export function processEffectsForCSS(effects: EnhancedSimplifiedEffects): {
  boxShadow?: string;
  filter?: string;
  backdropFilter?: string;
  textShadow?: string;
  opacity?: string;
  mixBlendMode?: string;
} {
  const cssProperties: any = {};

  if (effects.boxShadow) {
    cssProperties.boxShadow = effects.boxShadow;
  }

  if (effects.textShadow) {
    cssProperties.textShadow = effects.textShadow;
  }

  if (effects.filter) {
    cssProperties.filter = effects.filter;
  }

  if (effects.backdropFilter) {
    cssProperties.backdropFilter = effects.backdropFilter;
  }

  if (effects.opacity !== undefined) {
    cssProperties.opacity = effects.opacity.toString();
  }

  if (effects.mixBlendMode) {
    cssProperties.mixBlendMode = effects.mixBlendMode;
  }

  return cssProperties;
}

/**
 * Check if node has any visual effects
 */
export function hasEffects(node: FigmaNode): boolean {
  return hasValue("effects", node) && 
         Array.isArray(node.effects) && 
         node.effects.length > 0 &&
         node.effects.some((effect: any) => effect.visible !== false);
}

/**
 * Get effect categories for analysis
 */
export function categorizeEffects(node: FigmaNode): {
  hasShadows: boolean;
  hasBlurs: boolean;
  hasBlendModes: boolean;
  effectCount: number;
} {
  if (!hasEffects(node)) {
    return {
      hasShadows: false,
      hasBlurs: false,
      hasBlendModes: false,
      effectCount: 0,
    };
  }

  const effects = node.effects as any[];
  const shadowTypes = ["DROP_SHADOW", "INNER_SHADOW"];
  const blurTypes = ["LAYER_BLUR", "BACKGROUND_BLUR"];

  const hasShadows = effects.some(e => shadowTypes.includes(e.type));
  const hasBlurs = effects.some(e => blurTypes.includes(e.type));
  const hasBlendModes = hasValue("blendMode", node) && node.blendMode !== "NORMAL";

  return {
    hasShadows,
    hasBlurs,
    hasBlendModes,
    effectCount: effects.length,
  };
}