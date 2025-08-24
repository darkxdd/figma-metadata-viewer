import type { FigmaNode } from "../types/figma";
import { hasValue, isTruthy } from "../utils/identity";

export type SimplifiedTextStyle = Partial<{
  fontFamily: string;
  fontWeight: number | string;
  fontSize: number;
  lineHeight: string;
  letterSpacing: string;
  textCase: string;
  textAlignHorizontal: string;
  textAlignVertical: string;
  color: string;
  textDecoration: string;
  textTransform: string;
}>;

export function isTextNode(
  n: FigmaNode,
): n is Extract<FigmaNode, { type: "TEXT" }> {
  return n.type === "TEXT";
}

export function hasTextStyle(
  n: FigmaNode,
): n is FigmaNode & { style: any } {
  return hasValue("style", n) && typeof n.style === "object" && Object.keys(n.style).length > 0;
}

/**
 * Extract text content from a node
 */
export function extractNodeText(n: FigmaNode) {
  if (hasValue("characters", n, isTruthy)) {
    return n.characters;
  }
  return undefined;
}

/**
 * Extract and normalize text style from a Figma node
 */
export function extractTextStyle(n: FigmaNode): SimplifiedTextStyle | undefined {
  if (!hasTextStyle(n)) {
    return undefined;
  }

  const style = n.style as any;
  const textStyle: SimplifiedTextStyle = {};

  // Font family
  if (style.fontFamily) {
    textStyle.fontFamily = style.fontFamily;
  }

  // Font weight - normalize to CSS values
  if (style.fontWeight) {
    textStyle.fontWeight = normalizeFontWeight(style.fontWeight);
  }

  // Font size
  if (style.fontSize) {
    textStyle.fontSize = style.fontSize;
  }

  // Line height - convert to relative units
  if (style.lineHeightPx && style.fontSize) {
    const lineHeightRatio = style.lineHeightPx / style.fontSize;
    textStyle.lineHeight = `${Math.round(lineHeightRatio * 100) / 100}`;
  } else if (style.lineHeightPercent) {
    textStyle.lineHeight = `${style.lineHeightPercent / 100}`;
  }

  // Letter spacing - convert to relative units
  if (style.letterSpacing && style.letterSpacing !== 0 && style.fontSize) {
    const letterSpacingEm = style.letterSpacing / style.fontSize;
    textStyle.letterSpacing = `${Math.round(letterSpacingEm * 1000) / 1000}em`;
  }

  // Text case
  if (style.textCase) {
    textStyle.textCase = style.textCase;
    textStyle.textTransform = convertTextCase(style.textCase);
  }

  // Text alignment
  if (style.textAlignHorizontal) {
    textStyle.textAlignHorizontal = style.textAlignHorizontal.toLowerCase();
  }

  if (style.textAlignVertical) {
    textStyle.textAlignVertical = style.textAlignVertical.toLowerCase();
  }

  // Text decoration
  if (style.textDecoration) {
    textStyle.textDecoration = convertTextDecoration(style.textDecoration);
  }

  // Color - extract from fills if available
  if (hasValue("fills", n) && Array.isArray(n.fills) && n.fills.length > 0) {
    const textFill = n.fills[0] as any;
    if (textFill.type === "SOLID" && textFill.color) {
      textStyle.color = formatColor(textFill.color, textFill.opacity);
    }
  }

  return Object.keys(textStyle).length > 0 ? textStyle : undefined;
}

/**
 * Normalize font weight to CSS-compatible values
 */
function normalizeFontWeight(weight: number | string): string {
  if (typeof weight === "string") {
    return weight;
  }

  // Map numeric weights to CSS keywords where appropriate
  const weightMap: Record<number, string> = {
    100: "100",
    200: "200", 
    300: "300",
    400: "normal",
    500: "500",
    600: "600",
    700: "bold",
    800: "800",
    900: "900",
  };

  return weightMap[weight] || weight.toString();
}

/**
 * Convert Figma text case to CSS text-transform
 */
function convertTextCase(textCase: string): string {
  switch (textCase) {
    case "UPPER":
      return "uppercase";
    case "LOWER":
      return "lowercase";
    case "TITLE":
      return "capitalize";
    case "ORIGINAL":
    default:
      return "none";
  }
}

/**
 * Convert Figma text decoration to CSS text-decoration
 */
function convertTextDecoration(textDecoration: string): string {
  switch (textDecoration) {
    case "UNDERLINE":
      return "underline";
    case "STRIKETHROUGH":
      return "line-through";
    case "NONE":
    default:
      return "none";
  }
}

/**
 * Format color from Figma RGBA to CSS
 */
function formatColor(color: any, opacity?: number): string {
  if (!color) return "";

  const r = Math.round((color.r || 0) * 255);
  const g = Math.round((color.g || 0) * 255);
  const b = Math.round((color.b || 0) * 255);
  const a = opacity !== undefined ? opacity : (color.a !== undefined ? color.a : 1);

  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // Convert to hex if fully opaque
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}