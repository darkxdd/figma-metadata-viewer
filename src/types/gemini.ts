import type { FigmaNode } from './figma';

// Gemini API credentials
export interface GeminiCredentials {
  apiKey: string;
}

// Code generation request configuration
export interface CodeGenerationOptions {
  // Component generation options
  includeChildren?: boolean;
  generateInteractions?: boolean;
  optimizeForAccessibility?: boolean;
  generateResponsive?: boolean;
  prioritizeVisualFidelity?: boolean; // New option for exact visual replication
  
  // Styling options
  customCSS?: {
    framework?: 'tailwind' | 'bootstrap' | 'mui' | 'chakra' | 'styled-components';
    useModules?: boolean;
    useVariables?: boolean;
  };
  
  // Output preferences
  componentName?: string;
  exportType?: 'default' | 'named';
  includeTypeScript?: boolean;
  includeComments?: boolean;
  
  // Layout preferences
  responsiveBreakpoints?: string[];
  preferFlexbox?: boolean;
  preferGrid?: boolean;
}

// Code generation request
export interface CodeGenerationRequest {
  node: FigmaNode;
  options?: CodeGenerationOptions;
  includePrompt?: boolean;
}

// Generated code metadata
export interface CodeMetadata {
  nodeId: string;
  nodeName: string;
  generatedAt: string;
  prompt?: string;
  warnings?: string[];
}

// Successful code generation response
export interface SuccessfulCodeResponse {
  success: true;
  componentCode: string;
  cssCode: string;
  imports: string[];
  metadata: CodeMetadata;
  childComponents?: SuccessfulCodeResponse[];
}

// Failed code generation response
export interface FailedCodeResponse {
  success: false;
  error: ApiError;
}

// Union type for code generation response
export type CodeGenerationResponse = SuccessfulCodeResponse | FailedCodeResponse;

// Batch code generation for multiple nodes
export interface BatchCodeGenerationRequest {
  nodes: FigmaNode[];
  options?: CodeGenerationOptions;
  generateAsHierarchy?: boolean;
}

export interface BatchCodeGenerationResponse {
  success: boolean;
  responses: CodeGenerationResponse[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// Code preview and editing
export interface CodePreview {
  id: string;
  componentName: string;
  code: string;
  css: string;
  language: 'tsx' | 'jsx';
  isEdited?: boolean;
  originalCode?: string;
}

export interface CodeProject {
  id: string;
  name: string;
  description?: string;
  components: CodePreview[];
  createdAt: string;
  updatedAt: string;
}

// API error types (extending existing figma types)
export interface ApiError {
  message: string;
  status?: number;
  type: 'AUTHENTICATION' | 'NETWORK' | 'NOT_FOUND' | 'RATE_LIMIT' | 'SAFETY_FILTER' | 'UNKNOWN';
}

// Figma to CSS mapping types
export interface FigmaToCSS {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  typography: Record<string, CSSTextStyle>;
  effects: Record<string, CSSEffect>;
}

export interface CSSTextStyle {
  fontFamily: string;
  fontSize: string;
  fontWeight: number | string;
  lineHeight: string;
  letterSpacing?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
}

export interface CSSEffect {
  boxShadow?: string;
  filter?: string;
  backdropFilter?: string;
}

// Component props interfaces for the UI components
export interface CodeGeneratorProps {
  node: FigmaNode;
  credentials: {
    figma: {
      fileId: string;
      accessToken: string;
    };
    gemini: GeminiCredentials;
  };
  onCodeGenerated?: (response: CodeGenerationResponse) => void;
  onError?: (error: ApiError) => void;
}

export interface CodePreviewProps {
  preview: CodePreview;
  figmaNode?: FigmaNode;
  onEdit?: (code: string) => void;
  onDownload?: (preview: CodePreview) => void;
  onCopy?: (code: string) => void;
  readOnly?: boolean;
}

export interface CodeProjectProps {
  project: CodeProject;
  onUpdateProject?: (project: CodeProject) => void;
  onDeleteProject?: (projectId: string) => void;
  onExportProject?: (project: CodeProject) => void;
}

export interface GeminiConfigProps {
  onSave: (credentials: GeminiCredentials) => void;
  initialCredentials?: GeminiCredentials;
  loading?: boolean;
}

// Utility types for code generation
export type ComponentGenerationType = 'single' | 'hierarchy' | 'batch';

export interface GenerationStats {
  nodesProcessed: number;
  componentsGenerated: number;
  linesOfCode: number;
  cssRules: number;
  processingTime: number;
}

// Code quality metrics
export interface CodeQualityMetrics {
  accessibility: {
    score: number;
    issues: string[];
  };
  performance: {
    score: number;
    suggestions: string[];
  };
  maintainability: {
    score: number;
    complexity: number;
  };
}

// Export validation
export interface ExportValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Code formatting options
export interface CodeFormattingOptions {
  indentSize: 2 | 4;
  indentType: 'spaces' | 'tabs';
  semicolons: boolean;
  singleQuotes: boolean;
  trailingCommas: boolean;
  maxLineLength: number;
}