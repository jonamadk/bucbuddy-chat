import React, { useState, useEffect, useRef } from 'react';

function ChatWindow({ setHistory, voiceActivate, sessionId }) {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const chatWindowRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    setMessages([]); // Clear messages on new session
  }, [sessionId]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      recognitionRef.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (query.trim()) sendMessage();
      };

      recognitionRef.current.onresult = (event) => {
        setQuery(event.results[0][0].transcript);
      };
    }
  }, [query]);

  const sendMessage = async () => {
    const userMessage = { text: query, type: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setHistory(prev => [...prev, query]);

    const botMessage = { text: 'Loading...', type: 'bot' };
    setMessages(prev => [...prev, botMessage]);

    try {
      const response = await fetch('http://localhost:8000/chat', { // Updated URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, sessionId })
      });
      const data = await response.json();

      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          text: data.response || 'Error fetching response',
          type: 'bot',
          citations: data.citation_data || []
        };
        return newMessages;
      });

      if (voiceActivate) {
        const speech = new SpeechSynthesisUtterance(data.response);
        speech.lang = 'en-US';
        window.speechSynthesis.speak(speech);
      }
    } catch (error) {
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { text: 'Error fetching response!', type: 'bot' };
        return newMessages;
      });
    }
    setQuery('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (query.trim()) sendMessage();
    }
  };

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <>
      <div id="chat-window" ref={chatWindowRef}>
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}-message`}>
            <span>{msg.text}</span>
            {msg.citations && msg.citations.map((citation, i) => (
              <p key={i} className="citation">
                <b>Citation:</b>{' '}
                {Object.entries(citation).map(([name, url]) => (
                  <a key={name} href={url} target="_blank" rel="noopener noreferrer">{name}</a>
                ))}
              </p>
            ))}
          </div>
        ))}
      </div>
      <form id="chat-form" onSubmit={(e) => { e.preventDefault(); if (query.trim()) sendMessage(); }}>
        <textarea
          id="query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your question here..."
          required
        />
        <button
          type="button"
          id="mic-button"
          onClick={toggleMic}
          disabled={!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)}
          style={{ backgroundColor: isListening ? '#FF0000' : '' }}
        >
          <i className="fas fa-microphone"></i>
        </button>
        <button type="submit">
          <i className="fas fa-paper-plane"></i>
        </button>
      </form>
    </>
  );
}

export default ChatWindow;