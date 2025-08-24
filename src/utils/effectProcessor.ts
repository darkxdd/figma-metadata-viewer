import type { Effect } from '../types/figma';
import { VisualStyleExtractor } from './visualStyleExtractor';

export interface ProcessedEffect {
  id: string;
  type: EffectType;
  visible: boolean;
  cssProperty: 'box-shadow' | 'filter' | 'backdrop-filter' | 'text-shadow';
  cssValue: string;
  parameters: EffectParameters;
}

export interface EffectParameters {
  // Shadow parameters
  offsetX?: number;
  offsetY?: number;
  blur?: number;
  spread?: number;
  color?: string;
  
  // Filter parameters
  blurRadius?: number;
  brightness?: number;
  contrast?: number;
  saturate?: number;
  hueRotate?: number;
  opacity?: number;
  
  // Blend mode parameters
  blendMode?: BlendMode;
}

export type EffectType = 
  | 'drop-shadow'
  | 'inner-shadow' 
  | 'layer-blur'
  | 'background-blur'
  | 'brightness'
  | 'contrast'
  | 'saturate'
  | 'hue-rotate'
  | 'opacity'
  | 'custom';

export type BlendMode = 
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'hard-light'
  | 'color-dodge'
  | 'color-burn'
  | 'darken'
  | 'lighten'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export interface EffectSystem {
  boxShadows: ProcessedEffect[];
  filters: ProcessedEffect[];
  backdropFilters: ProcessedEffect[];
  textShadows: ProcessedEffect[];
  blendMode?: BlendMode;
  cssDeclarations: string[];
}

export class EffectProcessor {
  /**
   * Process all effects from a Figma node
   */
  static processEffects(effects: Effect[], blendMode?: string): EffectSystem {
    const processedEffects = effects
      .filter(effect => effect.visible !== false)
      .map((effect, index) => this.processEffect(effect, index));

    const boxShadows = processedEffects.filter(e => e.cssProperty === 'box-shadow');
    const filters = processedEffects.filter(e => e.cssProperty === 'filter');
    const backdropFilters = processedEffects.filter(e => e.cssProperty === 'backdrop-filter');
    const textShadows = processedEffects.filter(e => e.cssProperty === 'text-shadow');

    const processedBlendMode = this.processBlendMode(blendMode);

    return {
      boxShadows,
      filters,
      backdropFilters,
      textShadows,
      blendMode: processedBlendMode,
      cssDeclarations: this.generateEffectCSS({
        boxShadows,
        filters,
        backdropFilters,
        textShadows,
        blendMode: processedBlendMode
      })
    };
  }

  /**
   * Process a single effect
   */
  private static processEffect(effect: Effect, index: number): ProcessedEffect {
    const id = `effect-${index}`;
    
    switch (effect.type) {
      case 'DROP_SHADOW':
        return this.processDropShadow(effect, id);
      
      case 'INNER_SHADOW':
        return this.processInnerShadow(effect, id);
      
      case 'LAYER_BLUR':
        return this.processLayerBlur(effect, id);
      
      case 'BACKGROUND_BLUR':
        return this.processBackgroundBlur(effect, id);
      
      default:
        return this.processCustomEffect(effect, id);
    }
  }

  /**
   * Process drop shadow effect
   */
  private static processDropShadow(effect: Effect, id: string): ProcessedEffect {
    const effectAny = effect as any;
    const offsetX = effectAny.offset?.x || 0;
    const offsetY = effectAny.offset?.y || 0;
    const blur = effectAny.radius || 0;
    const spread = effectAny.spread || 0;
    const color = effectAny.color 
      ? VisualStyleExtractor.colorToCSS(effectAny.color)
      : 'rgba(0, 0, 0, 0.25)';

    const cssValue = `${offsetX}px ${offsetY}px ${blur}px ${spread}px ${color}`;

    return {
      id,
      type: 'drop-shadow',
      visible: effect.visible !== false,
      cssProperty: 'box-shadow',
      cssValue,
      parameters: {
        offsetX,
        offsetY,
        blur,
        spread,
        color
      }
    };
  }

  /**
   * Process inner shadow effect
   */
  private static processInnerShadow(effect: Effect, id: string): ProcessedEffect {
    const effectAny = effect as any;
    const offsetX = effectAny.offset?.x || 0;
    const offsetY = effectAny.offset?.y || 0;
    const blur = effectAny.radius || 0;
    const spread = effectAny.spread || 0;
    const color = effectAny.color 
      ? VisualStyleExtractor.colorToCSS(effectAny.color)
      : 'rgba(0, 0, 0, 0.25)';

    const cssValue = `inset ${offsetX}px ${offsetY}px ${blur}px ${spread}px ${color}`;

    return {
      id,
      type: 'inner-shadow',
      visible: effect.visible !== false,
      cssProperty: 'box-shadow',
      cssValue,
      parameters: {
        offsetX,
        offsetY,
        blur,
        spread,
        color
      }
    };
  }

  /**
   * Process layer blur effect
   */
  private static processLayerBlur(effect: Effect, id: string): ProcessedEffect {
    const effectAny = effect as any;
    const blurRadius = effectAny.radius || 0;
    const cssValue = `blur(${blurRadius}px)`;

    return {
      id,
      type: 'layer-blur',
      visible: effect.visible !== false,
      cssProperty: 'filter',
      cssValue,
      parameters: {
        blurRadius
      }
    };
  }

  /**
   * Process background blur effect
   */
  private static processBackgroundBlur(effect: Effect, id: string): ProcessedEffect {
    const effectAny = effect as any;
    const blurRadius = effectAny.radius || 0;
    const cssValue = `blur(${blurRadius}px)`;

    return {
      id,
      type: 'background-blur',
      visible: effect.visible !== false,
      cssProperty: 'backdrop-filter',
      cssValue,
      parameters: {
        blurRadius
      }
    };
  }

  /**
   * Process custom or unknown effect
   */
  private static processCustomEffect(effect: Effect, id: string): ProcessedEffect {
    return {
      id,
      type: 'custom',
      visible: effect.visible !== false,
      cssProperty: 'filter',
      cssValue: `/* ${effect.type} effect */`,
      parameters: {}
    };
  }

  /**
   * Process blend mode
   */
  private static processBlendMode(blendMode?: string): BlendMode | undefined {
    if (!blendMode || blendMode === 'NORMAL') {
      return undefined;
    }

    const blendModeMap: Record<string, BlendMode> = {
      'MULTIPLY': 'multiply',
      'SCREEN': 'screen',
      'OVERLAY': 'overlay',
      'SOFT_LIGHT': 'soft-light',
      'HARD_LIGHT': 'hard-light',
      'COLOR_DODGE': 'color-dodge',
      'COLOR_BURN': 'color-burn',
      'DARKEN': 'darken',
      'LIGHTEN': 'lighten',
      'DIFFERENCE': 'difference',
      'EXCLUSION': 'exclusion',
      'HUE': 'hue',
      'SATURATION': 'saturation',
      'COLOR': 'color',
      'LUMINOSITY': 'luminosity'
    };

    return blendModeMap[blendMode] || 'normal';
  }

  /**
   * Generate CSS declarations from effect system
   */
  private static generateEffectCSS(effectSystem: Partial<EffectSystem>): string[] {
    const css: string[] = [];

    // Box shadows
    if (effectSystem.boxShadows && effectSystem.boxShadows.length > 0) {
      const shadowValues = effectSystem.boxShadows.map(shadow => shadow.cssValue);
      css.push(`box-shadow: ${shadowValues.join(', ')}`);
    }

    // Filters
    if (effectSystem.filters && effectSystem.filters.length > 0) {
      const filterValues = effectSystem.filters.map(filter => filter.cssValue);
      css.push(`filter: ${filterValues.join(' ')}`);
    }

    // Backdrop filters
    if (effectSystem.backdropFilters && effectSystem.backdropFilters.length > 0) {
      const backdropValues = effectSystem.backdropFilters.map(filter => filter.cssValue);
      css.push(`backdrop-filter: ${backdropValues.join(' ')}`);
    }

    // Text shadows
    if (effectSystem.textShadows && effectSystem.textShadows.length > 0) {
      const textShadowValues = effectSystem.textShadows.map(shadow => shadow.cssValue);
      css.push(`text-shadow: ${textShadowValues.join(', ')}`);
    }

    // Blend mode
    if (effectSystem.blendMode && effectSystem.blendMode !== 'normal') {
      css.push(`mix-blend-mode: ${effectSystem.blendMode}`);
    }

    return css;
  }

  /**
   * Create advanced shadow combinations
   */
  static createLayeredShadow(shadows: Effect[]): ProcessedEffect[] {
    return shadows
      .filter(effect => effect.visible !== false)
      .map((effect, index) => {
        if (effect.type === 'DROP_SHADOW') {
          return this.processDropShadow(effect, `layered-${index}`);
        } else if (effect.type === 'INNER_SHADOW') {
          return this.processInnerShadow(effect, `layered-${index}`);
        }
        return this.processCustomEffect(effect, `layered-${index}`);
      });
  }

  /**
   * Generate material design elevation shadows
   */
  static generateMaterialShadow(elevation: number): ProcessedEffect[] {
    const materialShadows: Record<number, { umbra: string; penumbra: string; ambient: string }> = {
      1: {
        umbra: '0px 2px 1px -1px rgba(0,0,0,0.2)',
        penumbra: '0px 1px 1px 0px rgba(0,0,0,0.14)',
        ambient: '0px 1px 3px 0px rgba(0,0,0,0.12)'
      },
      2: {
        umbra: '0px 3px 1px -2px rgba(0,0,0,0.2)',
        penumbra: '0px 2px 2px 0px rgba(0,0,0,0.14)',
        ambient: '0px 1px 5px 0px rgba(0,0,0,0.12)'
      },
      4: {
        umbra: '0px 2px 4px -1px rgba(0,0,0,0.2)',
        penumbra: '0px 4px 5px 0px rgba(0,0,0,0.14)',
        ambient: '0px 1px 10px 0px rgba(0,0,0,0.12)'
      },
      8: {
        umbra: '0px 5px 5px -3px rgba(0,0,0,0.2)',
        penumbra: '0px 8px 10px 1px rgba(0,0,0,0.14)',
        ambient: '0px 3px 14px 2px rgba(0,0,0,0.12)'
      },
      16: {
        umbra: '0px 8px 10px -5px rgba(0,0,0,0.2)',
        penumbra: '0px 16px 24px 2px rgba(0,0,0,0.14)',
        ambient: '0px 6px 30px 5px rgba(0,0,0,0.12)'
      }
    };

    const shadowSet = materialShadows[elevation] || materialShadows[1];
    
    return [
      {
        id: 'material-umbra',
        type: 'drop-shadow',
        visible: true,
        cssProperty: 'box-shadow',
        cssValue: shadowSet.umbra,
        parameters: {}
      },
      {
        id: 'material-penumbra',
        type: 'drop-shadow',
        visible: true,
        cssProperty: 'box-shadow',
        cssValue: shadowSet.penumbra,
        parameters: {}
      },
      {
        id: 'material-ambient',
        type: 'drop-shadow',
        visible: true,
        cssProperty: 'box-shadow',
        cssValue: shadowSet.ambient,
        parameters: {}
      }
    ];
  }

  /**
   * Generate CSS custom properties for effect tokens
   */
  static generateEffectTokens(effectSystem: EffectSystem, prefix: string = 'effect'): string[] {
    const tokens: string[] = [];

    if (effectSystem.boxShadows.length > 0) {
      const shadowValues = effectSystem.boxShadows.map(s => s.cssValue).join(', ');
      tokens.push(`--${prefix}-box-shadow: ${shadowValues};`);
    }

    if (effectSystem.filters.length > 0) {
      const filterValues = effectSystem.filters.map(f => f.cssValue).join(' ');
      tokens.push(`--${prefix}-filter: ${filterValues};`);
    }

    if (effectSystem.backdropFilters.length > 0) {
      const backdropValues = effectSystem.backdropFilters.map(f => f.cssValue).join(' ');
      tokens.push(`--${prefix}-backdrop-filter: ${backdropValues};`);
    }

    if (effectSystem.blendMode) {
      tokens.push(`--${prefix}-blend-mode: ${effectSystem.blendMode};`);
    }

    return tokens;
  }

  /**
   * Optimize effects for performance
   */
  static optimizeEffects(effectSystem: EffectSystem): EffectSystem {
    // Remove duplicate shadows
    const uniqueBoxShadows = this.removeDuplicateEffects(effectSystem.boxShadows);
    
    // Combine similar filters
    const optimizedFilters = this.combineFilters(effectSystem.filters);
    
    // Limit backdrop filters for better performance
    const limitedBackdropFilters = effectSystem.backdropFilters.slice(0, 3);

    return {
      ...effectSystem,
      boxShadows: uniqueBoxShadows,
      filters: optimizedFilters,
      backdropFilters: limitedBackdropFilters,
      cssDeclarations: this.generateEffectCSS({
        boxShadows: uniqueBoxShadows,
        filters: optimizedFilters,
        backdropFilters: limitedBackdropFilters,
        textShadows: effectSystem.textShadows,
        blendMode: effectSystem.blendMode
      })
    };
  }

  /**
   * Remove duplicate effects
   */
  private static removeDuplicateEffects(effects: ProcessedEffect[]): ProcessedEffect[] {
    const seen = new Set<string>();
    return effects.filter(effect => {
      if (seen.has(effect.cssValue)) {
        return false;
      }
      seen.add(effect.cssValue);
      return true;
    });
  }

  /**
   * Combine similar filters
   */
  private static combineFilters(filters: ProcessedEffect[]): ProcessedEffect[] {
    // Group filters by type and combine when possible
    const filterGroups: Record<string, ProcessedEffect[]> = {};
    
    filters.forEach(filter => {
      const type = filter.type;
      if (!filterGroups[type]) {
        filterGroups[type] = [];
      }
      filterGroups[type].push(filter);
    });

    // For now, just return the first of each type
    return Object.values(filterGroups).map(group => group[0]);
  }

  /**
   * Validate effect compatibility with browsers
   */
  static validateEffectCompatibility(effectSystem: EffectSystem): {
    compatible: ProcessedEffect[];
    incompatible: ProcessedEffect[];
    warnings: string[];
  } {
    const compatible: ProcessedEffect[] = [];
    const incompatible: ProcessedEffect[] = [];
    const warnings: string[] = [];

    const allEffects = [
      ...effectSystem.boxShadows,
      ...effectSystem.filters,
      ...effectSystem.backdropFilters,
      ...effectSystem.textShadows
    ];

    allEffects.forEach(effect => {
      if (this.isEffectSupported(effect)) {
        compatible.push(effect);
      } else {
        incompatible.push(effect);
        warnings.push(`Effect ${effect.type} may not be supported in older browsers`);
      }
    });

    return { compatible, incompatible, warnings };
  }

  /**
   * Check if effect is widely supported
   */
  private static isEffectSupported(effect: ProcessedEffect): boolean {
    // Define effects with limited browser support
    const limitedSupport = ['backdrop-filter', 'mix-blend-mode'];
    
    return !limitedSupport.some(prop => 
      effect.cssProperty.includes(prop) || effect.cssValue.includes(prop)
    );
  }
}

export default EffectProcessor;