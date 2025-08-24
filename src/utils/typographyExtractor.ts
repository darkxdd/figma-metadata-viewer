import type { FigmaNode } from '../types/figma';
import { VisualStyleExtractor } from './visualStyleExtractor';

export interface AdvancedTypography {
  // Core font properties
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  fontStretch?: string;
  fontVariant?: string;
  
  // Text spacing and sizing
  lineHeight?: number;
  letterSpacing?: number;
  wordSpacing?: number;
  textIndent?: number;
  
  // Text alignment and flow
  textAlign: 'left' | 'right' | 'center' | 'justify' | 'start' | 'end';
  verticalAlign?: string;
  textJustify?: string;
  textAlignLast?: string;
  direction?: 'ltr' | 'rtl';
  writingMode?: string;
  
  // Text decoration and styling
  textDecoration?: string;
  textDecorationLine?: string;
  textDecorationStyle?: string;
  textDecorationColor?: string;
  textDecorationThickness?: string;
  textUnderlineOffset?: string;
  
  // Text transformation and effects
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textShadow?: string;
  textStroke?: string;
  textFillColor?: string;
  
  // Advanced text features
  fontFeatureSettings?: string;
  fontVariationSettings?: string;
  fontOpticalSizing?: string;
  
  // Colors
  color?: string;
  backgroundColor?: string;
  
  // Generated CSS
  cssProperties: string[];
  cssValue: string;
}

export interface TextStyleHierarchy {
  isHeading: boolean;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  semanticRole: 'heading' | 'body' | 'caption' | 'label' | 'button' | 'link' | 'code';
  suggestedElement: string;
}

export interface ResponsiveTypography {
  base: AdvancedTypography;
  breakpoints?: {
    mobile?: Partial<AdvancedTypography>;
    tablet?: Partial<AdvancedTypography>;
    desktop?: Partial<AdvancedTypography>;
  };
}

export class TypographyExtractor {
  /**
   * Extract comprehensive typography information from Figma text node
   */
  static extractTypography(node: FigmaNode): AdvancedTypography | null {
    if (node.type !== 'TEXT' || !node.style) {
      return null;
    }

    const style = node.style;
    
    // Ensure required properties exist
    if (!style.fontFamily || !style.fontSize || !style.fontWeight) {
      return null;
    }
    
    const typography: AdvancedTypography = {
      fontFamily: this.processFontFamily(style.fontFamily),
      fontSize: style.fontSize,
      fontWeight: this.processFontWeight(style.fontWeight),
      textAlign: this.processTextAlign(style.textAlignHorizontal),
      cssProperties: [],
      cssValue: ''
    };

    // Process optional properties
    if (style.fontPostScriptName) {
      typography.fontStyle = this.extractFontStyle(style.fontPostScriptName);
    }

    if (style.lineHeightPx && style.fontSize) {
      typography.lineHeight = this.calculateLineHeight(style.lineHeightPx, style.fontSize);
    } else if (style.lineHeightPercent) {
      typography.lineHeight = style.lineHeightPercent / 100;
    }

    if (style.letterSpacing) {
      typography.letterSpacing = style.letterSpacing;
    }

    if (style.textAlignVertical) {
      typography.verticalAlign = this.processVerticalAlign(style.textAlignVertical);
    }

    if (style.textDecoration) {
      typography.textDecoration = this.processTextDecoration(style.textDecoration);
    }

    if (style.textCase) {
      typography.textTransform = this.processTextTransform(style.textCase);
    }

    // Extract text color from fills
    if (node.fills && node.fills.length > 0) {
      const textFill = node.fills[0] as any;
      if (textFill.type === 'SOLID' && textFill.color) {
        typography.color = VisualStyleExtractor.colorToCSS(textFill.color);
        typography.textFillColor = typography.color;
      }
    }

    // Process text effects (shadows, outlines)
    if (node.effects && node.effects.length > 0) {
      typography.textShadow = this.processTextEffects(node.effects);
    }

    // Generate CSS properties and value
    this.generateCSSProperties(typography);

    return typography;
  }

  /**
   * Process font family with fallbacks
   */
  private static processFontFamily(fontFamily?: string): string {
    if (!fontFamily) {
      return 'Arial, sans-serif';
    }
    // Add appropriate fallbacks based on font family
    const fallbackMap: Record<string, string[]> = {
      'Inter': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      'Roboto': ['Roboto', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      'Poppins': ['Poppins', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      'Open Sans': ['Open Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      'Lato': ['Lato', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      'Montserrat': ['Montserrat', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      'Source Code Pro': ['Source Code Pro', 'Menlo', 'Monaco', 'Consolas', 'Courier New', 'monospace'],
      'JetBrains Mono': ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'Courier New', 'monospace']
    };

    const fallbacks = fallbackMap[fontFamily];
    if (fallbacks) {
      return fallbacks.map(font => font.includes(' ') ? `"${font}"` : font).join(', ');
    }

    // Default fallback logic
    if (fontFamily.toLowerCase().includes('mono') || 
        fontFamily.toLowerCase().includes('code')) {
      return `"${fontFamily}", Menlo, Monaco, Consolas, "Courier New", monospace`;
    }

    if (fontFamily.toLowerCase().includes('serif')) {
      return `"${fontFamily}", Georgia, "Times New Roman", serif`;
    }

    return `"${fontFamily}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  }

  /**
   * Process font weight with proper CSS values
   */
  private static processFontWeight(fontWeight?: number): number {
    if (!fontWeight) {
      return 400; // Default to normal weight
    }
    
    // Ensure font weight is a valid CSS font-weight value
    const validWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    
    // Find the closest valid weight
    return validWeights.reduce((prev, curr) => 
      Math.abs(curr - fontWeight) < Math.abs(prev - fontWeight) ? curr : prev
    );
  }

  /**
   * Process text alignment
   */
  private static processTextAlign(align?: string): AdvancedTypography['textAlign'] {
    switch (align) {
      case 'LEFT': return 'left';
      case 'CENTER': return 'center';
      case 'RIGHT': return 'right';
      case 'JUSTIFIED': return 'justify';
      default: return 'left';
    }
  }

  /**
   * Process vertical alignment
   */
  private static processVerticalAlign(verticalAlign?: string): string {
    switch (verticalAlign) {
      case 'TOP': return 'top';
      case 'CENTER': return 'middle';
      case 'BOTTOM': return 'bottom';
      default: return 'baseline';
    }
  }

  /**
   * Process text decoration
   */
  private static processTextDecoration(decoration?: string): string {
    switch (decoration) {
      case 'UNDERLINE': return 'underline';
      case 'STRIKETHROUGH': return 'line-through';
      default: return 'none';
    }
  }

  /**
   * Process text transformation
   */
  private static processTextTransform(textCase?: string): AdvancedTypography['textTransform'] {
    switch (textCase) {
      case 'UPPER': return 'uppercase';
      case 'LOWER': return 'lowercase';
      case 'TITLE': return 'capitalize';
      default: return 'none';
    }
  }

  /**
   * Extract font style from PostScript name
   */
  private static extractFontStyle(postScriptName: string): 'normal' | 'italic' | 'oblique' {
    const lowercaseName = postScriptName.toLowerCase();
    if (lowercaseName.includes('italic') || lowercaseName.includes('oblique')) {
      return lowercaseName.includes('oblique') ? 'oblique' : 'italic';
    }
    return 'normal';
  }

  /**
   * Calculate line height as a ratio or pixel value
   */
  private static calculateLineHeight(lineHeightPx: number, fontSize: number): number {
    // Convert to unitless ratio for better scalability
    const ratio = lineHeightPx / fontSize;
    
    // Round to reasonable precision
    return Math.round(ratio * 100) / 100;
  }

  /**
   * Process text effects into CSS text-shadow
   */
  private static processTextEffects(effects: any[]): string {
    const textShadows: string[] = [];
    
    for (const effect of effects) {
      if (effect.visible === false) continue;
      
      switch (effect.type) {
        case 'DROP_SHADOW': {
          const x = effect.offset?.x || 0;
          const y = effect.offset?.y || 0;
          const blur = effect.radius || 0;
          const color = effect.color 
            ? VisualStyleExtractor.colorToCSS(effect.color)
            : 'rgba(0, 0, 0, 0.25)';
          
          textShadows.push(`${x}px ${y}px ${blur}px ${color}`);
          break;
        }
      }
    }
    
    return textShadows.length > 0 ? textShadows.join(', ') : '';
  }

  /**
   * Determine semantic hierarchy and appropriate HTML element
   */
  static analyzeTextHierarchy(node: FigmaNode): TextStyleHierarchy {
    const name = node.name.toLowerCase();
    const content = node.characters?.toLowerCase() || '';
    const fontSize = node.style?.fontSize || 14;
    
    // Determine if it's a heading
    const isHeading = this.isHeading(name, content, fontSize);
    const headingLevel = isHeading ? this.determineHeadingLevel(fontSize, name, content) : undefined;
    
    // Determine semantic role
    const semanticRole = this.determineSemanticRole(name, content, node.style);
    
    // Suggest appropriate HTML element
    const suggestedElement = this.suggestHTMLElement(semanticRole, headingLevel, content);
    
    return {
      isHeading,
      headingLevel,
      semanticRole,
      suggestedElement
    };
  }

  /**
   * Determine if text should be a heading
   */
  private static isHeading(name: string, content: string, fontSize: number): boolean {
    const headingIndicators = [
      'title', 'heading', 'header', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
    ];
    
    const hasHeadingKeyword = headingIndicators.some(indicator => 
      name.includes(indicator) || content.includes(indicator)
    );
    
    const isLargeText = fontSize >= 18;
    const isShortText = content.length > 0 && content.length <= 60;
    
    return hasHeadingKeyword || (isLargeText && isShortText);
  }

  /**
   * Determine heading level based on size and context
   */
  private static determineHeadingLevel(fontSize: number, name: string, content: string): 1 | 2 | 3 | 4 | 5 | 6 {
    // Check for explicit level indicators
    for (let level = 1; level <= 6; level++) {
      if (name.includes(`h${level}`) || content.includes(`h${level}`)) {
        return level as 1 | 2 | 3 | 4 | 5 | 6;
      }
    }
    
    // Determine by font size
    if (fontSize >= 32) return 1;
    if (fontSize >= 28) return 2;
    if (fontSize >= 24) return 3;
    if (fontSize >= 20) return 4;
    if (fontSize >= 18) return 5;
    return 6;
  }

  /**
   * Determine semantic role
   */
  private static determineSemanticRole(name: string, content: string, style?: any): TextStyleHierarchy['semanticRole'] {
    if (content.includes('button') || name.includes('button') || name.includes('btn')) {
      return 'button';
    }
    
    if (content.includes('link') || name.includes('link') || style?.textDecoration === 'UNDERLINE') {
      return 'link';
    }
    
    if (name.includes('code') || name.includes('mono') || style?.fontFamily?.toLowerCase().includes('mono')) {
      return 'code';
    }
    
    if (name.includes('label') || content.length < 20) {
      return 'label';
    }
    
    if (name.includes('caption') || (style?.fontSize && style.fontSize < 14)) {
      return 'caption';
    }
    
    if (this.isHeading(name, content, style?.fontSize || 14)) {
      return 'heading';
    }
    
    return 'body';
  }

  /**
   * Suggest appropriate HTML element
   */
  private static suggestHTMLElement(role: TextStyleHierarchy['semanticRole'], headingLevel?: number, content?: string): string {
    switch (role) {
      case 'heading':
        return headingLevel ? `h${headingLevel}` : 'h2';
      case 'button':
        return 'button';
      case 'link':
        return 'a';
      case 'code':
        return content && content.length > 50 ? 'pre' : 'code';
      case 'label':
        return 'label';
      case 'caption':
        return 'small';
      default:
        return content && content.length > 50 ? 'p' : 'span';
    }
  }

  /**
   * Generate CSS properties array and combined value
   */
  private static generateCSSProperties(typography: AdvancedTypography): void {
    const properties: string[] = [];
    
    // Core font properties
    properties.push(`font-family: ${typography.fontFamily}`);
    properties.push(`font-size: ${typography.fontSize}px`);
    properties.push(`font-weight: ${typography.fontWeight}`);
    
    if (typography.fontStyle && typography.fontStyle !== 'normal') {
      properties.push(`font-style: ${typography.fontStyle}`);
    }
    
    // Text spacing
    if (typography.lineHeight !== undefined) {
      properties.push(`line-height: ${typography.lineHeight}`);
    }
    
    if (typography.letterSpacing !== undefined) {
      properties.push(`letter-spacing: ${typography.letterSpacing}px`);
    }
    
    if (typography.wordSpacing !== undefined) {
      properties.push(`word-spacing: ${typography.wordSpacing}px`);
    }
    
    // Text alignment
    if (typography.textAlign !== 'left') {
      properties.push(`text-align: ${typography.textAlign}`);
    }
    
    if (typography.verticalAlign) {
      properties.push(`vertical-align: ${typography.verticalAlign}`);
    }
    
    // Text decoration
    if (typography.textDecoration && typography.textDecoration !== 'none') {
      properties.push(`text-decoration: ${typography.textDecoration}`);
    }
    
    // Text transformation
    if (typography.textTransform && typography.textTransform !== 'none') {
      properties.push(`text-transform: ${typography.textTransform}`);
    }
    
    // Colors
    if (typography.color) {
      properties.push(`color: ${typography.color}`);
    }
    
    // Text effects
    if (typography.textShadow) {
      properties.push(`text-shadow: ${typography.textShadow}`);
    }
    
    typography.cssProperties = properties;
    typography.cssValue = properties.join(';\n  ') + ';';
  }

  /**
   * Generate responsive typography
   */
  static generateResponsiveTypography(typography: AdvancedTypography): ResponsiveTypography {
    const base = typography;
    
    // Generate responsive variations
    const breakpoints = {
      mobile: {
        fontSize: Math.max(12, typography.fontSize * 0.875), // Smaller on mobile
        lineHeight: typography.lineHeight ? typography.lineHeight * 1.1 : undefined, // More line height on mobile
      },
      tablet: {
        fontSize: Math.max(14, typography.fontSize * 0.9375),
      },
      desktop: {
        fontSize: typography.fontSize, // Base size for desktop
      }
    };
    
    return {
      base,
      breakpoints
    };
  }

  /**
   * Generate CSS custom properties for design tokens
   */
  static generateTypographyTokens(typography: AdvancedTypography, tokenPrefix: string = 'text'): string[] {
    const tokens: string[] = [];
    
    tokens.push(`--${tokenPrefix}-font-family: ${typography.fontFamily};`);
    tokens.push(`--${tokenPrefix}-font-size: ${typography.fontSize}px;`);
    tokens.push(`--${tokenPrefix}-font-weight: ${typography.fontWeight};`);
    
    if (typography.lineHeight !== undefined) {
      tokens.push(`--${tokenPrefix}-line-height: ${typography.lineHeight};`);
    }
    
    if (typography.letterSpacing !== undefined) {
      tokens.push(`--${tokenPrefix}-letter-spacing: ${typography.letterSpacing}px;`);
    }
    
    if (typography.color) {
      tokens.push(`--${tokenPrefix}-color: ${typography.color};`);
    }
    
    return tokens;
  }
}

export default TypographyExtractor;