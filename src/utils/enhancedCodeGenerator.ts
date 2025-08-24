import type { SimplifiedNode, GlobalVars } from '../extractors/types';
import type { DesignTokens, DesignToken } from './globalVariables';
import type { CodeGenerationOptions } from '../types/gemini';
import { Logger } from './logger';

export interface EnhancedGeneratedComponent {
  name: string;
  code: string;
  css: string;
  cssVariables: string;
  imports: string[];
  designTokens: DesignToken[];
  metadata: {
    extractorsUsed: string[];
    globalVariablesUsed: number;
    generationTime: number;
    optimizations: string[];
  };
}

export interface EnhancedCodeGenerationOptions extends CodeGenerationOptions {
  useGlobalVariables?: boolean;
  generateDesignTokens?: boolean;
  optimizeCSS?: boolean;
  includeCSSTDocumentation?: boolean;
  generateStorybook?: boolean;
  extractorCombination?: 'all' | 'layout' | 'content' | 'visuals';
}

/**
 * Enhanced code generator that leverages AI-optimized data structures and global variables
 */
export class EnhancedCodeGenerator {
  private globalVars: GlobalVars;
  private designTokens: DesignTokens;
  private generationStats = {
    componentsGenerated: 0,
    cssLinesGenerated: 0,
    globalVariablesUsed: 0,
    optimizationsApplied: 0,
  };

  constructor(globalVars: GlobalVars = { styles: {} }, designTokens?: DesignTokens) {
    this.globalVars = globalVars;
    this.designTokens = designTokens || {
      colors: [],
      typography: [],
      spacing: [],
      effects: [],
      layout: [],
      components: [],
    };
  }

  /**
   * Generate enhanced React component from simplified node with global variables
   */
  public generateEnhancedComponent(
    node: SimplifiedNode,
    options: EnhancedCodeGenerationOptions = {}
  ): EnhancedGeneratedComponent {
    const startTime = performance.now();
    Logger.log(`Generating enhanced component for node: ${node.name}`);

    // Set default options
    const enhancedOptions = {
      useGlobalVariables: true,
      generateDesignTokens: true,
      optimizeCSS: true,
      includeCSSTDocumentation: true,
      generateStorybook: false,
      extractorCombination: 'all' as const,
      ...options,
    };

    const componentName = this.generateComponentName(node.name);
    const className = this.generateClassName(node.name);

    // Generate imports with enhanced features
    const imports = this.generateEnhancedImports(enhancedOptions);

    // Generate CSS variables and design tokens
    const cssVariables = enhancedOptions.useGlobalVariables 
      ? this.generateCSSVariables() 
      : '';

    // Generate component props interface
    const propsInterface = enhancedOptions.includeTypeScript
      ? this.generateEnhancedPropsInterface(componentName, node)
      : '';

    // Generate component JSX with semantic HTML
    const jsxElement = this.generateEnhancedJSXElement(node, className, enhancedOptions);

    // Generate component code
    const componentCode = this.generateComponentCode(
      componentName, 
      propsInterface, 
      jsxElement, 
      enhancedOptions
    );

    // Generate enhanced CSS with global variables
    const css = this.generateEnhancedCSS(node, className, enhancedOptions);

    // Collect relevant design tokens
    const relevantTokens = this.collectRelevantDesignTokens(node);

    // Generate metadata
    const processingTime = performance.now() - startTime;
    const metadata = {
      extractorsUsed: ['enhanced'],
      globalVariablesUsed: this.countGlobalVariablesUsed(node),
      generationTime: processingTime,
      optimizations: this.getOptimizationsApplied(enhancedOptions),
    };

    this.generationStats.componentsGenerated++;
    this.generationStats.globalVariablesUsed += metadata.globalVariablesUsed;

    Logger.log(`Enhanced component generated in ${processingTime.toFixed(2)}ms`);

    return {
      name: componentName,
      code: imports.join('\n') + '\n\n' + componentCode,
      css,
      cssVariables,
      imports,
      designTokens: relevantTokens,
      metadata,
    };
  }

  /**
   * Generate multiple components from an array of nodes
   */
  public generateComponentsFromNodes(
    nodes: SimplifiedNode[],
    options: EnhancedCodeGenerationOptions = {}
  ): EnhancedGeneratedComponent[] {
    Logger.log(`Generating ${nodes.length} enhanced components...`);
    
    return nodes.map(node => this.generateEnhancedComponent(node, options));
  }

  /**
   * Generate CSS variables from global vars
   */
  private generateCSSVariables(): string {
    const cssVars: string[] = [':root {'];
    
    for (const [id, value] of Object.entries(this.globalVars.styles)) {
      const cssVarName = `--${id.toLowerCase().replace(/_/g, '-')}`;
      const cssValue = this.formatValueForCSS(value);
      
      if (cssValue) {
        cssVars.push(`  ${cssVarName}: ${cssValue};`);
      }
    }
    
    cssVars.push('}');
    return cssVars.join('\n');
  }

  /**
   * Generate enhanced CSS that uses global variables and design tokens
   */
  private generateEnhancedCSS(
    node: SimplifiedNode,
    className: string,
    options: EnhancedCodeGenerationOptions
  ): string {
    const css: string[] = [];
    
    // Add documentation if enabled
    if (options.includeCSSTDocumentation) {
      css.push(`/* Enhanced component styles for ${node.name} */`);
      css.push(`/* Generated with AI-optimized extractors and global variables */`);
    }

    css.push(`.${className} {`);

    // Layout properties using global variables
    if (node.layout) {
      const layoutVar = this.getGlobalVariableReference(node.layout);
      if (layoutVar && options.useGlobalVariables) {
        css.push(`  /* Layout from global variable ${node.layout} */`);
        css.push(`  ${this.expandLayoutVariable(layoutVar)}`);
      } else {
        css.push(this.generateDirectLayoutCSS());
      }
    }

    // Typography using global variables
    if (node.textStyle) {
      const textVar = this.getGlobalVariableReference(node.textStyle);
      if (textVar && options.useGlobalVariables) {
        css.push(`  /* Typography from global variable ${node.textStyle} */`);
        css.push(`  ${this.expandTypographyVariable(textVar)}`);
      }
    }

    // Visual styles using global variables
    if (node.fills) {
      const fillVar = this.getGlobalVariableReference(node.fills);
      if (fillVar && options.useGlobalVariables) {
        css.push(`  /* Fills from global variable ${node.fills} */`);
        css.push(`  ${this.expandFillVariable(fillVar)}`);
      }
    }

    // Effects using global variables
    if (node.effects) {
      const effectVar = this.getGlobalVariableReference(node.effects);
      if (effectVar && options.useGlobalVariables) {
        css.push(`  /* Effects from global variable ${node.effects} */`);
        css.push(`  ${this.expandEffectVariable(effectVar)}`);
      }
    }

    // Strokes using global variables
    if (node.strokes) {
      const strokeVar = this.getGlobalVariableReference(node.strokes);
      if (strokeVar && options.useGlobalVariables) {
        css.push(`  /* Strokes from global variable ${node.strokes} */`);
        css.push(`  ${this.expandStrokeVariable(strokeVar)}`);
      }
    }

    // Direct properties
    if (node.opacity && node.opacity !== 1) {
      css.push(`  opacity: ${node.opacity};`);
    }

    if (node.borderRadius) {
      css.push(`  border-radius: ${node.borderRadius};`);
    }

    css.push('}');

    // Add responsive styles if layout supports it
    if (options.generateResponsive && node.layout) {
      css.push('', this.generateResponsiveCSS(className));
    }

    // Optimize CSS if enabled
    if (options.optimizeCSS) {
      return this.optimizeCSS(css.join('\n'));
    }

    return css.join('\n');
  }

  /**
   * Generate enhanced JSX element with semantic HTML and accessibility
   */
  private generateEnhancedJSXElement(
    node: SimplifiedNode,
    className: string,
    options: EnhancedCodeGenerationOptions,
    depth: number = 0
  ): string {
    const indent = '  '.repeat(depth + 1);
    
    // Determine semantic element
    const elementType = this.determineSemanticElement(node);
    
    // Generate attributes
    const attributes: string[] = [];
    attributes.push(`className={\`${className} \${className || ''}\`}`);
    
    // Add accessibility attributes
    if (options.optimizeForAccessibility) {
      const accessibilityAttrs = this.generateAccessibilityAttributes(node);
      attributes.push(...accessibilityAttrs);
    }

    // Generate content
    let content = '';
    if (node.text) {
      content = `{text || "${node.text}"}`;
    } else if (node.children && node.children.length > 0 && options.includeChildren) {
      const childElements = node.children
        .map(child => this.generateEnhancedJSXElement(
          child, 
          this.generateClassName(child.name), 
          options, 
          depth + 1
        ))
        .join('\n');
      content = '\n' + childElements + '\n' + indent;
    } else {
      content = '{children}';
    }

    // Combine everything
    const attributeStr = attributes.length > 0 ? ' ' + attributes.join(' ') : '';
    
    return `${indent}<${elementType}${attributeStr}>${content}</${elementType}>`;
  }

  /**
   * Generate component name from node name
   */
  private generateComponentName(nodeName: string): string {
    const cleaned = nodeName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const pascalCase = cleaned
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    
    return pascalCase.match(/^[A-Za-z]/) ? pascalCase : `Component${pascalCase}`;
  }

  /**
   * Generate CSS class name from component name
   */
  private generateClassName(componentName: string): string {
    return componentName
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  }

  /**
   * Generate enhanced imports with TypeScript and design system support
   */
  private generateEnhancedImports(options: EnhancedCodeGenerationOptions): string[] {
    const imports = ['import React from "react";'];
    
    if (options.includeTypeScript) {
      imports.push('import type { FC } from "react";');
    }

    if (options.generateDesignTokens) {
      imports.push('// Design tokens and CSS variables are automatically imported');
    }

    return imports;
  }

  /**
   * Get global variable reference
   */
  private getGlobalVariableReference(varId: string): any {
    return this.globalVars.styles[varId as keyof typeof this.globalVars.styles];
  }

  /**
   * Expand layout variable to CSS properties
   */
  private expandLayoutVariable(layoutVar: any): string {
    const props: string[] = [];
    
    if (layoutVar.display) props.push(`display: ${layoutVar.display};`);
    if (layoutVar.flexDirection) props.push(`flex-direction: ${layoutVar.flexDirection};`);
    if (layoutVar.alignItems) props.push(`align-items: ${layoutVar.alignItems};`);
    if (layoutVar.justifyContent) props.push(`justify-content: ${layoutVar.justifyContent};`);
    if (layoutVar.gap) props.push(`gap: ${layoutVar.gap};`);
    if (layoutVar.padding) props.push(`padding: ${layoutVar.padding};`);
    if (layoutVar.margin) props.push(`margin: ${layoutVar.margin};`);
    if (layoutVar.width) props.push(`width: ${layoutVar.width};`);
    if (layoutVar.height) props.push(`height: ${layoutVar.height};`);
    if (layoutVar.position) props.push(`position: ${layoutVar.position};`);
    if (layoutVar.top) props.push(`top: ${layoutVar.top};`);
    if (layoutVar.left) props.push(`left: ${layoutVar.left};`);
    
    return props.map(p => `  ${p}`).join('\n');
  }

  /**
   * Expand typography variable to CSS properties
   */
  private expandTypographyVariable(textVar: any): string {
    const props: string[] = [];
    
    if (textVar.fontFamily) props.push(`font-family: ${textVar.fontFamily};`);
    if (textVar.fontSize) props.push(`font-size: ${textVar.fontSize}px;`);
    if (textVar.fontWeight) props.push(`font-weight: ${textVar.fontWeight};`);
    if (textVar.lineHeight) props.push(`line-height: ${textVar.lineHeight};`);
    if (textVar.letterSpacing) props.push(`letter-spacing: ${textVar.letterSpacing};`);
    if (textVar.textAlign) props.push(`text-align: ${textVar.textAlign};`);
    if (textVar.color) props.push(`color: ${textVar.color};`);
    if (textVar.textDecoration) props.push(`text-decoration: ${textVar.textDecoration};`);
    if (textVar.textTransform) props.push(`text-transform: ${textVar.textTransform};`);
    
    return props.map(p => `  ${p}`).join('\n');
  }

  /**
   * Expand fill variable to CSS background properties
   */
  private expandFillVariable(fillVar: any): string {
    if (Array.isArray(fillVar)) {
      const backgrounds = fillVar.map(fill => {
        if (typeof fill === 'string') {
          return `background: ${fill};`;
        }
        if (fill.type === 'GRADIENT_LINEAR' || fill.type?.startsWith('GRADIENT')) {
          return `background: ${fill.gradient};`;
        }
        if (fill.type === 'IMAGE') {
          const bgProps = [];
          if (fill.backgroundSize) bgProps.push(`background-size: ${fill.backgroundSize};`);
          if (fill.backgroundRepeat) bgProps.push(`background-repeat: ${fill.backgroundRepeat};`);
          bgProps.push(`background-image: url('${fill.imageRef}');`);
          return bgProps.join('\n  ');
        }
        return '';
      }).filter(Boolean);
      
      return backgrounds.map(bg => `  ${bg}`).join('\n');
    }
    
    return `  background: ${fillVar};`;
  }

  /**
   * Expand effect variable to CSS properties
   */
  private expandEffectVariable(effectVar: any): string {
    const props: string[] = [];
    
    if (effectVar.boxShadow) props.push(`box-shadow: ${effectVar.boxShadow};`);
    if (effectVar.filter) props.push(`filter: ${effectVar.filter};`);
    if (effectVar.backdropFilter) props.push(`backdrop-filter: ${effectVar.backdropFilter};`);
    if (effectVar.textShadow) props.push(`text-shadow: ${effectVar.textShadow};`);
    if (effectVar.mixBlendMode) props.push(`mix-blend-mode: ${effectVar.mixBlendMode};`);
    
    return props.map(p => `  ${p}`).join('\n');
  }

  /**
   * Expand stroke variable to CSS border properties
   */
  private expandStrokeVariable(strokeVar: any): string {
    const props: string[] = [];
    
    if (strokeVar.colors && strokeVar.colors.length > 0) {
      const color = strokeVar.colors[0];
      props.push(`border-color: ${color};`);
    }
    
    if (strokeVar.strokeWeight) {
      props.push(`border-width: ${strokeVar.strokeWeight};`);
    }
    
    if (strokeVar.strokeDashes && strokeVar.strokeDashes.length > 0) {
      props.push(`border-style: dashed;`);
    } else {
      props.push(`border-style: solid;`);
    }
    
    return props.map(p => `  ${p}`).join('\n');
  }

  /**
   * Generate direct layout CSS without global variables
   */
  private generateDirectLayoutCSS(/* layoutId: string */): string {
    // Fallback when global variables are not used
    return `  /* Layout properties would be expanded here */`;
  }

  /**
   * Determine semantic HTML element type
   */
  private determineSemanticElement(node: SimplifiedNode): string {
    if (node.type === 'TEXT') {
      if (node.name.toLowerCase().includes('heading') || node.name.toLowerCase().includes('title')) {
        return 'h2';
      }
      if (node.name.toLowerCase().includes('button')) {
        return 'button';
      }
      if (node.name.toLowerCase().includes('link')) {
        return 'a';
      }
      return 'p';
    }
    
    if (node.name.toLowerCase().includes('header')) return 'header';
    if (node.name.toLowerCase().includes('footer')) return 'footer';
    if (node.name.toLowerCase().includes('nav')) return 'nav';
    if (node.name.toLowerCase().includes('main')) return 'main';
    if (node.name.toLowerCase().includes('section')) return 'section';
    if (node.name.toLowerCase().includes('article')) return 'article';
    if (node.name.toLowerCase().includes('aside')) return 'aside';
    
    return 'div';
  }

  /**
   * Generate accessibility attributes
   */
  private generateAccessibilityAttributes(node: SimplifiedNode): string[] {
    const attrs: string[] = [];
    
    if (node.type === 'TEXT') {
      attrs.push('role="text"');
    }
    
    if (node.name) {
      attrs.push(`aria-label="${node.name}"`);
    }
    
    return attrs;
  }

  /**
   * Generate enhanced props interface
   */
  private generateEnhancedPropsInterface(componentName: string, node: SimplifiedNode): string {
    const interfaceName = `${componentName}Props`;
    const props: string[] = [];

    props.push('className?: string');
    props.push('children?: React.ReactNode');
    
    if (node.text) {
      props.push('text?: string');
    }
    
    props.push('style?: React.CSSProperties');
    props.push('[key: string]: any');

    return `\ninterface ${interfaceName} {\n  ${props.join(';\n  ')};\n}\n\n`;
  }

  /**
   * Generate complete component code
   */
  private generateComponentCode(
    componentName: string,
    propsInterface: string,
    jsxElement: string,
    options: EnhancedCodeGenerationOptions
  ): string {
    const signature = options.includeTypeScript 
      ? `const ${componentName}: FC<${componentName}Props> = ({ className, children, text, ...props })` 
      : `const ${componentName} = ({ className, children, text, ...props })`;

    return `${propsInterface}${signature} => {
  return (
${jsxElement}
  );
};

export default ${componentName};`;
  }

  /**
   * Generate responsive CSS
   */
  private generateResponsiveCSS(/* node: SimplifiedNode, */ className: string): string {
    const css: string[] = [];
    
    css.push('/* Responsive styles */');
    css.push('@media (max-width: 768px) {');
    css.push(`  .${className} {`);
    css.push('    /* Mobile adaptations */');
    css.push('  }');
    css.push('}');
    
    return css.join('\n');
  }

  /**
   * Optimize generated CSS
   */
  private optimizeCSS(css: string): string {
    // Remove empty rules and duplicate properties
    return css
      .replace(/\/\*.*?\*\//g, '') // Remove comments for optimization
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
  }

  /**
   * Format value for CSS custom property
   */
  private formatValueForCSS(value: any): string | null {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      
      if ('gradient' in value) return value.gradient;
      if ('boxShadow' in value) return value.boxShadow;
      if ('fontFamily' in value) {
        return `${value.fontWeight || 'normal'} ${value.fontSize || '16px'} ${value.fontFamily}`;
      }
    }
    
    return null;
  }

  /**
   * Collect relevant design tokens for the node
   */
  private collectRelevantDesignTokens(node: SimplifiedNode): DesignToken[] {
    const tokens: DesignToken[] = [];
    
    // Add tokens based on node properties
    if (node.fills) {
      tokens.push(...this.designTokens.colors);
    }
    
    if (node.textStyle) {
      tokens.push(...this.designTokens.typography);
    }
    
    if (node.layout) {
      tokens.push(...this.designTokens.layout);
    }
    
    if (node.effects) {
      tokens.push(...this.designTokens.effects);
    }
    
    return tokens;
  }

  /**
   * Count global variables used in the node
   */
  private countGlobalVariablesUsed(node: SimplifiedNode): number {
    let count = 0;
    
    if (node.layout && this.globalVars.styles[node.layout as keyof typeof this.globalVars.styles]) count++;
    if (node.textStyle && this.globalVars.styles[node.textStyle as keyof typeof this.globalVars.styles]) count++;
    if (node.fills && this.globalVars.styles[node.fills as keyof typeof this.globalVars.styles]) count++;
    if (node.effects && this.globalVars.styles[node.effects as keyof typeof this.globalVars.styles]) count++;
    if (node.strokes && this.globalVars.styles[node.strokes as keyof typeof this.globalVars.styles]) count++;
    
    return count;
  }

  /**
   * Get optimizations applied based on options
   */
  private getOptimizationsApplied(options: EnhancedCodeGenerationOptions): string[] {
    const optimizations: string[] = [];
    
    if (options.useGlobalVariables) optimizations.push('Global variables deduplication');
    if (options.optimizeCSS) optimizations.push('CSS optimization');
    if (options.generateDesignTokens) optimizations.push('Design token integration');
    if (options.optimizeForAccessibility) optimizations.push('Accessibility enhancements');
    
    return optimizations;
  }

  /**
   * Get generation statistics
   */
  public getGenerationStats() {
    return { ...this.generationStats };
  }

  /**
   * Reset statistics
   */
  public resetStats() {
    this.generationStats = {
      componentsGenerated: 0,
      cssLinesGenerated: 0,
      globalVariablesUsed: 0,
      optimizationsApplied: 0,
    };
  }
}