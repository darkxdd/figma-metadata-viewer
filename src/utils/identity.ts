import type {
  Node as FigmaDocumentNode,
  Rectangle,
  HasLayoutTrait,
  StrokeWeights,
  HasFramePropertiesTrait,
  FrameNode,
  GroupNode,
  TextNode,
  InstanceNode,
  RectangleNode,
  EllipseNode,
  VectorNode,
  ComponentNode,
} from "@figma/rest-api-spec";

// Type guards for specific node types
export function isFrameNode(node: FigmaDocumentNode): node is FrameNode {
  return node.type === 'FRAME';
}

export function isGroupNode(node: FigmaDocumentNode): node is GroupNode {
  return node.type === 'GROUP';
}

export function isTextNode(node: FigmaDocumentNode): node is TextNode {
  return node.type === 'TEXT';
}

export function isInstanceNode(node: FigmaDocumentNode): node is InstanceNode {
  return node.type === 'INSTANCE';
}

export function isRectangleNode(node: FigmaDocumentNode): node is RectangleNode {
  return node.type === 'RECTANGLE';
}

export function isEllipseNode(node: FigmaDocumentNode): node is EllipseNode {
  return node.type === 'ELLIPSE';
}

export function isVectorNode(node: FigmaDocumentNode): node is VectorNode {
  return node.type === 'VECTOR';
}

export function isComponentNode(node: FigmaDocumentNode): node is ComponentNode {
  return node.type === 'COMPONENT';
}

// Type guard for nodes that have children
export function hasChildren(node: FigmaDocumentNode): node is FigmaDocumentNode & { children: FigmaDocumentNode[] } {
  return 'children' in node && Array.isArray(node.children);
}

// Type guard for nodes that have layout properties
export function hasLayoutProperties(node: FigmaDocumentNode): node is FigmaDocumentNode & {
  absoluteBoundingBox: Rectangle;
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  itemSpacing?: number;
} {
  return 'absoluteBoundingBox' in node || isFrameNode(node) || isGroupNode(node);
}

// Type guard for nodes that have visual properties
export function hasVisualProperties(node: FigmaDocumentNode): node is FigmaDocumentNode & {
  fills?: any[];
  strokes?: any[];
  effects?: any[];
  cornerRadius?: number;
} {
  return isFrameNode(node) || isRectangleNode(node) || isEllipseNode(node) || isVectorNode(node) || isTextNode(node);
}

// Type guard for nodes that have text properties
export function hasTextProperties(node: FigmaDocumentNode): node is TextNode {
  return isTextNode(node);
}

/**
 * Check if a value is truthy (not null, undefined, empty string, or empty array)
 */
export function isTruthy<T>(value: T): value is NonNullable<T> {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string' && value === '') {
    return false;
  }
  if (Array.isArray(value) && value.length === 0) {
    return false;
  }
  return true;
}

export function hasValue<K extends PropertyKey, T>(
  key: K,
  obj: unknown,
  typeGuard?: (val: unknown) => val is T,
): obj is Record<K, T> {
  const isObject = typeof obj === "object" && obj !== null;
  if (!isObject || !(key in obj)) return false;
  const val = (obj as Record<K, unknown>)[key];
  return typeGuard ? typeGuard(val) : val !== undefined;
}

export function isFrame(val: unknown): val is HasFramePropertiesTrait {
  return (
    typeof val === "object" &&
    !!val &&
    "clipsContent" in val &&
    typeof (val as any).clipsContent === "boolean"
  );
}

export function isLayout(val: unknown): val is HasLayoutTrait {
  return (
    typeof val === "object" &&
    !!val &&
    "absoluteBoundingBox" in val &&
    typeof (val as any).absoluteBoundingBox === "object" &&
    !!(val as any).absoluteBoundingBox &&
    "x" in (val as any).absoluteBoundingBox &&
    "y" in (val as any).absoluteBoundingBox &&
    "width" in (val as any).absoluteBoundingBox &&
    "height" in (val as any).absoluteBoundingBox
  );
}


/**
 * Checks if:
 * 1. A node is a child to an auto layout frame
 * 2. The child adheres to the auto layout rules—i.e. it's not absolutely positioned
 *
 * @param node - The node to check.
 * @param parent - The parent node.
 * @returns True if the node is a child of an auto layout frame, false otherwise.
 */
export function isInAutoLayoutFlow(node: unknown, parent: unknown): boolean {
  const autoLayoutModes = ["HORIZONTAL", "VERTICAL"];
  return (
    isFrame(parent) &&
    autoLayoutModes.includes((parent as any).layoutMode ?? "NONE") &&
    isLayout(node) &&
    (node as any).layoutPositioning !== "ABSOLUTE"
  );
}

export function isStrokeWeights(val: unknown): val is StrokeWeights {
  return (
    typeof val === "object" &&
    val !== null &&
    "top" in val &&
    "right" in val &&
    "bottom" in val &&
    "left" in val
  );
}

export function isRectangle<T, K extends string>(
  key: K,
  obj: T,
): obj is T & { [P in K]: Rectangle } {
  const recordObj = obj as Record<K, unknown>;
  return (
    typeof obj === "object" &&
    !!obj &&
    key in recordObj &&
    typeof recordObj[key] === "object" &&
    !!recordObj[key] &&
    "x" in recordObj[key] &&
    "y" in recordObj[key] &&
    "width" in recordObj[key] &&
    "height" in recordObj[key]
  );
}

export function isRectangleCornerRadii(val: unknown): val is number[] {
  return Array.isArray(val) && val.length === 4 && val.every((v) => typeof v === "number");
}

export function isCSSColorValue(val: unknown): val is string {
  return typeof val === "string" && (val.startsWith("#") || val.startsWith("rgba"));
}