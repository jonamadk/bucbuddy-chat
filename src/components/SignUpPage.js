import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './SignUpPage.css';

function SignUpPage({ theme, onLoginSuccess }) {
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // ✅ Handle Google OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userData = params.get('user');
    const token = params.get('token');
    const errorMessage = params.get('error');

    if (errorMessage) {
      setError(`Google OAuth failed: ${decodeURIComponent(errorMessage)}. Please try again or use email/password.`);
      return;
    }

    if (userData && token) {
      try {
        const parsedUser = JSON.parse(decodeURIComponent(userData));
        localStorage.setItem('access_token', token);
        localStorage.setItem('user', JSON.stringify(parsedUser));
        if (typeof onLoginSuccess === 'function') {
          onLoginSuccess(parsedUser);
        }
        navigate('/', { replace: true });
      } catch (err) {
        console.error('OAuth redirect error:', err);
        setError('Failed to process Google OAuth login. Try again or use email/password.');
      }
    }
  }, [onLoginSuccess, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstname,
          lastname,
          email,
          password,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Registration successful! Redirecting to login...');
        setTimeout(() => {
          navigate('/signin');
        }, 2000);
      } else {
        setError(data.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:8000/api/auth/login'; // Same as SignInPage
  };

  return (
    <div className={`signup-container ${theme}`}>
      <div className="signup-card">
        <h1>Create an Account</h1>
        <form className="signup-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="First Name"
            value={firstname}
            onChange={(e) => setFirstname(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastname}
            onChange={(e) => setLastname(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="password-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
          <div className="password-wrapper">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
          <button type="submit" className="signup-button" disabled={isLoading}>
            {isLoading ? 'Registering...' : 'Sign Up'}
          </button>
        </form>

        {successMessage && <p className="success-message">{successMessage}</p>}
        {error && <p className="error-message">{error}</p>}

        <div className="signup-divider">
          <span>
            Already have an account?{' '}
            <button className="login-link" onClick={() => navigate('/signin')}>
              Log in
            </button>
          </span>
          <div className="or-divider">
            <hr /> <span>OR</span> <hr />
          </div>
          <button className="google-signin" onClick={handleGoogleLogin} disabled={isLoading}>
            <i className="fab fa-google"></i> Continue with Google
          </button>
        </div>

   
        <button className="back-button" onClick={() => navigate('/')} aria-label="Back">
          <i className="fas fa-arrow-left"></i> Back 
        </button>
      </div>
    </div>
  );
}

export default SignUpPage;
