import "./SignupPage.css";

export default function SignupPage() {
  return (
    <div className="login-page">
      <div className="login-container">
        
        <h2 className="login-title">Create an account     </h2>
                                    
      </div>

      <div className="login-container">
        <div className="login-card">
          <form className="login-form">
            <div>
              <label className="login-label">Email address</label>
              <input type="email" className="login-input" />
            </div>

            <div>
              <label className="login-label">Username</label>
              <input type="username" className="login-input" />
            </div>

            <div>
              <label className="login-label">Password</label>
              <input type="password" className="login-input" />
            </div>

           

            <button type="submit" className="login-button">
              Sign Up
            </button>

          </form>
          
        </div>
      </div>
    </div>
  );
}
