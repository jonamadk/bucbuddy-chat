import React from 'react';
import NewChatFeature from './NewChatFeature';

function Sidebar({ history, onNewChat, showSettings, setShowSettings, activeChat, onChatSelect }) {
  return (
    <div id="sidebar">
      <div className="sidebar-header">
        <h2>History</h2>
        <NewChatFeature onNewChat={onNewChat} />
      </div>
      <div className="divider"></div>
      <ul id="history-list">
        {history.map((chat, index) => (
          <li 
            key={chat.id}
            className={activeChat === index ? 'active' : ''}
            onClick={() => onChatSelect(index)}
          >
            {chat.title}
          </li>
        ))}
      </ul>
      <button 
        id="settings-button-sidebar" 
        onClick={() => setShowSettings(!showSettings)}
      >
        <i className="fas fa-cog"></i>
      </button>
    </div>
  );
}

export default Sidebar;