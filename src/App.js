// src/App.js
import React, { useState, useEffect, Component, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import SignInPage from './components/SignInPage';
import SignUpPage from './components/SignUpPage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h1>Something went wrong.</h1>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [history, setHistory] = useState([]);
  const [activeChat, setActiveChat] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [theme, setTheme] = useState('light');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const sidebarRef = useRef(null);

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  useEffect(() => {
    const fetchUserHistory = async () => {
      if (!user || !localStorage.getItem('access_token')) {
        setHistory([]);
        return;
      }
      try {
        const response = await fetch('http://localhost:8000/api/auth/conversations', {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error(`Failed to fetch conversations: ${response.status}`);
        const data = await response.json();
        if (data.conversations) {
          const formatted = data.conversations.map((conv) => ({
            id: conv.conversationId,
            title: conv.title || 'New Chat',
            conversationId: conv.conversationId,
          }));
          setHistory(formatted);
          setActiveChat(formatted.length > 0 ? 0 : 0);
        } else setHistory([]);
      } catch (error) {
        console.error('Error fetching history:', error);
        setHistory([]);
      }
    };
    fetchUserHistory();
  }, [user]);

  useEffect(() => {
    if (history.length === 0) {
      setHistory([{ id: Date.now(), title: 'New Chat', conversationId: null }]);
      setActiveChat(0);
    }
  }, [history]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobileSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsMobileSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileSidebarOpen]);

  const handleNewChat = () => {
    const newChat = { id: Date.now(), title: 'New Chat', conversationId: null };
    setHistory((prev) => [newChat, ...prev]);
    setActiveChat(0);
  };

  const handleChatSelect = (index) => {
    setActiveChat(index);
    setIsMobileSidebarOpen(false);
  };

  const updateChatTitle = (index, newTitle) => {
    setHistory((prev) => prev.map((chat, i) => (i === index ? { ...chat, title: newTitle } : chat)));
  };

  const handleSignIn = () => navigate('/signin');

  const handleSignUp = () => navigate('/signup');

  const handleSignOut = async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      await fetch('http://localhost:8000/api/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      }).catch(console.error);
    }
    localStorage.clear();
    setUser(null);
    setHistory([]);
    setActiveChat(0);
    navigate('/signin');
  };

  const handleLoginSuccess = (userData) => setUser(userData);

  return (
    <div className="app">
      <div className="content">
        <ErrorBoundary>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <Sidebar
                    ref={sidebarRef}
                    history={history}
                    onNewChat={handleNewChat}
                    showSettings={showSettings}
                    setShowSettings={setShowSettings}
                    activeChat={activeChat}
                    onChatSelect={handleChatSelect}
                    toggleTheme={toggleTheme}
                    theme={theme}
                    isMobileSidebarOpen={isMobileSidebarOpen}
                    setIsMobileSidebarOpen={setIsMobileSidebarOpen}
                  />
                  <div className="chat-container">
                    <div className="chat-header-user-info">
                      <div className="toggle-and-title">
                        <button
                          className="mobile-toggle-button"
                          onClick={() => setIsMobileSidebarOpen(true)}
                          aria-label="Open Sidebar"
                        >
                          <FontAwesomeIcon icon={faBars} />
                        </button>
                        <h3 className="bucbuddy-title">BucBuddy</h3>
                      </div>
                      <div className="user-info">
                        {!user ? (
                          <>
                            <button className="login-button" onClick={handleSignIn}>
                              Log in
                            </button>
                            <button className="signup-main-button" onClick={handleSignUp}>
                              Sign up
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="user-icon">{user.email.charAt(0).toUpperCase()}</div>
                            <button id="signout-button" onClick={handleSignOut}>
                              Sign out
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <ChatWindow
                      setHistory={setHistory}
                      currentChat={history[activeChat]}
                      activeChat={activeChat}
                      updateChatTitle={updateChatTitle}
                      history={history}
                      accessToken={localStorage.getItem('access_token')}
                      onChatSelect={handleChatSelect}
                    />
                  </div>
                </>
              }
            />
            <Route path="/signin" element={<SignInPage theme={theme} toggleTheme={toggleTheme} onLoginSuccess={handleLoginSuccess} />} />
            <Route path="/signup" element={<SignUpPage theme={theme} toggleTheme={toggleTheme} />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default App;
