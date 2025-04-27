import React from 'react';

function SettingsModal({ onClose }) {
  return (
    <div id="settings-modal">
      <button id="close-settings" onClick={onClose}>Close</button>
    </div>
  );
}

export default SettingsModal;