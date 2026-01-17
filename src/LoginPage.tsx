import "./LoginPage.css";
import { Link } from 'react-router-dom';
import { useState } from "react";


export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
  console.log("handleSubmit called!");
  e.preventDefault();

  try {
    const response = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();
    console.log("Response:", data);
    console.log("Sent:", username, password);
  } catch (error) {
    console.error("Error:", error);
  }
};
  return (
    <div className="login-page">
      <div className="login-container">
        
        <h2 className="login-title">Login to your account</h2>
        
      </div>

      <div className="login-container">
        <div className="login-card">
          <form className="login-form" onSubmit={handleSubmit}>
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
