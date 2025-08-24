import React, { useState, useCallback, useMemo } from 'react';
import type { FigmaNode } from '../types/figma';
import type { SimplifiedNode, GlobalVars } from '../extractors/types';

import type { DesignTokens, DesignToken } from '../utils/globalVariables';
import { EnhancedCodeGenerator } from '../utils/enhancedCodeGenerator';
// import { EnhancedMetadataParser } from '../utils/enhancedMetadataParser';
import { GlobalVariableManager } from '../utils/globalVariables';
import './EnhancedCodePreview.css';

interface EnhancedCodePreviewProps {
  node: SimplifiedNode;
  globalVars: GlobalVars;
  designTokens?: DesignTokens;
  onEdit?: (code: string) => void;
  onCopy?: (content: string) => void;
  readOnly?: boolean;
  figmaNode?: FigmaNode;
  showMetrics?: boolean;
}

interface EnhancedCodePreviewState {
  activeTab: 'component' | 'css' | 'variables' | 'tokens' | 'preview' | 'metrics';
  isEditing: boolean;
  editedCode: string;
  editedCSS: string;
  copyFeedback: string | null;
  previewMode: 'component' | 'responsive' | 'fullscreen';
  selectedBreakpoint: 'mobile' | 'tablet' | 'desktop';
  showGlobalVariables: boolean;
  showDesignTokens: boolean;
  showExtractionMetrics: boolean;
  filterTokenType: 'all' | 'colors' | 'typography' | 'layout' | 'effects' | 'spacing';
  searchQuery: string;
}

const EnhancedCodePreview: React.FC<EnhancedCodePreviewProps> = ({
  node,
  globalVars,
  designTokens,
  onEdit,
  onCopy,
  readOnly = false,
  // figmaNode,
  showMetrics = true,
}) => {
  const [state, setState] = useState<EnhancedCodePreviewState>({
    activeTab: 'component',
    isEditing: false,
    editedCode: '',
    editedCSS: '',
    copyFeedback: null,
    previewMode: 'component',
    selectedBreakpoint: 'desktop',
    showGlobalVariables: true,
    showDesignTokens: true,
    showExtractionMetrics: false,
    filterTokenType: 'all',
    searchQuery: '',
  });

  // Initialize enhanced code generator with global variables and design tokens
  const codeGenerator = useMemo(() => {
    return new EnhancedCodeGenerator(globalVars, designTokens);
  }, [globalVars, designTokens]);

  // Generate enhanced component with AI-optimized features
  const generatedComponent = useMemo(() => {
    const component = codeGenerator.generateEnhancedComponent(node, {
      includeTypeScript: true,
      optimizeForAccessibility: true,
      useGlobalVariables: true,
      generateDesignTokens: true,
      optimizeCSS: true,
      includeCSSTDocumentation: true,
    });

    setState(prev => ({
      ...prev,
      editedCode: component.code,
      editedCSS: component.css,
    }));

    return component;
  }, [node, codeGenerator]);

  // Enhanced metadata parser for additional insights
  // const metadataParser = useMemo(() => {
  //   return new EnhancedMetadataParser();
  // }, []);

  // Global variable manager for statistics and analysis
  const globalVarManager = useMemo(() => {
    return new GlobalVariableManager(globalVars);
  }, [globalVars]);

  // CSS custom properties from global variables
  const cssCustomProperties = useMemo(() => {
    return globalVarManager.generateCSSCustomProperties();
  }, [globalVarManager]);

  // Filter design tokens based on type and search
  const filteredDesignTokens = useMemo(() => {
    if (!designTokens) return [];
    
    let tokens: DesignToken[] = [];
    
    switch (state.filterTokenType) {
      case 'colors':
        tokens = designTokens.colors;
        break;
      case 'typography':
        tokens = designTokens.typography;
        break;
      case 'layout':
        tokens = designTokens.layout;
        break;
      case 'effects':
        tokens = designTokens.effects;
        break;
      case 'spacing':
        tokens = designTokens.spacing;
        break;
      case 'all':
      default:
        tokens = [
          ...designTokens.colors,
          ...designTokens.typography,
          ...designTokens.layout,
          ...designTokens.effects,
          ...designTokens.spacing,
          ...designTokens.components,
        ];
    }

    // Apply search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      tokens = tokens.filter(token => 
        token.name.toLowerCase().includes(query) ||
        token.type.toLowerCase().includes(query) ||
        (token.description && token.description.toLowerCase().includes(query))
      );
    }

    return tokens;
  }, [designTokens, state.filterTokenType, state.searchQuery]);

  // Global variable statistics
  const globalVarStats = useMemo(() => {
    return globalVarManager.getStatistics();
  }, [globalVarManager]);

  // Generation metrics
  // const generationMetrics = useMemo(() => {
  //   return codeGenerator.getGenerationStats();
  // }, [codeGenerator]);

  const handleTabChange = useCallback((tab: typeof state.activeTab) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const handleEditToggle = useCallback(() => {
    if (readOnly) return;
    setState(prev => ({ ...prev, isEditing: !prev.isEditing }));
  }, [readOnly]);

  const handleCodeChange = useCallback((code: string) => {
    setState(prev => ({ ...prev, editedCode: code }));
  }, []);

  const handleCSSChange = useCallback((css: string) => {
    setState(prev => ({ ...prev, editedCSS: css }));
  }, []);

  const handleSave = useCallback(() => {
    onEdit?.(state.editedCode);
    setState(prev => ({ ...prev, isEditing: false }));
  }, [state.editedCode, onEdit]);

  const handleCopy = useCallback(async (content: string, type: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setState(prev => ({ ...prev, copyFeedback: `${type} copied!` }));
      onCopy?.(content);
      
      setTimeout(() => {
        setState(prev => ({ ...prev, copyFeedback: null }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      setState(prev => ({ ...prev, copyFeedback: 'Copy failed' }));
      
      setTimeout(() => {
        setState(prev => ({ ...prev, copyFeedback: null }));
      }, 2000);
    }
  }, [onCopy]);

  const handlePreviewModeChange = useCallback((mode: typeof state.previewMode) => {
    setState(prev => ({ ...prev, previewMode: mode }));
  }, []);

  const handleBreakpointChange = useCallback((breakpoint: typeof state.selectedBreakpoint) => {
    setState(prev => ({ ...prev, selectedBreakpoint: breakpoint }));
  }, []);

  const handleFilterChange = useCallback((filter: typeof state.filterTokenType) => {
    setState(prev => ({ ...prev, filterTokenType: filter }));
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  // Render syntax-highlighted code
  const renderHighlightedCode = useCallback((code: string, language: 'tsx' | 'css') => {
    return (
      <pre className={`code-display ${language}`}>
        <code>{code}</code>
      </pre>
    );
  }, []);

  // Render global variables panel
  const renderGlobalVariables = useCallback(() => {
    return (
      <div className="global-variables-panel">
        <div className="panel-header">
          <h4>Global Variables ({Object.keys(globalVars.styles).length})</h4>
          <div className="panel-stats">
            <span>Memory: {(globalVarStats.memoryUsage / 1024).toFixed(1)}KB</span>
            <span>Duplicates Avoided: {globalVarStats.duplicatesFound}</span>
          </div>
        </div>
        
        <div className="css-variables">
          <h5>CSS Custom Properties</h5>
          {renderHighlightedCode(cssCustomProperties, 'css')}
          <button
            className="copy-button"
            onClick={() => handleCopy(cssCustomProperties, 'CSS Variables')}
          >
            📋 Copy Variables
          </button>
        </div>

        <div className="variables-breakdown">
          <h5>Variables by Type</h5>
          {Object.entries(globalVarStats.variablesByType).map(([type, count]) => (
            <div key={type} className="variable-type">
              <span className="type-name">{type}</span>
              <span className="type-count">{count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }, [globalVars, globalVarStats, cssCustomProperties, handleCopy, renderHighlightedCode]);

  // Render design tokens panel
  const renderDesignTokens = useCallback(() => {
    return (
      <div className="design-tokens-panel">
        <div className="panel-header">
          <h4>Design Tokens ({filteredDesignTokens.length})</h4>
          
          <div className="tokens-controls">
            <select 
              value={state.filterTokenType} 
              onChange={(e) => handleFilterChange(e.target.value as any)}
            >
              <option value="all">All Types</option>
              <option value="colors">Colors</option>
              <option value="typography">Typography</option>
              <option value="layout">Layout</option>
              <option value="effects">Effects</option>
              <option value="spacing">Spacing</option>
            </select>
            
            <input
              type="text"
              placeholder="Search tokens..."
              value={state.searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="token-search"
            />
          </div>
        </div>

        <div className="tokens-list">
          {filteredDesignTokens.map((token) => (
            <div key={token.id} className={`token-item token-${token.type}`}>
              <div className="token-header">
                <span className="token-name">{token.name}</span>
                <span className="token-type">{token.type}</span>
              </div>
              
              <div className="token-value">
                {token.type === 'color' ? (
                  <div className="color-preview">
                    <div 
                      className="color-swatch"
                      style={{ backgroundColor: token.value }}
                    />
                    <code>{token.value}</code>
                  </div>
                ) : (
                  <code>{JSON.stringify(token.value, null, 2)}</code>
                )}
              </div>
              
              {token.cssVariable && (
                <div className="token-css-var">
                  <code>{token.cssVariable}</code>
                  <button
                    className="copy-token-button"
                    onClick={() => handleCopy(token.cssVariable!, 'CSS Variable')}
                  >
                    📋
                  </button>
                </div>
              )}
              
              {token.description && (
                <div className="token-description">
                  {token.description}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }, [filteredDesignTokens, state.filterTokenType, state.searchQuery, handleFilterChange, handleSearchChange, handleCopy]);

  // Render metrics panel
  const renderMetrics = useCallback(() => {
    return (
      <div className="metrics-panel">
        <div className="panel-header">
          <h4>Performance Metrics</h4>
        </div>

        <div className="metrics-grid">
          <div className="metric-group">
            <h5>Generation Statistics</h5>
            <div className="metric-item">
              <span>Processing Time:</span>
              <span>{generatedComponent.metadata.generationTime.toFixed(2)}ms</span>
            </div>
            <div className="metric-item">
              <span>Global Variables Used:</span>
              <span>{generatedComponent.metadata.globalVariablesUsed}</span>
            </div>
            <div className="metric-item">
              <span>Extractors Used:</span>
              <span>{generatedComponent.metadata.extractorsUsed.join(', ')}</span>
            </div>
          </div>

          <div className="metric-group">
            <h5>Code Quality</h5>
            <div className="metric-item">
              <span>Design Tokens:</span>
              <span>{generatedComponent.designTokens.length}</span>
            </div>
            <div className="metric-item">
              <span>CSS Lines:</span>
              <span>{generatedComponent.css.split('\n').length}</span>
            </div>
            <div className="metric-item">
              <span>Optimizations:</span>
              <span>{generatedComponent.metadata.optimizations.length}</span>
            </div>
          </div>

          <div className="metric-group">
            <h5>Global Variable Efficiency</h5>
            <div className="metric-item">
              <span>Total Variables:</span>
              <span>{globalVarStats.totalVariables}</span>
            </div>
            <div className="metric-item">
              <span>Duplicates Avoided:</span>
              <span>{globalVarStats.duplicatesFound}</span>
            </div>
            <div className="metric-item">
              <span>Memory Usage:</span>
              <span>{(globalVarStats.memoryUsage / 1024).toFixed(1)}KB</span>
            </div>
          </div>
        </div>

        <div className="optimizations-list">
          <h5>Applied Optimizations</h5>
          {generatedComponent.metadata.optimizations.map((optimization, index) => (
            <div key={index} className="optimization-item">
              ✓ {optimization}
            </div>
          ))}
        </div>
      </div>
    );
  }, [generatedComponent, globalVarStats]);

  // Render component preview
  const renderPreview = useCallback(() => {
    const previewStyle = {
      '--preview-width': state.selectedBreakpoint === 'mobile' ? '375px' :
                         state.selectedBreakpoint === 'tablet' ? '768px' : '1200px',
    } as React.CSSProperties;

    return (
      <div className="preview-panel">
        <div className="preview-controls">
          <div className="preview-modes">
            <button
              className={state.previewMode === 'component' ? 'active' : ''}
              onClick={() => handlePreviewModeChange('component')}
            >
              Component
            </button>
            <button
              className={state.previewMode === 'responsive' ? 'active' : ''}
              onClick={() => handlePreviewModeChange('responsive')}
            >
              Responsive
            </button>
            <button
              className={state.previewMode === 'fullscreen' ? 'active' : ''}
              onClick={() => handlePreviewModeChange('fullscreen')}
            >
              Fullscreen
            </button>
          </div>

          {state.previewMode === 'responsive' && (
            <div className="breakpoint-controls">
              <button
                className={state.selectedBreakpoint === 'mobile' ? 'active' : ''}
                onClick={() => handleBreakpointChange('mobile')}
              >
                📱 Mobile
              </button>
              <button
                className={state.selectedBreakpoint === 'tablet' ? 'active' : ''}
                onClick={() => handleBreakpointChange('tablet')}
              >
                📱 Tablet
              </button>
              <button
                className={state.selectedBreakpoint === 'desktop' ? 'active' : ''}
                onClick={() => handleBreakpointChange('desktop')}
              >
                🖥️ Desktop
              </button>
            </div>
          )}
        </div>

        <div 
          className={`preview-container ${state.previewMode}`}
          style={previewStyle}
        >
          <style>{state.editedCSS}</style>
          <style>{cssCustomProperties}</style>
          <div dangerouslySetInnerHTML={{ __html: 'Preview would be rendered here' }} />
        </div>
      </div>
    );
  }, [state.previewMode, state.selectedBreakpoint, state.editedCSS, cssCustomProperties, handlePreviewModeChange, handleBreakpointChange]);

  return (
    <div className="enhanced-code-preview">
      {/* Header */}
      <div className="preview-header">
        <h3>{generatedComponent.name}</h3>
        
        <div className="header-actions">
          {!readOnly && (
            <button 
              className={`edit-button ${state.isEditing ? 'editing' : ''}`}
              onClick={handleEditToggle}
            >
              {state.isEditing ? '📝 Editing' : '✏️ Edit'}
            </button>
          )}
          
          <button 
            className="copy-all-button"
            onClick={() => handleCopy(generatedComponent.code + '\n\n' + generatedComponent.css, 'Complete Component')}
          >
            📋 Copy All
          </button>
        </div>
      </div>

      {/* Feedback */}
      {state.copyFeedback && (
        <div className="copy-feedback">
          {state.copyFeedback}
        </div>
      )}

      {/* Tabs */}
      <div className="preview-tabs">
        <button
          className={`tab-button ${state.activeTab === 'component' ? 'active' : ''}`}
          onClick={() => handleTabChange('component')}
        >
          Component
        </button>
        
        <button
          className={`tab-button ${state.activeTab === 'css' ? 'active' : ''}`}
          onClick={() => handleTabChange('css')}
        >
          CSS
        </button>
        
        <button
          className={`tab-button ${state.activeTab === 'variables' ? 'active' : ''}`}
          onClick={() => handleTabChange('variables')}
        >
          Variables ({Object.keys(globalVars.styles).length})
        </button>
        
        {designTokens && (
          <button
            className={`tab-button ${state.activeTab === 'tokens' ? 'active' : ''}`}
            onClick={() => handleTabChange('tokens')}
          >
            Tokens ({filteredDesignTokens.length})
          </button>
        )}
        
        <button
          className={`tab-button ${state.activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => handleTabChange('preview')}
        >
          Preview
        </button>
        
        {showMetrics && (
          <button
            className={`tab-button ${state.activeTab === 'metrics' ? 'active' : ''}`}
            onClick={() => handleTabChange('metrics')}
          >
            Metrics
          </button>
        )}
      </div>

      {/* Content */}
      <div className="preview-content">
        {state.activeTab === 'component' && (
          <div className="code-panel">
            <div className="code-header">
              <span>React Component (TypeScript)</span>
              <button
                className="copy-button"
                onClick={() => handleCopy(state.editedCode, 'Component Code')}
              >
                📋 Copy
              </button>
            </div>
            {state.isEditing ? (
              <textarea
                className="code-editor"
                value={state.editedCode}
                onChange={(e) => handleCodeChange(e.target.value)}
              />
            ) : (
              renderHighlightedCode(state.editedCode, 'tsx')
            )}
          </div>
        )}

        {state.activeTab === 'css' && (
          <div className="code-panel">
            <div className="code-header">
              <span>CSS Styles</span>
              <button
                className="copy-button"
                onClick={() => handleCopy(state.editedCSS, 'CSS')}
              >
                📋 Copy
              </button>
            </div>
            {state.isEditing ? (
              <textarea
                className="code-editor"
                value={state.editedCSS}
                onChange={(e) => handleCSSChange(e.target.value)}
              />
            ) : (
              renderHighlightedCode(state.editedCSS, 'css')
            )}
          </div>
        )}

        {state.activeTab === 'variables' && renderGlobalVariables()}
        {state.activeTab === 'tokens' && renderDesignTokens()}
        {state.activeTab === 'preview' && renderPreview()}
        {state.activeTab === 'metrics' && renderMetrics()}
      </div>

      {/* Save/Discard buttons */}
      {state.isEditing && (
        <div className="edit-actions">
          <button className="save-button" onClick={handleSave}>
            💾 Save Changes
          </button>
          <button 
            className="discard-button" 
            onClick={() => setState(prev => ({ 
              ...prev, 
              isEditing: false,
              editedCode: generatedComponent.code,
              editedCSS: generatedComponent.css,
            }))}
          >
            ❌ Discard
          </button>
        </div>
      )}
    </div>
  );
};

export default EnhancedCodePreview;