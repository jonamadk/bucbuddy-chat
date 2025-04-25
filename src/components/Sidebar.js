import React from 'react';
import NewChatFeature from './NewChatFeature';

function Sidebar({ history, onNewChat, onChatSelect, showSettings, setShowSettings }) {
  return (
    <div id="sidebar">
      <div className="sidebar-header">
        <h2>History</h2>
        <NewChatFeature onNewChat={onNewChat} />
      </div>
      <div className="divider"></div>
      <ul id="history-list">
        {history.map((item, index) => (
          <li key={index} onClick={() => onChatSelect(item)}>{item}</li>
        ))}
      </ul>
      <button 
        id="settings-button-sidebar" 
        onClick={() => setShowSettings(true)}
      >
        <i className="fas fa-cog"></i>
      </button>
    </div>
  );
}

export default Sidebar;