import "./SignupPage.css";
import { useState } from "react";
import { Link, useNavigate } from 'react-router-dom';

export default function SignupPage() {
  const [email0, setEmail0] = useState("");
  const [email1, setEmail1] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
  console.log("handleSubmit called!");
  e.preventDefault();

  try {
    const response = await fetch("http://localhost:5000/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email0,
        email1,
        username,
        password,
      }),
    });

    const data = await response.json();
    console.log("Response:", data);
    console.log("Sent:", email0, email1, username, password);
    if (response.ok) {
        navigate('/verify-email'); 
      }
  } catch (error) {
    console.error("Error:", error);
  }
};
  return (
    <div className="login-page">
      <div className="login-container">
        
        <h2 className="login-title">Create an account     </h2>
                                    
      </div>

      <div className="login-container">
        <div className="login-card">
          <form className="login-form" onSubmit={handleSubmit}>
            <div>
              <label className="login-label">Email address</label>
              <input 
                type="email" 
                className="login-input" 
                value={email0}
                onChange={(e) => setEmail0(e.target.value)}
              />
            </div>
            <div>
              <label className="login-label">Reconfirm email address</label>
              <input 
                type="email" 
                className="login-input" 
                value={email1}
                onChange={(e) => setEmail1(e.target.value)}
              />
            </div>

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

           

            <button type="submit" className="login-button">
              Sign Up
            </button>

          </form>
          
        </div>
      </div>
    </div>
  );
}
