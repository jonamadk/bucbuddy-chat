import React from 'react';
import NewChatFeature from './NewChatFeature';

function Sidebar({ history, onNewChat }) {
  return (
    <div id="sidebar">
      <h2>History</h2>
      <ul id="history-list">
        {history.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
      <NewChatFeature onNewChat={onNewChat} />
    </div>
  );
}

export default Sidebar;