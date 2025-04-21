import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SignUpPage.css';

function SignUpPage() {
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

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
          navigate('/signin'); // Redirect to the sign-in page
        }, 2000);
      } else {
        setError(data.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Error during registration:', err);
      setError('An error occurred. Please try again later.');
    }
  };

  return (
    <div className="signup-container">
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
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit" className="signup-button">Sign Up</button>
      </form>
      {successMessage && <p className="success-message">{successMessage}</p>}
      {error && <p className="error-message">{error}</p>}
      <p className="signin-text">
        Already have an account? <a href="/signin" className="signin-link">Sign in</a>
      </p>
    </div>
  );
}

export default SignUpPage;