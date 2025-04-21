import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import SettingsModal from './components/SettingsModal';
import SignInPage from './components/SignInPage';
import SignUpPage from './components/SignUpPage';

function App() {
  const [history, setHistory] = useState(["New Chat"]);
  const [showSettings, setShowSettings] = useState(false);
  const [voiceActivate, setVoiceActivate] = useState(false);
  const [sessionId, setSessionId] = useState(Date.now());
  const [user, setUser] = useState(null); // State to store user info
  const [showSignOut, setShowSignOut] = useState(false); // State to toggle sign-out option
  const [message, setMessage] = useState(''); // State to show success messages
  const navigate = useNavigate();

  useEffect(() => {
    // Retrieve user info from local storage on app load
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleNewChat = () => {
    setHistory((prev) => [...prev, "New Chat"]);
    setSessionId(Date.now());
  };

  const handleSignInClick = () => {
    if (user) {
      // Toggle the sign-out option if the user is already signed in
      setShowSignOut((prev) => !prev);
    } else {
      // Navigate to the sign-in page if the user is not signed in
      navigate('/signin');
    }
  };

  const handleSignOut = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        credentials: 'include', // Include cookies for JWT
      });

      if (response.ok) {
        // Clear user info and access token from local storage
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        setUser(null);
        setShowSignOut(false);

        // Show sign-out success message
        setMessage('Sign Out successful!');
        setTimeout(() => {
          setMessage(''); // Clear the message after 1 second
          navigate('/'); // Redirect to the home page
        }, 1000);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to log out. Please try again.');
      }
    } catch (err) {
      console.error('Error during logout:', err);
      alert('An error occurred. Please try again later.');
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData); // Update the user state dynamically
  };

  return (
    <div className="app">
      {message && <div className="message-banner">{message}</div>}
      <Routes>
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/signin" element={<SignInPage onLoginSuccess={handleLoginSuccess} />} />
        <Route
          path="/"
          element={
            <>
              <Sidebar 
                history={history} 
                onNewChat={handleNewChat} 
                showSettings={showSettings}
                setShowSettings={setShowSettings}
              />
              <div className="chat-container">
                <h1>BucBuddy</h1>
                <div className="user-info">
                  {user ? (
                    <>
                      <span className="user-name">Hi, {user.firstname}</span>
                      <button 
                        id="signin-button" 
                        onClick={handleSignInClick}
                      >
                        <i className="fas fa-sign-in-alt"></i>
                      </button>
                      {showSignOut && (
                        <button 
                          id="signout-button" 
                          onClick={handleSignOut}
                          className="signout-button"
                        >
                          Sign Out
                        </button>
                      )}
                    </>
                  ) : (
                    <button 
                      id="signin-button" 
                      onClick={handleSignInClick}
                    >
                      <i className="fas fa-sign-in-alt"></i>
                    </button>
                  )}
                </div>
                {showSettings && (
                  <SettingsModal 
                    voiceActivate={voiceActivate}
                    setVoiceActivate={setVoiceActivate}
                    onClose={() => setShowSettings(false)}
                  />
                )}
                <ChatWindow 
                  setHistory={setHistory}
                  voiceActivate={voiceActivate}
                  sessionId={sessionId}
                />
              </div>
            </>
          }
        />
      </Routes>
    </div>
  );
}

export default App;