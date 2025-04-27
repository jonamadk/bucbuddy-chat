import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './SignInPage.css';

function SignInPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // State for toggling password visibility
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Handle Google OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userData = params.get('user');
    const token = params.get('token');
    const errorMessage = params.get('error');

    if (errorMessage) {
      setError(`Google OAuth failed: ${decodeURIComponent(errorMessage)}. Please try again or use email/password login.`);
      return;
    }

    if (userData && token) {
      try {
        const parsedUser = JSON.parse(decodeURIComponent(userData));
        localStorage.setItem('access_token', token);
        localStorage.setItem('user', JSON.stringify(parsedUser));
        console.log('OAuth login successful:', parsedUser);
        if (typeof onLoginSuccess === 'function') {
          onLoginSuccess(parsedUser);
        } else {
          console.warn('onLoginSuccess is not a function:', onLoginSuccess);
        }
        navigate('/', { replace: true });
      } catch (err) {
        console.error('OAuth redirect error:', err);
        setError('Failed to process Google OAuth login. Please try again or use email/password login.');
      }
    }
  }, [onLoginSuccess, navigate]);

  // Handle email/password login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('Login response:', JSON.stringify(data, null, 2));

      if (response.ok) {
        if (!data.access_token || !data.user) {
          throw new Error('Invalid response: missing access_token or user');
        }
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setSuccessMessage('Login successful!');
        if (typeof onLoginSuccess === 'function') {
          onLoginSuccess(data.user);
        } else {
          console.warn('onLoginSuccess is not a function:', onLoginSuccess);
        }
        navigate('/');
      } else {
        setError(data.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Error during login:', err.message, err.stack);
      let errorMessage = 'An error occurred. Please try again later.';
      if (err.message.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to the server. Please check if the server is running or try again later.';
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect to Flask OAuth route
  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:8000/api/auth/login';
  };

  return (
    <div className="signin-container">
      <h1>Welcome Back</h1>
      <form className="signin-form" onSubmit={handleSubmit}>
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
        <div className="button-container">
          <button type="submit" className="continue-button" disabled={isLoading}>
            {isLoading ? 'Signing In...' : 'Continue'}
          </button>
        </div>
      </form>
      {successMessage && <p className="success-message">{successMessage}</p>}
      {error && <p className="error-message">{error}</p>}
      <p className="signup-text">
        Don't have an account?{' '}
        <a
          href="/signup"
          className="signup-link"
          onClick={(e) => {
            e.preventDefault();
            navigate('/signup');
          }}
        >
          Sign Up
        </a>
      </p>
      <div className="divider"><span>OR</span></div>
      <div className="button-container">
        <button className="google-signin" onClick={handleGoogleLogin} disabled={isLoading}>
          <i className="fab fa-google"></i> Continue with Google
        </button>
      </div>
      <button className="back-button" onClick={() => navigate('/')} aria-label="Back to Home">
        <i className="fas fa-arrow-left"></i> Back to Home
      </button>
    </div>
  );
}

export default SignInPage;