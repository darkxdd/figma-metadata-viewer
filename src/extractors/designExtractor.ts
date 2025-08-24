import type { FigmaNode } from "../types/figma";
import { isVisible } from "../utils/enhancedCommon";
import type { ExtractorFn, TraversalOptions, GlobalVars, SimplifiedDesign } from "./types";
import { extractFromDesignNodes } from "./nodeWalker";

interface GetFileResponse {
  name: string;
  lastModified: string;
  thumbnailUrl?: string;
  document: FigmaNode;
  components?: Record<string, any>;
  componentSets?: Record<string, any>;
}

interface GetFileNodesResponse {
  name: string;
  lastModified: string;
  thumbnailUrl?: string;
  nodes: Record<string, {
    document: FigmaNode;
    components?: Record<string, any>;
    componentSets?: Record<string, any>;
  }>;
}

/**
 * Extract a complete SimplifiedDesign from raw Figma API response using extractors.
 */
export function simplifyRawFigmaObject(
  apiResponse: GetFileResponse | GetFileNodesResponse,
  nodeExtractors: ExtractorFn[],
  options: TraversalOptions = {},
): SimplifiedDesign {
  // Extract components, componentSets, and raw nodes from API response
  const { metadata, rawNodes, components, componentSets } = parseAPIResponse(apiResponse);

  // Process nodes using the flexible extractor system
  const globalVars: GlobalVars = { styles: {} };
  const { nodes: extractedNodes, globalVars: finalGlobalVars } = extractFromDesignNodes(
    rawNodes,
    nodeExtractors,
    options,
    globalVars,
  );

  // Return complete design
  return {
    ...metadata,
    nodes: extractedNodes,
    components: simplifyComponents(components),
    componentSets: simplifyComponentSets(componentSets),
    globalVars: finalGlobalVars,
  };
}

/**
 * Parse the raw Figma API response to extract metadata, nodes, and components.
 */
function parseAPIResponse(data: GetFileResponse | GetFileNodesResponse) {
  const aggregatedComponents: Record<string, any> = {};
  const aggregatedComponentSets: Record<string, any> = {};
  let nodesToParse: Array<FigmaNode>;

  if ("nodes" in data) {
    // GetFileNodesResponse
    const nodeResponses = Object.values(data.nodes);
    nodeResponses.forEach((nodeResponse) => {
      if (nodeResponse.components) {
        Object.assign(aggregatedComponents, nodeResponse.components);
      }
      if (nodeResponse.componentSets) {
        Object.assign(aggregatedComponentSets, nodeResponse.componentSets);
      }
    });
    nodesToParse = nodeResponses.map((n) => n.document).filter(isVisible);
  } else {
    // GetFileResponse
    Object.assign(aggregatedComponents, data.components || {});
    Object.assign(aggregatedComponentSets, data.componentSets || {});
    nodesToParse = data.document.children?.filter(isVisible) || [];
  }

  const { name, lastModified, thumbnailUrl } = data;

  return {
    metadata: {
      name,
      lastModified,
      thumbnailUrl: thumbnailUrl || "",
    },
    rawNodes: nodesToParse,
    components: aggregatedComponents,
    componentSets: aggregatedComponentSets,
  };
}

/**
 * Simplify Figma components to our format
 */
function simplifyComponents(components: Record<string, any>) {
  const simplified: Record<string, any> = {};
  
  for (const [id, component] of Object.entries(components)) {
    simplified[id] = {
      id: component.id || id,
      name: component.name || "Unnamed Component",
      description: component.description || "",
      properties: extractComponentProperties(component),
    };
  }
  
  return simplified;
}

/**
 * Simplify Figma component sets to our format
 */
function simplifyComponentSets(componentSets: Record<string, any>) {
  const simplified: Record<string, any> = {};
  
  for (const [id, componentSet] of Object.entries(componentSets)) {
    simplified[id] = {
      id: componentSet.id || id,
      name: componentSet.name || "Unnamed Component Set",
      description: componentSet.description || "",
      variants: extractComponentVariants(componentSet),
    };
  }
  
  return simplified;
}

/**
 * Extract component properties from a Figma component
 */
function extractComponentProperties(component: any) {
  const properties = [];
  
  // Extract properties from componentPropertyDefinitions if available
  if (component.componentPropertyDefinitions) {
    for (const [name, definition] of Object.entries(component.componentPropertyDefinitions)) {
      properties.push({
        name,
        value: (definition as any).defaultValue?.toString() || "",
        type: (definition as any).type || "TEXT",
      });
    }
  }
  
  return properties;
}

/**
 * Extract component variants from a Figma component set
 */
function extractComponentVariants(_componentSet: any) {
  const variants: any[] = [];
  
  // In a real implementation, this would extract variants from the component set
  // For now, return empty array
  return variants;
}