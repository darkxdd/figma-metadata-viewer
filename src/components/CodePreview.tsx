import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { CodePreviewProps } from '../types/gemini';
import { CodeGeneratorUtils } from '../utils/codeGenerator';
import { ProjectGenerator } from '../utils/projectGenerator';
import { MetadataParser } from '../utils/metadataParser';
import './CodePreview.css';

interface CodePreviewState {
  activeTab: 'component' | 'css' | 'preview' | 'metadata';
  isEditing: boolean;
  editedCode: string;
  editedCSS: string;
  copyFeedback: string | null;
  validationResult: ReturnType<typeof CodeGeneratorUtils.validateGeneratedCode> | null;
  isDownloading: boolean;
  downloadError: string | null;
  previewMode: 'component' | 'fullscreen' | 'responsive';
  selectedBreakpoint: 'mobile' | 'tablet' | 'desktop';
  showDesignTokens: boolean;
}

const CodePreview: React.FC<CodePreviewProps> = ({
  preview,
  onEdit,
  onCopy,
  readOnly = false,
  figmaNode, // Add figmaNode prop for enhanced features
}) => {
  const [state, setState] = useState<CodePreviewState>({
    activeTab: 'component',
    isEditing: false,
    editedCode: preview.code,
    editedCSS: preview.css,
    copyFeedback: null,
    validationResult: null,
    isDownloading: false,
    downloadError: null,
    previewMode: 'component',
    selectedBreakpoint: 'desktop',
    showDesignTokens: false,
  });

  // Enhanced metadata processing for better visual fidelity
  const enhancedMetadata = useMemo(() => {
    if (!figmaNode) return null;
    return MetadataParser.parseNode(figmaNode);
  }, [figmaNode]);

  // Generate enhanced code with high visual fidelity
  const enhancedCode = useMemo(() => {
    if (!enhancedMetadata) return { code: preview.code, css: preview.css };
    
    const generatedComponent = CodeGeneratorUtils.generateAdvancedComponent(enhancedMetadata, {
      includeTypeScript: true,
      optimizeForAccessibility: true,
      includeChildren: true,
      generateResponsive: true,
    });
    
    return {
      code: generatedComponent.code,
      css: generatedComponent.css,
    };
  }, [enhancedMetadata, preview]);

  // Design tokens for better visual representation
  const designTokens = useMemo(() => {
    if (!enhancedMetadata?.designTokens) return null;
    return enhancedMetadata.designTokens;
  }, [enhancedMetadata]);

  // Validate code when it changes
  useEffect(() => {
    if (state.editedCode) {
      const validation = CodeGeneratorUtils.validateGeneratedCode(state.editedCode);
      setState(prev => ({ ...prev, validationResult: validation }));
    }
  }, [state.editedCode]);

  const handleTabChange = useCallback((tab: 'component' | 'css' | 'preview' | 'metadata') => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const handlePreviewModeChange = useCallback((mode: 'component' | 'fullscreen' | 'responsive') => {
    setState(prev => ({ ...prev, previewMode: mode }));
  }, []);

  const handleBreakpointChange = useCallback((breakpoint: 'mobile' | 'tablet' | 'desktop') => {
    setState(prev => ({ ...prev, selectedBreakpoint: breakpoint }));
  }, []);

  const toggleDesignTokens = useCallback(() => {
    setState(prev => ({ ...prev, showDesignTokens: !prev.showDesignTokens }));
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

  const handleSaveChanges = useCallback(() => {
    onEdit?.(state.editedCode);
    setState(prev => ({ ...prev, isEditing: false }));
  }, [state.editedCode, onEdit]);

  const handleDiscardChanges = useCallback(() => {
    setState(prev => ({
      ...prev,
      editedCode: preview.code,
      editedCSS: preview.css,
      isEditing: false,
    }));
  }, [preview.code, preview.css]);

  const handleCopy = useCallback(async (content: string, type: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setState(prev => ({ ...prev, copyFeedback: `${type} copied!` }));
      onCopy?.(content);
      
      setTimeout(() => {
        setState(prev => ({ ...prev, copyFeedback: null }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setState(prev => ({ ...prev, copyFeedback: 'Copy failed' }));
      
      setTimeout(() => {
        setState(prev => ({ ...prev, copyFeedback: null }));
      }, 2000);
    }
  }, [onCopy]);

  // Enhanced download with comprehensive project generation
  const handleDownload = useCallback(async () => {
    setState(prev => ({ ...prev, isDownloading: true, downloadError: null }));
    
    try {
      const codeToUse = enhancedCode.code !== preview.code ? enhancedCode.code : state.editedCode;
      const cssToUse = enhancedCode.css !== preview.css ? enhancedCode.css : state.editedCSS;
      
      const updatedPreview = {
        ...preview,
        code: codeToUse,
        css: cssToUse,
        isEdited: codeToUse !== preview.code || cssToUse !== preview.css,
        enhancedMetadata: enhancedMetadata || undefined,
        designTokens: designTokens || undefined,
      };
      
      // Generate project name from component name
      const projectName = `${preview.componentName.replace(/Component$/, '')}-project`;
      
      // Download complete React project with enhanced features
      await ProjectGenerator.downloadProject(projectName, [updatedPreview]);
      
      setState(prev => ({ 
        ...prev, 
        isDownloading: false,
        copyFeedback: 'Enhanced project downloaded successfully!' 
      }));
      
      setTimeout(() => {
        setState(prev => ({ ...prev, copyFeedback: null }));
      }, 3000);
      
    } catch (error) {
      console.error('Download failed:', error);
      setState(prev => ({ 
        ...prev, 
        isDownloading: false,
        downloadError: error instanceof Error ? error.message : 'Download failed'
      }));
      
      setTimeout(() => {
        setState(prev => ({ ...prev, downloadError: null }));
      }, 5000);
    }
  }, [preview, state.editedCode, state.editedCSS, enhancedCode, enhancedMetadata, designTokens]);

  const formatCode = useCallback((code: string) => {
    // Simple code formatting - in a real app, you might use prettier
    return code
      .replace(/\t/g, '  ') // Convert tabs to spaces
      .replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove excessive line breaks
  }, []);

  const highlightSyntax = useCallback((code: string, language: 'tsx' | 'css') => {
    if (language === 'css') {
      return code
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token comment">$1</span>')
        .replace(/([.#][a-zA-Z][a-zA-Z0-9_-]*)/g, '<span class="token selector">$1</span>')
        .replace(/([a-zA-Z-]+)(?=\s*:)/g, '<span class="token property">$1</span>')
        .replace(/("[^"]*"|'[^']*')/g, '<span class="token string">$1</span>')
        .replace(/(!important)/g, '<span class="token important">$1</span>')
        .replace(/(--[a-zA-Z][a-zA-Z0-9-]*)/g, '<span class="token variable">$1</span>') // CSS custom properties
        .replace(/(@media|@keyframes|@import|@supports)/g, '<span class="token atrule">$1</span>') // CSS at-rules
        .replace(/(linear-gradient|radial-gradient|conic-gradient|var|calc|rgba?|hsla?)/g, '<span class="token function">$1</span>'); // CSS functions
    }
    
    // Enhanced TypeScript/JSX highlighting
    let highlighted = code;
    
    // First, protect string literals and comments from further processing
    const strings: string[] = [];
    const comments: string[] = [];
    
    // Extract and protect strings
    highlighted = highlighted.replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, (match) => {
      const index = strings.length;
      strings.push(match);
      return `__STRING_${index}__`;
    });
    
    // Extract and protect comments
    highlighted = highlighted.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, (match) => {
      const index = comments.length;
      comments.push(match);
      return `__COMMENT_${index}__`;
    });
    
    // Apply enhanced syntax highlighting
    highlighted = highlighted
      .replace(/\b(import|export|from|default|const|let|var|function|return|if|else|for|while|class|interface|type|extends|implements|async|await|try|catch|finally)\b/g, '<span class="token keyword">$1</span>')
      .replace(/\b(React|useState|useEffect|useCallback|useMemo|Component|FC|ReactNode|JSX|CSSProperties)\b/g, '<span class="token class-name">$1</span>')
      .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="token number">$1</span>')
      .replace(/\b(true|false|null|undefined)\b/g, '<span class="token boolean">$1</span>')
      .replace(/([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/g, '<span class="token function">$1</span>')
      .replace(/<([a-zA-Z][a-zA-Z0-9-]*)/g, '<span class="token tag">&lt;<span class="token tag-name">$1</span></span>') // JSX tags
      .replace(/([a-zA-Z-]+)=/g, '<span class="token attr-name">$1</span>='); // JSX attributes
    
    // Restore comments with highlighting
    comments.forEach((comment, index) => {
      highlighted = highlighted.replace(`__COMMENT_${index}__`, `<span class="token comment">${comment}</span>`);
    });
    
    // Restore strings with highlighting
    strings.forEach((string, index) => {
      highlighted = highlighted.replace(`__STRING_${index}__`, `<span class="token string">${string}</span>`);
    });
    
    return highlighted;
  }, []);

  const renderCodeEditor = useCallback((
    code: string,
    language: 'tsx' | 'css',
    onChange: (value: string) => void,
    ref?: React.RefObject<HTMLTextAreaElement | null>
  ) => {
    if (state.isEditing) {
      return (
        <textarea
          ref={ref}
          className={`code-editor ${language}`}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          data-gramm="false" // Disable Grammarly
        />
      );
    }

    // Check if code contains SVG or complex HTML that might break syntax highlighting
    const hasSVG = code.includes('<svg') || code.includes('viewBox') || code.includes('<path');
    const hasComplexHTML = code.includes('<!DOCTYPE') || code.includes('<html');
    
    if (hasSVG || hasComplexHTML) {
      // Use plain text display for complex HTML/SVG to avoid attribute parsing issues
      return (
        <pre className={`code-display ${language}`}>
          <code>{formatCode(code)}</code>
        </pre>
      );
    }

    return (
      <pre className={`code-display ${language}`}>
        <code 
          dangerouslySetInnerHTML={{ 
            __html: highlightSyntax(formatCode(code), language as 'tsx' | 'css') 
          }}
        />
      </pre>
    );
  }, [state.isEditing, formatCode]);

  const renderValidationResults = useCallback(() => {
    if (!state.validationResult) return null;

    return (
      <div className="validation-results">
        <div className="validation-header">
          <span className={`validation-status ${state.validationResult.isValid ? 'valid' : 'invalid'}`}>
            {state.validationResult.isValid ? '✓ Valid' : '⚠ Issues Found'}
          </span>
        </div>
        
        {state.validationResult.errors.length > 0 && (
          <div className="validation-errors">
            <h5>Errors:</h5>
            <ul>
              {state.validationResult.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        {state.validationResult.warnings.length > 0 && (
          <div className="validation-warnings">
            <h5>Warnings:</h5>
            <ul>
              {state.validationResult.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }, [state.validationResult]);

  return (
    <div className="code-preview">
      {/* Header */}
      <div className="code-preview-header">
        <h3>{preview.componentName}</h3>
        
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
            className="download-button"
            onClick={handleDownload}
            disabled={state.isDownloading}
          >
            {state.isDownloading ? '📦 Generating...' : '📦 Download Project'}
          </button>
        </div>
      </div>

        {/* Tabs */}
        <div className="code-tabs">
          <button
            className={`tab-button ${state.activeTab === 'component' ? 'active' : ''}`}
            onClick={() => handleTabChange('component')}
          >
            Component ({preview.language.toUpperCase()})
          </button>
          
          <button
            className={`tab-button ${state.activeTab === 'css' ? 'active' : ''}`}
            onClick={() => handleTabChange('css')}
          >
            CSS
          </button>
          
          <button
            className={`tab-button ${state.activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => handleTabChange('preview')}
          >
            Preview
          </button>
          
          {enhancedMetadata && (
            <button
              className={`tab-button ${state.activeTab === 'metadata' ? 'active' : ''}`}
              onClick={() => handleTabChange('metadata')}
            >
              Design Data
            </button>
          )}
          
          {designTokens && (
            <button
              className={`toggle-button ${state.showDesignTokens ? 'active' : ''}`}
              onClick={toggleDesignTokens}
              title="Show/Hide Design Tokens"
            >
              🎨 Tokens
            </button>
          )}
        </div>

      {/* Content */}
      <div className="code-content">
        {/* Component Tab */}
        {state.activeTab === 'component' && (
          <div className="code-panel">
            <div className="panel-header">
              <span>React Component</span>
              <button
                className="copy-button"
                onClick={() => handleCopy(state.editedCode, 'Component code')}
              >
                📋 Copy
              </button>
            </div>
            
            {renderCodeEditor(
              state.editedCode,
              preview.language === 'jsx' ? 'tsx' : preview.language,
              handleCodeChange,
              undefined
            )}
            
            {renderValidationResults()}
          </div>
        )}

        {/* CSS Tab */}
        {state.activeTab === 'css' && (
          <div className="code-panel">
            <div className="panel-header">
              <span>Styles</span>
              <button
                className="copy-button"
                onClick={() => handleCopy(state.editedCSS, 'CSS code')}
              >
                📋 Copy
              </button>
            </div>
            
            {renderCodeEditor(
              state.editedCSS,
              'css',
              handleCSSChange,
              undefined
            )}
          </div>
        )}

        {/* Enhanced Preview Tab */}
        {state.activeTab === 'preview' && (
          <div className="preview-panel enhanced">
            <div className="preview-header">
              <span>Component Preview</span>
              <div className="preview-controls">
                <div className="preview-mode-selector">
                  <button
                    className={`mode-btn ${state.previewMode === 'component' ? 'active' : ''}`}
                    onClick={() => handlePreviewModeChange('component')}
                  >
                    Component
                  </button>
                  <button
                    className={`mode-btn ${state.previewMode === 'responsive' ? 'active' : ''}`}
                    onClick={() => handlePreviewModeChange('responsive')}
                  >
                    Responsive
                  </button>
                  <button
                    className={`mode-btn ${state.previewMode === 'fullscreen' ? 'active' : ''}`}
                    onClick={() => handlePreviewModeChange('fullscreen')}
                  >
                    Fullscreen
                  </button>
                </div>
                
                {state.previewMode === 'responsive' && (
                  <div className="breakpoint-selector">
                    <button
                      className={`bp-btn ${state.selectedBreakpoint === 'mobile' ? 'active' : ''}`}
                      onClick={() => handleBreakpointChange('mobile')}
                    >
                      📱 Mobile
                    </button>
                    <button
                      className={`bp-btn ${state.selectedBreakpoint === 'tablet' ? 'active' : ''}`}
                      onClick={() => handleBreakpointChange('tablet')}
                    >
                      📟 Tablet
                    </button>
                    <button
                      className={`bp-btn ${state.selectedBreakpoint === 'desktop' ? 'active' : ''}`}
                      onClick={() => handleBreakpointChange('desktop')}
                    >
                      🖥️ Desktop
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="preview-content">
              <div className={`preview-mockup ${state.previewMode} ${state.selectedBreakpoint}`}>
                <div className="mockup-browser">
                  <div className="mockup-browser-header">
                    <div className="mockup-browser-buttons">
                      <div className="mockup-button red"></div>
                      <div className="mockup-button yellow"></div>
                      <div className="mockup-button green"></div>
                    </div>
                    <div className="mockup-url">localhost:3000</div>
                  </div>
                  
                  <div className="mockup-content">
                    <div className="component-info">
                      <h4>{preview.componentName}</h4>
                      <p>Generated from Figma design with enhanced visual fidelity</p>
                      
                      {enhancedMetadata && (
                        <div className="enhancement-info">
                          <span className="enhancement-badge">✨ Enhanced</span>
                          <span className="enhancement-details">
                            {enhancedMetadata.layoutSystem?.type} layout, 
                            {enhancedMetadata.visualStyle?.backgrounds?.length || 0} backgrounds,
                            {enhancedMetadata.advancedTypography ? 'advanced typography' : 'basic typography'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Dynamic CSS injection for preview */}
                    <style>
                      {enhancedCode.css !== preview.css ? enhancedCode.css : state.editedCSS}
                    </style>
                    
                    {/* Mock component rendering */}
                    <div className="mock-component-render">
                      <div className="render-note">
                        <strong>Preview Note:</strong> This shows the visual styling that will be applied. 
                        The actual component would render your content dynamically.
                      </div>
                      
                      {enhancedMetadata && (
                        <div className="visual-preview">
                          <div 
                            className="preview-element"
                            style={{
                              ...enhancedMetadata.layoutSystem?.properties,
                              backgroundColor: enhancedMetadata.visualStyle?.backgrounds?.[0]?.replace('background-color: ', '').replace('background: ', ''),
                              border: enhancedMetadata.visualStyle?.borders?.[0]?.replace('border: ', ''),
                              boxShadow: enhancedMetadata.visualStyle?.shadows?.join(', '),
                              fontFamily: enhancedMetadata.advancedTypography?.fontFamily,
                              fontSize: enhancedMetadata.advancedTypography?.fontSize + 'px',
                              fontWeight: enhancedMetadata.advancedTypography?.fontWeight,
                              color: enhancedMetadata.advancedTypography?.color,
                            }}
                          >
                            {enhancedMetadata.content || 'Component Content'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Enhanced Metadata Tab */}
        {state.activeTab === 'metadata' && enhancedMetadata && (
          <div className="metadata-panel">
            <div className="panel-header">
              <span>Design Metadata</span>
              <button
                className="copy-button"
                onClick={() => handleCopy(JSON.stringify(enhancedMetadata, null, 2), 'Metadata')}
              >
                📋 Copy JSON
              </button>
            </div>
            
            <div className="metadata-content">
              <div className="metadata-section">
                <h4>Component Information</h4>
                <ul>
                  <li><strong>Name:</strong> {enhancedMetadata.name}</li>
                  <li><strong>Type:</strong> {enhancedMetadata.type}</li>
                  <li><strong>Layout System:</strong> {enhancedMetadata.layoutSystem?.type}</li>
                  {enhancedMetadata.textHierarchy && (
                    <li><strong>Semantic Element:</strong> {enhancedMetadata.textHierarchy.suggestedElement}</li>
                  )}
                </ul>
              </div>
              
              {enhancedMetadata.visualStyle && (
                <div className="metadata-section">
                  <h4>Visual Styling</h4>
                  <ul>
                    <li><strong>Backgrounds:</strong> {enhancedMetadata.visualStyle.backgrounds.length}</li>
                    <li><strong>Borders:</strong> {enhancedMetadata.visualStyle.borders.length}</li>
                    <li><strong>Shadows:</strong> {enhancedMetadata.visualStyle.shadows.length}</li>
                    <li><strong>Filters:</strong> {enhancedMetadata.visualStyle.filters.length}</li>
                    {enhancedMetadata.visualStyle.blendMode && (
                      <li><strong>Blend Mode:</strong> {enhancedMetadata.visualStyle.blendMode}</li>
                    )}
                  </ul>
                </div>
              )}
              
              {enhancedMetadata.advancedTypography && (
                <div className="metadata-section">
                  <h4>Typography</h4>
                  <ul>
                    <li><strong>Font Family:</strong> {enhancedMetadata.advancedTypography.fontFamily}</li>
                    <li><strong>Font Size:</strong> {enhancedMetadata.advancedTypography.fontSize}px</li>
                    <li><strong>Font Weight:</strong> {enhancedMetadata.advancedTypography.fontWeight}</li>
                    <li><strong>Text Align:</strong> {enhancedMetadata.advancedTypography.textAlign}</li>
                    {enhancedMetadata.advancedTypography.lineHeight && (
                      <li><strong>Line Height:</strong> {enhancedMetadata.advancedTypography.lineHeight}</li>
                    )}
                  </ul>
                </div>
              )}
              
              {enhancedMetadata.accessibility && (
                <div className="metadata-section">
                  <h4>Accessibility</h4>
                  <ul>
                    <li><strong>Role:</strong> {enhancedMetadata.accessibility.role}</li>
                    {enhancedMetadata.accessibility.label && (
                      <li><strong>Label:</strong> {enhancedMetadata.accessibility.label}</li>
                    )}
                    {enhancedMetadata.accessibility.ariaAttributes && (
                      <li><strong>ARIA Attributes:</strong> {Object.keys(enhancedMetadata.accessibility.ariaAttributes).length}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Design Tokens Panel */}
        {state.showDesignTokens && designTokens && (
          <div className="design-tokens-panel">
            <div className="panel-header">
              <span>Design Tokens</span>
              <button
                className="copy-button"
                onClick={() => handleCopy([
                  '/* Design Tokens */',
                  ':root {',
                  ...designTokens.colors,
                  ...designTokens.typography,
                  ...designTokens.spacing,
                  ...designTokens.layout,
                  '}'
                ].join('\n'), 'Design Tokens')}
              >
                📋 Copy CSS
              </button>
            </div>
            
            <div className="tokens-content">
              {designTokens.colors.length > 0 && (
                <div className="token-category">
                  <h5>Colors</h5>
                  <pre><code>{designTokens.colors.join('\n')}</code></pre>
                </div>
              )}
              
              {designTokens.typography.length > 0 && (
                <div className="token-category">
                  <h5>Typography</h5>
                  <pre><code>{designTokens.typography.join('\n')}</code></pre>
                </div>
              )}
              
              {designTokens.spacing.length > 0 && (
                <div className="token-category">
                  <h5>Spacing</h5>
                  <pre><code>{designTokens.spacing.join('\n')}</code></pre>
                </div>
              )}
              
              {designTokens.layout.length > 0 && (
                <div className="token-category">
                  <h5>Layout</h5>
                  <pre><code>{designTokens.layout.join('\n')}</code></pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Actions */}
      {state.isEditing && (
        <div className="edit-actions">
          <button 
            className="save-button primary"
            onClick={handleSaveChanges}
          >
            💾 Save Changes
          </button>
          
          <button 
            className="discard-button secondary"
            onClick={handleDiscardChanges}
          >
            🚫 Discard Changes
          </button>
        </div>
      )}

      {/* Copy Feedback */}
      {state.copyFeedback && (
        <div className="copy-feedback">
          {state.copyFeedback}
        </div>
      )}
      
      {/* Download Error */}
      {state.downloadError && (
        <div className="download-error">
          {state.downloadError}
        </div>
      )}
    </div>
  );
};

export default CodePreview;