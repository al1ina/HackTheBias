import { useState } from "react";
import { Link } from "react-router-dom";
import "./VerifyPage.css";

export default function VerifyPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Later this will call your backend API
    console.log("Reset password for:", email);

    setSubmitted(true);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2 className="login-title">Forgot your password?</h2>

        {submitted ? (
          <p>
            If an account exists for <strong>{email}</strong>,
            you’ll receive a password reset email shortly.
          </p>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-label">Email address or username</label>
            <input
              type="email"
              className="login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <button type="submit" className="login-button">
              Send reset link
            </button>
          </form>
        )}

        <Link to="/" className="login-forgot">
          Back to login
        </Link>
      </div>
    </div>
  );
}
