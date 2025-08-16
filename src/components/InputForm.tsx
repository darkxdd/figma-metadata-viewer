import { useState } from 'react';
import type { FigmaCredentials, InputFormProps } from '../types/figma';
import LoadingSpinner from './LoadingSpinner';
import './InputForm.css';

export default function InputForm({ onSubmit, loading }: InputFormProps) {
  const [fileId, setFileId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    fileId?: string;
    accessToken?: string;
  }>({});

  const extractFileIdFromUrl = (input: string): string => {
    // Extract file ID from Figma URL if provided
    const urlMatch = input.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    return urlMatch ? urlMatch[1] : input;
  };

  const validateForm = (): boolean => {
    const errors: { fileId?: string; accessToken?: string } = {};
    
    if (!fileId.trim()) {
      errors.fileId = 'File ID is required';
    }
    
    if (!accessToken.trim()) {
      errors.accessToken = 'Access token is required';
    } else if (accessToken.length < 10) {
      errors.accessToken = 'Access token appears to be too short';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const credentials: FigmaCredentials = {
      fileId: extractFileIdFromUrl(fileId.trim()),
      accessToken: accessToken.trim()
    };

    onSubmit(credentials);
  };

  const handleFileIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileId(e.target.value);
    if (validationErrors.fileId) {
      setValidationErrors(prev => ({ ...prev, fileId: undefined }));
    }
  };

  const handleAccessTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccessToken(e.target.value);
    if (validationErrors.accessToken) {
      setValidationErrors(prev => ({ ...prev, accessToken: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="input-form">
      <div className="form-group">
        <label htmlFor="fileId">
          Figma File ID or URL
        </label>
        <input
          id="fileId"
          type="text"
          value={fileId}
          onChange={handleFileIdChange}
          placeholder="Enter file ID or paste Figma URL"
          disabled={loading}
          className={validationErrors.fileId ? 'error' : ''}
        />
        {validationErrors.fileId && (
          <span className="error-message">{validationErrors.fileId}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="accessToken">
          Personal Access Token
        </label>
        <input
          id="accessToken"
          type="password"
          value={accessToken}
          onChange={handleAccessTokenChange}
          placeholder="Enter your Figma personal access token"
          disabled={loading}
          className={validationErrors.accessToken ? 'error' : ''}
        />
        {validationErrors.accessToken && (
          <span className="error-message">{validationErrors.accessToken}</span>
        )}
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className={`submit-button ${loading ? 'loading-button' : ''}`}
      >
        {loading && (
          <LoadingSpinner size="small" />
        )}
        {loading ? 'Loading...' : 'Get Metadata'}
      </button>
    </form>
  );
}