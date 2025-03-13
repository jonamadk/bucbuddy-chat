import React from 'react';

function SettingsModal({ voiceActivate, setVoiceActivate, onClose }) {
  return (
    <div id="settings-modal">
      <label htmlFor="enable-voice-agent">Enable Voice Agent</label>
      <input
        type="checkbox"
        id="enable-voice-agent"
        checked={voiceActivate}
        onChange={(e) => setVoiceActivate(e.target.checked)}
      />
      <br />
      <button id="close-settings" onClick={onClose}>Close</button>
    </div>
  );
}

export default SettingsModal;