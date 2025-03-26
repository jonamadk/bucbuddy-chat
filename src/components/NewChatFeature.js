import React from 'react';

function NewChatFeature({ onNewChat }) {
  return (
    <button onClick={onNewChat} className="new-chat-button">
      New Chat
    </button>
  );
}

export default NewChatFeature;