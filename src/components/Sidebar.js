import React from 'react';
import NewChatFeature from './NewChatFeature';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';

function Sidebar({ history, onNewChat, showSettings, setShowSettings, activeChat, onChatSelect, toggleTheme, theme }) {
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
        id="theme-toggle-button" 
        onClick={toggleTheme}
        aria-label="Toggle Theme"
      >
        <FontAwesomeIcon 
          icon={theme === 'light' ? faMoon : faSun} 
          style={{ fontSize: '1.5rem' }} // Set icon size to 1.5x
        />
      </button>
    </div>
  );
}

export default Sidebar;