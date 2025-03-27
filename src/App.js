import React, { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import SettingsModal from './components/SettingsModal';

function App() {
  const [history, setHistory] = useState(["New Chat"]); // Initialize with "New Chat"
  const [showSettings, setShowSettings] = useState(false);
  const [voiceActivate, setVoiceActivate] = useState(false);
  const [sessionId, setSessionId] = useState(Date.now());

  const handleNewChat = () => {
    setHistory((prev) => [...prev, "New Chat"]); // Add "New Chat" to history
    setSessionId(Date.now()); // Generate a new session ID
  };

  return (
    <div className="app">
      <Sidebar history={history} onNewChat={handleNewChat} />
      <div className="chat-container">
        <h1>ContextSync-BucBuddy</h1>
        <button 
          id="settings-button" 
          onClick={() => setShowSettings(true)}
        >
          <i className="fas fa-cog"></i>
        </button>
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
    </div>
  );
}

export default App;