import type { StyleId } from "./enhancedCommon";
import { generateVarId } from "./enhancedCommon";
import type { StyleTypes, GlobalVars } from "../extractors/types";

export interface DesignToken {
  id: string;
  name: string;
  value: any;
  type: "color" | "typography" | "spacing" | "effect" | "layout" | "component";
  category?: string;
  description?: string;
  cssVariable?: string;
}

export interface DesignTokens {
  colors: DesignToken[];
  typography: DesignToken[];
  spacing: DesignToken[];
  effects: DesignToken[];
  layout: DesignToken[];
  components: DesignToken[];
}

/**
 * Global variable manager for style deduplication and design token generation
 */
export class GlobalVariableManager {
  private globalVars: GlobalVars;

  constructor(initialVars: GlobalVars = { styles: {} }) {
    this.globalVars = initialVars;
  }

  /**
   * Find existing variable or create new one
   */
  findOrCreateVariable(value: StyleTypes, prefix: string): StyleId {
    // Check if the same value already exists
    const [existingVarId] = Object.entries(this.globalVars.styles).find(
      ([_, existingValue]) => JSON.stringify(existingValue) === JSON.stringify(value),
    ) ?? [];

    if (existingVarId) {
      return existingVarId as StyleId;
    }

    // Create a new variable if it doesn't exist
    const varId = generateVarId(prefix);
    this.globalVars.styles[varId] = value;
    return varId;
  }

  /**
   * Get all global variables
   */
  getGlobalVars(): GlobalVars {
    return { ...this.globalVars };
  }

  /**
   * Get variable by ID
   */
  getVariable(id: StyleId): StyleTypes | undefined {
    return this.globalVars.styles[id];
  }

  /**
   * Get all variables of a specific type
   */
  getVariablesByType(type: string): Record<StyleId, StyleTypes> {
    return Object.fromEntries(
      Object.entries(this.globalVars.styles).filter(([id]) => id.startsWith(type))
    ) as Record<StyleId, StyleTypes>;
  }

  /**
   * Generate design tokens from global variables
   */
  generateDesignTokens(): DesignTokens {
    const tokens: DesignTokens = {
      colors: [],
      typography: [],
      spacing: [],
      effects: [],
      layout: [],
      components: [],
    };

    for (const [id, value] of Object.entries(this.globalVars.styles)) {
      const token = this.createDesignToken(id as StyleId, value);
      if (token) {
        switch (token.type) {
          case "color":
            tokens.colors.push(token);
            break;
          case "typography":
            tokens.typography.push(token);
            break;
          case "spacing":
            tokens.spacing.push(token);
            break;
          case "effect":
            tokens.effects.push(token);
            break;
          case "layout":
            tokens.layout.push(token);
            break;
          case "component":
            tokens.components.push(token);
            break;
        }
      }
    }

    return tokens;
  }

  /**
   * Create design token from variable ID and value
   */
  private createDesignToken(id: StyleId, value: StyleTypes): DesignToken | null {
    const [prefix] = id.split('_');
    let type: DesignToken["type"];
    let processedValue = value;
    let cssVariable: string | undefined;

    // Determine token type based on prefix
    switch (prefix) {
      case "fill":
      case "color":
        type = "color";
        processedValue = this.processColorValue(value);
        cssVariable = `--${this.toCSSVariableName(id)}-color`;
        break;
      case "textStyle":
      case "font":
        type = "typography";
        processedValue = this.processTypographyValue(value);
        cssVariable = `--${this.toCSSVariableName(id)}-typography`;
        break;
      case "layout":
        type = "layout";
        processedValue = this.processLayoutValue(value);
        cssVariable = `--${this.toCSSVariableName(id)}-layout`;
        break;
      case "effect":
        type = "effect";
        processedValue = this.processEffectValue(value);
        cssVariable = `--${this.toCSSVariableName(id)}-effect`;
        break;
      case "stroke":
        type = "color";
        processedValue = this.processStrokeValue(value);
        cssVariable = `--${this.toCSSVariableName(id)}-stroke`;
        break;
      default:
        // Try to infer type from value structure
        type = this.inferTokenType(value) || 'color';
        if (!type) return null;
        cssVariable = `--${this.toCSSVariableName(id)}`;
    }

    return {
      id,
      name: this.generateTokenName(id, type),
      value: processedValue,
      type,
      cssVariable,
      description: this.generateTokenDescription(type, processedValue),
    };
  }

  /**
   * Process color value for design token
   */
  private processColorValue(value: StyleTypes): any {
    if (typeof value === "string") {
      return value;
    }

    if (Array.isArray(value)) {
      // Handle fill arrays
      return value.map(fill => {
        if (typeof fill === "string") {
          return fill;
        }
        if (typeof fill === "object" && fill !== null) {
          if ("gradient" in fill) {
            return fill.gradient;
          }
          if ("type" in fill && fill.type === "IMAGE") {
            return `url(${fill.imageRef})`;
          }
        }
        return fill;
      });
    }

    return value;
  }

  /**
   * Process typography value for design token
   */
  private processTypographyValue(value: StyleTypes): any {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Extract CSS-compatible typography properties
      const typography = value as any;
      return {
        fontFamily: typography.fontFamily,
        fontSize: typography.fontSize ? `${typography.fontSize}px` : undefined,
        fontWeight: typography.fontWeight,
        lineHeight: typography.lineHeight,
        letterSpacing: typography.letterSpacing,
        textAlign: typography.textAlign || typography.textAlignHorizontal,
        color: typography.color,
      };
    }
    return value;
  }

  /**
   * Process layout value for design token
   */
  private processLayoutValue(value: StyleTypes): any {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const layout = value as any;
      return {
        display: layout.display,
        flexDirection: layout.flexDirection,
        alignItems: layout.alignItems,
        justifyContent: layout.justifyContent,
        gap: layout.gap,
        padding: layout.padding,
        margin: layout.margin,
        width: layout.width,
        height: layout.height,
      };
    }
    return value;
  }

  /**
   * Process effect value for design token
   */
  private processEffectValue(value: StyleTypes): any {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const effects = value as any;
      return {
        boxShadow: effects.boxShadow,
        filter: effects.filter,
        backdropFilter: effects.backdropFilter,
        textShadow: effects.textShadow,
        opacity: effects.opacity,
      };
    }
    return value;
  }

  /**
   * Process stroke value for design token
   */
  private processStrokeValue(value: StyleTypes): any {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const stroke = value as any;
      return {
        colors: stroke.colors,
        strokeWeight: stroke.strokeWeight,
        strokeDashes: stroke.strokeDashes,
      };
    }
    return value;
  }

  /**
   * Infer token type from value structure
   */
  private inferTokenType(value: StyleTypes): DesignToken["type"] | null {
    if (typeof value === "string") {
      // Check if it looks like a color
      if (value.startsWith("#") || value.startsWith("rgb") || value.startsWith("hsl")) {
        return "color";
      }
      // Check if it looks like spacing
      if (value.match(/^\d+(\.\d+)?(px|em|rem|%)$/)) {
        return "spacing";
      }
    }

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const obj = value as any;
      
      // Check for typography properties
      if (obj.fontFamily || obj.fontSize || obj.fontWeight) {
        return "typography";
      }
      
      // Check for layout properties
      if (obj.display || obj.flexDirection || obj.alignItems) {
        return "layout";
      }
      
      // Check for effect properties
      if (obj.boxShadow || obj.filter || obj.textShadow) {
        return "effect";
      }
    }

    return null;
  }

  /**
   * Generate human-readable token name
   */
  private generateTokenName(id: StyleId, type: DesignToken["type"]): string {
    const [_prefix, suffix] = id.split('_');
    const baseName = `${type}-${suffix}`;
    
    // Convert to human-readable format
    return baseName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Generate token description
   */
  private generateTokenDescription(type: DesignToken["type"], value: any): string {
    switch (type) {
      case "color":
        return typeof value === "string" ? 
          `Color value: ${value}` : 
          `Color palette with ${Array.isArray(value) ? value.length : 1} variants`;
      case "typography":
        return `Typography style with font, size, and spacing properties`;
      case "layout":
        return `Layout configuration for positioning and alignment`;
      case "effect":
        return `Visual effect including shadows, blurs, or other filters`;
      case "spacing":
        return `Spacing value for margins, padding, or gaps`;
      case "component":
        return `Component-specific styling and behavior`;
      default:
        return `Design token of type ${type}`;
    }
  }

  /**
   * Convert StyleId to CSS variable name
   */
  private toCSSVariableName(id: StyleId): string {
    return id.toLowerCase().replace(/_/g, '-');
  }

  /**
   * Generate CSS custom properties from design tokens
   */
  generateCSSCustomProperties(): string {
    const tokens = this.generateDesignTokens();
    const cssProperties: string[] = [];

    // Add CSS custom properties for each token category
    const addTokenProperties = (tokenList: DesignToken[], _category: string) => {
      tokenList.forEach(token => {
        if (token.cssVariable && token.value) {
          const cssValue = this.formatValueForCSS(token.value, token.type);
          if (cssValue) {
            cssProperties.push(`  ${token.cssVariable}: ${cssValue};`);
          }
        }
      });
    };

    cssProperties.push(`:root {`);
    cssProperties.push(`  /* Color tokens */`);
    addTokenProperties(tokens.colors, "colors");
    
    cssProperties.push(`  /* Typography tokens */`);
    addTokenProperties(tokens.typography, "typography");
    
    cssProperties.push(`  /* Layout tokens */`);
    addTokenProperties(tokens.layout, "layout");
    
    cssProperties.push(`  /* Effect tokens */`);
    addTokenProperties(tokens.effects, "effects");
    
    cssProperties.push(`  /* Spacing tokens */`);
    addTokenProperties(tokens.spacing, "spacing");
    
    cssProperties.push(`}`);

    return cssProperties.join('\n');
  }

  /**
   * Format token value for CSS
   */
  private formatValueForCSS(value: any, type: DesignToken["type"]): string | null {
    if (typeof value === "string") {
      return value;
    }

    if (type === "typography" && typeof value === "object") {
      // For typography, create a shorthand if possible
      const { fontSize, fontWeight, lineHeight, fontFamily } = value;
      if (fontSize && fontFamily) {
        const weight = fontWeight || 'normal';
        const height = lineHeight ? `/${lineHeight}` : '';
        return `${weight} ${fontSize}${height} ${fontFamily}`;
      }
    }

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (typeof value === "object" && value !== null) {
      // For complex objects, serialize key properties
      const keys = Object.keys(value);
      if (keys.length === 1) {
        return value[keys[0]];
      }
    }

    return null;
  }

  /**
   * Clear all variables
   */
  clear(): void {
    this.globalVars = { styles: {} };
  }

  /**
   * Get statistics about variables
   */
  getStatistics(): {
    totalVariables: number;
    variablesByType: Record<string, number>;
    duplicatesFound: number;
    memoryUsage: number;
  } {
    const totalVariables = Object.keys(this.globalVars.styles).length;
    const variablesByType: Record<string, number> = {};
    
    for (const id of Object.keys(this.globalVars.styles)) {
      const [prefix] = (id as StyleId).split('_');
      variablesByType[prefix] = (variablesByType[prefix] || 0) + 1;
    }

    // Simple duplicate detection (same values)
    const values = Object.values(this.globalVars.styles);
    const uniqueValues = new Set(values.map(v => JSON.stringify(v)));
    const duplicatesFound = values.length - uniqueValues.size;

    // Rough memory usage calculation
    const jsonString = JSON.stringify(this.globalVars);
    const memoryUsage = jsonString.length * 2; // Rough bytes estimate

    return {
      totalVariables,
      variablesByType,
      duplicatesFound,
      memoryUsage,
    };
  }
}