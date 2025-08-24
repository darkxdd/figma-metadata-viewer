import type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";
import { hasValue, isFrame, isLayout } from "../utils/identity";
import { generateCSSShorthand, pixelRound } from "../utils/enhancedCommon";

// Type aliases for backward compatibility
export type FigmaNode = FigmaDocumentNode;

export interface SimplifiedLayout {
  mode: "none" | "row" | "column";
  justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "baseline" | "stretch";
  alignItems?: "flex-start" | "flex-end" | "center" | "space-between" | "baseline" | "stretch";
  alignSelf?: "flex-start" | "flex-end" | "center" | "stretch";
  wrap?: boolean;
  gap?: string;
  locationRelativeToParent?: {
    x: number;
    y: number;
  };
  dimensions?: {
    width?: number;
    height?: number;
    aspectRatio?: number;
  };
  padding?: string;
  sizing?: {
    horizontal?: "fixed" | "fill" | "hug";
    vertical?: "fixed" | "fill" | "hug";
  };
  overflowScroll?: ("x" | "y")[];
  position?: "absolute";
}

// Convert Figma's layout config into a more typical flex-like schema
export function buildSimplifiedLayout(
  n: FigmaNode,
  parent?: FigmaNode,
): SimplifiedLayout {
  const frameValues = buildSimplifiedFrameValues(n);
  const layoutValues = buildSimplifiedLayoutValues(n, parent, frameValues.mode) || {};

  return { ...frameValues, ...layoutValues };
}

// For flex layouts, process alignment and sizing
function convertAlign(
  axisAlign?: string,
  stretch?: {
    children: FigmaNode[];
    axis: "primary" | "counter";
    mode: "row" | "column" | "none";
  },
) {
  if (stretch && stretch.mode !== "none") {
    const { children, mode, axis } = stretch;

    // Compute whether to check horizontally or vertically based on axis and direction
    const direction = getDirection(axis, mode);

    const shouldStretch =
      children.length > 0 &&
      children.reduce((shouldStretch, c) => {
        if (!shouldStretch) return false;
        if (hasValue("layoutPositioning", c) && c.layoutPositioning === "ABSOLUTE") return true;
        if (direction === "horizontal") {
          return hasValue("layoutSizingHorizontal", c) && c.layoutSizingHorizontal === "FILL";
        } else if (direction === "vertical") {
          return hasValue("layoutSizingVertical", c) && c.layoutSizingVertical === "FILL";
        }
        return false;
      }, true);

    if (shouldStretch) return "stretch";
  }

  switch (axisAlign) {
    case "MIN":
      // MIN, AKA flex-start, is the default alignment
      return undefined;
    case "MAX":
      return "flex-end";
    case "CENTER":
      return "center";
    case "SPACE_BETWEEN":
      return "space-between";
    case "BASELINE":
      return "baseline";
    default:
      return undefined;
  }
}

function convertSelfAlign(align?: string) {
  switch (align) {
    case "MIN":
      // MIN, AKA flex-start, is the default alignment
      return undefined;
    case "MAX":
      return "flex-end";
    case "CENTER":
      return "center";
    case "STRETCH":
      return "stretch";
    default:
      return undefined;
  }
}

// interpret sizing
function convertSizing(s?: string) {
  if (s === "FIXED") return "fixed";
  if (s === "FILL") return "fill";
  if (s === "HUG") return "hug";
  return undefined;
}

function getDirection(
  axis: "primary" | "counter",
  mode: "row" | "column",
): "horizontal" | "vertical" {
  switch (axis) {
    case "primary":
      switch (mode) {
        case "row":
          return "horizontal";
        case "column":
          return "vertical";
      }
    case "counter":
      switch (mode) {
        case "row":
          return "vertical";
        case "column":
          return "horizontal";
      }
  }
}

function buildSimplifiedFrameValues(n: FigmaNode): SimplifiedLayout | { mode: "none" } {
  if (!isFrame(n)) {
    return { mode: "none" };
  }

  const frameValues: SimplifiedLayout = {
    mode:
      !n.layoutMode || n.layoutMode === "NONE"
        ? "none"
        : n.layoutMode === "HORIZONTAL"
          ? "row"
          : "column",
  };

  const overflowScroll: SimplifiedLayout["overflowScroll"] = [];
  if (n.overflowDirection?.includes("HORIZONTAL")) overflowScroll.push("x");
  if (n.overflowDirection?.includes("VERTICAL")) overflowScroll.push("y");
  if (overflowScroll.length > 0) frameValues.overflowScroll = overflowScroll;

  if (frameValues.mode === "none") {
    return frameValues;
  }

  frameValues.justifyContent = convertAlign(n.primaryAxisAlignItems ?? "MIN", {
    children: n.children || [],
    axis: "primary",
    mode: frameValues.mode,
  });
  frameValues.alignItems = convertAlign(n.counterAxisAlignItems ?? "MIN", {
    children: n.children || [],
    axis: "counter",
    mode: frameValues.mode,
  });
  frameValues.alignSelf = convertSelfAlign(n.layoutAlign);

  // Only include wrap if it's set to WRAP, since flex layouts don't default to wrapping
  frameValues.wrap = n.layoutWrap === "WRAP" ? true : undefined;
  frameValues.gap = n.itemSpacing ? `${n.itemSpacing ?? 0}px` : undefined;
  
  // gather padding
  if (n.paddingTop || n.paddingBottom || n.paddingLeft || n.paddingRight) {
    frameValues.padding = generateCSSShorthand({
      top: n.paddingTop ?? 0,
      right: n.paddingRight ?? 0,
      bottom: n.paddingBottom ?? 0,
      left: n.paddingLeft ?? 0,
    });
  }

  return frameValues;
}

function buildSimplifiedLayoutValues(
  n: FigmaNode,
  parent: FigmaNode | undefined,
  mode: "row" | "column" | "none",
): SimplifiedLayout | undefined {
  if (!isLayout(n)) return undefined;

  const layoutValues: SimplifiedLayout = { mode };

  // sizing
  if (hasValue("layoutSizingHorizontal", n) || hasValue("layoutSizingVertical", n)) {
    layoutValues.sizing = {
      horizontal: convertSizing(n.layoutSizingHorizontal),
      vertical: convertSizing(n.layoutSizingVertical),
    };
  }

  // alignment (for children in auto-layout)
  layoutValues.alignSelf = convertSelfAlign(n.layoutAlign);

  // position
  if (hasValue("layoutPositioning", n) && n.layoutPositioning === "ABSOLUTE") {
    layoutValues.position = "absolute";
  }

  // location relative to parent
  if (parent && hasValue("absoluteBoundingBox", parent) && hasValue("absoluteBoundingBox", n) && 
      parent.absoluteBoundingBox && n.absoluteBoundingBox) {
    layoutValues.locationRelativeToParent = {
      x: pixelRound(n.absoluteBoundingBox.x - parent.absoluteBoundingBox.x),
      y: pixelRound(n.absoluteBoundingBox.y - parent.absoluteBoundingBox.y),
    };
  }

  // dimensions
  if (hasValue("absoluteBoundingBox", n) && n.absoluteBoundingBox) {
    const { width, height } = n.absoluteBoundingBox;
    if (width !== undefined && height !== undefined) {
      layoutValues.dimensions = {
        width: pixelRound(width),
        height: pixelRound(height),
        aspectRatio: width && height ? pixelRound(width / height) : undefined,
      };
    }
  }

  return layoutValues;
}

