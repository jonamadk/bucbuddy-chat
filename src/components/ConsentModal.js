// src/components/ConsentModal.js
import React, { useState, useEffect } from 'react';

function ConsentModal({ onConsent, user }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem('bucaide_consent');
    if (existing === null) setVisible(true);
  }, []);

  const handleChoice = (agreed) => {
    localStorage.setItem('bucaide_consent', agreed ? 'true' : 'false');
    setVisible(false);
    if (onConsent) onConsent(agreed);
    fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/api/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_consent: agreed }),
    }).catch(() => {});
  };

  if (!visible) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        {/* Body */}
        <div style={styles.body}>
          <h2 style={styles.title}>Privacy & Data Notice</h2>
          <p style={styles.intro}>
            Before you continue, please review how BucBuddy handles your information
            during this research pilot.
          </p>

          {/* Divider */}
          <div style={styles.divider} />

          <p style={styles.sectionLabel}>WHAT WE COLLECT</p>
          <div style={styles.itemList}>
            {[
              ["Your questions and BucBuddy's responses", "To evaluate answer quality"],
              ["Response time per message", "To measure system performance"],
              ["Feedback ratings (thumbs up / down)", "To track helpfulness over time"],
            ].map(([main, sub]) => (
              <div key={main} style={styles.item}>
                <div style={styles.dot} />
                <div>
                  <div style={styles.itemMain}>{main}</div>
                  <div style={styles.itemSub}>{sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.divider} />

          <p style={styles.sectionLabel}>YOUR PRIVACY</p>
          <div style={styles.privacyList}>
            {[
              "Your Google account credentials are never stored or accessed by this application.",
              "Your interaction data will not be shared with any public AI models or third parties.",
              user
                ? "As a signed-in user, your conversation history will be available when you return."
                : "Guest sessions are anonymous. No personally identifying information is collected.",
            ].map((text) => (
              <div key={text} style={styles.privacyRow}>
                <div style={styles.checkmark}>&#10003;</div>
                <p style={styles.privacyText}>{text}</p>
              </div>
            ))}
          </div>

          <div style={styles.divider} />

          <p style={styles.footNote}>
            Declining will prevent your conversations from being saved. Anonymous
            performance data and feedback ratings will still be recorded.
            This project is conducted under the supervision of the ETSU Department
            of Computing for academic research purposes only.
          </p>
        </div>

        {/* Buttons */}
        <div style={styles.footer}>
          <button
            style={styles.declineBtn}
            onClick={() => handleChoice(false)}
          >
            Decline
          </button>
          <button
            style={styles.agreeBtn}
            onClick={() => handleChoice(true)}
          >
            I Agree
          </button>
        </div>

      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5000,
    backdropFilter: 'blur(8px)',
    padding: '16px',
  },
  modal: {
    background: '#ffffff',
    borderRadius: '16px',
    maxWidth: '440px',
    width: '100%',
    boxShadow: '0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },

  body: {
    padding: '24px 24px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '70vh',
    overflowY: 'auto',
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0D1B4B',
    margin: 0,
    letterSpacing: '-0.01em',
  },
  intro: {
    fontSize: '14px',
    color: '#4B5563',
    lineHeight: 1.6,
    margin: 0,
  },
  divider: {
    height: '1px',
    background: '#F1F5F9',
    margin: '2px 0',
  },
  sectionLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: '0.08em',
    margin: 0,
  },
  itemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  item: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#0D1B4B',
    flexShrink: 0,
    marginTop: '6px',
  },
  itemMain: {
    fontSize: '13px',
    color: '#1E293B',
    fontWeight: '500',
    lineHeight: 1.4,
  },
  itemSub: {
    fontSize: '12px',
    color: '#94A3B8',
    marginTop: '1px',
  },
  privacyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  privacyRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
  },
  checkmark: {
    color: '#16A34A',
    fontWeight: '700',
    fontSize: '13px',
    flexShrink: 0,
    marginTop: '1px',
  },
  privacyText: {
    fontSize: '13px',
    color: '#374151',
    lineHeight: 1.5,
    margin: 0,
  },
  footNote: {
    fontSize: '11px',
    color: '#94A3B8',
    lineHeight: 1.6,
    margin: 0,
  },
  footer: {
    display: 'flex',
    gap: '8px',
    padding: '16px 24px 20px',
    borderTop: '1px solid #F1F5F9',
    marginTop: '8px',
  },
  declineBtn: {
    flex: 1,
    padding: '11px',
    borderRadius: '8px',
    border: '1.5px solid #E2E8F0',
    background: '#ffffff',
    color: '#64748B',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    letterSpacing: '0.01em',
  },
  agreeBtn: {
    flex: 2,
    padding: '11px',
    borderRadius: '8px',
    border: 'none',
    background: '#0D1B4B',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    letterSpacing: '0.01em',
  },
};

export default ConsentModal;