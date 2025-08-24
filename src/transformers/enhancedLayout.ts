import { isInAutoLayoutFlow, isFrame, isLayout, isRectangle } from "../utils/identity";
import type { FigmaNode } from "../types/figma";
import { generateCSSShorthand, pixelRound } from "../utils/enhancedCommon";

export interface EnhancedSimplifiedLayout {
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
  // Enhanced properties for better CSS generation
  display?: string;
  flexDirection?: string;
  width?: string;
  height?: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  margin?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridGap?: string;
}

/**
 * Build simplified layout information from a Figma node
 * Integrates with our existing layout extractor for enhanced functionality
 */
export function buildEnhancedSimplifiedLayout(
  n: FigmaNode,
  parent?: FigmaNode,
): EnhancedSimplifiedLayout {
  const frameValues = buildSimplifiedFrameValues(n);
  const layoutValues = buildSimplifiedLayoutValues(n, parent, frameValues.mode) || {};

  // Enhanced processing for better CSS generation
  const enhanced = enhanceLayoutForCSS({ ...frameValues, ...layoutValues }, n);

  return enhanced;
}

/**
 * Enhance layout data for better CSS generation
 */
function enhanceLayoutForCSS(
  layout: EnhancedSimplifiedLayout,
  node: FigmaNode,
  // parent?: FigmaNode,
): EnhancedSimplifiedLayout {
  const enhanced = { ...layout };

  // Set display property based on layout mode
  if (layout.mode === "row" || layout.mode === "column") {
    enhanced.display = "flex";
    enhanced.flexDirection = layout.mode === "row" ? "row" : "column";
  } else {
    enhanced.display = "block";
  }

  // Convert dimensions to CSS-friendly format
  if (layout.dimensions) {
    if (layout.dimensions.width) {
      enhanced.width = `${layout.dimensions.width}px`;
    }
    if (layout.dimensions.height) {
      enhanced.height = `${layout.dimensions.height}px`;
    }
  }

  // Convert positioning to CSS properties
  if (layout.position === "absolute" && layout.locationRelativeToParent) {
    enhanced.position = "absolute";
    enhanced.top = `${layout.locationRelativeToParent.y}px`;
    enhanced.left = `${layout.locationRelativeToParent.x}px`;
  }

  // Handle sizing constraints
  if (layout.sizing) {
    if (layout.sizing.horizontal === "fill") {
      enhanced.width = "100%";
    } else if (layout.sizing.horizontal === "hug") {
      enhanced.width = "fit-content";
    }

    if (layout.sizing.vertical === "fill") {
      enhanced.height = "100%";
    } else if (layout.sizing.vertical === "hug") {
      enhanced.height = "fit-content";
    }
  }

  // Handle grid layouts if detected
  if (shouldUseGridLayout(node)) {
    enhanced.display = "grid";
    const gridProperties = calculateGridProperties(node);
    enhanced.gridTemplateColumns = gridProperties.columns;
    enhanced.gridTemplateRows = gridProperties.rows;
    enhanced.gridGap = enhanced.gap || "0px";
  }

  return enhanced;
}

/**
 * Check if node should use CSS Grid instead of Flexbox
 */
function shouldUseGridLayout(node: FigmaNode): boolean {
  if (!isFrame(node) || !node.children || node.children.length < 4) {
    return false;
  }

  // Simple heuristic: if children are arranged in a regular grid pattern, use CSS Grid
  const children = node.children.filter(child => isLayout(child));
  if (children.length < 4) return false;

  // Check if children form a grid pattern by analyzing positions
  const positions = children.map(child => ({
    x: (child as any).absoluteBoundingBox?.x || 0,
    y: (child as any).absoluteBoundingBox?.y || 0,
  }));

  const uniqueX = [...new Set(positions.map(p => p.x))].sort((a, b) => a - b);
  const uniqueY = [...new Set(positions.map(p => p.y))].sort((a, b) => a - b);

  // If we have at least 2 columns and 2 rows, consider it a grid
  return uniqueX.length >= 2 && uniqueY.length >= 2;
}

/**
 * Calculate grid properties for CSS Grid layout
 */
function calculateGridProperties(node: FigmaNode): { columns: string; rows: string } {
  if (!isFrame(node) || !node.children) {
    return { columns: "1fr", rows: "1fr" };
  }

  const children = node.children.filter(child => isLayout(child));
  const positions = children.map(child => ({
    x: (child as any).absoluteBoundingBox?.x || 0,
    y: (child as any).absoluteBoundingBox?.y || 0,
    width: (child as any).absoluteBoundingBox?.width || 0,
    height: (child as any).absoluteBoundingBox?.height || 0,
  }));

  const uniqueX = [...new Set(positions.map(p => p.x))].sort((a, b) => a - b);
  const uniqueY = [...new Set(positions.map(p => p.y))].sort((a, b) => a - b);

  // Simple approach: assume equal-width columns and rows
  const columns = uniqueX.map(() => "1fr").join(" ");
  const rows = uniqueY.map(() => "1fr").join(" ");

  return { columns, rows };
}

// Convert Figma's layout config into a more typical flex-like schema
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
    const direction = getDirection(axis, mode);
    const shouldStretch = children.length > 0 && children.reduce((shouldStretch, c) => {
      if (!shouldStretch) return false;
      if ((c as any).layoutPositioning === "ABSOLUTE") return true;
      if (direction === "horizontal") {
        return (c as any).layoutSizingHorizontal === "FILL";
      } else if (direction === "vertical") {
        return (c as any).layoutSizingVertical === "FILL";
      }
      return false;
    }, true);

    if (shouldStretch) return "stretch";
  }

  switch (axisAlign) {
    case "MIN":
      return undefined; // flex-start is default
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
      return undefined; // flex-start is default
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
      return mode === "row" ? "horizontal" : "vertical";
    case "counter":
      return mode === "row" ? "vertical" : "horizontal";
  }
}

function buildSimplifiedFrameValues(n: FigmaNode): EnhancedSimplifiedLayout | { mode: "none" } {
  if (!isFrame(n)) {
    return { mode: "none" };
  }

  const frameNode = n as any;
  const frameValues: EnhancedSimplifiedLayout = {
    mode: !frameNode.layoutMode || frameNode.layoutMode === "NONE"
      ? "none"
      : frameNode.layoutMode === "HORIZONTAL"
        ? "row"
        : "column",
  };

  const overflowScroll: EnhancedSimplifiedLayout["overflowScroll"] = [];
  if (frameNode.overflowDirection?.includes("HORIZONTAL")) overflowScroll.push("x");
  if (frameNode.overflowDirection?.includes("VERTICAL")) overflowScroll.push("y");
  if (overflowScroll.length > 0) frameValues.overflowScroll = overflowScroll;

  if (frameValues.mode === "none") {
    return frameValues;
  }

  frameValues.justifyContent = convertAlign(frameNode.primaryAxisAlignItems ?? "MIN", {
    children: frameNode.children || [],
    axis: "primary",
    mode: frameValues.mode,
  });
  frameValues.alignItems = convertAlign(frameNode.counterAxisAlignItems ?? "MIN", {
    children: frameNode.children || [],
    axis: "counter",
    mode: frameValues.mode,
  });
  frameValues.alignSelf = convertSelfAlign(frameNode.layoutAlign);
  frameValues.wrap = frameNode.layoutWrap === "WRAP" ? true : undefined;
  frameValues.gap = frameNode.itemSpacing ? `${frameNode.itemSpacing}px` : undefined;

  // Gather padding
  if (frameNode.paddingTop || frameNode.paddingBottom || frameNode.paddingLeft || frameNode.paddingRight) {
    frameValues.padding = generateCSSShorthand({
      top: frameNode.paddingTop ?? 0,
      right: frameNode.paddingRight ?? 0,
      bottom: frameNode.paddingBottom ?? 0,
      left: frameNode.paddingLeft ?? 0,
    });
  }

  return frameValues;
}

function buildSimplifiedLayoutValues(
  n: FigmaNode,
  parent: FigmaNode | undefined,
  mode: "row" | "column" | "none",
): EnhancedSimplifiedLayout | undefined {
  if (!isLayout(n)) return undefined;

  const layoutNode = n as any;
  const layoutValues: EnhancedSimplifiedLayout = { mode };

  layoutValues.sizing = {
    horizontal: convertSizing(layoutNode.layoutSizingHorizontal),
    vertical: convertSizing(layoutNode.layoutSizingVertical),
  };

  // Position handling
  if (isFrame(parent) && !isInAutoLayoutFlow(n, parent)) {
    if (layoutNode.layoutPositioning === "ABSOLUTE") {
      layoutValues.position = "absolute";
    }
    if (layoutNode.absoluteBoundingBox && (parent as any).absoluteBoundingBox) {
      layoutValues.locationRelativeToParent = {
        x: pixelRound(layoutNode.absoluteBoundingBox.x - (parent as any).absoluteBoundingBox.x),
        y: pixelRound(layoutNode.absoluteBoundingBox.y - (parent as any).absoluteBoundingBox.y),
      };
    }
  }

  // Dimensions handling
  if (isRectangle("absoluteBoundingBox", n)) {
    const dimensions: { width?: number; height?: number; aspectRatio?: number } = {};

    if (mode === "row") {
      if (!layoutNode.layoutGrow && layoutNode.layoutSizingHorizontal === "FIXED")
        dimensions.width = layoutNode.absoluteBoundingBox.width;
      if (layoutNode.layoutAlign !== "STRETCH" && layoutNode.layoutSizingVertical === "FIXED")
        dimensions.height = layoutNode.absoluteBoundingBox.height;
    } else if (mode === "column") {
      if (layoutNode.layoutAlign !== "STRETCH" && layoutNode.layoutSizingHorizontal === "FIXED")
        dimensions.width = layoutNode.absoluteBoundingBox.width;
      if (!layoutNode.layoutGrow && layoutNode.layoutSizingVertical === "FIXED")
        dimensions.height = layoutNode.absoluteBoundingBox.height;

      if (layoutNode.preserveRatio) {
        dimensions.aspectRatio = layoutNode.absoluteBoundingBox.width / layoutNode.absoluteBoundingBox.height;
      }
    } else {
      if (!layoutNode.layoutSizingHorizontal || layoutNode.layoutSizingHorizontal === "FIXED") {
        dimensions.width = layoutNode.absoluteBoundingBox.width;
      }
      if (!layoutNode.layoutSizingVertical || layoutNode.layoutSizingVertical === "FIXED") {
        dimensions.height = layoutNode.absoluteBoundingBox.height;
      }
    }

    if (Object.keys(dimensions).length > 0) {
      if (dimensions.width) {
        dimensions.width = pixelRound(dimensions.width);
      }
      if (dimensions.height) {
        dimensions.height = pixelRound(dimensions.height);
      }
      layoutValues.dimensions = dimensions;
    }
  }

  return layoutValues;
}