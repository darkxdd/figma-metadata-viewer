import { useState } from 'react';
import type { FigmaCredentials, FigmaFileData, ApiError, FigmaNode } from './types/figma';
import { getFigmaFileMetadata } from './services/figmaApi';
import InputForm from './components/InputForm';
import MetadataDisplay from './components/MetadataDisplay';
import NodeDetail from './components/NodeDetail';
import ErrorMessage from './components/ErrorMessage';
import LoadingSpinner from './components/LoadingSpinner';
import ImageFills from './components/ImageFills';
import './App.css';

function App() {
  const [credentials, setCredentials] = useState<FigmaCredentials | null>(null);
  const [fileData, setFileData] = useState<FigmaFileData | null>(null);
  const [selectedNode, setSelectedNode] = useState<FigmaNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | string | null>(null);

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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Figma Metadata Viewer</h1>
        <p>Extract and view metadata from Figma files</p>
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
            </div>

            <div className={`content-layout ${selectedNode ? 'with-detail' : ''}`}>
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
        </p>
      </footer>
    </div>
  );
}

export default App;
