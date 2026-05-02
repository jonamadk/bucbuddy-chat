import React from 'react';

function NewChatFeature({ onNewChat }) {
  return (
    <button onClick={onNewChat} className="new-chat-button">
      <i className="fas fa-edit"></i>
    </button>
  );
}

export default NewChatFeature;