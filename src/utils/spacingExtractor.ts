import type { FigmaNode } from '../types/figma';

export interface SpacingSystem {
  padding: BoxSpacing;
  margin: BoxSpacing;
  gap: GapSpacing;
  constraints: ConstraintSystem;
  sizing: SizingSystem;
  cssDeclarations: string[];
}

export interface BoxSpacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
  cssValue: string;
  isUniform: boolean;
}

export interface GapSpacing {
  row?: number;
  column?: number;
  uniform?: number;
  cssValue: string;
}

export interface ConstraintSystem {
  horizontal: {
    type: 'left' | 'right' | 'center' | 'left-right' | 'scale';
    value: number;
    cssProperty: string;
  };
  vertical: {
    type: 'top' | 'bottom' | 'center' | 'top-bottom' | 'scale';
    value: number;
    cssProperty: string;
  };
}

export interface SizingSystem {
  width: SizingMode;
  height: SizingMode;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: number;
  cssDeclarations: string[];
}

export interface SizingMode {
  type: 'fixed' | 'hug' | 'fill' | 'auto';
  value?: number;
  percentage?: number;
  cssValue: string;
}

export interface ResponsiveSpacing {
  base: SpacingSystem;
  breakpoints?: {
    mobile?: Partial<SpacingSystem>;
    tablet?: Partial<SpacingSystem>;
    desktop?: Partial<SpacingSystem>;
  };
}

export class SpacingExtractor {
  /**
   * Extract comprehensive spacing system from Figma node
   */
  static extractSpacingSystem(node: FigmaNode, parent?: FigmaNode): SpacingSystem {
    const padding = this.extractPadding(node);
    const margin = this.extractMargin(node, parent);
    const gap = this.extractGap(node);
    const constraints = this.extractConstraints(node, parent);
    const sizing = this.extractSizing(node);

    return {
      padding,
      margin,
      gap,
      constraints,
      sizing,
      cssDeclarations: this.generateSpacingCSS({ padding, margin, gap, constraints, sizing })
    };
  }

  /**
   * Extract padding from node
   */
  private static extractPadding(node: FigmaNode): BoxSpacing {
    const top = node.paddingTop || 0;
    const right = node.paddingRight || 0;
    const bottom = node.paddingBottom || 0;
    const left = node.paddingLeft || 0;

    const isUniform = top === right && right === bottom && bottom === left;
    
    let cssValue: string;
    if (isUniform && top === 0) {
      cssValue = '0';
    } else if (isUniform) {
      cssValue = `${top}px`;
    } else if (top === bottom && left === right) {
      cssValue = `${top}px ${right}px`;
    } else {
      cssValue = `${top}px ${right}px ${bottom}px ${left}px`;
    }

    return {
      top,
      right,
      bottom,
      left,
      cssValue,
      isUniform
    };
  }

  /**
   * Extract margin from node based on positioning context
   */
  private static extractMargin(node: FigmaNode, parent?: FigmaNode): BoxSpacing {
    // Calculate margins based on position in parent and auto-layout
    let top = 0;
    let right = 0;
    let bottom = 0;
    let left = 0;

    if (parent && node.absoluteBoundingBox && parent.absoluteBoundingBox) {
      // Calculate relative position within parent
      const relativeX = node.absoluteBoundingBox.x - parent.absoluteBoundingBox.x;
      const relativeY = node.absoluteBoundingBox.y - parent.absoluteBoundingBox.y;

      // For auto-layout parents, margins might be implicit in spacing
      if (!parent.layoutMode) {
        // For absolute positioning, calculate margins from edges
        left = relativeX;
        top = relativeY;
        right = parent.absoluteBoundingBox.width - (relativeX + node.absoluteBoundingBox.width);
        bottom = parent.absoluteBoundingBox.height - (relativeY + node.absoluteBoundingBox.height);
      }
    }

    const isUniform = top === right && right === bottom && bottom === left;
    
    let cssValue: string;
    if (isUniform && top === 0) {
      cssValue = '0';
    } else if (isUniform) {
      cssValue = `${top}px`;
    } else if (top === bottom && left === right) {
      cssValue = `${top}px ${right}px`;
    } else {
      cssValue = `${top}px ${right}px ${bottom}px ${left}px`;
    }

    return {
      top,
      right,
      bottom,
      left,
      cssValue,
      isUniform
    };
  }

  /**
   * Extract gap spacing for flex/grid containers
   */
  private static extractGap(node: FigmaNode): GapSpacing {
    if (node.layoutMode) {
      // Auto-layout uses itemSpacing as gap
      const spacing = node.itemSpacing || 0;
      
      if (node.layoutMode === 'HORIZONTAL') {
        return {
          column: spacing,
          cssValue: `0 ${spacing}px`
        };
      } else if (node.layoutMode === 'VERTICAL') {
        return {
          row: spacing,
          cssValue: `${spacing}px 0`
        };
      }
    }

    // Check for grid-like spacing patterns in children
    if (node.children && node.children.length > 1) {
      const gridSpacing = this.detectGridSpacing(node.children);
      if (gridSpacing.row || gridSpacing.column) {
        return {
          row: gridSpacing.row,
          column: gridSpacing.column,
          cssValue: `${gridSpacing.row || 0}px ${gridSpacing.column || 0}px`
        };
      }
    }

    return {
      uniform: 0,
      cssValue: '0'
    };
  }

  /**
   * Detect grid spacing patterns in children
   */
  private static detectGridSpacing(children: FigmaNode[]): { row?: number; column?: number } {
    const positions = children
      .filter(child => child.absoluteBoundingBox)
      .map(child => ({
        x: child.absoluteBoundingBox!.x,
        y: child.absoluteBoundingBox!.y,
        width: child.absoluteBoundingBox!.width,
        height: child.absoluteBoundingBox!.height
      }))
      .sort((a, b) => a.y - b.y || a.x - b.x);

    if (positions.length < 2) {
      return {};
    }

    // Calculate horizontal gaps (column spacing)
    const horizontalGaps: number[] = [];
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];
      
      if (Math.abs(prev.y - curr.y) < 10) { // Same row
        const gap = curr.x - (prev.x + prev.width);
        if (gap > 0) {
          horizontalGaps.push(gap);
        }
      }
    }

    // Calculate vertical gaps (row spacing)
    const verticalGaps: number[] = [];
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];
      
      if (Math.abs(prev.x - curr.x) < 10) { // Same column
        const gap = curr.y - (prev.y + prev.height);
        if (gap > 0) {
          verticalGaps.push(gap);
        }
      }
    }

    const avgHorizontalGap = horizontalGaps.length > 0 
      ? Math.round(horizontalGaps.reduce((sum, gap) => sum + gap, 0) / horizontalGaps.length)
      : undefined;

    const avgVerticalGap = verticalGaps.length > 0
      ? Math.round(verticalGaps.reduce((sum, gap) => sum + gap, 0) / verticalGaps.length)
      : undefined;

    return {
      column: avgHorizontalGap,
      row: avgVerticalGap
    };
  }

  /**
   * Extract constraint system from node
   */
  private static extractConstraints(node: FigmaNode, parent?: FigmaNode): ConstraintSystem {
    const nodeAny = node as any;
    const constraints = nodeAny.constraints || { horizontal: 'LEFT', vertical: 'TOP' };
    
    let horizontalValue = 0;
    let verticalValue = 0;

    if (node.absoluteBoundingBox && parent?.absoluteBoundingBox) {
      const relativeX = node.absoluteBoundingBox.x - parent.absoluteBoundingBox.x;
      const relativeY = node.absoluteBoundingBox.y - parent.absoluteBoundingBox.y;

      horizontalValue = relativeX;
      verticalValue = relativeY;

      // Calculate right/bottom values for those constraints
      if (constraints.horizontal === 'RIGHT') {
        horizontalValue = parent.absoluteBoundingBox.width - (relativeX + node.absoluteBoundingBox.width);
      }

      if (constraints.vertical === 'BOTTOM') {
        verticalValue = parent.absoluteBoundingBox.height - (relativeY + node.absoluteBoundingBox.height);
      }
    }

    return {
      horizontal: {
        type: constraints.horizontal.toLowerCase().replace('_', '-') as any,
        value: horizontalValue,
        cssProperty: this.getHorizontalCSSProperty(constraints.horizontal, horizontalValue)
      },
      vertical: {
        type: constraints.vertical.toLowerCase().replace('_', '-') as any,
        value: verticalValue,
        cssProperty: this.getVerticalCSSProperty(constraints.vertical, verticalValue)
      }
    };
  }

  /**
   * Extract sizing system from node
   */
  private static extractSizing(node: FigmaNode): SizingSystem {
    const width = this.extractSizeMode('width', node);
    const height = this.extractSizeMode('height', node);

    // Calculate aspect ratio if both dimensions are fixed
    let aspectRatio: number | undefined;
    if (width.type === 'fixed' && height.type === 'fixed' && width.value && height.value) {
      aspectRatio = width.value / height.value;
    }

    const cssDeclarations = this.generateSizingCSS({ width, height, aspectRatio });

    return {
      width,
      height,
      aspectRatio,
      cssDeclarations
    };
  }

  /**
   * Extract size mode for width or height
   */
  private static extractSizeMode(dimension: 'width' | 'height', node: FigmaNode): SizingMode {
    const sizingProperty = dimension === 'width' 
      ? node.layoutSizingHorizontal 
      : node.layoutSizingVertical;

    const absoluteSize = node.absoluteBoundingBox
      ? (dimension === 'width' ? node.absoluteBoundingBox.width : node.absoluteBoundingBox.height)
      : undefined;

    switch (sizingProperty) {
      case 'FIXED':
        return {
          type: 'fixed',
          value: absoluteSize,
          cssValue: absoluteSize ? `${Math.round(absoluteSize)}px` : 'auto'
        };

      case 'HUG':
        return {
          type: 'hug',
          cssValue: 'auto'
        };

      case 'FILL':
        return {
          type: 'fill',
          percentage: 100,
          cssValue: '100%'
        };

      default:
        return {
          type: 'auto',
          value: absoluteSize,
          cssValue: absoluteSize ? `${Math.round(absoluteSize)}px` : 'auto'
        };
    }
  }

  /**
   * Get CSS property for horizontal constraints
   */
  private static getHorizontalCSSProperty(constraint: string, value: number): string {
    switch (constraint) {
      case 'LEFT':
        return `left: ${value}px`;
      case 'RIGHT':
        return `right: ${value}px`;
      case 'CENTER':
        return `left: 50%; transform: translateX(-50%)`;
      case 'LEFT_RIGHT':
        return `left: ${value}px; right: ${value}px`;
      case 'SCALE':
        return 'width: 100%';
      default:
        return `left: ${value}px`;
    }
  }

  /**
   * Get CSS property for vertical constraints
   */
  private static getVerticalCSSProperty(constraint: string, value: number): string {
    switch (constraint) {
      case 'TOP':
        return `top: ${value}px`;
      case 'BOTTOM':
        return `bottom: ${value}px`;
      case 'CENTER':
        return `top: 50%; transform: translateY(-50%)`;
      case 'TOP_BOTTOM':
        return `top: ${value}px; bottom: ${value}px`;
      case 'SCALE':
        return 'height: 100%';
      default:
        return `top: ${value}px`;
    }
  }

  /**
   * Generate spacing CSS declarations
   */
  private static generateSpacingCSS(system: Partial<SpacingSystem>): string[] {
    const css: string[] = [];

    if (system.padding && system.padding.cssValue !== '0') {
      css.push(`padding: ${system.padding.cssValue}`);
    }

    if (system.margin && system.margin.cssValue !== '0') {
      css.push(`margin: ${system.margin.cssValue}`);
    }

    if (system.gap && system.gap.cssValue !== '0') {
      css.push(`gap: ${system.gap.cssValue}`);
    }

    return css;
  }

  /**
   * Generate sizing CSS declarations
   */
  private static generateSizingCSS(sizing: Partial<SizingSystem>): string[] {
    const css: string[] = [];

    if (sizing.width) {
      css.push(`width: ${sizing.width.cssValue}`);
    }

    if (sizing.height) {
      css.push(`height: ${sizing.height.cssValue}`);
    }

    if (sizing.minWidth) {
      css.push(`min-width: ${sizing.minWidth}px`);
    }

    if (sizing.minHeight) {
      css.push(`min-height: ${sizing.minHeight}px`);
    }

    if (sizing.maxWidth) {
      css.push(`max-width: ${sizing.maxWidth}px`);
    }

    if (sizing.maxHeight) {
      css.push(`max-height: ${sizing.maxHeight}px`);
    }

    if (sizing.aspectRatio) {
      css.push(`aspect-ratio: ${sizing.aspectRatio.toFixed(3)}`);
    }

    return css;
  }

  /**
   * Generate responsive spacing variations
   */
  static generateResponsiveSpacing(spacing: SpacingSystem): ResponsiveSpacing {
    const base = spacing;
    
    const breakpoints: ResponsiveSpacing['breakpoints'] = {
      mobile: this.generateMobileSpacing(spacing),
      tablet: this.generateTabletSpacing(spacing),
      desktop: spacing
    };

    return { base, breakpoints };
  }

  /**
   * Generate mobile-optimized spacing
   */
  private static generateMobileSpacing(spacing: SpacingSystem): Partial<SpacingSystem> {
    const mobile: Partial<SpacingSystem> = {};

    // Reduce padding for mobile
    if (spacing.padding && !spacing.padding.isUniform) {
      const scaleFactor = 0.75;
      mobile.padding = {
        ...spacing.padding,
        top: Math.max(8, spacing.padding.top * scaleFactor),
        right: Math.max(8, spacing.padding.right * scaleFactor),
        bottom: Math.max(8, spacing.padding.bottom * scaleFactor),
        left: Math.max(8, spacing.padding.left * scaleFactor),
        cssValue: `${Math.max(8, spacing.padding.top * scaleFactor)}px ${Math.max(8, spacing.padding.right * scaleFactor)}px ${Math.max(8, spacing.padding.bottom * scaleFactor)}px ${Math.max(8, spacing.padding.left * scaleFactor)}px`,
        isUniform: false
      };
    }

    // Reduce gap for mobile
    if (spacing.gap && spacing.gap.uniform) {
      mobile.gap = {
        uniform: Math.max(8, spacing.gap.uniform * 0.75),
        cssValue: `${Math.max(8, spacing.gap.uniform * 0.75)}px`
      };
    }

    return mobile;
  }

  /**
   * Generate tablet spacing
   */
  private static generateTabletSpacing(spacing: SpacingSystem): Partial<SpacingSystem> {
    const tablet: Partial<SpacingSystem> = {};

    // Slightly reduce spacing for tablet
    if (spacing.padding && !spacing.padding.isUniform) {
      const scaleFactor = 0.875;
      tablet.padding = {
        ...spacing.padding,
        cssValue: spacing.padding.cssValue.replace(/(\d+)px/g, (_match, px) => 
          `${Math.max(12, Math.round(parseInt(px) * scaleFactor))}px`
        ),
        isUniform: false
      };
    }

    return tablet;
  }

  /**
   * Generate CSS custom properties for spacing tokens
   */
  static generateSpacingTokens(spacing: SpacingSystem, prefix: string = 'spacing'): string[] {
    const tokens: string[] = [];

    if (spacing.padding.cssValue !== '0') {
      tokens.push(`--${prefix}-padding: ${spacing.padding.cssValue};`);
    }

    if (spacing.margin.cssValue !== '0') {
      tokens.push(`--${prefix}-margin: ${spacing.margin.cssValue};`);
    }

    if (spacing.gap.cssValue !== '0') {
      tokens.push(`--${prefix}-gap: ${spacing.gap.cssValue};`);
    }

    return tokens;
  }
}

export default SpacingExtractor;