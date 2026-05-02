import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import './App.css';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import SettingsModal from './components/SettingsModal';
import SignInPage from './components/SignInPage';
import SignUpPage from './components/SignUpPage';
import ConsentModal from './components/ConsentModal';
import { debounce } from './utils/debounce';

function App() {
  const [history, setHistory] = useState(() => {
    const cached = localStorage.getItem('chat_history');
    if (!cached) return ['New Chat'];
    try {
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed : ['New Chat'];
    } catch (error) {
      console.error('Error parsing chat_history from localStorage:', error);
      localStorage.removeItem('chat_history');
      return ['New Chat'];
    }
  });

  const [showSettings, setShowSettings] = useState(false);
  const [voiceActivate, setVoiceActivate] = useState(false);
  const [themeVariant, setThemeVariant] = useState(() => localStorage.getItem('theme') || 'light');
  const [sessionId, setSessionId] = useState(Date.now());
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();
  const lastHandledRouteIdRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('theme', themeVariant);
  }, [themeVariant]);

  const getConversationId = useCallback((conversation) => {
    if (!conversation) return null;
    return conversation.conversationid || conversation.conversationId || conversation.id || null;
  }, []);

  const getConversationTitle = useCallback((conversation) => {
    if (!conversation) return 'Untitled Chat';
    return conversation.title || conversation.name || 'Untitled Chat';
  }, []);

  const buildHistoryList = useCallback((conversations = []) => {
    const seen = new Set();
    const cleaned = [];
    conversations.forEach((conv) => {
      if (!conv || typeof conv !== 'object') return;
      const convId = String(conv.conversationid || conv.conversationId || conv.id || '');
      if (!convId || seen.has(convId)) return;
      seen.add(convId);
      cleaned.push(conv);
    });
    return ['New Chat', ...cleaned];
  }, []);

  const fetchChatHistory = useCallback(
    debounce(async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) { setHistory(['New Chat']); setSelectedConversation(null); return; }
        const cachedConversations = localStorage.getItem('conversations');
        if (cachedConversations) {
          try {
            const parsed = JSON.parse(cachedConversations);
            setHistory(buildHistoryList(parsed));
            return;
          } catch (error) {
            console.error('Error parsing cached conversations:', error);
            localStorage.removeItem('conversations');
          }
        }
        setIsLoading(true);
        const response = await fetch('http://localhost:8000/api/auth/conversations', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const conversations = Array.isArray(data.conversations) ? data.conversations : [];
          setHistory(buildHistoryList(conversations));
          localStorage.setItem('conversations', JSON.stringify(conversations));
        } else {
          setHistory(['New Chat']); setSelectedConversation(null);
        }
      } catch (error) {
        setHistory(['New Chat']); setSelectedConversation(null);
      } finally {
        setIsLoading(false);
      }
    }, 500),
    [buildHistoryList]
  );

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        fetchChatHistory();
      } catch (error) {
        localStorage.removeItem('user');
      }
    }
  }, [fetchChatHistory]);

  const fetchConversationById = useCallback(
    debounce(async (conversationId) => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('access_token');
        if (!token) { navigate('/signin'); return; }
        const numericConversationId = Number(conversationId);
        if (!numericConversationId || Number.isNaN(numericConversationId)) return;
        const cachedConversations = localStorage.getItem('conversations');
        if (cachedConversations) {
          try {
            const parsed = JSON.parse(cachedConversations);
            const conversation = parsed.find((conv) => Number(getConversationId(conv)) === numericConversationId);
            if (conversation) {
              const convId = getConversationId(conversation);
              setSelectedConversation(conversation);
              localStorage.setItem(`conversation_${sessionId}`, String(convId));
              localStorage.setItem('current_conversation_id', String(convId));
              return;
            }
          } catch (error) { localStorage.removeItem('conversations'); }
        }
        const response = await fetch(`http://localhost:8000/api/auth/conversations/${numericConversationId}`, {
          method: 'GET', headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const conversation = data.conversation;
          const convId = getConversationId(conversation);
          setSelectedConversation(conversation);
          localStorage.setItem(`conversation_${sessionId}`, String(convId));
          localStorage.setItem('current_conversation_id', String(convId));
          const cached = localStorage.getItem('conversations');
          let conversations = [];
          try { conversations = cached ? JSON.parse(cached) : []; } catch (error) {}
          conversations = [...conversations.filter((conv) => Number(getConversationId(conv)) !== Number(convId)), conversation];
          localStorage.setItem('conversations', JSON.stringify(conversations));
          setHistory(buildHistoryList(conversations));
        } else {
          navigate('/');
        }
      } catch (error) {
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    }, 500),
    [sessionId, navigate, getConversationId, buildHistoryList]
  );

  const handleChatSelect = useCallback(async (chat) => {
    if (!chat) return;
    if (typeof chat === 'string' && chat === 'New Chat') {
      setSelectedConversation(null);
      localStorage.removeItem('current_conversation_id');
      lastHandledRouteIdRef.current = null;
      navigate('/');
      return;
    }
    try {
      const token = localStorage.getItem('access_token');
      if (!token) { navigate('/signin'); return; }
      const chatId = getConversationId(chat);
      if (chatId) {
        lastHandledRouteIdRef.current = Number(chatId);
        localStorage.setItem(`conversation_${sessionId}`, String(chatId));
        localStorage.setItem('current_conversation_id', String(chatId));
        const cached = localStorage.getItem('conversations');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const fullConv = parsed.find((conv) => Number(getConversationId(conv)) === Number(chatId));
            if (fullConv) {
              setSelectedConversation(fullConv);
              navigate(`/conversation/${chatId}`);
              return;
            }
          } catch (e) {}
        }
        setSelectedConversation(chat);
        navigate(`/conversation/${chatId}`);
        return;
      }
      const chatTitle = typeof chat === 'string' ? chat : getConversationTitle(chat);
      const cachedConversations = localStorage.getItem('conversations');
      let conversation = null;
      if (cachedConversations) {
        try {
          const parsed = JSON.parse(cachedConversations);
          conversation = parsed.find((conv) => getConversationTitle(conv) === chatTitle);
          if (conversation) {
            const convId = getConversationId(conversation);
            lastHandledRouteIdRef.current = Number(convId);
            localStorage.setItem(`conversation_${sessionId}`, String(convId));
            localStorage.setItem('current_conversation_id', String(convId));
            setSelectedConversation(conversation);
            navigate(`/conversation/${convId}`);
            return;
          }
        } catch (error) { localStorage.removeItem('conversations'); }
      }
      setIsLoading(true);
      const response = await fetch('http://10.0.0.236:8000/api/auth/conversations', {
        method: 'GET', headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const conversations = Array.isArray(data.conversations) ? data.conversations : [];
        localStorage.setItem('conversations', JSON.stringify(conversations));
        setHistory(buildHistoryList(conversations));
        conversation = conversations.find((conv) => getConversationTitle(conv) === chatTitle);
        if (conversation) {
          const convId = getConversationId(conversation);
          lastHandledRouteIdRef.current = Number(convId);
          localStorage.setItem(`conversation_${sessionId}`, String(convId));
          localStorage.setItem('current_conversation_id', String(convId));
          setSelectedConversation(conversation);
          navigate(`/conversation/${convId}`);
        }
      }
    } catch (error) {
      console.error('Error fetching conversation data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, navigate, getConversationId, getConversationTitle, buildHistoryList]);

  const handleNewChat = useCallback(() => {
    setHistory((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) return ['New Chat'];
      if (prev[0] !== 'New Chat') return ['New Chat', ...prev];
      return prev;
    });
    setSelectedConversation(null);
    localStorage.removeItem('current_conversation_id');
    lastHandledRouteIdRef.current = null;
    navigate('/');
  }, [navigate]);

  const handleUpdateChatTitle = useCallback((newTitle, conversationId) => {
    if (!newTitle) return;
    const trimmedTitle = newTitle.length > 30 ? `${newTitle.substring(0, 30)}...` : newTitle;
    if (conversationId) {
      setHistory((prev) => prev.map((item) => {
        if (typeof item === 'string') return item;
        const itemId = getConversationId(item);
        if (String(itemId) === String(conversationId)) return { ...item, title: trimmedTitle };
        return item;
      }));
      const cached = localStorage.getItem('conversations');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const updated = parsed.map((conv) => {
            const convId = getConversationId(conv);
            if (String(convId) === String(conversationId)) return { ...conv, title: trimmedTitle };
            return conv;
          });
          localStorage.setItem('conversations', JSON.stringify(updated));
        } catch (error) {}
      }
      setSelectedConversation((prev) => {
        if (!prev || typeof prev === 'string') return prev;
        const selectedId = getConversationId(prev);
        if (String(selectedId) === String(conversationId)) return { ...prev, title: trimmedTitle };
        return prev;
      });
      return;
    }
    setHistory((prev) => {
      const index = prev.findIndex((item) => item === 'New Chat');
      if (index !== -1) { const updated = [...prev]; updated[index] = trimmedTitle; return updated; }
      return [trimmedTitle, ...prev];
    });
  }, [getConversationId]);

  const handleSignOut = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('conversations');
    localStorage.removeItem('chat_history');
    localStorage.removeItem('current_conversation_id');
    setUser(null);
    setHistory(['New Chat']);
    setSelectedConversation(null);
    setSessionId(Date.now());
    setMessage('Sign out successful!');
    lastHandledRouteIdRef.current = null;
    setTimeout(() => { setMessage(''); navigate('/'); }, 1000);
  }, [navigate]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    fetchChatHistory();
    handleNewChat();
  };

  const ConversationRoute = () => {
    const { conversation_id } = useParams();
    useEffect(() => {
      const numericRouteId = conversation_id && !Number.isNaN(Number(conversation_id)) ? Number(conversation_id) : null;
      if (!numericRouteId || !user) return;
      if (lastHandledRouteIdRef.current === numericRouteId) return;
      const currentConversationId = Number(localStorage.getItem('current_conversation_id'));
      if (currentConversationId && !Number.isNaN(currentConversationId) && currentConversationId === numericRouteId && selectedConversation && Number(getConversationId(selectedConversation)) === numericRouteId) {
        lastHandledRouteIdRef.current = numericRouteId;
        return;
      }
      lastHandledRouteIdRef.current = numericRouteId;
      fetchConversationById(numericRouteId);
    }, [conversation_id, user, selectedConversation, fetchConversationById, getConversationId]);
    return null;
  };

  // FIX: Login prompt modal for unauthenticated users
  const LoginPrompt = () => {
    const token = localStorage.getItem('access_token');
    const dismissed = sessionStorage.getItem('login_prompt_dismissed');
    const [visible, setVisible] = useState(!token && !dismissed);
    if (!visible) return null;
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 6000
      }}>
        <div style={{
          background: 'var(--color-background-primary, #fff)',
          borderRadius: '12px', padding: '2rem', maxWidth: '380px',
          width: '90%', textAlign: 'center', display: 'flex',
          flexDirection: 'column', gap: '1rem',
          border: '0.5px solid var(--color-border-tertiary)'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 500 }}>Welcome to BucBuddy! 👋</h2>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
            Sign in to keep your conversation history and get a personalized experience.
          </p>
          <button
            onClick={() => navigate('/signin')}
            style={{
              background: '#185FA5', color: '#fff', border: 'none',
              padding: '0.7rem', borderRadius: '8px', fontSize: '15px',
              fontWeight: 500, cursor: 'pointer'
            }}
          >
            Sign in
          </button>
          <button
            onClick={() => navigate('/signup')}
            style={{
              background: 'none', border: '0.5px solid var(--color-border-secondary)',
              padding: '0.65rem', borderRadius: '8px', fontSize: '14px',
              color: 'var(--color-text-primary)', cursor: 'pointer'
            }}
          >
            Create an account
          </button>
          <button
            onClick={() => {
              sessionStorage.setItem('login_prompt_dismissed', '1');
              localStorage.removeItem('bucaide_consent');
              setVisible(false);
            }}
            style={{
              background: 'none', border: 'none', color: 'var(--color-text-tertiary, #888)',
              cursor: 'pointer', fontSize: '13px', textDecoration: 'underline'
            }}
          >
            Continue without signing in
          </button>
        </div>
      </div>
    );
  };

  const MainLayout = () => (
    <div className={`bucbuddy-shell ${themeVariant === "dark" ? "dark-mode" : ""}`}>
      {!user && <LoginPrompt />}
      <ConsentModal user={user} />

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <Sidebar
        history={history}
        onNewChat={handleNewChat}
        onChatSelect={handleChatSelect}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        user={user}
        selectedChat={selectedConversation}
        onSignOut={handleSignOut}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        themeVariant={themeVariant}
      />

      <main className="bucbuddy-main">
        <div className="bucbuddy-main-inner">
          {showSettings && (
            <SettingsModal
              voiceActivate={voiceActivate}
              setVoiceActivate={setVoiceActivate}
              themeVariant={themeVariant}
              setThemeVariant={setThemeVariant}
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
            user={user}
            onSignOut={handleSignOut}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        </div>
      </main>
    </div>
  );

  return (
    <div className="app">
      {message && <div className="message-banner">{message}</div>}
      {isLoading && <div className="loading-overlay">Loading...</div>}
      <Routes>
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/signin" element={<SignInPage onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/" element={<MainLayout />} />
        <Route path="/conversation/:conversation_id" element={<><ConversationRoute /><MainLayout /></>} />
      </Routes>
    </div>
  );
}

export default App;