import "./LoginPage.css";
import { Link, useNavigate } from 'react-router-dom';
import { useState } from "react";


export default function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please enter username and password.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.login) {
        navigate("/home"); // <-- next page route CHNAGE THIS
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Backend server not running.");
      console.error(err);
    }
  };
  return (
    <div className="login-page">
      <div className="login-container">
        
        <h2 className="login-title">Login to your account</h2>
        
      </div>

      <div className="login-container">
        <div className="login-card">
          <form className="login-form" onSubmit={handleLogin}>
            <div>
              <label className="login-label">Username</label>
              <input
                type="text"
                className="login-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="login-label">Password</label>
              <input 
                  type="password" 
                  className="login-input" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            {error && <p style={{ color: "red" }}>{error}</p>}

            <Link to="/forgot-password" className="login-forgot">
              Forgot password?
            </Link>


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
