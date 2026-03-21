import { useNavigate } from 'react-router-dom';
import './ErrorPages.css';

export const NetworkError = () => {
  const navigate = useNavigate();

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="error-page">
      <div className="error-content">
        <h1 className="error-code">⚠</h1>
        <h2 className="error-title">NO INTERNET CONNECTION</h2>
        <p className="error-message">
          Please check your internet connection and try again.
        </p>
        <div className="error-btn-group">
          <button className="error-btn" onClick={handleRetry}>
            RETRY
          </button>
          <button className="error-btn error-btn-secondary" onClick={() => navigate('/')}>
            GO HOME
          </button>
        </div>
      </div>
    </div>
  );
};
