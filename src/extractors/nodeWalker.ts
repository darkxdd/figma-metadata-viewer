import type { FigmaNode } from "../types/figma";
import { isVisible } from "../utils/enhancedCommon";
import { hasValue } from "../utils/identity";
import type {
  ExtractorFn,
  TraversalContext,
  TraversalOptions,
  GlobalVars,
  SimplifiedNode,
} from "./types";

/**
 * Extract data from a Figma node using a flexible, single-pass approach.
 *
 * @param node - The Figma node to process (single node, not array)
 * @param options - Object containing extractors, globalVars, and traversal options
 * @returns The processed SimplifiedNode
 */
export function extractFromDesign(
  node: FigmaNode,
  options: {
    extractors: ExtractorFn[];
    globalVars: GlobalVars;
    traversalOptions?: TraversalOptions;
  }
): SimplifiedNode {
  const { extractors, globalVars, traversalOptions = {} } = options;
  
  const context: TraversalContext = {
    globalVars,
    currentDepth: 0,
  };

  const processedNode = processNodeWithExtractors(node, extractors, context, traversalOptions);
  
  if (!processedNode) {
    throw new Error(`Failed to process node: ${node.id}`);
  }

  return processedNode;
}

/**
 * Extract data from multiple Figma nodes using a flexible, single-pass approach.
 *
 * @param nodes - The Figma nodes to process
 * @param extractors - Array of extractor functions to apply during traversal
 * @param options - Traversal options (filtering, depth limits, etc.)
 * @param globalVars - Global variables for style deduplication
 * @returns Object containing processed nodes and updated global variables
 */
export function extractFromDesignNodes(
  nodes: FigmaNode[],
  extractors: ExtractorFn[],
  options: TraversalOptions = {},
  globalVars: GlobalVars = { styles: {} },
): { nodes: SimplifiedNode[]; globalVars: GlobalVars } {
  const context: TraversalContext = {
    globalVars,
    currentDepth: 0,
  };

  const processedNodes = nodes
    .filter((node) => shouldProcessNode(node, options))
    .map((node) => processNodeWithExtractors(node, extractors, context, options))
    .filter((node): node is SimplifiedNode => node !== null);

  return {
    nodes: processedNodes,
    globalVars: context.globalVars,
  };
}

/**
 * Process a single node with all provided extractors in one pass.
 */
function processNodeWithExtractors(
  node: FigmaNode,
  extractors: ExtractorFn[],
  context: TraversalContext,
  options: TraversalOptions,
): SimplifiedNode | null {
  if (!shouldProcessNode(node, options)) {
    return null;
  }

  // Always include base metadata
  const result: SimplifiedNode = {
    id: node.id,
    name: node.name,
    type: node.type === "VECTOR" ? "IMAGE-SVG" : node.type,
  };

  // Apply all extractors to this node in a single pass
  for (const extractor of extractors) {
    extractor(node, result, context);
  }

  // Handle children recursively
  if (shouldTraverseChildren(node, context, options)) {
    const childContext: TraversalContext = {
      ...context,
      currentDepth: context.currentDepth + 1,
      parent: node,
    };

    // Check if node has children property
    if (hasValue("children", node) && Array.isArray(node.children) && node.children.length > 0) {
      const children = node.children
        .filter((child) => shouldProcessNode(child, options))
        .map((child) => processNodeWithExtractors(child, extractors, childContext, options))
        .filter((child): child is SimplifiedNode => child !== null);

      if (children.length > 0) {
        result.children = children;
      }
    }
  }

  return result;
}

/**
 * Determine if a node should be processed based on filters.
 */
function shouldProcessNode(node: FigmaNode, options: TraversalOptions): boolean {
  // Skip invisible nodes
  if (!isVisible(node)) {
    return false;
  }

  // Apply custom node filter if provided
  if (options.nodeFilter && !options.nodeFilter(node)) {
    return false;
  }

  return true;
}

/**
 * Determine if we should traverse into a node's children.
 */
function shouldTraverseChildren(
  _node: FigmaNode,
  context: TraversalContext,
  options: TraversalOptions,
): boolean {
  // Check depth limit
  if (options.maxDepth !== undefined && context.currentDepth >= options.maxDepth) {
    return false;
  }

  return true;
}