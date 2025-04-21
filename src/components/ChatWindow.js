import React, { useState, useEffect, useRef } from 'react';

function ChatWindow({ setHistory, voiceActivate, currentChat, activeChat, updateChatTitle }) {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const chatWindowRef = useRef(null);
  const recognitionRef = useRef(null);

  // Load chat history when switching chats
  useEffect(() => {
    const loadChatHistory = async () => {
      if (currentChat.conversationId) {
        try {
          const response = await fetch(`http://localhost:8000/conversation/${currentChat.conversationId}/history`);
          const data = await response.json();
          
          if (data.conversation_history) {
            const formattedMessages = data.conversation_history.map(msg => ([
              { text: msg.userquery, type: 'user' },
              { text: msg.llmresponse, type: 'bot' }
            ])).flat();
            setMessages(formattedMessages);
          }
        } catch (error) {
          console.error("Error loading chat history:", error);
          setMessages([]);
        }
      } else {
        setMessages([]); // Clear messages for new chat
      }
    };

    loadChatHistory();
  }, [currentChat.conversationId]);

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
    if (!inputQuery.trim()) return;
    
    const userMessage = { text: inputQuery, type: 'user' };
    setMessages(prev => [...prev, userMessage]);

    try {
      const requestBody = { 
        userquery: inputQuery,
        conversation_id: currentChat.conversationId
      };

      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      // Update chat title and conversation ID if this is a new chat
      if (data.conversation_id && !currentChat.conversationId) {
        setHistory(prev => prev.map((chat, i) => 
          i === activeChat 
            ? { 
                ...chat, 
                conversationId: data.conversation_id,
                title: inputQuery.substring(0, 30) + '...'
              }
            : chat
        ));
      }

      const botMessage = {
        text: data.conversation_history[data.conversation_id][0].llmresponse,
        type: 'bot',
        citations: data.documents
      };

      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error("Error during fetch:", error);
      setMessages(prev => [...prev, { 
        text: 'Error fetching response. Please try again.', 
        type: 'bot' 
      }]);
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