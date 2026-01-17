import "./LoginPage.css";
import { Link } from 'react-router-dom';


export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-container">
        
        <h2 className="login-title">Login to your account</h2>
        
      </div>

      <div className="login-container">
        <div className="login-card">
          <form className="login-form">
            <div>
              <label className="login-label">Username</label>
              <input type="email" className="login-input" />
            </div>

            <div>
              <label className="login-label">Password</label>
              <input type="password" className="login-input" />
            </div>

            <a href="#" className="login-forgot">
              Forgot password?
            </a>

            <button type="submit" className="login-button">
              Login
            </button>
            <Link to="/signup" className="create-account">
              Create account?
            </Link>

          </form>
          
        </div>
      </div>
    </div>
  );
}
