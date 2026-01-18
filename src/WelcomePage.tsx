import "./WelcomePage.css";
import { useNavigate } from 'react-router-dom';

export default function WelcomePage() {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate("/login");
  };

  return (
    <div className="welcome-page">
      <div className="welcome-container">
        <div className="welcome-content">
          <img 
            src="/silent_speak_logo.png" 
            alt="Silent Speak Logo" 
            className="welcome-logo"
          />
          <h1 className="welcome-title">Silent Speak</h1>
          <p className="welcome-subtitle">Sign Elegantly</p>
          <button 
            className="welcome-login-button" 
            onClick={handleLoginClick}
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
