import React from 'react';
import NewChatFeature from './NewChatFeature';

function Sidebar({ history, onNewChat }) {
  return (
    <div id="sidebar">
      <div className="sidebar-header">
        <h2>History</h2>
        <NewChatFeature onNewChat={onNewChat} />
      </div>
      <ul id="history-list">
        {history.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default Sidebar;