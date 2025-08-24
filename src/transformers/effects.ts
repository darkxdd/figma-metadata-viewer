import type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";
import { formatRGBAColor } from "./style";
import { hasValue } from "../utils/identity";

// Type aliases for backward compatibility
export type FigmaNode = FigmaDocumentNode;

export type SimplifiedEffects = {
  boxShadow?: string;
  filter?: string;
  backdropFilter?: string;
  textShadow?: string;
};

export function buildSimplifiedEffects(n: FigmaNode): SimplifiedEffects {
  if (!hasValue("effects", n) || !n.effects) return {};
  const effects = n.effects.filter((e: any) => e.visible !== false);

  // Handle drop and inner shadows (both go into CSS box-shadow)
  const dropShadows = effects
    .filter((e: any) => e.type === "DROP_SHADOW")
    .map(simplifyDropShadow);

  const innerShadows = effects
    .filter((e: any) => e.type === "INNER_SHADOW")
    .map(simplifyInnerShadow);

  const boxShadow = [...dropShadows, ...innerShadows].join(", ");

  // Handle blur effects - separate by CSS property
  // Layer blurs use the CSS 'filter' property
  const filterBlurValues = effects
    .filter((e: any) => e.type === "LAYER_BLUR")
    .map(simplifyBlur)
    .join(" ");

  // Background blurs use the CSS 'backdrop-filter' property
  const backdropFilterValues = effects
    .filter((e: any) => e.type === "BACKGROUND_BLUR")
    .map(simplifyBlur)
    .join(" ");

  const result: SimplifiedEffects = {};

  if (boxShadow) {
    if (n.type === "TEXT") {
      result.textShadow = boxShadow;
    } else {
      result.boxShadow = boxShadow;
    }
  }
  if (filterBlurValues) result.filter = filterBlurValues;
  if (backdropFilterValues) result.backdropFilter = backdropFilterValues;

  return result;
}

function simplifyDropShadow(effect: any) {
  return `${effect.offset?.x || 0}px ${effect.offset?.y || 0}px ${effect.radius || 0}px ${effect.spread || 0}px ${formatRGBAColor(effect.color)}`;
}

function simplifyInnerShadow(effect: any) {
  return `inset ${effect.offset?.x || 0}px ${effect.offset?.y || 0}px ${effect.radius || 0}px ${effect.spread || 0}px ${formatRGBAColor(effect.color)}`;
}

function simplifyBlur(effect: any) {
  return `blur(${effect.radius || 0}px)`;
}