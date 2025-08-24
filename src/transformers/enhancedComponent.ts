import type { FigmaNode } from "../types/figma";

export interface ComponentProperties {
  name: string;
  value: string;
  type: string;
}

export interface EnhancedSimplifiedComponentDefinition {
  id: string;
  key?: string;
  name: string;
  description?: string;
  componentSetId?: string;
  properties: ComponentProperties[];
  variants?: ComponentProperties[];
}

export interface EnhancedSimplifiedComponentSetDefinition {
  id: string;
  key?: string;
  name: string;
  description?: string;
  components: Record<string, EnhancedSimplifiedComponentDefinition>;
  variantProperties?: string[];
}

/**
 * Simplify components to our enhanced format
 */
export function simplifyEnhancedComponents(
  aggregatedComponents: Record<string, any>,
): Record<string, EnhancedSimplifiedComponentDefinition> {
  return Object.fromEntries(
    Object.entries(aggregatedComponents).map(([id, comp]) => [
      id,
      {
        id,
        key: comp.key || id,
        name: comp.name || "Unnamed Component",
        description: comp.description || "",
        componentSetId: comp.componentSetId,
        properties: extractComponentProperties(comp),
        variants: extractComponentVariants(comp),
      },
    ]),
  );
}

/**
 * Simplify component sets to our enhanced format
 */
export function simplifyEnhancedComponentSets(
  aggregatedComponentSets: Record<string, any>,
): Record<string, EnhancedSimplifiedComponentSetDefinition> {
  return Object.fromEntries(
    Object.entries(aggregatedComponentSets).map(([id, set]) => [
      id,
      {
        id,
        key: set.key || id,
        name: set.name || "Unnamed Component Set",
        description: set.description || "",
        components: extractComponentSetComponents(set),
        variantProperties: extractVariantProperties(set),
      },
    ]),
  );
}

/**
 * Extract component properties from a Figma component
 */
function extractComponentProperties(component: any): ComponentProperties[] {
  const properties: ComponentProperties[] = [];
  
  // Extract properties from componentPropertyDefinitions if available
  if (component.componentPropertyDefinitions) {
    for (const [name, definition] of Object.entries(component.componentPropertyDefinitions)) {
      const def = definition as any;
      properties.push({
        name,
        value: def.defaultValue?.toString() || "",
        type: def.type || "TEXT",
      });
    }
  }
  
  // Extract from componentProperties (for instances)
  if (component.componentProperties) {
    for (const [name, property] of Object.entries(component.componentProperties)) {
      const prop = property as any;
      properties.push({
        name,
        value: prop.value?.toString() || "",
        type: prop.type || "TEXT",
      });
    }
  }
  
  return properties;
}

/**
 * Extract component variants from a Figma component
 */
function extractComponentVariants(component: any): ComponentProperties[] {
  const variants: ComponentProperties[] = [];
  
  // Extract variant properties from component
  if (component.variantProperties) {
    for (const [name, value] of Object.entries(component.variantProperties)) {
      variants.push({
        name,
        value: (value as any)?.toString() || "",
        type: "VARIANT",
      });
    }
  }
  
  return variants;
}

/**
 * Extract components from a component set
 */
function extractComponentSetComponents(componentSet: any): Record<string, EnhancedSimplifiedComponentDefinition> {
  const components: Record<string, EnhancedSimplifiedComponentDefinition> = {};
  
  // If the component set has a components property
  if (componentSet.components) {
    for (const [id, component] of Object.entries(componentSet.components)) {
      const comp = component as any;
      components[id] = {
        id,
        key: comp.key || id,
        name: comp.name || "Unnamed Component",
        description: comp.description || "",
        componentSetId: componentSet.id,
        properties: extractComponentProperties(comp),
        variants: extractComponentVariants(comp),
      };
    }
  }
  
  return components;
}

/**
 * Extract variant properties from a component set
 */
function extractVariantProperties(componentSet: any): string[] {
  const variantProperties: string[] = [];
  
  // Extract from componentPropertyDefinitions
  if (componentSet.componentPropertyDefinitions) {
    for (const name of Object.keys(componentSet.componentPropertyDefinitions)) {
      variantProperties.push(name);
    }
  }
  
  return variantProperties;
}

/**
 * Check if a node is a component instance
 */
export function isComponentInstance(node: FigmaNode): boolean {
  return node.type === "INSTANCE";
}

/**
 * Check if a node is a component definition
 */
export function isComponentDefinition(node: FigmaNode): boolean {
  return node.type === "COMPONENT";
}

/**
 * Check if a node is a component set
 */
export function isComponentSet(node: FigmaNode): boolean {
  return node.type === "COMPONENT_SET";
}

/**
 * Extract component instance data from a node
 */
export function extractComponentInstanceData(node: FigmaNode): {
  componentId?: string;
  componentProperties: ComponentProperties[];
} | null {
  if (!isComponentInstance(node)) {
    return null;
  }

  const instanceNode = node as any;
  
  return {
    componentId: instanceNode.componentId,
    componentProperties: extractComponentProperties(instanceNode),
  };
}

/**
 * Generate design tokens from components
 */
export function generateComponentDesignTokens(
  components: Record<string, EnhancedSimplifiedComponentDefinition>,
  componentSets: Record<string, EnhancedSimplifiedComponentSetDefinition>,
): {
  componentTokens: string[];
  variantTokens: string[];
  propertyTokens: string[];
} {
  const componentTokens: string[] = [];
  const variantTokens: string[] = [];
  const propertyTokens: string[] = [];
  
  // Generate tokens from individual components
  for (const component of Object.values(components)) {
    componentTokens.push(`--component-${component.name.toLowerCase().replace(/\s+/g, '-')}`);
    
    // Add property tokens
    for (const property of component.properties) {
      propertyTokens.push(`--${component.name.toLowerCase().replace(/\s+/g, '-')}-${property.name.toLowerCase().replace(/\s+/g, '-')}`);
    }
  }
  
  // Generate tokens from component sets
  for (const componentSet of Object.values(componentSets)) {
    componentTokens.push(`--component-set-${componentSet.name.toLowerCase().replace(/\s+/g, '-')}`);
    
    // Add variant tokens
    for (const property of componentSet.variantProperties || []) {
      variantTokens.push(`--variant-${property.toLowerCase().replace(/\s+/g, '-')}`);
    }
  }
  
  return {
    componentTokens: [...new Set(componentTokens)],
    variantTokens: [...new Set(variantTokens)],
    propertyTokens: [...new Set(propertyTokens)],
  };
}