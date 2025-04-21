import React, { useState, useEffect, useRef } from 'react';

function ChatWindow({ setHistory, voiceActivate, sessionId }) {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const chatWindowRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    setMessages([]); // Clear messages on new session
  }, [sessionId]);

  useEffect(() => {
    const stored = localStorage.getItem(`conversation_${sessionId}`);
    setConversationId(stored ? parseInt(stored, 10) : null);
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
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(''); // Clear the typing box
        sendMessage(transcript); // Automatically send the captured word
      };
    }
  }, []);

  const sendMessage = async (inputQuery = query) => {
    const userMessage = { text: inputQuery, type: 'user' };
    setMessages((prev) => [...prev, userMessage]);

    setHistory((prev) => {
      const updatedHistory = [...prev];
      if (updatedHistory[updatedHistory.length - 1] === "New Chat") {
        updatedHistory[updatedHistory.length - 1] = inputQuery;
      }
      return updatedHistory;
    });

    const botMessage = { text: 'Loading...', type: 'bot' };
    setMessages((prev) => [...prev, botMessage]);

    try {
      const requestBody = { userquery: inputQuery, conversation_id: conversationId };
      console.log("Request to server:", requestBody);

      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log("Response from server:", data);

      // Update conversation ID and persist it
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
        localStorage.setItem(`conversation_${sessionId}`, data.conversation_id);
      } else {
        console.error("Failed to retrieve conversation_id from server.");
        alert("An error occurred while starting a new conversation. Please try again.");
      }

      const convKey = String(data.conversation_id);
      const history = data.conversation_history?.[convKey] || [];
      const lastTurn = history[history.length - 1] || {};
      const botText = lastTurn.llmresponse || 'Error fetching response';

      const citations = (data.documents || []).map((doc) => ({
        name: doc.document_name,
        url: doc.document_link,
      }));

      setMessages((prev) => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = { text: botText, type: 'bot', citations };
        return msgs;
      });

      if (voiceActivate) {
        const speech = new SpeechSynthesisUtterance(botText);
        speech.lang = 'en-US';
        window.speechSynthesis.speak(speech);
      }
    } catch (error) {
      console.error("Error during fetch:", error);
      setMessages((prev) => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = { text: 'Error fetching response!', type: 'bot' };
        return msgs;
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
                <a href={citation.url} target="_blank" rel="noopener noreferrer">
                  {citation.name}
                </a>
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