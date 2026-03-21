import { useNavigate } from 'react-router-dom';
import './ErrorPages.css';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="error-page">
      <div className="error-content">
        <h1 className="error-code">404</h1>
        <h2 className="error-title">PAGE NOT FOUND</h2>
        <p className="error-message">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button className="error-btn" onClick={() => navigate('/')}>
          BACK TO HOME
        </button>
      </div>
    </div>
  );
};
