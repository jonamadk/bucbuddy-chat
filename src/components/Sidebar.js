import React from 'react';

function Sidebar({ history }) {
  return (
    <div id="sidebar">
      <h2>History</h2>
      <ul id="history-list">
        {history.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default Sidebar;