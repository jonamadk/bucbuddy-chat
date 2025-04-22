// src/components/SignInPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './SignInPage.css';

function SignInPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  // Handle Google OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userData = params.get('user');
    const token = params.get('token');

    if (userData && token) {
      try {
        const parsedUser = JSON.parse(decodeURIComponent(userData));
        localStorage.setItem('access_token', token);
        localStorage.setItem('user', JSON.stringify(parsedUser));
        onLoginSuccess(parsedUser);
        navigate('/', { replace: true });
      } catch (err) {
        console.error('OAuth redirect error:', err);
      }
    }
  }, [onLoginSuccess, navigate]);

  // Handle email/password login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setSuccessMessage('Login successful!');
        onLoginSuccess(data.user);
        setTimeout(() => navigate('/'), 1000);
      } else {
        setError(data.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Error during login:', err);
      setError('An error occurred. Please try again later.');
    }
  };

  // Redirect to Flask OAuth route
  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:8000/api/auth/login';
  };

  return (
    <div className="signin-container">
      <h1>Welcome back</h1>
      <form className="signin-form" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="continue-button">Continue</button>
      </form>
      {successMessage && <p className="success-message">{successMessage}</p>}
      {error && <p className="error-message">{error}</p>}
      <p className="signup-text">
        Don't have an account? <a href="/signup" className="signup-link">Sign up</a>
      </p>
      <div className="divider"><span>OR</span></div>
      <button className="google-signin" onClick={handleGoogleLogin}>
        <i className="fab fa-google"></i> Continue with Google
      </button>
    </div>
  );
}

export default SignInPage;
