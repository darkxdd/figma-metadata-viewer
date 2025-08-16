import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  overlay?: boolean;
}

export default function LoadingSpinner({ 
  size = 'medium', 
  message = 'Loading...', 
  overlay = false 
}: LoadingSpinnerProps) {
  const content = (
    <div className={`loading-container ${overlay ? 'loading-overlay' : ''}`}>
      <div className={`loading-spinner loading-${size}`}>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {message && (
        <p className="loading-message">{message}</p>
      )}
    </div>
  );

  return content;
}