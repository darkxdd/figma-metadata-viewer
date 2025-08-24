import type { FigmaNode } from '../types/figma';
import type { ParsedNodeMetadata } from './metadataParser';

export interface ValidationResult {
  overallScore: number;
  categories: ValidationCategories;
  issues: ValidationIssue[];
  suggestions: string[];
  comparison: VisualComparison;
}

export interface ValidationCategories {
  layout: CategoryScore;
  typography: CategoryScore;
  colors: CategoryScore;
  spacing: CategoryScore;
  effects: CategoryScore;
  imagery: CategoryScore;
}

export interface CategoryScore {
  score: number; // 0-100
  maxScore: number;
  weight: number;
  details: ScoreDetail[];
}

export interface ScoreDetail {
  property: string;
  expected: string | number;
  actual: string | number;
  score: number;
  impact: 'high' | 'medium' | 'low';
}

export interface ValidationIssue {
  category: keyof ValidationCategories;
  severity: 'error' | 'warning' | 'info';
  message: string;
  property: string;
  expected?: string;
  actual?: string;
  suggestion?: string;
}

export interface VisualComparison {
  figmaReference: string; // Original Figma node reference
  generatedCSS: string;
  matchedProperties: string[];
  missingProperties: string[];
  extraProperties: string[];
  accuracy: number;
}

export interface ValidationConfig {
  strictMode: boolean;
  tolerances: {
    color: number; // Color difference threshold (0-1)
    spacing: number; // Pixel difference threshold
    typography: number; // Font size difference threshold
    positioning: number; // Position difference threshold
  };
  weights: {
    layout: number;
    typography: number;
    colors: number;
    spacing: number;
    effects: number;
    imagery: number;
  };
  skipProperties?: string[];
}

export class VisualValidator {
  private config: ValidationConfig;

  constructor(config?: Partial<ValidationConfig>) {
    this.config = {
      strictMode: false,
      tolerances: {
        color: 0.05, // 5% tolerance for color differences
        spacing: 2, // 2px tolerance
        typography: 1, // 1px tolerance for font sizes
        positioning: 1 // 1px tolerance for positions
      },
      weights: {
        layout: 0.25,
        typography: 0.20,
        colors: 0.20,
        spacing: 0.15,
        effects: 0.10,
        imagery: 0.10
      },
      skipProperties: [],
      ...config
    };
  }

  /**
   * Validate generated code against original Figma design
   */
  async validateDesign(
    originalNode: FigmaNode,
    generatedMetadata: ParsedNodeMetadata,
    generatedCSS: string
  ): Promise<ValidationResult> {
    
    const categories = await this.validateCategories(originalNode, generatedMetadata);
    const issues = this.collectIssues(categories);
    const suggestions = this.generateSuggestions(issues);
    const comparison = this.createVisualComparison(originalNode, generatedCSS, generatedMetadata);
    const overallScore = this.calculateOverallScore(categories);

    return {
      overallScore,
      categories,
      issues,
      suggestions,
      comparison
    };
  }

  /**
   * Validate all categories
   */
  private async validateCategories(
    originalNode: FigmaNode,
    generatedMetadata: ParsedNodeMetadata
  ): Promise<ValidationCategories> {
    
    const [layout, typography, colors, spacing, effects, imagery] = await Promise.all([
      this.validateLayout(originalNode, generatedMetadata),
      this.validateTypography(originalNode, generatedMetadata),
      this.validateColors(originalNode, generatedMetadata),
      this.validateSpacing(originalNode, generatedMetadata),
      this.validateEffects(originalNode, generatedMetadata),
      this.validateImagery(originalNode, generatedMetadata)
    ]);

    return { layout, typography, colors, spacing, effects, imagery };
  }

  /**
   * Validate layout properties
   */
  private async validateLayout(
    originalNode: FigmaNode,
    generatedMetadata: ParsedNodeMetadata
  ): Promise<CategoryScore> {
    const details: ScoreDetail[] = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    // Validate dimensions
    if (originalNode.absoluteBoundingBox && generatedMetadata.layout) {
      const widthScore = this.compareNumericValues(
        originalNode.absoluteBoundingBox.width,
        generatedMetadata.layout.width || 0,
        this.config.tolerances.positioning,
        'width'
      );
      details.push(widthScore);
      totalScore += widthScore.score;
      maxPossibleScore += 100;

      const heightScore = this.compareNumericValues(
        originalNode.absoluteBoundingBox.height,
        generatedMetadata.layout.height || 0,
        this.config.tolerances.positioning,
        'height'
      );
      details.push(heightScore);
      totalScore += heightScore.score;
      maxPossibleScore += 100;
    }

    // Validate layout mode
    if (originalNode.layoutMode && generatedMetadata.layoutSystem) {
      const expectedDisplay = originalNode.layoutMode ? 'flex' : 'block';
      const actualDisplay = generatedMetadata.layoutSystem.properties.display || 'block';
      
      const displayScore: ScoreDetail = {
        property: 'display',
        expected: expectedDisplay,
        actual: actualDisplay,
        score: expectedDisplay === actualDisplay ? 100 : 0,
        impact: 'high'
      };
      details.push(displayScore);
      totalScore += displayScore.score;
      maxPossibleScore += 100;
    }

    // Validate flex direction
    if (originalNode.layoutMode && generatedMetadata.layoutSystem?.properties.flexDirection) {
      const expectedDirection = originalNode.layoutMode === 'HORIZONTAL' ? 'row' : 'column';
      const actualDirection = generatedMetadata.layoutSystem.properties.flexDirection;
      
      const directionScore: ScoreDetail = {
        property: 'flex-direction',
        expected: expectedDirection,
        actual: actualDirection,
        score: expectedDirection === actualDirection ? 100 : 0,
        impact: 'high'
      };
      details.push(directionScore);
      totalScore += directionScore.score;
      maxPossibleScore += 100;
    }

    const finalScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 100;

    return {
      score: Math.round(finalScore),
      maxScore: 100,
      weight: this.config.weights.layout,
      details
    };
  }

  /**
   * Validate typography properties
   */
  private async validateTypography(
    originalNode: FigmaNode,
    generatedMetadata: ParsedNodeMetadata
  ): Promise<CategoryScore> {
    const details: ScoreDetail[] = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    if (originalNode.type === 'TEXT' && originalNode.style && generatedMetadata.advancedTypography) {
      const originalStyle = originalNode.style;
      const generatedTypography = generatedMetadata.advancedTypography;

      // Font family
      const fontFamilyScore: ScoreDetail = {
        property: 'font-family',
        expected: originalStyle.fontFamily || 'Arial',
        actual: generatedTypography.fontFamily.split(',')[0].replace(/"/g, ''),
        score: (originalStyle.fontFamily || 'Arial') === generatedTypography.fontFamily.split(',')[0].replace(/"/g, '') ? 100 : 50,
        impact: 'high'
      };
      details.push(fontFamilyScore);
      totalScore += fontFamilyScore.score;
      maxPossibleScore += 100;

      // Font size
      const fontSizeScore = this.compareNumericValues(
        originalStyle.fontSize || 16,
        generatedTypography.fontSize,
        this.config.tolerances.typography,
        'font-size'
      );
      details.push(fontSizeScore);
      totalScore += fontSizeScore.score;
      maxPossibleScore += 100;

      // Font weight
      const fontWeightScore = this.compareNumericValues(
        originalStyle.fontWeight || 400,
        generatedTypography.fontWeight,
        0,
        'font-weight'
      );
      details.push(fontWeightScore);
      totalScore += fontWeightScore.score;
      maxPossibleScore += 100;

      // Text align
      const expectedAlign = originalStyle.textAlignHorizontal?.toLowerCase() || 'left';
      const actualAlign = generatedTypography.textAlign;
      const alignScore: ScoreDetail = {
        property: 'text-align',
        expected: expectedAlign,
        actual: actualAlign,
        score: expectedAlign === actualAlign ? 100 : 0,
        impact: 'medium'
      };
      details.push(alignScore);
      totalScore += alignScore.score;
      maxPossibleScore += 100;

      // Line height
      if (originalStyle.lineHeightPx && generatedTypography.lineHeight) {
        const lineHeightScore = this.compareNumericValues(
          originalStyle.lineHeightPx,
          typeof generatedTypography.lineHeight === 'number' 
            ? generatedTypography.lineHeight * generatedTypography.fontSize 
            : generatedTypography.lineHeight,
          this.config.tolerances.typography,
          'line-height'
        );
        details.push(lineHeightScore);
        totalScore += lineHeightScore.score;
        maxPossibleScore += 100;
      }
    }

    const finalScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 100;

    return {
      score: Math.round(finalScore),
      maxScore: 100,
      weight: this.config.weights.typography,
      details
    };
  }

  /**
   * Validate color properties
   */
  private async validateColors(
    originalNode: FigmaNode,
    generatedMetadata: ParsedNodeMetadata
  ): Promise<CategoryScore> {
    const details: ScoreDetail[] = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    // Validate background colors
    if (originalNode.fills && originalNode.fills.length > 0 && generatedMetadata.visualStyle?.backgrounds) {
      const originalFill = originalNode.fills[0];
      if (originalFill.type === 'SOLID' && originalFill.color) {
        const originalColor = this.figmaColorToHex(originalFill.color);
        const generatedBackground = generatedMetadata.visualStyle.backgrounds[0];
        
        const colorScore = this.compareColors(originalColor, generatedBackground, 'background-color');
        details.push(colorScore);
        totalScore += colorScore.score;
        maxPossibleScore += 100;
      }
    }

    // Validate text colors
    if (originalNode.type === 'TEXT' && originalNode.fills && generatedMetadata.advancedTypography?.color) {
      const textFill = originalNode.fills[0];
      if (textFill.type === 'SOLID' && textFill.color) {
        const originalTextColor = this.figmaColorToHex(textFill.color);
        const generatedTextColor = generatedMetadata.advancedTypography.color;
        
        const textColorScore = this.compareColors(originalTextColor, generatedTextColor, 'color');
        details.push(textColorScore);
        totalScore += textColorScore.score;
        maxPossibleScore += 100;
      }
    }

    // Validate border colors
    if (originalNode.strokes && originalNode.strokes.length > 0 && generatedMetadata.visualStyle?.borders) {
      const originalStroke = originalNode.strokes[0] as any;
      if (originalStroke.color) {
        const originalBorderColor = this.figmaColorToHex(originalStroke.color);
        const generatedBorder = generatedMetadata.visualStyle.borders[0];
        
        const borderColorScore = this.compareColors(originalBorderColor, generatedBorder, 'border-color');
        details.push(borderColorScore);
        totalScore += borderColorScore.score;
        maxPossibleScore += 100;
      }
    }

    const finalScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 100;

    return {
      score: Math.round(finalScore),
      maxScore: 100,
      weight: this.config.weights.colors,
      details
    };
  }

  /**
   * Validate spacing properties
   */
  private async validateSpacing(
    originalNode: FigmaNode,
    generatedMetadata: ParsedNodeMetadata
  ): Promise<CategoryScore> {
    const details: ScoreDetail[] = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    // Validate padding
    const paddingValues = [
      { name: 'padding-top', original: originalNode.paddingTop || 0 },
      { name: 'padding-right', original: originalNode.paddingRight || 0 },
      { name: 'padding-bottom', original: originalNode.paddingBottom || 0 },
      { name: 'padding-left', original: originalNode.paddingLeft || 0 }
    ];

    const generatedPadding = generatedMetadata.layoutSystem?.properties.padding;
    if (generatedPadding) {
      const paddingNumbers = this.parseCSSSpacing(generatedPadding);
      
      paddingValues.forEach((padding, index) => {
        if (padding.original > 0 || paddingNumbers[index] > 0) {
          const paddingScore = this.compareNumericValues(
            padding.original,
            paddingNumbers[index],
            this.config.tolerances.spacing,
            padding.name
          );
          details.push(paddingScore);
          totalScore += paddingScore.score;
          maxPossibleScore += 100;
        }
      });
    }

    // Validate gap/item spacing
    if (originalNode.itemSpacing && generatedMetadata.layoutSystem?.properties.gap) {
      const gapScore = this.compareNumericValues(
        originalNode.itemSpacing,
        this.parseCSSSpacing(generatedMetadata.layoutSystem.properties.gap)[0],
        this.config.tolerances.spacing,
        'gap'
      );
      details.push(gapScore);
      totalScore += gapScore.score;
      maxPossibleScore += 100;
    }

    const finalScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 100;

    return {
      score: Math.round(finalScore),
      maxScore: 100,
      weight: this.config.weights.spacing,
      details
    };
  }

  /**
   * Validate effects properties
   */
  private async validateEffects(
    originalNode: FigmaNode,
    generatedMetadata: ParsedNodeMetadata
  ): Promise<CategoryScore> {
    const details: ScoreDetail[] = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    if (originalNode.effects && originalNode.effects.length > 0 && generatedMetadata.visualStyle?.shadows) {
      const originalEffects = originalNode.effects.filter(e => e.visible !== false);
      const generatedShadows = generatedMetadata.visualStyle.shadows;
      
      const shadowCountScore: ScoreDetail = {
        property: 'shadow-count',
        expected: originalEffects.length,
        actual: generatedShadows.length,
        score: originalEffects.length === generatedShadows.length ? 100 : 50,
        impact: 'medium'
      };
      details.push(shadowCountScore);
      totalScore += shadowCountScore.score;
      maxPossibleScore += 100;

      // Validate first shadow in detail
      if (originalEffects.length > 0 && generatedShadows.length > 0) {
        const firstEffect = originalEffects[0];
        if (firstEffect.type === 'DROP_SHADOW') {
          const shadowScore: ScoreDetail = {
            property: 'box-shadow',
            expected: `${firstEffect.offset?.x || 0}px ${firstEffect.offset?.y || 0}px ${firstEffect.radius}px`,
            actual: generatedShadows[0],
            score: this.compareShadowValues(),
            impact: 'medium'
          };
          details.push(shadowScore);
          totalScore += shadowScore.score;
          maxPossibleScore += 100;
        }
      }
    }

    const finalScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 100;

    return {
      score: Math.round(finalScore),
      maxScore: 100,
      weight: this.config.weights.effects,
      details
    };
  }

  /**
   * Validate imagery properties
   */
  private async validateImagery(
    originalNode: FigmaNode,
    generatedMetadata: ParsedNodeMetadata
  ): Promise<CategoryScore> {
    const details: ScoreDetail[] = [];
    let totalScore = 100; // Default perfect score for non-image elements
    // let maxPossibleScore = 100;

    if (originalNode.fills) {
      const imageFills = originalNode.fills.filter(fill => fill.type === 'IMAGE');
      
      if (imageFills.length > 0) {
        const hasGeneratedImageBackground = generatedMetadata.visualStyle?.backgrounds.some(bg => 
          bg.includes('background-image') || bg.includes('url(')
        );
        
        const imageScore: ScoreDetail = {
          property: 'background-image',
          expected: 'image fill present',
          actual: hasGeneratedImageBackground ? 'image background generated' : 'no image background',
          score: hasGeneratedImageBackground ? 100 : 0,
          impact: 'high'
        };
        details.push(imageScore);
        totalScore = imageScore.score;
      }
    }

    return {
      score: Math.round(totalScore),
      maxScore: 100,
      weight: this.config.weights.imagery,
      details
    };
  }

  /**
   * Helper methods
   */
  private compareNumericValues(
    expected: number,
    actual: number | string,
    tolerance: number,
    property: string
  ): ScoreDetail {
    const actualNum = typeof actual === 'string' ? parseFloat(actual) : actual;
    const difference = Math.abs(expected - actualNum);
    const percentDifference = expected !== 0 ? (difference / expected) * 100 : 0;
    
    let score: number;
    if (difference <= tolerance) {
      score = 100;
    } else if (percentDifference <= 10) {
      score = 80;
    } else if (percentDifference <= 25) {
      score = 60;
    } else if (percentDifference <= 50) {
      score = 40;
    } else {
      score = 0;
    }

    return {
      property,
      expected,
      actual: actualNum,
      score,
      impact: difference <= tolerance ? 'low' : (percentDifference <= 25 ? 'medium' : 'high')
    };
  }

  private compareColors(expected: string, actual: string, property: string): ScoreDetail {
    // Simple color comparison - could be enhanced with color space calculations
    const normalizedExpected = expected.toLowerCase().replace(/\s/g, '');
    const normalizedActual = actual.toLowerCase().replace(/\s/g, '');
    
    const exactMatch = normalizedExpected === normalizedActual;
    const score = exactMatch ? 100 : this.calculateColorSimilarity();

    return {
      property,
      expected,
      actual,
      score,
      impact: score >= 80 ? 'low' : (score >= 60 ? 'medium' : 'high')
    };
  }

  private figmaColorToHex(color: any): string {
    const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  private calculateColorSimilarity(/* color1: string, color2: string */): number {
    // Simplified color similarity - could use Delta E for better accuracy
    return 50; // Placeholder
  }

  private compareShadowValues(/* figmaEffect: any, generatedShadow: string */): number {
    // Simplified shadow comparison
    return 75; // Placeholder
  }

  private parseCSSSpacing(spacing: string): number[] {
    const values = spacing.replace(/px/g, '').split(/\s+/).map(v => parseFloat(v) || 0);
    
    if (values.length === 1) return [values[0], values[0], values[0], values[0]];
    if (values.length === 2) return [values[0], values[1], values[0], values[1]];
    if (values.length === 3) return [values[0], values[1], values[2], values[1]];
    return values.slice(0, 4);
  }

  private collectIssues(categories: ValidationCategories): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    Object.entries(categories).forEach(([categoryName, category]) => {
      category.details.forEach((detail: any) => {
        if (detail.score < 80) {
          const severity: ValidationIssue['severity'] = 
            detail.score < 40 ? 'error' : (detail.score < 70 ? 'warning' : 'info');
          
          issues.push({
            category: categoryName as keyof ValidationCategories,
            severity,
            message: `${detail.property} mismatch detected`,
            property: detail.property,
            expected: detail.expected.toString(),
            actual: detail.actual.toString(),
            suggestion: this.generatePropertySuggestion(detail)
          });
        }
      });
    });

    return issues;
  }

  private generatePropertySuggestion(detail: ScoreDetail): string {
    if (detail.impact === 'high') {
      return `Critical: Update ${detail.property} from ${detail.actual} to ${detail.expected}`;
    } else if (detail.impact === 'medium') {
      return `Consider adjusting ${detail.property} for better accuracy`;
    }
    return `Minor difference in ${detail.property} can be ignored`;
  }

  private generateSuggestions(issues: ValidationIssue[]): string[] {
    const suggestions: string[] = [];
    
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;

    if (errorCount > 0) {
      suggestions.push(`Fix ${errorCount} critical issues for better visual fidelity`);
    }
    
    if (warningCount > 0) {
      suggestions.push(`Address ${warningCount} warnings to improve accuracy`);
    }

    if (errorCount === 0 && warningCount === 0) {
      suggestions.push('Excellent visual fidelity achieved!');
    }

    return suggestions;
  }

  private createVisualComparison(
    originalNode: FigmaNode,
    generatedCSS: string,
    generatedMetadata: ParsedNodeMetadata
  ): VisualComparison {
    const matchedProperties: string[] = [];
    const missingProperties: string[] = [];
    const extraProperties: string[] = [];

    // Basic comparison logic
    if (originalNode.fills?.length && generatedMetadata.visualStyle?.backgrounds.length) {
      matchedProperties.push('background');
    }

    const accuracy = matchedProperties.length > 0 ? 85 : 60; // Simplified calculation

    return {
      figmaReference: originalNode.id,
      generatedCSS,
      matchedProperties,
      missingProperties,
      extraProperties,
      accuracy
    };
  }

  private calculateOverallScore(categories: ValidationCategories): number {
    let weightedScore = 0;
    let totalWeight = 0;

    Object.values(categories).forEach(category => {
      weightedScore += category.score * category.weight;
      totalWeight += category.weight;
    });

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  }
}

export default VisualValidator;