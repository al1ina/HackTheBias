import "./VerifyEmailPage.css";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function VerifyEmailPage() {
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) (nextInput as HTMLInputElement).focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) (prevInput as HTMLInputElement).focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newCode = pastedData.split('');
    setVerificationCode([...newCode, ...Array(6 - newCode.length).fill('')]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const code = verificationCode.join('');
    
    if (code.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch('http://localhost:5000/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await fetch('http://localhost:5000/resend-verification', {
        method: 'POST',
      });
      alert('Verification code sent!');
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    }
  };

  if (success) {
    return (
      <div className="verify-page">
        <div className="verify-card">
          <div className="verify-header">
            <div className="success-icon-container">
              <svg className="success-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="success-title">Email Verified!</h2>
            <p className="success-description">Your account has been successfully verified.</p>
            <button
              onClick={() => navigate('/login')}
              className="success-button"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-page">
      <div className="verify-card">
        <div className="verify-header">
          <div className="verify-icon-container">
            <svg className="verify-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="verify-title">Verify Your Email</h2>
          <p className="verify-description">
            We've sent a 6-digit code to your email address. Please enter it below.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="code-inputs-container" onPaste={handlePaste}>
            {verificationCode.map((digit, index) => (
              <input
                key={index}
                id={`code-${index}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="code-input"
                disabled={isVerifying}
              />
            ))}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className="verify-button"
          >
            {isVerifying ? 'Verifying...' : 'Verify Email'}
          </button>

          <div className="resend-section">
            <p className="resend-text">Didn't receive the code?</p>
            <button
              type="button"
              onClick={handleResend}
              className="resend-button"
            >
              Resend Code
            </button>
          </div>
        </form>

        {/* <div className="back-section">
          <button
            onClick={() => navigate('/login')}
            className="back-button"
          >
            ← Back to Login
          </button>
        </div> */}
      </div>
    </div>
  );
}