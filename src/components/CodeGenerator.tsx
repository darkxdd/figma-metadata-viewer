import React, { useState, useCallback } from 'react';
import type { 
  CodeGeneratorProps, 
  CodeGenerationResponse, 
  CodeGenerationOptions,
  GeminiCredentials 
} from '../types/gemini';
import { generateReactCode } from '../services/geminiApi';
import { MetadataParser } from '../utils/metadataParser';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import './CodeGenerator.css';

interface CodeGeneratorState {
  loading: boolean;
  error: string | null;
  generatedCode: CodeGenerationResponse | null;
  geminiCredentials: GeminiCredentials | null;
  options: CodeGenerationOptions;
  showAdvancedOptions: boolean;
}

const CodeGenerator: React.FC<CodeGeneratorProps> = ({
  node,
  onCodeGenerated,
  onError,
}) => {
  const [state, setState] = useState<CodeGeneratorState>({
    loading: false,
    error: null,
    generatedCode: null,
    geminiCredentials: null,
    options: {
      includeChildren: true,
      generateInteractions: false,
      optimizeForAccessibility: true,
      includeTypeScript: true,
      includeComments: true,
      exportType: 'default',
      customCSS: {
        useModules: false,
        useVariables: true,
      },
    },
    showAdvancedOptions: false,
  });

  const handleGenerateCode = useCallback(async () => {
    if (!state.geminiCredentials) {
      setState(prev => ({ ...prev, error: 'Please provide Gemini API credentials' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Create AI-optimized metadata that includes only visually relevant properties
      const optimizedNode = MetadataParser.createAIOptimizedMetadata(node);
      
      // Create the request with optimized data
      const request = {
        node: optimizedNode,
        options: {
          ...state.options,
          // Emphasize visual fidelity over UI conventions
          prioritizeVisualFidelity: true,
        },
        includePrompt: true,
      };

      // Generate code using Gemini API
      const response = await generateReactCode(state.geminiCredentials, request);
      
      setState(prev => ({ ...prev, generatedCode: response, loading: false }));
      
      if (response.success) {
        onCodeGenerated?.(response);
      } else {
        onError?.(response.error);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to generate React code';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      onError?.({ message: errorMessage, type: 'UNKNOWN' });
    }
  }, [node, state.geminiCredentials, state.options, onCodeGenerated, onError]);

  const handleApiKeyChange = useCallback((apiKey: string) => {
    setState(prev => ({ 
      ...prev, 
      geminiCredentials: apiKey ? { apiKey } : null,
      error: null 
    }));
  }, []);

  const handleOptionChange = useCallback((key: keyof CodeGenerationOptions, value: any) => {
    setState(prev => ({
      ...prev,
      options: { ...prev.options, [key]: value },
    }));
  }, []);

  const handleCustomCSSChange = useCallback((key: string, value: any) => {
    setState(prev => ({
      ...prev,
      options: {
        ...prev.options,
        customCSS: { ...prev.options.customCSS, [key]: value },
      },
    }));
  }, []);

  const toggleAdvancedOptions = useCallback(() => {
    setState(prev => ({ ...prev, showAdvancedOptions: !prev.showAdvancedOptions }));
  }, []);

  const resetGeneration = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      generatedCode: null, 
      error: null 
    }));
  }, []);

  return (
    <div className="code-generator">
      <div className="code-generator-header">
        <h3>Generate React Component</h3>
        <p>Convert "{node.name}" to React code using AI</p>
      </div>

      {/* Gemini API Configuration */}
      <div className="api-config">
        <h4>Gemini API Configuration</h4>
        <div className="input-group">
          <label htmlFor="gemini-api-key">API Key</label>
          <input
            id="gemini-api-key"
            type="password"
            placeholder="Enter your Gemini API key"
            onChange={(e) => handleApiKeyChange(e.target.value)}
            disabled={state.loading}
          />
          <p className="help-text">
            Get your API key from{' '}
            <a 
              href="https://makersuite.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Google AI Studio
            </a>
          </p>
        </div>
      </div>

      {/* Generation Options */}
      <div className="generation-options">
        <h4>Generation Options</h4>
        
        <div className="options-grid">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={state.options.includeChildren}
              onChange={(e) => handleOptionChange('includeChildren', e.target.checked)}
              disabled={state.loading}
            />
            Include child components
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={state.options.generateInteractions}
              onChange={(e) => handleOptionChange('generateInteractions', e.target.checked)}
              disabled={state.loading}
            />
            Add interaction handlers
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={state.options.optimizeForAccessibility}
              onChange={(e) => handleOptionChange('optimizeForAccessibility', e.target.checked)}
              disabled={state.loading}
            />
            Optimize for accessibility
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={state.options.includeTypeScript}
              onChange={(e) => handleOptionChange('includeTypeScript', e.target.checked)}
              disabled={state.loading}
            />
            Include TypeScript types
          </label>
        </div>

        {/* Advanced Options */}
        <button 
          className="toggle-advanced"
          onClick={toggleAdvancedOptions}
          type="button"
        >
          {state.showAdvancedOptions ? '▼' : '▶'} Advanced Options
        </button>

        {state.showAdvancedOptions && (
          <div className="advanced-options">
            <div className="option-group">
              <label>Export Type</label>
              <select
                value={state.options.exportType}
                onChange={(e) => handleOptionChange('exportType', e.target.value)}
                disabled={state.loading}
              >
                <option value="default">Default Export</option>
                <option value="named">Named Export</option>
              </select>
            </div>

            <div className="option-group">
              <label>CSS Framework</label>
              <select
                value={state.options.customCSS?.framework || ''}
                onChange={(e) => handleCustomCSSChange('framework', e.target.value || undefined)}
                disabled={state.loading}
              >
                <option value="">None (Vanilla CSS)</option>
                <option value="tailwind">Tailwind CSS</option>
                <option value="bootstrap">Bootstrap</option>
                <option value="mui">Material-UI</option>
                <option value="chakra">Chakra UI</option>
                <option value="styled-components">Styled Components</option>
              </select>
            </div>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={state.options.customCSS?.useModules}
                onChange={(e) => handleCustomCSSChange('useModules', e.target.checked)}
                disabled={state.loading}
              />
              Use CSS Modules
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={state.options.customCSS?.useVariables}
                onChange={(e) => handleCustomCSSChange('useVariables', e.target.checked)}
                disabled={state.loading}
              />
              Generate CSS Variables
            </label>
          </div>
        )}
      </div>

      {/* Node Information */}
      <div className="node-info">
        <h4>Node Information</h4>
        <div className="node-details">
          <p><strong>Name:</strong> {node.name}</p>
          <p><strong>Type:</strong> {node.type}</p>
          {node.absoluteBoundingBox && (
            <p>
              <strong>Dimensions:</strong> {Math.round(node.absoluteBoundingBox.width)}×{Math.round(node.absoluteBoundingBox.height)}px
            </p>
          )}
          {node.children && (
            <p><strong>Children:</strong> {node.children.length}</p>
          )}
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <ErrorMessage
          error={state.error}
          onDismiss={() => setState(prev => ({ ...prev, error: null }))}
        />
      )}

      {/* Generate Button */}
      <div className="generate-section">
        <button
          className="generate-button primary"
          onClick={handleGenerateCode}
          disabled={!state.geminiCredentials || state.loading}
        >
          {state.loading ? (
            <>
              <LoadingSpinner size="small" />
              Generating...
            </>
          ) : (
            'Generate React Component'
          )}
        </button>

        {state.generatedCode && (
          <button
            className="reset-button secondary"
            onClick={resetGeneration}
            disabled={state.loading}
          >
            Generate Again
          </button>
        )}
      </div>

      {/* Loading Spinner */}
      {state.loading && (
        <LoadingSpinner
          overlay={true}
          message="Analyzing Figma design and generating React code..."
          size="large"
        />
      )}
    </div>
  );
};

export default CodeGenerator;