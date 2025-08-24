import type { ParsedNodeMetadata } from './metadataParser';
import type { CodeFormattingOptions, CodeGenerationOptions } from '../types/gemini';
import { VisualStyleExtractor } from './visualStyleExtractor';
// import { TypographyExtractor } from './typographyExtractor';
// import { LayoutExtractor } from './layoutExtractor';

export interface GeneratedComponent {
  name: string;
  code: string;
  css: string;
  imports: string[];
}

export class CodeGeneratorUtils {
  /**
   * Generate a React component name from a Figma node name
   */
  public static generateComponentName(nodeName: string, suffix: string = 'Component'): string {
    // Clean and format the name
    const cleaned = nodeName
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    
    // Convert to PascalCase
    const pascalCase = cleaned
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    
    // Ensure it starts with a letter and add suffix if needed
    const validName = pascalCase.match(/^[A-Za-z]/) ? pascalCase : `Component${pascalCase}`;
    
    // Add suffix if not already present
    return validName.endsWith(suffix) ? validName : `${validName}${suffix}`;
  }

  /**
   * Generate CSS class name from component name
   */
  public static generateClassName(componentName: string): string {
    return componentName
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  }

  /**
   * Convert parsed metadata to high-fidelity CSS properties with modern features
   */
  public static generateAdvancedCSSFromMetadata(metadata: ParsedNodeMetadata): string {
    const css: string[] = [];
    const className = this.generateClassName(metadata.name);

    css.push(`.${className} {`);

    // Layout system (modern Flexbox/Grid)
    if (metadata.layoutSystem) {
      css.push(...metadata.layoutSystem.cssDeclarations.map(decl => `  ${decl};`));
    } else {
      // Fallback to basic display
      css.push(`  display: ${metadata.cssHints.display || 'block'};`);
    }

    // Visual styling with gradients and advanced effects
    if (metadata.visualStyle) {
      const visualCSS = VisualStyleExtractor.generateCSSFromVisualStyles(metadata.visualStyle);
      css.push(...visualCSS.map(decl => `  ${decl.endsWith(';') ? decl : decl + ';'}`));
    }

    // Advanced typography
    if (metadata.advancedTypography) {
      const typographyCSS = metadata.advancedTypography.cssProperties;
      css.push(...typographyCSS.map(prop => `  ${prop.endsWith(';') ? prop : prop + ';'}`));
    }

    // Dimensions with responsive considerations
    if (metadata.layout.width && metadata.layout.height) {
      if (metadata.layoutSystem?.properties.width) {
        css.push(`  width: ${metadata.layoutSystem.properties.width};`);
      } else {
        css.push(`  width: ${metadata.layout.width}px;`);
      }
      
      if (metadata.layoutSystem?.properties.height) {
        css.push(`  height: ${metadata.layoutSystem.properties.height};`);
      } else {
        css.push(`  height: ${metadata.layout.height}px;`);
      }
    }

    // Enhanced spacing from layout system
    if (metadata.layoutSystem?.properties.padding) {
      css.push(`  padding: ${metadata.layoutSystem.properties.padding};`);
    }
    
    if (metadata.layoutSystem?.properties.margin) {
      css.push(`  margin: ${metadata.layoutSystem.properties.margin};`);
    }

    // Border radius
    if (metadata.styling.cornerRadius) {
      css.push(`  border-radius: ${metadata.styling.cornerRadius}px;`);
    }

    // Opacity
    if (metadata.styling.opacity && metadata.styling.opacity < 1) {
      css.push(`  opacity: ${metadata.styling.opacity};`);
    }

    // Blend mode for advanced effects
    if (metadata.visualStyle?.blendMode && metadata.visualStyle.blendMode !== 'NORMAL') {
      const blendMode = metadata.visualStyle.blendMode.toLowerCase().replace('_', '-');
      css.push(`  mix-blend-mode: ${blendMode};`);
    }

    css.push('}');

    return css.join('\n');
  }

  /**
   * Generate advanced React component structure with high visual fidelity
   */
  public static generateAdvancedComponent(
    metadata: ParsedNodeMetadata,
    options: CodeGenerationOptions = {}
  ): GeneratedComponent {
    const componentName = this.generateComponentName(metadata.name);
    const className = this.generateClassName(metadata.name);
    
    // Generate imports
    const imports = ['import React from "react";'];
    if (options.includeTypeScript) {
      imports.push('import type { FC } from "react";');
    }

    // Generate props interface with enhanced properties
    let propsInterface = '';
    if (options.includeTypeScript) {
      propsInterface = this.generateEnhancedPropsInterface(componentName, metadata);
    }

    // Generate component with semantic HTML
    const componentSignature = options.includeTypeScript 
      ? `const ${componentName}: FC<${componentName}Props> = ({ className, children, ...props })` 
      : `const ${componentName} = ({ className, children, ...props })`;

    // Generate JSX element with semantic structure
    const element = this.generateSemanticJSXElement(metadata, className, options);

    // Generate component code
    const code = `${propsInterface}${componentSignature} => {
  return (
${element}
  );
};

export default ${componentName};`;

    // Generate advanced CSS with modern features
    const css = this.generateAdvancedCSSFromMetadata(metadata);

    // Generate responsive CSS if enabled
    let responsiveCSS = '';
    if (options.generateResponsive && metadata.responsiveLayout) {
      responsiveCSS = this.generateResponsiveCSS(metadata, className);
    }

    return {
      name: componentName,
      code: imports.join('\n') + '\n\n' + code,
      css: css + (responsiveCSS ? '\n\n' + responsiveCSS : ''),
      imports,
    };
  }

  /**
   * Generate semantic JSX element with proper HTML tags
   */
  private static generateSemanticJSXElement(
    metadata: ParsedNodeMetadata,
    className: string,
    options: CodeGenerationOptions = {},
    depth: number = 0
  ): string {
    const indent = '    '.repeat(depth + 2);
    
    // Determine semantic element type
    let elementType = 'div';
    if (metadata.textHierarchy) {
      elementType = metadata.textHierarchy.suggestedElement;
    } else if (metadata.type === 'TEXT') {
      elementType = this.inferSemanticTextElement(metadata);
    } else {
      elementType = this.inferSemanticContainerElement(metadata);
    }

    // Generate attributes
    const attributes: string[] = [];
    attributes.push(`className=\`${className} \${className || ''\}\``);
    
    // Add accessibility attributes
    if (options.optimizeForAccessibility && metadata.accessibility) {
      if (metadata.accessibility.role && metadata.accessibility.role !== 'generic') {
        attributes.push(`role="${metadata.accessibility.role}"`);
      }
      if (metadata.accessibility.label) {
        attributes.push(`aria-label="${metadata.accessibility.label}"`);
      }
      if (metadata.accessibility.ariaAttributes) {
        Object.entries(metadata.accessibility.ariaAttributes).forEach(([key, value]) => {
          attributes.push(`${key}="${value}"`);
        });
      }
    }

    // Add semantic attributes based on element type
    if (elementType === 'button') {
      attributes.push('type="button"');
    } else if (elementType === 'a') {
      attributes.push('href="#"');
    }

    // Generate content
    let content = '';
    if (metadata.content) {
      content = metadata.content;
    } else if (metadata.children && metadata.children.length > 0 && options.includeChildren) {
      const childElements = metadata.children
        .map(child => this.generateSemanticJSXElement(child, this.generateClassName(child.name), options, depth + 1))
        .join('\n');
      content = '\n' + childElements + '\n' + indent;
    } else if (!metadata.content && !metadata.children?.length) {
      content = '{children}';
    }

    // Combine everything
    const attributeStr = attributes.length > 0 ? ' ' + attributes.join(' ') : '';
    
    if (content && content !== '{children}') {
      return `${indent}<${elementType}${attributeStr}>${content}</${elementType}>`;
    } else {
      return `${indent}<${elementType}${attributeStr}>{content || children}</${elementType}>`;
    }
  }

  /**
   * Infer semantic text element based on typography and hierarchy
   */
  private static inferSemanticTextElement(metadata: ParsedNodeMetadata): string {
    if (metadata.textHierarchy) {
      return metadata.textHierarchy.suggestedElement;
    }
    
    if (!metadata.content) return 'span';
    
    const content = metadata.content.toLowerCase();
    const fontSize = metadata.advancedTypography?.fontSize || 14;
    
    // Infer based on content and styling
    if (fontSize >= 24 || content.includes('title') || content.includes('heading')) {
      return fontSize >= 32 ? 'h1' : fontSize >= 24 ? 'h2' : 'h3';
    }
    
    if (content.includes('button') || content.includes('click')) {
      return 'button';
    }
    
    if (content.includes('link') || metadata.advancedTypography?.textDecoration?.includes('underline')) {
      return 'a';
    }
    
    if (content.length > 50) {
      return 'p';
    }
    
    return 'span';
  }

  /**
   * Infer semantic container element
   */
  private static inferSemanticContainerElement(metadata: ParsedNodeMetadata): string {
    const name = metadata.name.toLowerCase();
    
    if (name.includes('header')) return 'header';
    if (name.includes('footer')) return 'footer';
    if (name.includes('nav') || name.includes('menu')) return 'nav';
    if (name.includes('main') || name.includes('content')) return 'main';
    if (name.includes('article')) return 'article';
    if (name.includes('section')) return 'section';
    if (name.includes('aside') || name.includes('sidebar')) return 'aside';
    if (name.includes('card')) return 'article';
    if (name.includes('list') || name.includes('grid')) return 'ul';
    if (name.includes('form')) return 'form';
    
    return 'div';
  }

  /**
   * Generate responsive CSS for different breakpoints
   */
  private static generateResponsiveCSS(metadata: ParsedNodeMetadata, className: string): string {
    if (!metadata.responsiveLayout?.breakpoints) {
      return '';
    }

    const css: string[] = [];
    const breakpoints = metadata.responsiveLayout.breakpoints;

    // Mobile styles
    if (breakpoints.mobile && Object.keys(breakpoints.mobile).length > 0) {
      css.push('@media (max-width: 768px) {');
      css.push(`  .${className} {`);
      Object.entries(breakpoints.mobile).forEach(([prop, value]) => {
        if (value !== undefined) {
          const cssProperty = this.camelToCssCase(prop);
          css.push(`    ${cssProperty}: ${value};`);
        }
      });
      css.push('  }');
      css.push('}');
    }

    // Tablet styles
    if (breakpoints.tablet && Object.keys(breakpoints.tablet).length > 0) {
      css.push('@media (min-width: 769px) and (max-width: 1024px) {');
      css.push(`  .${className} {`);
      Object.entries(breakpoints.tablet).forEach(([prop, value]) => {
        if (value !== undefined) {
          const cssProperty = this.camelToCssCase(prop);
          css.push(`    ${cssProperty}: ${value};`);
        }
      });
      css.push('  }');
      css.push('}');
    }

    return css.join('\n');
  }

  /**
   * Generate enhanced props interface with semantic properties
   */
  private static generateEnhancedPropsInterface(
    componentName: string,
    metadata: ParsedNodeMetadata
  ): string {
    const interfaceName = `${componentName}Props`;
    const props: string[] = [];

    // Basic props
    props.push('className?: string');
    
    // Content props for text components
    if (metadata.type === 'TEXT') {
      props.push('children?: React.ReactNode');
      if (metadata.content) {
        props.push('text?: string');
      }
    } else if (metadata.children && metadata.children.length > 0) {
      props.push('children?: React.ReactNode');
    }

    // Interactive props
    if (this.isInteractiveElement(metadata)) {
      props.push('onClick?: (event: React.MouseEvent) => void');
      props.push('onHover?: (event: React.MouseEvent) => void');
      props.push('disabled?: boolean');
    }

    // Accessibility props
    props.push('aria-label?: string');
    props.push('role?: string');

    // Style props for customization
    props.push('style?: React.CSSProperties');

    return `\ninterface ${interfaceName} {\n  ${props.join(';\n  ')};\n}\n\n`;
  }

  /**
   * Convert camelCase to CSS property name
   */
  private static camelToCssCase(camelCase: string): string {
    return camelCase.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  /**
   * Format generated code according to options
   */
  public static formatCode(code: string, options: CodeFormattingOptions): string {
    let formatted = code;

    // Handle indentation
    if (options.indentType === 'tabs') {
      formatted = formatted.replace(/  /g, '\t');
    } else {
      const spaces = ' '.repeat(options.indentSize);
      formatted = formatted.replace(/  /g, spaces);
    }

    // Handle semicolons
    if (!options.semicolons) {
      formatted = formatted.replace(/;$/gm, '');
    }

    // Handle quotes
    if (options.singleQuotes) {
      formatted = formatted.replace(/"/g, "'");
    }

    // Handle trailing commas
    if (options.trailingCommas) {
      formatted = formatted.replace(/([}\]])\s*$/gm, '$1,');
    }

    return formatted;
  }

  /**
   * Generate TypeScript prop interfaces
   */
  public static generatePropsInterface(
    componentName: string,
    metadata: ParsedNodeMetadata
  ): string {
    const interfaceName = `${componentName}Props`;
    const props: string[] = [];

    // Basic props
    props.push('className?: string');
    
    // Content props for text components
    if (metadata.type === 'TEXT') {
      props.push('children?: React.ReactNode');
    } else if (metadata.children && metadata.children.length > 0) {
      props.push('children?: React.ReactNode');
    }

    // Interactive props
    if (this.isInteractiveElement(metadata)) {
      props.push('onClick?: () => void');
      props.push('onHover?: () => void');
      props.push('disabled?: boolean');
    }

    // Custom props based on content
    if (metadata.type === 'TEXT' && metadata.content) {
      props.push('text?: string');
    }

    return `interface ${interfaceName} {
  ${props.join(';\n  ')};
}`;
  }

  /**
   * Determine if element should have interactive props
   */
  private static isInteractiveElement(metadata: ParsedNodeMetadata): boolean {
    const interactiveTypes = ['COMPONENT', 'INSTANCE'];
    const hasButtonText = metadata.content?.toLowerCase().includes('button') || false;
    const hasClickText = metadata.content?.toLowerCase().includes('click') || false;
    
    return interactiveTypes.includes(metadata.type) || hasButtonText || hasClickText;
  }

  /**
   * Generate CSS variables from design tokens
   */
  public static generateCSSVariables(metadata: ParsedNodeMetadata): string {
    const variables: string[] = [];
    
    variables.push(':root {');
    
    // Color variables
    if (metadata.styling.fills.length > 0) {
      metadata.styling.fills.forEach((fill, index) => {
        if (fill.color) {
          variables.push(`  --color-${metadata.name.toLowerCase()}-fill-${index}: ${fill.color};`);
        }
      });
    }

    // Typography variables
    if (metadata.typography) {
      variables.push(`  --font-${metadata.name.toLowerCase()}-family: "${metadata.typography.fontFamily}";`);
      variables.push(`  --font-${metadata.name.toLowerCase()}-size: ${metadata.typography.fontSize}px;`);
      variables.push(`  --font-${metadata.name.toLowerCase()}-weight: ${metadata.typography.fontWeight};`);
    }

    // Spacing variables
    if (metadata.autoLayout) {
      variables.push(`  --spacing-${metadata.name.toLowerCase()}: ${metadata.autoLayout.spacing}px;`);
    }

    variables.push('}');
    
    return variables.join('\n');
  }

  /**
   * Validate generated code for common issues
   */
  public static validateGeneratedCode(code: string): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for basic React component structure
    if (!code.includes('export default')) {
      errors.push('Component must have a default export');
    }

    // Check for proper imports
    if (!code.includes('import React')) {
      errors.push('Missing React import');
    }

    // Check for valid component name (PascalCase)
    const componentMatch = code.match(/const (\w+)/);
    if (componentMatch) {
      const componentName = componentMatch[1];
      if (!/^[A-Z][a-zA-Z0-9]*/.test(componentName)) {
        warnings.push('Component name should start with capital letter');
      }
    }

    // Check for accessibility
    if (!code.includes('aria-') && !code.includes('role=')) {
      warnings.push('Consider adding accessibility attributes');
    }

    // Check for TypeScript
    if (!code.includes('interface') && !code.includes('type')) {
      warnings.push('Consider adding TypeScript types for better maintainability');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export default CodeGeneratorUtils;