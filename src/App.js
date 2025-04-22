import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import SettingsModal from './components/SettingsModal';
import SignInPage from './components/SignInPage';
import SignUpPage from './components/SignUpPage';

function App() {
  const [history, setHistory] = useState([]);
  const [activeChat, setActiveChat] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [voiceActivate, setVoiceActivate] = useState(false);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const navigate = useNavigate();

  // Fetch user chat history on login
  useEffect(() => {
    const fetchUserHistory = async () => {
      if (!user || !localStorage.getItem('access_token')) {
        setHistory([]); // Empty history for guest mode
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
          setActiveChat(0);
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

  const handleNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: 'New Chat',
      conversationId: null
    };
    setHistory(prev => [...prev, newChat]);
    setActiveChat(history.length);
  };

  const handleChatSelect = (index) => {
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

  const handleSignOut = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    setHistory([]);
    setActiveChat(0);
    console.log('Sign out clicked');
    navigate('/signin');
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    console.log('Login successful, user:', userData);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="app">
            <Sidebar 
              history={history} 
              onNewChat={handleNewChat} 
              showSettings={showSettings}
              setShowSettings={setShowSettings}
              activeChat={activeChat}
              onChatSelect={handleChatSelect}
            />
            <div className="chat-container">
              <h1>BucBuddy</h1>
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
                currentChat={history[activeChat]}
                activeChat={activeChat}
                updateChatTitle={updateChatTitle}
                history={history}
                accessToken={localStorage.getItem('access_token')}
                onChatSelect={handleChatSelect}
              />
            </div>
          </div>
        }
      />
      <Route path="/signin" element={<SignInPage onLoginSuccess={handleLoginSuccess} />} />
      <Route path="/signup" element={<SignUpPage />} />
    </Routes>
  );
}

export default App;