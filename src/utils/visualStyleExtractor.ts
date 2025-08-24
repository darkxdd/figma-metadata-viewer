import type { Color, Fill, Effect, Stroke } from '../types/figma';

export interface ProcessedGradient {
  type: 'linear' | 'radial' | 'angular' | 'diamond';
  angle?: number;
  stops: GradientStop[];
  cssValue: string;
}

export interface GradientStop {
  position: number;
  color: string;
  opacity?: number;
}

export interface ProcessedShadow {
  type: 'drop' | 'inner' | 'layer-blur' | 'background-blur';
  x: number;
  y: number;
  blur: number;
  spread?: number;
  color: string;
  cssValue: string;
}

export interface VisualStyle {
  backgrounds: string[];
  borders: string[];
  shadows: string[];
  filters: string[];
  opacity?: number;
  blendMode?: string;
}

export class VisualStyleExtractor {
  /**
   * Convert Figma color to CSS color with high precision
   */
  static colorToCSS(color: Color, includeAlpha: boolean = true): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = color.a ?? 1;

    if (!includeAlpha || a === 1) {
      return `rgb(${r}, ${g}, ${b})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  /**
   * Convert Figma color to HEX format
   */
  static colorToHex(color: Color): string {
    const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
    
    if (color.a && color.a < 1) {
      const a = Math.round(color.a * 255).toString(16).padStart(2, '0');
      return `#${r}${g}${b}${a}`;
    }
    
    return `#${r}${g}${b}`;
  }

  /**
   * Convert Figma color to HSL format
   */
  static colorToHSL(color: Color): string {
    const r = color.r;
    const g = color.g;
    const b = color.b;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;
    
    const l = sum / 2;
    
    let s = 0;
    if (diff !== 0) {
      s = l > 0.5 ? diff / (2 - sum) : diff / sum;
    }
    
    let h = 0;
    if (diff !== 0) {
      switch (max) {
        case r:
          h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / diff + 2) / 6;
          break;
        case b:
          h = ((r - g) / diff + 4) / 6;
          break;
      }
    }
    
    const hDeg = Math.round(h * 360);
    const sPercent = Math.round(s * 100);
    const lPercent = Math.round(l * 100);
    
    if (color.a && color.a < 1) {
      return `hsla(${hDeg}, ${sPercent}%, ${lPercent}%, ${color.a})`;
    }
    
    return `hsl(${hDeg}, ${sPercent}%, ${lPercent}%)`;
  }

  /**
   * Process gradient fills into CSS-compatible gradients
   */
  static processGradient(fill: Fill): ProcessedGradient | null {
    if (fill.type !== 'GRADIENT_LINEAR' && fill.type !== 'GRADIENT_RADIAL' && 
        fill.type !== 'GRADIENT_ANGULAR' && fill.type !== 'GRADIENT_DIAMOND') {
      return null;
    }

    const fillAny = fill as any;
    if (!fillAny.gradientStops || !fillAny.gradientTransform) {
      return null;
    }

    // Process gradient stops
    const stops: GradientStop[] = fillAny.gradientStops.map((stop: any) => ({
      position: stop.position,
      color: this.colorToCSS(stop.color),
      opacity: stop.color.a
    }));

    // Calculate gradient angle/direction from transform matrix
    const transform = fillAny.gradientTransform;
    let cssValue = '';
    
    switch (fill.type) {
      case 'GRADIENT_LINEAR': {
        const angle = this.calculateLinearGradientAngle(transform);
        const stopsCSS = stops.map(stop => 
          `${stop.color} ${Math.round(stop.position * 100)}%`
        ).join(', ');
        
        cssValue = `linear-gradient(${angle}deg, ${stopsCSS})`;
        
        return {
          type: 'linear',
          angle,
          stops,
          cssValue
        };
      }

      case 'GRADIENT_RADIAL': {
        const stopsCSS = stops.map(stop => 
          `${stop.color} ${Math.round(stop.position * 100)}%`
        ).join(', ');
        
        cssValue = `radial-gradient(circle, ${stopsCSS})`;
        
        return {
          type: 'radial',
          stops,
          cssValue
        };
      }

      case 'GRADIENT_ANGULAR': {
        // Convert angular gradient to conic-gradient
        const stopsCSS = stops.map(stop => 
          `${stop.color} ${Math.round(stop.position * 360)}deg`
        ).join(', ');
        
        cssValue = `conic-gradient(${stopsCSS})`;
        
        return {
          type: 'angular',
          stops,
          cssValue
        };
      }

      default:
        return null;
    }
  }

  /**
   * Calculate linear gradient angle from transform matrix
   */
  private static calculateLinearGradientAngle(transform: number[][]): number {
    if (transform.length < 2 || transform[0].length < 2) {
      return 0;
    }

    // Extract direction vector from transform matrix
    const dx = transform[0][0];
    const dy = transform[1][0];
    
    // Calculate angle in degrees
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // Normalize angle to 0-360 range
    if (angle < 0) {
      angle += 360;
    }
    
    // Convert to CSS gradient angle (0deg = top, 90deg = right)
    angle = (90 - angle + 360) % 360;
    
    return Math.round(angle);
  }

  /**
   * Process multiple fills into CSS background declarations
   */
  static processFills(fills: Fill[]): VisualStyle['backgrounds'] {
    if (!fills || fills.length === 0) {
      return [];
    }

    const backgrounds: string[] = [];
    
    // Process fills in reverse order (Figma stacks from bottom to top)
    const visibleFills = fills.filter(fill => fill.visible !== false);
    
    for (const fill of visibleFills) {
      switch (fill.type) {
        case 'SOLID':
          if (fill.color) {
            backgrounds.push(`background-color: ${this.colorToCSS(fill.color)}`);
          }
          break;

        case 'GRADIENT_LINEAR':
        case 'GRADIENT_RADIAL':
        case 'GRADIENT_ANGULAR':
        case 'GRADIENT_DIAMOND':
          const gradient = this.processGradient(fill);
          if (gradient) {
            backgrounds.push(`background: ${gradient.cssValue}`);
          }
          break;

        case 'IMAGE':
          if (fill.imageRef) {
            const scaleMode = this.getImageScaleMode(fill.scaleMode);
            backgrounds.push(`background-image: url('figma://image/${fill.imageRef}')`);
            backgrounds.push(`background-size: ${scaleMode}`);
            backgrounds.push(`background-repeat: no-repeat`);
            backgrounds.push(`background-position: center`);
          }
          break;

        default:
          // Handle other fill types with comments
          backgrounds.push(`/* ${fill.type} fill not fully supported */`);
      }

      // Add opacity if needed
      if (fill.opacity && fill.opacity < 1) {
        backgrounds.push(`opacity: ${fill.opacity}`);
      }
    }

    return backgrounds;
  }

  /**
   * Convert Figma image scale mode to CSS background-size
   */
  private static getImageScaleMode(scaleMode?: string): string {
    switch (scaleMode) {
      case 'FILL':
        return 'cover';
      case 'FIT':
        return 'contain';
      case 'CROP':
        return 'cover';
      case 'TILE':
        return 'auto';
      default:
        return 'cover';
    }
  }

  /**
   * Process strokes into CSS border declarations
   */
  static processStrokes(strokes: Stroke[], strokeWeight?: number): VisualStyle['borders'] {
    if (!strokes || strokes.length === 0) {
      return [];
    }

    const borders: string[] = [];
    const visibleStrokes = strokes.filter(stroke => stroke.visible !== false);
    
    // For now, handle only the first stroke (CSS limitation)
    const primaryStroke = visibleStrokes[0];
    if (!primaryStroke) {
      return [];
    }

    const weight = strokeWeight || 1;
    
    switch (primaryStroke.type) {
      case 'SOLID':
        if ((primaryStroke as any).color) {
          const color = this.colorToCSS((primaryStroke as any).color);
          borders.push(`border: ${weight}px solid ${color}`);
        }
        break;

      case 'GRADIENT_LINEAR':
      case 'GRADIENT_RADIAL':
        // Use border-image for gradient borders
        const gradient = this.processGradient(primaryStroke as any);
        if (gradient) {
          borders.push(`border: ${weight}px solid transparent`);
          borders.push(`border-image: ${gradient.cssValue} 1`);
        }
        break;

      default:
        borders.push(`/* ${primaryStroke.type} stroke */`);
        borders.push(`border-width: ${weight}px`);
    }

    return borders;
  }

  /**
   * Process effects into CSS shadow and filter declarations
   */
  static processEffects(effects: Effect[]): { shadows: string[], filters: string[] } {
    if (!effects || effects.length === 0) {
      return { shadows: [], filters: [] };
    }

    const shadows: string[] = [];
    const filters: string[] = [];
    const visibleEffects = effects.filter(effect => effect.visible !== false);

    for (const effect of visibleEffects) {
      const processed = this.processSingleEffect(effect);
      if (processed) {
        if (processed.type === 'drop' || processed.type === 'inner') {
          shadows.push(processed.cssValue);
        } else {
          filters.push(processed.cssValue);
        }
      }
    }

    return { shadows, filters };
  }

  /**
   * Process a single effect
   */
  private static processSingleEffect(effect: Effect): ProcessedShadow | null {
    const effectAny = effect as any;
    const x = effectAny.offset?.x || 0;
    const y = effectAny.offset?.y || 0;
    const blur = effectAny.radius || 0;
    const spread = effectAny.spread || 0;
    const color = effectAny.color ? this.colorToCSS(effectAny.color) : 'rgba(0, 0, 0, 0.25)';

    switch (effect.type) {
      case 'DROP_SHADOW':
        return {
          type: 'drop',
          x,
          y,
          blur,
          spread,
          color,
          cssValue: `${x}px ${y}px ${blur}px ${spread}px ${color}`
        };

      case 'INNER_SHADOW':
        return {
          type: 'inner',
          x,
          y,
          blur,
          spread,
          color,
          cssValue: `inset ${x}px ${y}px ${blur}px ${spread}px ${color}`
        };

      case 'LAYER_BLUR':
        return {
          type: 'layer-blur',
          x: 0,
          y: 0,
          blur,
          color: 'transparent',
          cssValue: `blur(${blur}px)`
        };

      case 'BACKGROUND_BLUR':
        return {
          type: 'background-blur',
          x: 0,
          y: 0,
          blur,
          color: 'transparent',
          cssValue: `blur(${blur}px)`
        };

      default:
        return null;
    }
  }

  /**
   * Generate comprehensive visual styles from Figma node
   */
  static extractVisualStyles(node: any): VisualStyle {
    const backgrounds = this.processFills(node.fills || []);
    const borders = this.processStrokes(node.strokes || [], node.strokeWeight);
    const effects = this.processEffects(node.effects || []);

    return {
      backgrounds,
      borders,
      shadows: effects.shadows,
      filters: effects.filters,
      opacity: node.opacity,
      blendMode: node.blendMode
    };
  }

  /**
   * Generate CSS from visual styles
   */
  static generateCSSFromVisualStyles(styles: VisualStyle): string[] {
    const css: string[] = [];

    // Add backgrounds
    styles.backgrounds.forEach(bg => css.push(bg));

    // Add borders
    styles.borders.forEach(border => css.push(border));

    // Add shadows
    if (styles.shadows.length > 0) {
      css.push(`box-shadow: ${styles.shadows.join(', ')}`);
    }

    // Add filters
    if (styles.filters.length > 0) {
      css.push(`filter: ${styles.filters.join(' ')}`);
    }

    // Add opacity
    if (styles.opacity !== undefined && styles.opacity < 1) {
      css.push(`opacity: ${styles.opacity}`);
    }

    // Add blend mode
    if (styles.blendMode && styles.blendMode !== 'NORMAL') {
      const blendMode = styles.blendMode.toLowerCase().replace('_', '-');
      css.push(`mix-blend-mode: ${blendMode}`);
    }

    return css;
  }
}

export default VisualStyleExtractor;