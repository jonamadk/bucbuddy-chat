import React, { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import SettingsModal from './components/SettingsModal';

function App() {
  // Update history structure to include conversation IDs and titles
  const [history, setHistory] = useState([{
    id: Date.now(),
    title: "New Chat",
    conversationId: null
  }]);
  const [activeChat, setActiveChat] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [voiceActivate, setVoiceActivate] = useState(false);

  const handleNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: "New Chat",
      conversationId: null
    };
    setHistory(prev => [...prev, newChat]);
    setActiveChat(history.length); // Set active chat to the new chat
  };

  const handleChatSelect = (index) => {
    setActiveChat(index);
  };

  const updateChatTitle = (index, newTitle) => {
    setHistory(prev => prev.map((chat, i) => 
      i === index ? { ...chat, title: newTitle } : chat
    ));
  };

  return (
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
        <button id="signin-button" onClick={() => console.log("Sign in clicked")}>
          <i className="fas fa-sign-in-alt"></i>
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
          activeChat={activeChat}
          currentChat={history[activeChat]}
          updateChatTitle={updateChatTitle}
          history={history} // <-- add this
        />
      </div>
    </div>
  );
}

export default App;