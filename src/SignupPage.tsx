import "./SignupPage.css";
import { useState } from "react";
import { useNavigate } from 'react-router-dom';

export default function SignupPage() {
  const [email0, setEmail0] = useState("");
  const [email1, setEmail1] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (email0 !== email1) {
      alert("Emails do not match!");
      return;
    }

    try {
      const response = await fetch("http://localhost:5001/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email0,
          email1,
          username,
          name,
          password,
        }),
      });

      const data = await response.json();
      console.log("Response:", data);

      if (response.ok) {
        alert(data.message);
        navigate('/verify-email'); 
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Network error. Please try again.");
    }
  };
// 
  return (
    <div className="signup-page">
      <div className="signup-wrapper">
        <h2 className="signup-title">Create an account</h2>
        
        <div className="signup-card">
          <div className="signup-form">
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Email address</label>
                <input 
                  type="email" 
                  className="form-input"
                  value={email0}
                  onChange={(e) => setEmail0(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Confirm email</label>
                <input 
                  type="email" 
                  className="form-input"
                  value={email1}
                  onChange={(e) => setEmail1(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Name</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="form-field-full">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button onClick={handleSubmit} className="signup-button">
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}