import { GoogleGenerativeAI } from '@google/generative-ai';
import type { 
  GeminiCredentials, 
  CodeGenerationRequest, 
  CodeGenerationResponse,
  ApiError 
} from '../types/gemini';
import type { FigmaNode } from '../types/figma';

export class GeminiApiService {
  private static genAI: GoogleGenerativeAI | null = null;

  private static initializeAPI(apiKey: string): GoogleGenerativeAI {
    if (!this.genAI) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    return this.genAI;
  }

  private static createApiError(message: string, type: ApiError['type'] = 'UNKNOWN'): ApiError {
    return { message, type };
  }

  /**
   * Generate React component code from Figma node metadata
   */
  public static async generateReactCode(
    credentials: GeminiCredentials,
    request: CodeGenerationRequest
  ): Promise<CodeGenerationResponse> {
    try {
      const genAI = this.initializeAPI(credentials.apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = this.createPrompt(request);
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const generatedCode = response.text();

      // Parse and validate the generated code
      const parsedResponse = this.parseGeneratedCode(generatedCode);
      
      return {
        success: true,
        componentCode: parsedResponse.componentCode,
        cssCode: parsedResponse.cssCode,
        imports: parsedResponse.imports,
        metadata: {
          nodeId: request.node.id,
          nodeName: request.node.name,
          generatedAt: new Date().toISOString(),
          prompt: request.includePrompt ? prompt : undefined,
        },
      };
    } catch (error: any) {
      console.error('Gemini API error:', error);
      
      let errorType: ApiError['type'] = 'UNKNOWN';
      let errorMessage = 'Failed to generate React code';

      if (error.message?.includes('API_KEY')) {
        errorType = 'AUTHENTICATION';
        errorMessage = 'Invalid Gemini API key. Please check your credentials.';
      } else if (error.message?.includes('QUOTA')) {
        errorType = 'RATE_LIMIT';
        errorMessage = 'Gemini API quota exceeded. Please try again later.';
      } else if (error.message?.includes('SAFETY')) {
        errorType = 'SAFETY_FILTER';
        errorMessage = 'Content was blocked by Gemini safety filters.';
      } else if (error.name === 'NetworkError') {
        errorType = 'NETWORK';
        errorMessage = 'Network error. Please check your internet connection.';
      }

      return {
        success: false,
        error: this.createApiError(errorMessage, errorType),
      };
    }
  }

  /**
   * Create optimized prompt for React code generation with exact visual fidelity
   */
  private static createPrompt(request: CodeGenerationRequest): string {
    const { node, options } = request;
    
    let basePrompt = `You are an expert React developer specialized in creating pixel-perfect replicas of Figma designs.

Your primary goal is to generate a React component that is an EXACT visual replica of the provided Figma design. The output should match the original design with 90-95% visual fidelity.

## Critical Requirements:
- NO additional headers, navigation, or project-specific UI elements
- NO wrapper components unless they exist in the original design
- NO "Generated Components" text or similar labels
- Create ONLY what exists in the Figma design - nothing more, nothing less
- Focus on exact visual reproduction, not user interface conventions

## Figma Node Data:
${JSON.stringify(node, null, 2)}

## Visual Fidelity Guidelines:
1. **Layout Precision**: Match exact positioning, spacing, and dimensions
2. **Color Accuracy**: Convert Figma RGBA values precisely to CSS
3. **Typography Matching**: Exact font families, sizes, weights, and line heights
4. **Visual Effects**: Accurate shadows, blur, border radius, and opacity
5. **Responsive Behavior**: Maintain design proportions and layout
6. **Semantic Structure**: Use appropriate HTML elements for the content

## Technical Implementation:
- Convert Figma auto-layout to CSS Flexbox/Grid with exact properties
- Map all Figma visual properties (fills, strokes, effects) to CSS
- Handle corner radius, padding, margins, and spacing precisely
- Convert text styles including character spacing and line height
- Generate semantic HTML that reflects the content structure
- Use CSS custom properties for consistent values
- Ensure accessibility without compromising visual accuracy

## Output Format:
Provide your response in this exact JSON format:
\`\`\`json
{
  "componentCode": "// Complete React component code",
  "cssCode": "/* Complete CSS styles */",
  "imports": ["array of import statements"],
  "explanation": "Brief explanation focusing on visual fidelity decisions"
}
\`\`\``;

    if (options?.includeChildren && node.children?.length) {
      basePrompt += `
- Render child elements: Include all visual child elements as they appear in the design
- Maintain exact hierarchy and nesting structure from Figma`;
    }

    if (options?.generateInteractions) {
      basePrompt += `
- Add interaction handlers only if they enhance visual fidelity
- Avoid unnecessary interactive states that aren't in the design`;
    }

    if (options?.optimizeForAccessibility) {
      basePrompt += `
- Include ARIA attributes without affecting visual appearance
- Use semantic HTML while maintaining exact visual layout
- Ensure screen reader compatibility without compromising design`;
    }

    if (options?.customCSS?.framework) {
      basePrompt += `
- Use ${options.customCSS.framework} classes only when they achieve exact visual match
- Prefer custom CSS over framework classes for precision`;
    }

    return basePrompt + `

**CRITICAL**: Generate a component that visually replicates the Figma design exactly. No additional UI elements, headers, or project-specific components should be added.`;
  }

  /**
   * Parse and validate the generated code response
   */
  private static parseGeneratedCode(rawResponse: string): {
    componentCode: string;
    cssCode: string;
    imports: string[];
    explanation?: string;
  } {
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = rawResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          componentCode: parsed.componentCode || '',
          cssCode: parsed.cssCode || '',
          imports: Array.isArray(parsed.imports) ? parsed.imports : [],
          explanation: parsed.explanation,
        };
      }

      // Fallback: try to extract code blocks directly
      const componentMatch = rawResponse.match(/```(?:tsx?|jsx?)\s*([\s\S]*?)\s*```/);
      const cssMatch = rawResponse.match(/```css\s*([\s\S]*?)\s*```/);

      return {
        componentCode: componentMatch ? componentMatch[1] : rawResponse,
        cssCode: cssMatch ? cssMatch[1] : '',
        imports: ['import React from "react";'],
      };
    } catch (error) {
      console.error('Failed to parse generated code:', error);
      
      // Return raw response as fallback
      return {
        componentCode: rawResponse,
        cssCode: '',
        imports: ['import React from "react";'],
      };
    }
  }

  /**
   * Generate multiple components from a Figma node hierarchy
   */
  public static async generateComponentHierarchy(
    credentials: GeminiCredentials,
    rootNode: FigmaNode,
    options: CodeGenerationRequest['options'] = {}
  ): Promise<CodeGenerationResponse[]> {
    const responses: CodeGenerationResponse[] = [];
    
    // Generate main component
    const mainRequest: CodeGenerationRequest = {
      node: rootNode,
      options: { ...options, includeChildren: false },
    };
    
    const mainResponse = await this.generateReactCode(credentials, mainRequest);
    responses.push(mainResponse);

    // Generate child components if requested
    if (options.includeChildren && rootNode.children?.length) {
      for (const child of rootNode.children) {
        if (this.shouldGenerateComponentForNode(child)) {
          const childRequest: CodeGenerationRequest = {
            node: child,
            options: { ...options, includeChildren: false },
          };
          
          const childResponse = await this.generateReactCode(credentials, childRequest);
          responses.push(childResponse);
        }
      }
    }

    return responses;
  }

  /**
   * Determine if a node should have its own component
   */
  private static shouldGenerateComponentForNode(node: FigmaNode): boolean {
    // Generate components for complex nodes or components
    const complexTypes = ['COMPONENT', 'INSTANCE', 'FRAME', 'GROUP'];
    const hasChildren = node.children && node.children.length > 0;
    const isComplex = complexTypes.includes(node.type) || hasChildren;
    const isVisible = node.visible === undefined || node.visible !== false;
    
    return Boolean(isComplex && isVisible);
  }
}

// Convenience functions
export const generateReactCode = (
  credentials: GeminiCredentials,
  request: CodeGenerationRequest
): Promise<CodeGenerationResponse> => {
  return GeminiApiService.generateReactCode(credentials, request);
};

export const generateComponentHierarchy = (
  credentials: GeminiCredentials,
  rootNode: FigmaNode,
  options?: CodeGenerationRequest['options']
): Promise<CodeGenerationResponse[]> => {
  return GeminiApiService.generateComponentHierarchy(credentials, rootNode, options);
};

export default GeminiApiService;