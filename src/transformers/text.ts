import type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";
import { hasValue, isTruthy } from "../utils/identity";

// Type aliases for backward compatibility
export type FigmaNode = FigmaDocumentNode;

export type SimplifiedTextStyle = Partial<{
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: string;
  letterSpacing: string;
  textCase: string;
  textAlignHorizontal: string;
  textAlignVertical: string;
}>;

export function isTextNode(
  n: FigmaNode,
): n is Extract<FigmaNode, { type: "TEXT" }> {
  return n.type === "TEXT";
}

export function hasTextStyle(
  n: FigmaNode,
): n is FigmaNode & { style: any } {
  return hasValue("style", n) && !!n.style && Object.keys(n.style).length > 0;
}

// Keep other simple properties directly
export function extractNodeText(n: FigmaNode) {
  if (hasValue("characters", n, isTruthy)) {
    return n.characters;
  }
}

export function extractTextStyle(n: FigmaNode) {
  if (hasTextStyle(n)) {
    const style = n.style;
    const textStyle: SimplifiedTextStyle = {
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
      fontSize: style.fontSize,
      lineHeight:
        "lineHeightPx" in style && style.lineHeightPx && style.fontSize
          ? `${style.lineHeightPx / style.fontSize}em`
          : undefined,
      letterSpacing:
        style.letterSpacing && style.letterSpacing !== 0 && style.fontSize
          ? `${(style.letterSpacing / style.fontSize) * 100}%`
          : undefined,
      textCase: style.textCase,
      textAlignHorizontal: style.textAlignHorizontal,
      textAlignVertical: style.textAlignVertical,
    };
    return textStyle;
  }
}