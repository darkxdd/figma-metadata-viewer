import type { FigmaNode } from '../types/figma';
import type {
  SimplifiedNode,
  GlobalVars,
  ExtractorFn,
  TraversalOptions,
} from '../extractors/types';
import type {
  EnhancedFigmaFileData,
  EnhancedParsedNodeMetadata,
  EnhancedExtractionOptions,
} from '../types/figma';
import { extractFromDesign, extractFromDesignNodes } from '../extractors/nodeWalker';
import { simplifyRawFigmaObject } from '../extractors/designExtractor';
import { allExtractors, layoutAndText, contentOnly, visualsOnly } from '../extractors/builtInExtractors';
import { GlobalVariableManager } from './globalVariables';
import { Logger } from './logger';

/**
 * Enhanced metadata parser that uses the flexible extractor system for AI-optimized processing
 */
export class EnhancedMetadataParser {
  private globalVariableManager: GlobalVariableManager;
  private extractionStats = {
    processingTime: 0,
    nodesProcessed: 0,
    extractorsUsed: [] as string[],
    globalVariablesCreated: 0,
    duplicatesAvoided: 0,
  };

  constructor() {
    this.globalVariableManager = new GlobalVariableManager();
  }

  /**
   * Parse entire Figma file data using enhanced extractors
   */
  public parseFileData(
    fileData: any,
    options: EnhancedExtractionOptions = {}
  ): EnhancedFigmaFileData {
    const startTime = performance.now();
    Logger.log('Starting enhanced file data parsing...');

    // Set default options
    const extractionOptions = {
      extractors: options.extractors || allExtractors,
      traversalOptions: options.traversalOptions || {},
      generateDesignTokens: options.generateDesignTokens ?? true,
      generateGlobalVariables: options.generateGlobalVariables ?? true,
      optimizeForPerformance: options.optimizeForPerformance ?? true,
      includeLegacyFormat: options.includeLegacyFormat ?? false,
      ...options,
    };

    // Process using the flexible extractor system
    const simplifiedDesign = simplifyRawFigmaObject(
      fileData,
      extractionOptions.extractors,
      extractionOptions.traversalOptions
    );

    // Generate design tokens if requested
    let designTokens;
    if (extractionOptions.generateDesignTokens) {
      designTokens = this.globalVariableManager.generateDesignTokens();
    }

    // Update global variable manager with extracted variables
    if (extractionOptions.generateGlobalVariables && simplifiedDesign.globalVars) {
      this.globalVariableManager = new GlobalVariableManager(simplifiedDesign.globalVars);
    }

    const processingTime = performance.now() - startTime;
    Logger.log(`Enhanced file parsing completed in ${processingTime.toFixed(2)}ms`);

    // Create enhanced file data
    const enhancedFileData: EnhancedFigmaFileData = {
      name: fileData.name,
      lastModified: fileData.lastModified,
      thumbnailUrl: fileData.thumbnailUrl,
      document: fileData.document,
      components: fileData.components,
      componentSets: fileData.componentSets,
      simplifiedDesign,
      globalVars: simplifiedDesign.globalVars,
      designTokens,
    };

    this.extractionStats.processingTime = processingTime;
    this.extractionStats.extractorsUsed = extractionOptions.extractors?.map(e => e.name) || [];
    
    return enhancedFileData;
  }

  /**
   * Parse individual node with enhanced metadata
   */
  public parseNodeEnhanced(
    node: FigmaNode,
    options: EnhancedExtractionOptions = {},
    // parent?: FigmaNode
  ): EnhancedParsedNodeMetadata {
    const startTime = performance.now();
    
    // Set up extraction options
    const extractors = options.extractors || allExtractors;
    const traversalOptions = options.traversalOptions || { maxDepth: 1 };

    // Extract using flexible system
    const simplifiedNode = extractFromDesign(node, {
      extractors,
      globalVars: this.globalVariableManager.getGlobalVars(),
      traversalOptions
    });
    
    // Update global variable manager
    const globalVars = this.globalVariableManager.getGlobalVars();

    // Generate design tokens for this node
    const designTokens = this.globalVariableManager.generateDesignTokens();

    // Generate CSS variables
    const cssVariables = this.generateCSSVariables(globalVars);

    // Create legacy metadata if requested
    let originalMetadata;
    if (options.includeLegacyFormat) {
      // Import and use original parser for legacy format
      originalMetadata = this.generateLegacyMetadata(node);
    }

    const processingTime = performance.now() - startTime;

    const extractionStats = {
      processingTime,
      extractorsUsed: extractors.map(e => e.name || 'anonymous'),
      globalVariablesCreated: Object.keys(globalVars.styles).length,
      duplicatesAvoided: this.calculateDuplicatesAvoided(globalVars),
    };

    return {
      originalMetadata,
      simplifiedNode,
      designTokens: Object.values(designTokens).flat(),
      cssVariables,
      extractionStats,
    };
  }

  /**
   * Parse nodes with specific extractor combinations for different use cases
   */
  public parseWithExtractorCombination(
    nodes: FigmaNode[],
    extractorType: 'all' | 'layout' | 'content' | 'visuals',
    options: TraversalOptions = {}
  ): { nodes: SimplifiedNode[]; globalVars: GlobalVars } {
    let extractors: ExtractorFn[];

    switch (extractorType) {
      case 'layout':
        extractors = layoutAndText;
        break;
      case 'content':
        extractors = contentOnly;
        break;
      case 'visuals':
        extractors = visualsOnly;
        break;
      case 'all':
      default:
        extractors = allExtractors;
        break;
    }

    return extractFromDesignNodes(
      nodes,
      extractors,
      options,
      this.globalVariableManager.getGlobalVars()
    );
  }

  /**
   * Get extraction statistics
   */
  public getExtractionStats() {
    return {
      ...this.extractionStats,
      globalVariableStats: this.globalVariableManager.getStatistics(),
    };
  }

  /**
   * Generate CSS custom properties from extracted data
   */
  public generateCSSCustomProperties(): string {
    return this.globalVariableManager.generateCSSCustomProperties();
  }

  /**
   * Get design tokens in various formats
   */
  public getDesignTokens(format: 'object' | 'css' | 'json' = 'object') {
    const tokens = this.globalVariableManager.generateDesignTokens();
    
    switch (format) {
      case 'css':
        return this.globalVariableManager.generateCSSCustomProperties();
      case 'json':
        return JSON.stringify(tokens, null, 2);
      case 'object':
      default:
        return tokens;
    }
  }

  /**
   * Clear all cached data
   */
  public clearCache(): void {
    this.globalVariableManager.clear();
    this.extractionStats = {
      processingTime: 0,
      nodesProcessed: 0,
      extractorsUsed: [],
      globalVariablesCreated: 0,
      duplicatesAvoided: 0,
    };
  }

  /**
   * Optimize extraction performance for large files
   */
  public optimizeForPerformance(): void {
    // Set performance-focused options
    Logger.log('Optimizing parser for performance...');
    
    // Clear any cached data to free memory
    this.clearCache();
  }

  /**
   * Create fallback simplified node if extraction fails
   */
  // private createFallbackSimplifiedNode(node: FigmaNode): SimplifiedNode {
  //   return {
  //     id: node.id,
  //     name: node.name,
  //     type: node.type,
  //   };
  // }

  /**
   * Generate CSS variables from simplified node and global vars
   */
  private generateCSSVariables(
    // node: SimplifiedNode,
    globalVars: GlobalVars
  ): Record<string, string> {
    const cssVariables: Record<string, string> = {};

    // Process global variables to CSS custom properties
    for (const [id, value] of Object.entries(globalVars.styles)) {
      const cssVarName = `--${id.toLowerCase().replace(/_/g, '-')}`;
      const cssValue = this.formatValueForCSS(value);
      
      if (cssValue) {
        cssVariables[cssVarName] = cssValue;
      }
    }

    return cssVariables;
  }

  /**
   * Format value for CSS custom property
   */
  private formatValueForCSS(value: any): string | null {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      
      // Handle common object patterns
      if ('gradient' in value) {
        return value.gradient;
      }
      
      if ('boxShadow' in value) {
        return value.boxShadow;
      }
      
      if ('fontFamily' in value) {
        return `${value.fontWeight || 'normal'} ${value.fontSize || '16px'} ${value.fontFamily}`;
      }
    }

    return null;
  }

  /**
   * Calculate duplicates avoided by global variable system
   */
  private calculateDuplicatesAvoided(globalVars: GlobalVars): number {
    const values = Object.values(globalVars.styles);
    const uniqueValues = new Set(values.map(v => JSON.stringify(v)));
    return values.length - uniqueValues.size;
  }

  /**
   * Generate legacy metadata format for compatibility
   */
  private generateLegacyMetadata(node: FigmaNode): any {
    // This would call the original MetadataParser for backward compatibility
    // For now, return a basic structure
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      legacy: true,
    };
  }

  /**
   * Analyze extraction performance and provide recommendations
   */
  public analyzePerformance(): {
    recommendations: string[];
    metrics: Record<string, number>;
    optimizations: string[];
  } {
    const stats = this.getExtractionStats();
    const recommendations: string[] = [];
    const optimizations: string[] = [];
    
    const metrics = {
      processingTime: stats.processingTime,
      globalVariables: stats.globalVariableStats.totalVariables,
      duplicatesAvoided: stats.globalVariableStats.duplicatesFound,
      memoryUsage: stats.globalVariableStats.memoryUsage,
    };

    // Performance analysis
    if (stats.processingTime > 1000) {
      recommendations.push('Consider using performance optimization mode for large files');
      optimizations.push('Enable optimizeForPerformance option');
    }

    if (stats.globalVariableStats.duplicatesFound > 10) {
      recommendations.push('High number of duplicate styles found - global variables are providing significant benefits');
    }

    if (stats.globalVariableStats.memoryUsage > 1000000) {
      recommendations.push('High memory usage detected - consider clearing cache periodically');
      optimizations.push('Call clearCache() after processing large batches');
    }

    return {
      recommendations,
      metrics,
      optimizations,
    };
  }
}