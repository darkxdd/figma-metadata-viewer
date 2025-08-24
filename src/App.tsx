import { useState } from 'react';
import type { FigmaCredentials, FigmaFileData, ApiError, FigmaNode } from './types/figma';
import type { CodeGenerationResponse, CodePreview as CodePreviewType } from './types/gemini';
import { getFigmaFileMetadata } from './services/figmaApi';
import InputForm from './components/InputForm';
import MetadataDisplay from './components/MetadataDisplay';
import NodeDetail from './components/NodeDetail';
import ErrorMessage from './components/ErrorMessage';
import LoadingSpinner from './components/LoadingSpinner';
import ImageFills from './components/ImageFills';
import CodeGenerator from './components/CodeGenerator';
import CodePreview from './components/CodePreview';
import './App.css';

function App() {
  const [credentials, setCredentials] = useState<FigmaCredentials | null>(null);
  const [fileData, setFileData] = useState<FigmaFileData | null>(null);
  const [selectedNode, setSelectedNode] = useState<FigmaNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | string | null>(null);
  const [activeTab, setActiveTab] = useState<'viewer' | 'generator'>('viewer');
  const [codePreview, setCodePreview] = useState<CodePreviewType | null>(null);

  const handleFormSubmit = async (newCredentials: FigmaCredentials) => {
    setLoading(true);
    setError(null);
    setFileData(null);
    setSelectedNode(null);
    setCredentials(newCredentials);

    try {
      const data = await getFigmaFileMetadata(newCredentials);
      setFileData(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCredentials(null);
    setFileData(null);
    setSelectedNode(null);
    setError(null);
    setLoading(false);
  };

  const handleRetry = () => {
    if (credentials) {
      handleFormSubmit(credentials);
    }
  };

  const handleErrorDismiss = () => {
    setError(null);
  };

  const handleNodeSelect = (node: FigmaNode) => {
    setSelectedNode(node);
  };

  const handleTabChange = (tab: 'viewer' | 'generator') => {
    setActiveTab(tab);
  };

  const handleCodeGenerated = (response: CodeGenerationResponse) => {
    if (response.success) {
      const preview: CodePreviewType = {
        id: `${selectedNode?.id}-${Date.now()}`,
        componentName: response.metadata.nodeName.replace(/[^a-zA-Z0-9]/g, '') + 'Component',
        code: response.componentCode,
        css: response.cssCode,
        language: 'tsx',
        isEdited: false,
      };
      setCodePreview(preview);
    }
  };

  const handleCodeEdit = (code: string) => {
    if (codePreview) {
      setCodePreview({
        ...codePreview,
        code,
        isEdited: true,
        originalCode: codePreview.originalCode || codePreview.code,
      });
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Figma to React Converter</h1>
        <p>Extract metadata from Figma files and generate React components with AI</p>
      </header>

      <main className="app-main">
        {loading && (
          <LoadingSpinner
            overlay={true}
            message="Fetching Figma file metadata..."
            size="large"
          />
        )}

        {!fileData ? (
          <div className="input-section">
            {error && (
              <ErrorMessage
                error={error}
                onRetry={credentials ? handleRetry : undefined}
                onDismiss={handleErrorDismiss}
              />
            )}
            <InputForm
              onSubmit={handleFormSubmit}
              loading={loading}
            />
          </div>
        ) : (
          <div className="content-section">
            <div className="content-header">
              <button
                onClick={handleReset}
                className="reset-button"
              >
                ← New File
              </button>
              
              <div className="tab-navigation">
                <button
                  className={`tab-button ${activeTab === 'viewer' ? 'active' : ''}`}
                  onClick={() => handleTabChange('viewer')}
                >
                  🔍 Metadata Viewer
                </button>
                <button
                  className={`tab-button ${activeTab === 'generator' ? 'active' : ''}`}
                  onClick={() => handleTabChange('generator')}
                  disabled={!selectedNode}
                >
                  🚀 Code Generator
                </button>
              </div>
            </div>

            <div className={`content-layout ${selectedNode && activeTab === 'viewer' ? 'with-detail' : ''}`}>
              {activeTab === 'viewer' && (
                <>
                  <div className="metadata-panel">
                    <MetadataDisplay
                      fileData={fileData}
                      onNodeSelect={handleNodeSelect}
                    />
                  </div>

                  {selectedNode && (
                    <div className="detail-panel">
                      <NodeDetail
                        node={selectedNode}
                        credentials={credentials || undefined}
                        onCopy={(data) => console.log('Copied:', data)}
                      />
                      
                      {credentials && (
                        <div className="image-fills-section">
                          <ImageFills
                            key={`image-fills-${credentials.fileId}`}
                            credentials={credentials}
                            onLoad={(fills) => console.log('Image fills loaded:', Object.keys(fills).length)}
                            onError={(error) => console.error('Image fills error:', error)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'generator' && selectedNode && credentials && (
                <div className="generator-layout">
                  <div className="generator-panel">
                    <CodeGenerator
                      node={selectedNode}
                      credentials={{
                        figma: credentials,
                        gemini: { apiKey: '' }, // Will be set by user in the component
                      }}
                      onCodeGenerated={handleCodeGenerated}
                      onError={(error: any) => setError(error)}
                    />
                  </div>
                  
                  {codePreview && (
                    <div className="preview-panel">
                      <CodePreview
                        preview={codePreview}
                        onEdit={handleCodeEdit}
                        onCopy={() => console.log('Code copied to clipboard')}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Built with React & TypeScript •
          <a
            href="https://www.figma.com/developers/api"
            target="_blank"
            rel="noopener noreferrer"
          >
            Figma API
          </a>
          •
          <a
            href="https://ai.google.dev/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Gemini AI
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
