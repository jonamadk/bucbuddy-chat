import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import './App.css';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import SettingsModal from './components/SettingsModal';
import SignInPage from './components/SignInPage';
import SignUpPage from './components/SignUpPage';
import { debounce } from './utils/debounce';

function App() {
  const [history, setHistory] = useState(() => {
    const cached = localStorage.getItem('chat_history');
    return cached ? JSON.parse(cached) : ['New Chat'];
  });
  const [showSettings, setShowSettings] = useState(false);
  const [voiceActivate, setVoiceActivate] = useState(false);
  const [sessionId, setSessionId] = useState(Date.now());
  const [user, setUser] = useState(null);
  const [showSignOut, setShowSignOut] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null); // Always null or array
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Persist history to localStorage
  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(history));
  }, [history]);

  // Load user and cached data
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        fetchChatHistory();
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const fetchChatHistory = useCallback(
    debounce(async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setHistory(['New Chat']);
          setSelectedConversation(null);
          return;
        }

        // Check cached conversations
        const cachedConversations = localStorage.getItem('conversations');
        if (cachedConversations) {
          try {
            const parsed = JSON.parse(cachedConversations);
            const chatTitles = parsed.map((conv) => conv.title || 'New Chat');
            setHistory(['New Chat', ...chatTitles]);
            return;
          } catch (error) {
            console.error('Error parsing cached conversations:', error);
            localStorage.removeItem('conversations');
          }
        }

        setIsLoading(true);
        const response = await fetch('http://127.0.0.1:8000/api/auth/conversations', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Fetched conversations:', data);
          const chatTitles = data.conversations.map((conv) => conv.title || 'New Chat');
          setHistory(['New Chat', ...chatTitles]);
          localStorage.setItem('conversations', JSON.stringify(data.conversations));
        } else {
          console.error('Failed to fetch chat history:', response.status);
          setHistory(['New Chat']);
          setSelectedConversation(null);
        }
      } catch (error) {
        console.error('Error fetching chat history:', error);
        setHistory(['New Chat']);
        setSelectedConversation(null);
      } finally {
        setIsLoading(false);
      }
    }, 500),
    []
  );

  const fetchConversationById = useCallback(
    debounce(async (conversationId) => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('access_token');
        if (!token) {
          navigate('/signin');
          return;
        }

        // Check cached conversation
        const cachedConversations = localStorage.getItem('conversations');
        if (cachedConversations) {
          try {
            const parsed = JSON.parse(cachedConversations);
            const conversation = parsed.find((conv) => conv.conversationid === parseInt(conversationId));
            if (conversation) {
              console.log('Loaded conversation from cache:', conversation);
              setSelectedConversation(conversation.chat_history || []);
              localStorage.setItem(`conversation_${sessionId}`, conversation.conversationid);
              localStorage.setItem('current_conversation_id', conversation.conversationid);
              return;
            }
          } catch (error) {
            console.error('Error parsing cached conversations:', error);
            localStorage.removeItem('conversations');
          }
        }

        const response = await fetch(`http://127.0.0.1:8000/api/auth/conversations/${conversationId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Fetched conversation:', data);
          const conversation = data.conversation;
          setSelectedConversation(conversation.chat_history || []);
          localStorage.setItem(`conversation_${sessionId}`, conversation.conversationid);
          localStorage.setItem('current_conversation_id', conversation.conversationid);

          // Update cached conversations
          const cached = localStorage.getItem('conversations');
          let conversations = cached ? JSON.parse(cached) : [];
          conversations = [
            ...conversations.filter((conv) => conv.conversationid !== conversation.conversationid),
            conversation,
          ];
          localStorage.setItem('conversations', JSON.stringify(conversations));
        } else {
          console.error('Failed to fetch conversation data:', response.status);
          setSelectedConversation(null);
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching conversation data:', error);
        setSelectedConversation(null);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    }, 500),
    [sessionId, navigate]
  );

  const handleChatSelect = useCallback(
    async (chatTitle) => {
      console.log('handleChatSelect:', chatTitle);
      if (chatTitle === 'New Chat') {
        setSelectedConversation(null);
        localStorage.removeItem('current_conversation_id');
        navigate('/');
        return;
      }

      try {
        setIsLoading(true);
        const token = localStorage.getItem('access_token');
        const cachedConversations = localStorage.getItem('conversations');
        let conversation;

        if (cachedConversations) {
          try {
            const parsed = JSON.parse(cachedConversations);
            conversation = parsed.find((conv) => conv.title === chatTitle);
            if (conversation) {
              console.log('Loaded conversation from cache:', conversation);
              setSelectedConversation(conversation.chat_history || []);
              localStorage.setItem(`conversation_${sessionId}`, conversation.conversationid);
              localStorage.setItem('current_conversation_id', conversation.conversationid);
              navigate(`/conversation/${conversation.conversationid}`);
              return;
            }
          } catch (error) {
            console.error('Error parsing cached conversations:', error);
            localStorage.removeItem('conversations');
          }
        }

        const response = await fetch(`http://127.0.0.1:8000/api/auth/conversations`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          conversation = data.conversations.find((conv) => conv.title === chatTitle);
          if (conversation) {
            console.log('Fetched conversation:', conversation);
            setSelectedConversation(conversation.chat_history || []);
            localStorage.setItem(`conversation_${sessionId}`, conversation.conversationid);
            localStorage.setItem('current_conversation_id', conversation.conversationid);
            navigate(`/conversation/${conversation.conversationid}`);

            // Update cached conversations
            const cached = localStorage.getItem('conversations');
            let conversations = cached ? JSON.parse(cached) : [];
            conversations = [
              ...conversations.filter((conv) => conv.conversationid !== conversation.conversationid),
              conversation,
            ];
            localStorage.setItem('conversations', JSON.stringify(conversations));
          } else {
            console.error('Conversation not found:', chatTitle);
            setSelectedConversation(null);
            navigate('/');
          }
        } else {
          console.error('Failed to fetch conversation data:', response.status);
          setSelectedConversation(null);
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching conversation data:', error);
        setSelectedConversation(null);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, navigate]
  );

  const handleNewChat = useCallback(() => {
    console.log('handleNewChat: Setting selectedConversation to null');
    setHistory((prev) => {
      if (prev[0] !== 'New Chat') {
        return ['New Chat', ...prev];
      }
      return prev;
    });
    setSelectedConversation(null);
    localStorage.removeItem('current_conversation_id');
    navigate('/');
  }, [navigate]);

  const handleUpdateChatTitle = useCallback((newTitle, conversationId) => {
    console.log('handleUpdateChatTitle:', { newTitle, conversationId });
    // Only update history for new conversations (no conversationId)
    if (!conversationId) {
      setHistory((prev) => {
        const index = prev.indexOf('New Chat');
        if (index !== -1) {
          const newHistory = [...prev];
          newHistory[index] = newTitle.length > 30 ? newTitle.substring(0, 30) + '...' : newTitle;
          return newHistory;
        }
        return [newTitle, ...prev];
      });
    }
  }, []);

  const handleSignInClick = () => {
    if (user) {
      setShowSignOut((prev) => !prev);
    } else {
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
        credentials: 'include',
      });

      if (response.ok) {
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('conversations');
        localStorage.removeItem('chat_history');
        setUser(null);
        setShowSignOut(false);
        setHistory(['New Chat']);
        setSelectedConversation(null);
        setSessionId(Date.now());
        setMessage('Sign Out successful!');
        setTimeout(() => {
          setMessage('');
          navigate('/');
        }, 1000);
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to log out. Please try again.');
      }
    } catch (error) {
      console.error('Error during logout:', error);
      setMessage('An error occurred. Please try again later.');
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    fetchChatHistory();
    handleNewChat();
  };

  // Component to handle conversation route
  const ConversationRoute = () => {
    const { conversation_id } = useParams();
    useEffect(() => {
      if (conversation_id && user && !isLoading) {
        console.log('ConversationRoute: Fetching conversation', conversation_id);
        fetchConversationById(conversation_id);
      }
    }, [conversation_id, user]);
    return null;
  };

  return (
    <div className="app">
      {message && <div className="message-banner">{message}</div>}
      {isLoading && <div className="loading-overlay">Loading...</div>}
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
                onChatSelect={handleChatSelect}
                showSettings={showSettings}
                setShowSettings={setShowSettings}
              />
              <div className="chat-container">
                <h1>BucBuddy</h1>
                <div className="user-info">
                  {user ? (
                    <>
                      <span className="user-name">Hi, {user.firstname}</span>
                      <button id="signin-button" onClick={handleSignInClick}>
                        <i className="fas fa-sign-in-alt"></i>
                      </button>
                      {showSignOut && (
                        <button id="signout-button" onClick={handleSignOut} className="signout-button">
                          Sign Out
                        </button>
                      )}
                    </>
                  ) : (
                    <button id="signin-button" onClick={handleSignInClick}>
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
                  selectedConversation={selectedConversation}
                  setSelectedConversation={setSelectedConversation}
                  onUpdateChatTitle={handleUpdateChatTitle}
                />
              </div>
            </>
          }
        />
        <Route
          path="/conversation/:conversation_id"
          element={
            <>
              <ConversationRoute />
              <Sidebar
                history={history}
                onNewChat={handleNewChat}
                onChatSelect={handleChatSelect}
                showSettings={showSettings}
                setShowSettings={setShowSettings}
              />
              <div className="chat-container">
                <h1>BucBuddy</h1>
                <div className="user-info">
                  {user ? (
                    <>
                      <span className="user-name">Hi, {user.firstname}</span>
                      <button id="signin-button" onClick={handleSignInClick}>
                        <i className="fas fa-sign-in-alt"></i>
                      </button>
                      {showSignOut && (
                        <button id="signout-button" onClick={handleSignOut} className="signout-button">
                          Sign Out
                        </button>
                      )}
                    </>
                  ) : (
                    <button id="signin-button" onClick={handleSignInClick}>
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
                  selectedConversation={selectedConversation}
                  setSelectedConversation={setSelectedConversation}
                  onUpdateChatTitle={handleUpdateChatTitle}
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