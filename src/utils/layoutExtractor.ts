import type { FigmaNode } from '../types/figma';

export interface LayoutSystem {
  type: 'flexbox' | 'grid' | 'absolute' | 'float' | 'inline';
  properties: LayoutProperties;
  cssDeclarations: string[];
}

export interface LayoutProperties {
  // Container properties
  display?: string;
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  
  // Flexbox properties
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  alignContent?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around';
  gap?: string;
  rowGap?: string;
  columnGap?: string;
  
  // Grid properties
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridAutoColumns?: string;
  gridAutoRows?: string;
  gridAutoFlow?: 'row' | 'column' | 'dense';
  
  // Item properties
  flex?: string;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string;
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  gridColumn?: string;
  gridRow?: string;
  gridArea?: string;
  
  // Dimensions
  width?: string;
  height?: string;
  minWidth?: string;
  minHeight?: string;
  maxWidth?: string;
  maxHeight?: string;
  
  // Spacing
  margin?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  
  // Positioning
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: number;
  
  // Overflow
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowX?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowY?: 'visible' | 'hidden' | 'scroll' | 'auto';
}

export interface ResponsiveLayout {
  base: LayoutSystem;
  breakpoints?: {
    mobile?: Partial<LayoutProperties>;
    tablet?: Partial<LayoutProperties>;
    desktop?: Partial<LayoutProperties>;
  };
}

export interface ConstraintSystem {
  horizontal: 'left' | 'right' | 'center' | 'left-right' | 'scale';
  vertical: 'top' | 'bottom' | 'center' | 'top-bottom' | 'scale';
  cssEquivalent: string[];
}

export class LayoutExtractor {
  /**
   * Analyze and extract layout system from Figma node
   */
  static extractLayoutSystem(node: FigmaNode, parent?: FigmaNode): LayoutSystem {
    // Determine the primary layout type
    const layoutType = this.determineLayoutType(node, parent);
    
    switch (layoutType) {
      case 'flexbox':
        return this.extractFlexboxLayout(node);
      case 'grid':
        return this.extractGridLayout(node);
      case 'absolute':
        return this.extractAbsoluteLayout(node, parent);
      default:
        return this.extractBasicLayout(node);
    }
  }

  /**
   * Determine the most appropriate layout type
   */
  private static determineLayoutType(node: FigmaNode, parent?: FigmaNode): LayoutSystem['type'] {
    // Check for auto layout (Flexbox)
    if (this.hasAutoLayout(node)) {
      return 'flexbox';
    }

    // Check for grid-like patterns
    if (this.isGridPattern(node)) {
      return 'grid';
    }

    // Check if positioned absolutely
    if (this.shouldUseAbsolutePositioning(node, parent)) {
      return 'absolute';
    }

    return 'flexbox'; // Default to flexbox for modern layouts
  }

  /**
   * Extract Flexbox layout properties
   */
  private static extractFlexboxLayout(node: FigmaNode): LayoutSystem {
    const properties: LayoutProperties = {
      display: 'flex',
      position: 'relative'
    };

    // Flex direction
    if (node.layoutMode) {
      properties.flexDirection = node.layoutMode === 'HORIZONTAL' ? 'row' : 'column';
    }

    // Justify content (primary axis alignment)
    if (node.primaryAxisAlignItems) {
      properties.justifyContent = this.mapPrimaryAxisAlignment(node.primaryAxisAlignItems);
    }

    // Align items (counter axis alignment)
    if (node.counterAxisAlignItems) {
      properties.alignItems = this.mapCounterAxisAlignment(node.counterAxisAlignItems);
    }

    // Gap
    if (node.itemSpacing) {
      properties.gap = `${node.itemSpacing}px`;
    }

    // Padding
    const padding = this.extractPadding(node);
    Object.assign(properties, padding);

    // Sizing
    const sizing = this.extractSizing(node);
    Object.assign(properties, sizing);

    // Flex wrap
    const nodeAny = node as any;
    if (nodeAny.layoutWrap && nodeAny.layoutWrap === 'WRAP') {
      properties.flexWrap = 'wrap';
    }

    return {
      type: 'flexbox',
      properties,
      cssDeclarations: this.generateCSSDeclarations(properties)
    };
  }

  /**
   * Extract Grid layout properties
   */
  private static extractGridLayout(node: FigmaNode): LayoutSystem {
    const properties: LayoutProperties = {
      display: 'grid',
      position: 'relative'
    };

    // Analyze children to determine grid structure
    if (node.children) {
      const gridAnalysis = this.analyzeGridStructure(node.children);
      
      if (gridAnalysis.columns > 1) {
        properties.gridTemplateColumns = `repeat(${gridAnalysis.columns}, 1fr)`;
      }
      
      if (gridAnalysis.rows > 1) {
        properties.gridTemplateRows = `repeat(${gridAnalysis.rows}, auto)`;
      }
      
      if (gridAnalysis.gap) {
        properties.gap = `${gridAnalysis.gap}px`;
      }
    }

    // Extract padding
    const padding = this.extractPadding(node);
    Object.assign(properties, padding);

    return {
      type: 'grid',
      properties,
      cssDeclarations: this.generateCSSDeclarations(properties)
    };
  }

  /**
   * Extract absolute positioning layout
   */
  private static extractAbsoluteLayout(node: FigmaNode, parent?: FigmaNode): LayoutSystem {
    const properties: LayoutProperties = {
      position: 'absolute'
    };

    // Calculate positioning based on bounding box
    if (node.absoluteBoundingBox) {
      const box = node.absoluteBoundingBox;
      
      // Use constraints to determine positioning strategy
      const constraints = this.extractConstraints(node, parent);
      
      if (constraints.horizontal.includes('left')) {
        properties.left = `${box.x}px`;
      }
      
      if (constraints.horizontal.includes('right') && parent?.absoluteBoundingBox) {
        const rightOffset = parent.absoluteBoundingBox.width - (box.x + box.width);
        properties.right = `${rightOffset}px`;
      }
      
      if (constraints.vertical.includes('top')) {
        properties.top = `${box.y}px`;
      }
      
      if (constraints.vertical.includes('bottom') && parent?.absoluteBoundingBox) {
        const bottomOffset = parent.absoluteBoundingBox.height - (box.y + box.height);
        properties.bottom = `${bottomOffset}px`;
      }
    }

    // Extract dimensions
    const sizing = this.extractSizing(node);
    Object.assign(properties, sizing);

    return {
      type: 'absolute',
      properties,
      cssDeclarations: this.generateCSSDeclarations(properties)
    };
  }

  /**
   * Extract basic layout (fallback)
   */
  private static extractBasicLayout(node: FigmaNode): LayoutSystem {
    const properties: LayoutProperties = {
      display: 'block',
      position: 'relative'
    };

    // Extract basic properties
    const sizing = this.extractSizing(node);
    const padding = this.extractPadding(node);
    
    Object.assign(properties, sizing, padding);

    return {
      type: 'flexbox',
      properties,
      cssDeclarations: this.generateCSSDeclarations(properties)
    };
  }

  /**
   * Extract padding from node
   */
  private static extractPadding(node: FigmaNode): Partial<LayoutProperties> {
    const padding: Partial<LayoutProperties> = {};

    const top = node.paddingTop || 0;
    const right = node.paddingRight || 0;
    const bottom = node.paddingBottom || 0;
    const left = node.paddingLeft || 0;

    if (top || right || bottom || left) {
      if (top === right && right === bottom && bottom === left) {
        padding.padding = `${top}px`;
      } else if (top === bottom && left === right) {
        padding.padding = `${top}px ${right}px`;
      } else {
        padding.padding = `${top}px ${right}px ${bottom}px ${left}px`;
      }
    }

    return padding;
  }

  /**
   * Extract sizing from node
   */
  private static extractSizing(node: FigmaNode): Partial<LayoutProperties> {
    const sizing: Partial<LayoutProperties> = {};

    if (node.absoluteBoundingBox) {
      const box = node.absoluteBoundingBox;
      
      // Width
      if (node.layoutSizingHorizontal === 'FIXED') {
        sizing.width = `${Math.round(box.width)}px`;
      } else if (node.layoutSizingHorizontal === 'FILL') {
        sizing.width = '100%';
      } else {
        sizing.width = 'auto';
      }
      
      // Height
      if (node.layoutSizingVertical === 'FIXED') {
        sizing.height = `${Math.round(box.height)}px`;
      } else if (node.layoutSizingVertical === 'FILL') {
        sizing.height = '100%';
      } else {
        sizing.height = 'auto';
      }
    }

    return sizing;
  }

  /**
   * Extract constraints from node
   */
  private static extractConstraints(node: FigmaNode, _parent?: FigmaNode): ConstraintSystem {
    const nodeAny = node as any;
    const horizontal = nodeAny.constraints?.horizontal || 'LEFT';
    const vertical = nodeAny.constraints?.vertical || 'TOP';

    const cssEquivalent: string[] = [];

    // Process horizontal constraints
    switch (horizontal) {
      case 'LEFT':
        cssEquivalent.push('left: auto');
        break;
      case 'RIGHT':
        cssEquivalent.push('right: auto');
        break;
      case 'CENTER':
        cssEquivalent.push('left: 50%', 'transform: translateX(-50%)');
        break;
      case 'LEFT_RIGHT':
        cssEquivalent.push('left: auto', 'right: auto');
        break;
      case 'SCALE':
        cssEquivalent.push('width: 100%');
        break;
    }

    // Process vertical constraints
    switch (vertical) {
      case 'TOP':
        cssEquivalent.push('top: auto');
        break;
      case 'BOTTOM':
        cssEquivalent.push('bottom: auto');
        break;
      case 'CENTER':
        cssEquivalent.push('top: 50%', 'transform: translateY(-50%)');
        break;
      case 'TOP_BOTTOM':
        cssEquivalent.push('top: auto', 'bottom: auto');
        break;
      case 'SCALE':
        cssEquivalent.push('height: 100%');
        break;
    }

    return {
      horizontal: horizontal.toLowerCase().replace('_', '-') as ConstraintSystem['horizontal'],
      vertical: vertical.toLowerCase().replace('_', '-') as ConstraintSystem['vertical'],
      cssEquivalent
    };
  }

  /**
   * Map Figma primary axis alignment to CSS justify-content
   */
  private static mapPrimaryAxisAlignment(alignment: string): LayoutProperties['justifyContent'] {
    switch (alignment) {
      case 'MIN': return 'flex-start';
      case 'CENTER': return 'center';
      case 'MAX': return 'flex-end';
      case 'SPACE_BETWEEN': return 'space-between';
      default: return 'flex-start';
    }
  }

  /**
   * Map Figma counter axis alignment to CSS align-items
   */
  private static mapCounterAxisAlignment(alignment: string): LayoutProperties['alignItems'] {
    switch (alignment) {
      case 'MIN': return 'flex-start';
      case 'CENTER': return 'center';
      case 'MAX': return 'flex-end';
      default: return 'stretch';
    }
  }

  /**
   * Check if node has auto layout
   */
  private static hasAutoLayout(node: FigmaNode): boolean {
    return !!(node.layoutMode && (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL'));
  }

  /**
   * Check if children form a grid pattern
   */
  private static isGridPattern(node: FigmaNode): boolean {
    if (!node.children || node.children.length < 4) {
      return false;
    }

    // Analyze positions to detect grid patterns
    const positions = node.children
      .filter(child => child.absoluteBoundingBox)
      .map(child => ({
        x: child.absoluteBoundingBox!.x,
        y: child.absoluteBoundingBox!.y,
        width: child.absoluteBoundingBox!.width,
        height: child.absoluteBoundingBox!.height
      }));

    // Check for regular spacing
    const xPositions = [...new Set(positions.map(p => p.x))].sort((a, b) => a - b);
    const yPositions = [...new Set(positions.map(p => p.y))].sort((a, b) => a - b);

    return xPositions.length > 1 && yPositions.length > 1;
  }

  /**
   * Check if should use absolute positioning
   */
  private static shouldUseAbsolutePositioning(node: FigmaNode, parent?: FigmaNode): boolean {
    // Use absolute positioning for overlapping elements
    if (!parent || !parent.children || !node.absoluteBoundingBox) {
      return false;
    }

    const siblings = parent.children.filter(child => 
      child.id !== node.id && child.absoluteBoundingBox
    );

    // Check for overlaps with siblings
    return siblings.some(sibling => 
      this.elementsOverlap(node.absoluteBoundingBox!, sibling.absoluteBoundingBox!)
    );
  }

  /**
   * Check if two elements overlap
   */
  private static elementsOverlap(box1: any, box2: any): boolean {
    return !(box1.x + box1.width <= box2.x || 
             box2.x + box2.width <= box1.x || 
             box1.y + box1.height <= box2.y || 
             box2.y + box2.height <= box1.y);
  }

  /**
   * Analyze grid structure from children
   */
  private static analyzeGridStructure(children: FigmaNode[]): { columns: number; rows: number; gap?: number } {
    if (!children || children.length === 0) {
      return { columns: 1, rows: 1 };
    }

    const positions = children
      .filter(child => child.absoluteBoundingBox)
      .map(child => ({
        x: child.absoluteBoundingBox!.x,
        y: child.absoluteBoundingBox!.y,
        width: child.absoluteBoundingBox!.width,
        height: child.absoluteBoundingBox!.height
      }))
      .sort((a, b) => a.y - b.y || a.x - b.x);

    if (positions.length === 0) {
      return { columns: 1, rows: 1 };
    }

    // Count unique x and y positions
    const uniqueX = [...new Set(positions.map(p => Math.round(p.x)))];
    const uniqueY = [...new Set(positions.map(p => Math.round(p.y)))];

    const columns = uniqueX.length;
    const rows = uniqueY.length;

    // Calculate gap
    let gap: number | undefined;
    if (positions.length > 1) {
      const sortedByX = [...positions].sort((a, b) => a.x - b.x);
      if (sortedByX.length > 1) {
        gap = Math.round(sortedByX[1].x - (sortedByX[0].x + sortedByX[0].width));
      }
    }

    return { columns, rows, gap };
  }

  /**
   * Generate CSS declarations from properties
   */
  private static generateCSSDeclarations(properties: LayoutProperties): string[] {
    const declarations: string[] = [];

    Object.entries(properties).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const cssProperty = this.camelToCssCase(key);
        declarations.push(`${cssProperty}: ${value}`);
      }
    });

    return declarations;
  }

  /**
   * Convert camelCase to CSS property name
   */
  private static camelToCssCase(camelCase: string): string {
    return camelCase.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  /**
   * Generate responsive layout variations
   */
  static generateResponsiveLayout(layout: LayoutSystem): ResponsiveLayout {
    const base = layout;
    
    // Generate responsive breakpoints
    const breakpoints: ResponsiveLayout['breakpoints'] = {
      mobile: this.generateMobileLayout(layout),
      tablet: this.generateTabletLayout(layout),
      desktop: layout.properties
    };

    return { base, breakpoints };
  }

  /**
   * Generate mobile-optimized layout
   */
  private static generateMobileLayout(layout: LayoutSystem): Partial<LayoutProperties> {
    const mobile: Partial<LayoutProperties> = {};

    // Stack horizontally laid out items vertically on mobile
    if (layout.properties.flexDirection === 'row') {
      mobile.flexDirection = 'column';
    }

    // Adjust gap for mobile
    if (layout.properties.gap) {
      const currentGap = parseInt(layout.properties.gap);
      mobile.gap = `${Math.max(8, currentGap * 0.75)}px`;
    }

    // Adjust padding for mobile
    if (layout.properties.padding) {
      const currentPadding = parseInt(layout.properties.padding);
      mobile.padding = `${Math.max(8, currentPadding * 0.75)}px`;
    }

    return mobile;
  }

  /**
   * Generate tablet layout
   */
  private static generateTabletLayout(layout: LayoutSystem): Partial<LayoutProperties> {
    const tablet: Partial<LayoutProperties> = {};

    // Adjust gap for tablet
    if (layout.properties.gap) {
      const currentGap = parseInt(layout.properties.gap);
      tablet.gap = `${Math.max(12, currentGap * 0.875)}px`;
    }

    return tablet;
  }

  /**
   * Generate CSS custom properties for layout tokens
   */
  static generateLayoutTokens(layout: LayoutSystem, prefix: string = 'layout'): string[] {
    const tokens: string[] = [];

    if (layout.properties.gap) {
      tokens.push(`--${prefix}-gap: ${layout.properties.gap};`);
    }

    if (layout.properties.padding) {
      tokens.push(`--${prefix}-padding: ${layout.properties.padding};`);
    }

    return tokens;
  }
}

export default LayoutExtractor;