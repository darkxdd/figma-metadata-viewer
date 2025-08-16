import type { ApiError } from '../types/figma';
import './ErrorMessage.css';

interface ErrorMessageProps {
  error: string | ApiError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export default function ErrorMessage({ error, onRetry, onDismiss }: ErrorMessageProps) {
  const getErrorDetails = () => {
    if (typeof error === 'string') {
      return {
        message: error,
        type: 'UNKNOWN' as const,
        suggestions: []
      };
    }

    const suggestions: string[] = [];
    
    switch (error.type) {
      case 'AUTHENTICATION':
        suggestions.push('Check that your personal access token is valid');
        suggestions.push('Ensure you have permission to access this file');
        suggestions.push('Generate a new token from Figma settings if needed');
        break;
      case 'NOT_FOUND':
        suggestions.push('Verify the file ID is correct');
        suggestions.push('Make sure the file exists and is accessible');
        suggestions.push('Check if the file URL was copied correctly');
        break;
      case 'RATE_LIMIT':
        suggestions.push('Wait a few minutes before trying again');
        suggestions.push('Reduce the frequency of API requests');
        break;
      case 'NETWORK':
        suggestions.push('Check your internet connection');
        suggestions.push('Try again in a few moments');
        suggestions.push('Verify Figma API is accessible');
        break;
      default:
        suggestions.push('Try again in a few moments');
        suggestions.push('Check your credentials and file ID');
    }

    return {
      message: error.message,
      type: error.type,
      suggestions
    };
  };

  const { message, type, suggestions } = getErrorDetails();

  const getErrorIcon = () => {
    switch (type) {
      case 'AUTHENTICATION':
        return '🔒';
      case 'NOT_FOUND':
        return '📄';
      case 'RATE_LIMIT':
        return '⏱️';
      case 'NETWORK':
        return '🌐';
      default:
        return '⚠️';
    }
  };

  return (
    <div className={`error-message error-${type.toLowerCase()}`}>
      <div className="error-header">
        <span className="error-icon">{getErrorIcon()}</span>
        <div className="error-content">
          <h3 className="error-title">
            {type === 'AUTHENTICATION' && 'Authentication Error'}
            {type === 'NOT_FOUND' && 'File Not Found'}
            {type === 'RATE_LIMIT' && 'Rate Limit Exceeded'}
            {type === 'NETWORK' && 'Network Error'}
            {type === 'UNKNOWN' && 'Error'}
          </h3>
          <p className="error-description">{message}</p>
        </div>
        {onDismiss && (
          <button 
            className="error-dismiss"
            onClick={onDismiss}
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="error-suggestions">
          <h4>Suggestions:</h4>
          <ul>
            {suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {onRetry && (
        <div className="error-actions">
          <button 
            className="retry-button"
            onClick={onRetry}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}