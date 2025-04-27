import React, { forwardRef } from 'react';
import NewChatFeature from './NewChatFeature';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';

const Sidebar = forwardRef(({
  history,
  onNewChat,
  showSettings,
  setShowSettings,
  activeChat,
  onChatSelect,
  toggleTheme,
  theme,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen
}, ref) => {
  return (
    <div
      id="sidebar"
      ref={ref}
      className={isMobileSidebarOpen ? 'mobile-open' : 'mobile-closed'}
    >
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
            onClick={() => {
              onChatSelect(index);
              setIsMobileSidebarOpen(false); // Auto close on selecting chat
            }}
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
          style={{ fontSize: '1.5rem' }}
        />
      </button>
    </div>
  );
});

export default Sidebar;
