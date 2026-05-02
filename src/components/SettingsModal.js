import React from 'react';

function SettingsModal({
  voiceActivate,
  setVoiceActivate,
  themeVariant,
  setThemeVariant,
  onClose,
}) {
  const handleThemeSelect = (theme) => {
    setThemeVariant(theme);
    onClose();
  };

  return (
    <div id="settings-modal">
      <div className="settings-modal-title">Settings</div>

      <div className="settings-row">
        <div className="settings-label-group">
          <label htmlFor="enable-voice-agent">Voice Agent</label>
          <p className="settings-help-text">Read responses out loud.</p>
        </div>

        <label className="settings-toggle-switch" htmlFor="enable-voice-agent">
          <input
            type="checkbox"
            id="enable-voice-agent"
            checked={voiceActivate}
            onChange={(e) => setVoiceActivate(e.target.checked)}
          />
          <span className="settings-toggle-track">
            <span className="settings-toggle-thumb" />
          </span>
        </label>
      </div>

      <div className="settings-row">
        <div className="settings-label-group">
          <label>Appearance</label>
          <p className="settings-help-text">Choose your theme.</p>
        </div>

        <div className="theme-toggle-group">
          <button
            type="button"
            className={`theme-toggle-btn${themeVariant === 'light' ? ' active' : ''}`}
            onClick={() => handleThemeSelect('light')}
          >
            Light
          </button>

          <button
            type="button"
            className={`theme-toggle-btn${themeVariant === 'dark' ? ' active' : ''}`}
            onClick={() => handleThemeSelect('dark')}
          >
            Dark
          </button>
        </div>
      </div>

      <button id="close-settings" onClick={onClose}>
        Close
      </button>
    </div>
  );
}

export default SettingsModal;