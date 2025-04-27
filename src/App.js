import React, { useState, useEffect, Component } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import Footer from './components/Footer';
import SignInPage from './components/SignInPage';
import SignUpPage from './components/SignUpPage';

// eslint-disable-next-line react/prop-types
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
  const navigate = useNavigate();

  // Fetch user chat history on login
  useEffect(() => {
    const fetchUserHistory = async () => {
      if (!user || !localStorage.getItem('access_token')) {
        setHistory([]);
        return;
      }

      try {
        const response = await fetch('http://localhost:8000/api/auth/conversations', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error(`Failed to fetch conversations: ${response.status} ${response.statusText}`);
        const data = await response.json();
        console.log('Fetched user history:', JSON.stringify(data, null, 2));

        if (data.conversations && Array.isArray(data.conversations)) {
          const formattedHistory = data.conversations.map(conv => ({
            id: conv.conversationId,
            title: conv.title || 'New Chat',
            conversationId: conv.conversationId
          }));
          setHistory(formattedHistory);
          setActiveChat(formattedHistory.length > 0 ? 0 : 0);
        } else {
          setHistory([]);
        }
      } catch (error) {
        console.error('Error fetching user history:', error.message, error.stack);
        setHistory([]);
      }
    };

    fetchUserHistory();
  }, [user]);

  // Initialize with a default chat
  useEffect(() => {
    if (history.length === 0) {
      const defaultChat = {
        id: Date.now(),
        title: 'New Chat',
        conversationId: null
      };
      setHistory([defaultChat]);
      setActiveChat(0);
    }
  }, []); // Run once on component mount

  const handleNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: 'New Chat',
      conversationId: null
    };
    setHistory(prev => [newChat, ...prev]); // Prepend new chat
    setActiveChat(0); // Select the new chat (index 0)
  };

  const handleChatSelect = (index) => {
    console.log('Selecting chat at index:', index);
    setActiveChat(index);
  };

  const updateChatTitle = (index, newTitle) => {
    setHistory(prev => prev.map((chat, i) => 
      i === index ? { ...chat, title: newTitle } : chat
    ));
  };

  const handleSignIn = () => {
    navigate('/signin');
  };

  const handleSignOut = async () => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      try {
        const response = await fetch('http://localhost:8000/api/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) {
          throw new Error(`Logout failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Logout response:', data);
        alert('You have been logged out successfully.');
      } catch (error) {
        console.error('Error during logout:', error.message, error.stack);
      }
    }

    // Clear local state and storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    setHistory([]);
    setActiveChat(0);
    console.log('Sign out completed');
    navigate('/signin');
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    console.log('Login successful, user:', userData);
  };

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
                    history={history} 
                    onNewChat={handleNewChat} 
                    showSettings={showSettings}
                    setShowSettings={setShowSettings}
                    activeChat={activeChat}
                    onChatSelect={handleChatSelect}
                  />
                  <div className="chat-container">
                    <h1>
                      <span className="buc">Buc</span>
                      <span className="buddy">Buddy</span>
                    </h1>
                    <div className="user-info">
                      <span className="user-name">{user ? user.email : 'Guest'}</span>
                      {!user ? (
                        <button id="signin-button" onClick={handleSignIn}>
                          <i className="fas fa-sign-in-alt"></i>
                        </button>
                      ) : (
                        <button id="signout-button" onClick={handleSignOut}>
                          <i className="fas fa-sign-out-alt"></i>
                        </button>
                      )}
                    </div>
                    {/* {showSettings && (
                      <SettingsModal 
                        onClose={() => setShowSettings(false)}
                      />
                    )} */}
                    <ChatWindow 
                      setHistory={setHistory}
                      currentChat={history[activeChat] || {
                        id: Date.now(),
                        title: 'New Chat',
                        conversationId: null
                      }}
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
            <Route path="/signin" element={<SignInPage onLoginSuccess={handleLoginSuccess} />} />
            <Route path="/signup" element={<SignUpPage />} />
          </Routes>
        </ErrorBoundary>
      </div>
      <Footer />
    </div>
  );
}

export default App;