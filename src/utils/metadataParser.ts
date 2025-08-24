import type { FigmaNode, Fill, Stroke, Effect, Color } from '../types/figma';
import { VisualStyleExtractor, type VisualStyle } from './visualStyleExtractor';
import { TypographyExtractor, type AdvancedTypography, type TextStyleHierarchy } from './typographyExtractor';
import { LayoutExtractor, type LayoutSystem, type ResponsiveLayout } from './layoutExtractor';

export interface ParsedNodeMetadata {
  // Core properties
  id: string;
  name: string;
  type: string;
  
  // Enhanced layout and positioning
  layout: {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    constraints?: {
      horizontal: string;
      vertical: string;
    };
  };
  
  // Advanced layout system
  layoutSystem?: LayoutSystem;
  responsiveLayout?: ResponsiveLayout;
  
  // Legacy auto layout (kept for compatibility)
  autoLayout?: {
    direction: 'horizontal' | 'vertical' | 'none';
    spacing: number;
    padding: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    alignment: {
      primary: string;
      counter: string;
    };
    sizing: {
      horizontal: string;
      vertical: string;
    };
  };
  
  // Enhanced visual styling
  visualStyle?: VisualStyle;
  styling: {
    fills: ParsedFill[];
    strokes: ParsedStroke[];
    effects: ParsedEffect[];
    opacity?: number;
    cornerRadius?: number | number[];
    blendMode?: string;
  };
  
  // Advanced typography (for text nodes)
  advancedTypography?: AdvancedTypography;
  textHierarchy?: TextStyleHierarchy;
  
  // Legacy typography (kept for compatibility)
  typography?: ParsedTypography;
  
  // Content (for text nodes)
  content?: string;
  
  // Children (for container nodes)
  children?: ParsedNodeMetadata[];
  
  // Component information
  component?: {
    isComponent: boolean;
    isInstance: boolean;
    componentId?: string;
    mainComponent?: string;
    variantProperties?: Record<string, any>;
  };
  
  // Accessibility
  accessibility?: {
    role?: string;
    label?: string;
    description?: string;
    ariaAttributes?: Record<string, string>;
  };
  
  // Enhanced CSS generation
  cssHints: {
    display: string;
    position: string;
    flexDirection?: string;
    justifyContent?: string;
    alignItems?: string;
    gap?: string;
    padding?: string;
    margin?: string;
    background?: string;
    border?: string;
    borderRadius?: string;
    boxShadow?: string;
    transform?: string;
  };
  
  // Design tokens
  designTokens?: {
    colors: string[];
    typography: string[];
    spacing: string[];
    layout: string[];
  };
}

export interface ParsedFill {
  type: string;
  color?: string;
  opacity?: number;
  gradient?: {
    type: string;
    stops: Array<{
      position: number;
      color: string;
    }>;
    transform?: number[][];
  };
  image?: {
    ref: string;
    scaleMode: string;
    transform?: number[][];
  };
}

export interface ParsedStroke {
  type: string;
  color?: string;
  opacity?: number;
  weight: number;
  align: string;
  dashPattern?: number[];
}

export interface ParsedEffect {
  type: string;
  visible: boolean;
  color?: string;
  opacity?: number;
  offset?: { x: number; y: number };
  radius: number;
  spread?: number;
  cssValue: string;
}

export interface ParsedTypography {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign: string;
  textDecoration?: string;
  textTransform?: string;
  color?: string;
  cssValue: string;
}

export class MetadataParser {
  /**
   * Create AI-optimized metadata focusing only on visually relevant properties
   * This ensures Gemini receives only data that affects visual appearance
   */
  public static createAIOptimizedMetadata(node: FigmaNode): FigmaNode {
    // Extract only visually relevant properties
    const optimizedNode: any = {
      id: node.id,
      name: node.name,
      type: node.type,
      visible: node.visible,
    };

    // Visual positioning and dimensions
    if (node.absoluteBoundingBox) {
      optimizedNode.absoluteBoundingBox = node.absoluteBoundingBox;
    }

    // Layout properties that affect visual appearance
    if ('layoutMode' in node && node.layoutMode) {
      optimizedNode.layoutMode = node.layoutMode;
      if ('itemSpacing' in node) optimizedNode.itemSpacing = node.itemSpacing;
      if ('paddingTop' in node) optimizedNode.paddingTop = node.paddingTop;
      if ('paddingRight' in node) optimizedNode.paddingRight = node.paddingRight;
      if ('paddingBottom' in node) optimizedNode.paddingBottom = node.paddingBottom;
      if ('paddingLeft' in node) optimizedNode.paddingLeft = node.paddingLeft;
      if ('primaryAxisAlignItems' in node) optimizedNode.primaryAxisAlignItems = node.primaryAxisAlignItems;
      if ('counterAxisAlignItems' in node) optimizedNode.counterAxisAlignItems = node.counterAxisAlignItems;
      if ('layoutSizingHorizontal' in node) optimizedNode.layoutSizingHorizontal = node.layoutSizingHorizontal;
      if ('layoutSizingVertical' in node) optimizedNode.layoutSizingVertical = node.layoutSizingVertical;
    }

    // Visual styles - fills (backgrounds)
    if ('fills' in node && node.fills && node.fills.length > 0) {
      optimizedNode.fills = node.fills.filter(fill => fill.visible !== false);
    }

    // Visual styles - strokes (borders)
    if ('strokes' in node && node.strokes && node.strokes.length > 0) {
      optimizedNode.strokes = node.strokes.filter(stroke => stroke.visible !== false);
      if ('strokeWeight' in node) optimizedNode.strokeWeight = node.strokeWeight;
      if ('strokeAlign' in node) optimizedNode.strokeAlign = node.strokeAlign;
    }

    // Visual effects (shadows, blur, etc.)
    if ('effects' in node && node.effects && node.effects.length > 0) {
      optimizedNode.effects = node.effects.filter(effect => effect.visible !== false);
    }

    // Border radius for visual shape
    if ('cornerRadius' in node && node.cornerRadius !== undefined) {
      optimizedNode.cornerRadius = node.cornerRadius;
    }
    if ('rectangleCornerRadii' in node && node.rectangleCornerRadii) {
      optimizedNode.rectangleCornerRadii = node.rectangleCornerRadii;
    }

    // Opacity for visual transparency
    if ('opacity' in node && node.opacity !== undefined && node.opacity < 1) {
      optimizedNode.opacity = node.opacity;
    }

    // Blend mode for visual composition
    if ('blendMode' in node && node.blendMode && node.blendMode !== 'NORMAL') {
      optimizedNode.blendMode = node.blendMode;
    }

    // Text content and styling
    if (node.type === 'TEXT') {
      if ('characters' in node) optimizedNode.characters = node.characters;
      if ('style' in node && node.style) {
        optimizedNode.style = {
          fontFamily: node.style.fontFamily,
          fontSize: node.style.fontSize,
          fontWeight: node.style.fontWeight,
          lineHeightPx: node.style.lineHeightPx,
          lineHeightPercent: node.style.lineHeightPercent,
          letterSpacing: node.style.letterSpacing,
          textAlignHorizontal: node.style.textAlignHorizontal,
          textAlignVertical: node.style.textAlignVertical,
          textCase: node.style.textCase,
          textDecoration: node.style.textDecoration,
        };
      }
    }

    // Constraints for positioning context
    if ('constraints' in node && node.constraints) {
      optimizedNode.constraints = node.constraints;
    }

    // Include visually relevant children
    if (node.children && node.children.length > 0) {
      optimizedNode.children = node.children
        .filter(child => child.visible !== false)
        .map(child => this.createAIOptimizedMetadata(child));
    }

    return optimizedNode as FigmaNode;
  }
  public static parseNode(node: FigmaNode, depth: number = 0, parent?: FigmaNode): ParsedNodeMetadata {
    const parsedNode: ParsedNodeMetadata = {
      id: node.id,
      name: this.sanitizeName(node.name),
      type: node.type,
      layout: this.parseLayout(node),
      styling: this.parseStyling(node),
      cssHints: this.generateCSSHints(node),
    };

    // Extract advanced visual styling
    parsedNode.visualStyle = VisualStyleExtractor.extractVisualStyles(node);

    // Extract advanced layout system
    parsedNode.layoutSystem = LayoutExtractor.extractLayoutSystem(node, parent);
    parsedNode.responsiveLayout = LayoutExtractor.generateResponsiveLayout(parsedNode.layoutSystem);

    // Parse legacy auto layout (for compatibility)
    if (this.hasAutoLayout(node)) {
      parsedNode.autoLayout = this.parseAutoLayout(node);
    }

    // Parse advanced typography for text nodes
    if (node.type === 'TEXT') {
      parsedNode.content = node.characters || '';
      const extractedTypography = TypographyExtractor.extractTypography(node);
      if (extractedTypography) {
        parsedNode.advancedTypography = extractedTypography;
      }
      parsedNode.textHierarchy = TypographyExtractor.analyzeTextHierarchy(node);
      
      // Keep legacy typography for compatibility
      parsedNode.typography = this.parseTypography(node);
    }

    // Parse children (limit depth to avoid infinite recursion)
    if (node.children && depth < 10) {
      parsedNode.children = node.children
        .filter(child => child.visible !== false)
        .map(child => this.parseNode(child, depth + 1, node));
    }

    // Parse enhanced component information
    if (node.componentId || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      parsedNode.component = this.parseEnhancedComponent(node);
    }

    // Generate enhanced accessibility hints
    parsedNode.accessibility = this.generateEnhancedAccessibilityHints(node);

    // Generate design tokens
    parsedNode.designTokens = this.generateDesignTokens(parsedNode);

    return parsedNode;
  }

  /**
   * Parse layout properties
   */
  private static parseLayout(node: FigmaNode) {
    const layout: ParsedNodeMetadata['layout'] = {};

    if (node.absoluteBoundingBox) {
      layout.width = Math.round(node.absoluteBoundingBox.width);
      layout.height = Math.round(node.absoluteBoundingBox.height);
      layout.x = Math.round(node.absoluteBoundingBox.x);
      layout.y = Math.round(node.absoluteBoundingBox.y);
    }

    return layout;
  }

  /**
   * Parse auto layout properties
   */
  private static parseAutoLayout(node: FigmaNode): ParsedNodeMetadata['autoLayout'] {
    return {
      direction: node.layoutMode === 'HORIZONTAL' ? 'horizontal' : 
                node.layoutMode === 'VERTICAL' ? 'vertical' : 'none',
      spacing: node.itemSpacing || 0,
      padding: {
        top: node.paddingTop || 0,
        right: node.paddingRight || 0,
        bottom: node.paddingBottom || 0,
        left: node.paddingLeft || 0,
      },
      alignment: {
        primary: node.primaryAxisAlignItems || 'MIN',
        counter: node.counterAxisAlignItems || 'MIN',
      },
      sizing: {
        horizontal: node.layoutSizingHorizontal || 'FIXED',
        vertical: node.layoutSizingVertical || 'FIXED',
      },
    };
  }

  /**
   * Parse styling properties
   */
  private static parseStyling(node: FigmaNode): ParsedNodeMetadata['styling'] {
    return {
      fills: (node.fills || []).map(fill => this.parseFill(fill)),
      strokes: (node.strokes || []).map(stroke => this.parseStroke(stroke, node.strokeWeight)),
      effects: (node.effects || []).map(effect => this.parseEffect(effect)),
      opacity: node.opacity,
      cornerRadius: node.cornerRadius,
    };
  }

  /**
   * Parse fill properties
   */
  private static parseFill(fill: Fill): ParsedFill {
    const parsed: ParsedFill = {
      type: fill.type,
      opacity: fill.opacity,
    };

    if ((fill as any).color) {
      parsed.color = this.colorToCSS((fill as any).color);
    }

    if (fill.type === 'IMAGE' && fill.imageRef) {
      parsed.image = {
        ref: fill.imageRef,
        scaleMode: fill.scaleMode || 'FILL',
        transform: fill.imageTransform,
      };
    }

    return parsed;
  }

  /**
   * Parse stroke properties
   */
  private static parseStroke(stroke: Stroke, weight?: number): ParsedStroke {
    return {
      type: stroke.type,
      color: (stroke as any).color ? this.colorToCSS((stroke as any).color) : undefined,
      opacity: stroke.opacity,
      weight: weight || 1,
      align: 'center', // Default alignment
    };
  }

  /**
   * Parse effect properties
   */
  private static parseEffect(effect: Effect): ParsedEffect {
    const effectAny = effect as any;
    const parsed: ParsedEffect = {
      type: effectAny.type || 'UNKNOWN',
      visible: effect.visible !== false,
      radius: effectAny.radius,
      cssValue: this.effectToCSS(effect),
    };

    if (effectAny.color) {
      parsed.color = this.colorToCSS(effectAny.color);
      parsed.opacity = effectAny.color.a;
    }

    if (effectAny.offset) {
      parsed.offset = effectAny.offset;
    }

    return parsed;
  }

  /**
   * Parse typography properties
   */
  private static parseTypography(node: FigmaNode): ParsedTypography | undefined {
    if (!node.style) return undefined;

    const style = node.style;
    
    return {
      fontFamily: style.fontFamily || 'Arial',
      fontSize: style.fontSize || 16,
      fontWeight: style.fontWeight || 400,
      lineHeight: style.lineHeightPx,
      letterSpacing: style.letterSpacing,
      textAlign: style.textAlignHorizontal?.toLowerCase() || 'left',
      cssValue: this.typographyToCSS(style),
    };
  }

  /**
   * Parse enhanced component information
   */
  private static parseEnhancedComponent(node: FigmaNode): ParsedNodeMetadata['component'] {
    const component: any = {
      isComponent: node.type === 'COMPONENT',
      isInstance: node.type === 'INSTANCE',
      componentId: node.componentId,
    };

    // Extract variant properties for component instances
    if (node.type === 'INSTANCE' && node.componentProperties) {
      component.variantProperties = node.componentProperties;
    }

    return component;
  }

  /**
   * Generate enhanced accessibility hints
   */
  private static generateEnhancedAccessibilityHints(node: FigmaNode): ParsedNodeMetadata['accessibility'] {
    const hints: ParsedNodeMetadata['accessibility'] = {};
    const ariaAttributes: Record<string, string> = {};

    // Generate role based on node type and content
    switch (node.type) {
      case 'TEXT':
        if (node.characters?.toLowerCase().includes('button')) {
          hints.role = 'button';
          ariaAttributes['aria-label'] = this.sanitizeName(node.name);
        } else if (node.style && (node.style.fontSize || 16) > 18) {
          hints.role = 'heading';
          const fontSize = node.style.fontSize || 16;
          const level = Math.min(6, Math.max(1, Math.ceil((32 - fontSize) / 4) + 1));
          ariaAttributes['aria-level'] = level.toString();
        } else {
          hints.role = 'text';
        }
        break;
      case 'RECTANGLE':
      case 'ELLIPSE':
        hints.role = 'img';
        ariaAttributes['aria-label'] = this.sanitizeName(node.name);
        break;
      case 'FRAME':
      case 'GROUP':
        hints.role = 'group';
        if (node.name && node.name !== node.type) {
          ariaAttributes['aria-label'] = this.sanitizeName(node.name);
        }
        break;
      case 'COMPONENT':
      case 'INSTANCE':
        hints.role = 'region';
        ariaAttributes['aria-label'] = this.sanitizeName(node.name);
        break;
      default:
        hints.role = 'generic';
    }

    // Generate label from name
    if (node.name && node.name !== node.type) {
      hints.label = this.sanitizeName(node.name);
    }

    // Add description from content for text nodes
    if (node.type === 'TEXT' && node.characters) {
      hints.description = node.characters.length > 50 
        ? node.characters.substring(0, 50) + '...'
        : node.characters;
    }

    hints.ariaAttributes = ariaAttributes;
    return hints;
  }

  /**
   * Generate design tokens from parsed metadata
   */
  private static generateDesignTokens(metadata: ParsedNodeMetadata): ParsedNodeMetadata['designTokens'] {
    const tokens: ParsedNodeMetadata['designTokens'] = {
      colors: [],
      typography: [],
      spacing: [],
      layout: []
    };

    // Generate color tokens
    if (metadata.visualStyle) {
      tokens.colors.push(...VisualStyleExtractor.generateCSSFromVisualStyles(metadata.visualStyle));
    }

    // Generate typography tokens
    if (metadata.advancedTypography) {
      tokens.typography.push(...TypographyExtractor.generateTypographyTokens(
        metadata.advancedTypography,
        metadata.name.toLowerCase().replace(/\s+/g, '-')
      ));
    }

    // Generate layout tokens
    if (metadata.layoutSystem) {
      tokens.layout.push(...LayoutExtractor.generateLayoutTokens(
        metadata.layoutSystem,
        metadata.name.toLowerCase().replace(/\s+/g, '-')
      ));
    }

    // Generate spacing tokens from layout
    if (metadata.layoutSystem?.properties.gap) {
      tokens.spacing.push(`--spacing-${metadata.name.toLowerCase().replace(/\s+/g, '-')}: ${metadata.layoutSystem.properties.gap};`);
    }

    if (metadata.layoutSystem?.properties.padding) {
      tokens.spacing.push(`--padding-${metadata.name.toLowerCase().replace(/\s+/g, '-')}: ${metadata.layoutSystem.properties.padding};`);
    }

    return tokens;
  }

  /**
   * Generate CSS hints for the node with enhanced visual properties
   */
  private static generateCSSHints(node: FigmaNode): ParsedNodeMetadata['cssHints'] {
    const hints: ParsedNodeMetadata['cssHints'] = {
      display: this.getDisplayType(node),
      position: 'relative',
    };

    // Auto layout CSS
    if (this.hasAutoLayout(node)) {
      hints.display = 'flex';
      hints.flexDirection = node.layoutMode === 'VERTICAL' ? 'column' : 'row';
      hints.justifyContent = this.mapAlignmentToCSS(node.primaryAxisAlignItems);
      hints.alignItems = this.mapAlignmentToCSS(node.counterAxisAlignItems);
      
      if (node.itemSpacing) {
        hints.gap = `${node.itemSpacing}px`;
      }
    }

    // Padding
    if (node.paddingTop || node.paddingRight || node.paddingBottom || node.paddingLeft) {
      const padding = [
        node.paddingTop || 0,
        node.paddingRight || 0,
        node.paddingBottom || 0,
        node.paddingLeft || 0,
      ];
      hints.padding = padding.every(p => p === padding[0]) 
        ? `${padding[0]}px` 
        : `${padding[0]}px ${padding[1]}px ${padding[2]}px ${padding[3]}px`;
    }

    // Enhanced background with gradient support
    if (node.fills && node.fills.length > 0) {
      const backgrounds = VisualStyleExtractor.processFills(node.fills);
      if (backgrounds.length > 0) {
        hints.background = backgrounds[0].replace('background-color: ', '').replace('background: ', '');
      }
    }

    // Enhanced border with gradient support
    if (node.strokes && node.strokes.length > 0) {
      const borders = VisualStyleExtractor.processStrokes(node.strokes, node.strokeWeight);
      if (borders.length > 0) {
        hints.border = borders[0].replace('border: ', '');
      }
    }

    // Border radius
    if (node.cornerRadius) {
      hints.borderRadius = `${node.cornerRadius}px`;
    }

    // Enhanced effects (shadows and filters)
    if (node.effects && node.effects.length > 0) {
      const effects = VisualStyleExtractor.processEffects(node.effects);
      if (effects.shadows.length > 0) {
        hints.boxShadow = effects.shadows.join(', ');
      }
    }

    return hints;
  }

  /**
   * Utility functions
   */
  private static hasAutoLayout(node: FigmaNode): boolean {
    return !!(node.layoutMode && (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL'));
  }

  private static getDisplayType(node: FigmaNode): string {
    if (this.hasAutoLayout(node)) return 'flex';
    if (node.children && node.children.length > 0) return 'block';
    return 'block';
  }

  private static mapAlignmentToCSS(alignment?: string): string {
    switch (alignment) {
      case 'MIN': return 'flex-start';
      case 'CENTER': return 'center';
      case 'MAX': return 'flex-end';
      case 'SPACE_BETWEEN': return 'space-between';
      default: return 'flex-start';
    }
  }

  private static sanitizeName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private static colorToCSS(color: Color): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    
    if (color.a === 1) {
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      return `rgba(${r}, ${g}, ${b}, ${color.a})`;
    }
  }

  private static effectToCSS(effect: Effect): string {
    switch (effect.type) {
      case 'DROP_SHADOW':
        if (effect.color && effect.offset) {
          const color = this.colorToCSS(effect.color);
          return `${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${color}`;
        }
        break;
      case 'INNER_SHADOW':
        if (effect.color && effect.offset) {
          const color = this.colorToCSS(effect.color);
          return `inset ${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${color}`;
        }
        break;
      case 'LAYER_BLUR':
        return `blur(${effect.radius}px)`;
      case 'BACKGROUND_BLUR':
        return `blur(${effect.radius}px)`;
    }
    return '';
  }

  private static typographyToCSS(style: any): string {
    const css: string[] = [];
    
    css.push(`font-family: "${style.fontFamily}"`);
    css.push(`font-size: ${style.fontSize}px`);
    css.push(`font-weight: ${style.fontWeight}`);
    
    if (style.lineHeightPx) {
      css.push(`line-height: ${style.lineHeightPx}px`);
    }
    
    if (style.letterSpacing) {
      css.push(`letter-spacing: ${style.letterSpacing}px`);
    }
    
    if (style.textAlignHorizontal) {
      css.push(`text-align: ${style.textAlignHorizontal.toLowerCase()}`);
    }
    
    return css.join('; ');
  }


}

export default MetadataParser;