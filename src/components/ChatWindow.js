import React, { useState, useEffect, useRef } from 'react';
import './ChatWindow.css';

function ChatWindow({ setHistory, voiceActivate, currentChat, activeChat, updateChatTitle, history, accessToken, onChatSelect }) {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const chatWindowRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    console.log('Current chat updated:', currentChat);
    console.log('Active chat:', activeChat);
    console.log('Messages:', messages);
  }, [currentChat, activeChat, messages]);

  // Load chat history when conversationId changes
  useEffect(() => {
    let isMounted = true;

    const loadChatHistory = async () => {
      setMessages([]);

      if (!currentChat?.conversationId) {
        return;
      }

      try {
        console.log('Fetching history for conversationId:', currentChat.conversationId);
        const response = await fetch(`http://localhost:8000/api/conversation/${currentChat.conversationId}/history`, {
          headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch history: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(`Expected JSON response, received ${contentType || 'unknown'}: ${text.substring(0, 50)}...`);
        }

        const data = await response.json();
        console.log('Fetched history:', JSON.stringify(data, null, 2));

        if (isMounted && data.conversation_history) {
          const formattedMessages = data.conversation_history.map(msg => ([
            { text: msg.userquery, type: 'user' },
            { text: msg.llmresponse, type: 'bot' }
          ])).flat();
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error("Error loading chat history:", error.message, error.stack);
        if (isMounted) {
          setMessages([{ text: 'Failed to load chat history. Please try again.', type: 'bot' }]);
        }
      }
    };

    loadChatHistory();

    return () => {
      isMounted = false;
    };
  }, [currentChat?.conversationId, accessToken]);

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
        setQuery('');
        sendMessage(transcript);
      };
    }
  }, []);

  const sendMessage = async (inputQuery = query) => {
    if (!inputQuery.trim() || isLoading) return;

    setIsLoading(true);
    const userMessage = { text: inputQuery, type: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');

    try {
      let conversationId = currentChat?.conversationId || null;
      const requestBody = { 
        userquery: inputQuery,
        conversation_id: conversationId
      };

      console.log('Sending message:', { conversationId, userquery: inputQuery });
      let endpoint = accessToken ? '/api/auth/chat' : '/api/chat';
      let response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(requestBody),
      });

      // Retry with unauthenticated endpoint if CORS or auth fails
      if (!response.ok && accessToken) {
        console.warn('Authenticated chat failed, retrying with unauthenticated endpoint');
        endpoint = '/api/chat';
        response = await fetch(`http://localhost:8000${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON response, received ${contentType || 'unknown'}: ${text.substring(0, 50)}...`);
      }

      const data = await response.json();
      console.log('Full response data:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        throw new Error(data.error || `Failed to send message: ${response.status} ${response.statusText}`);
      }

      if (data.conversation_id && !conversationId) {
        const newChat = {
          id: data.conversation_id,
          title: inputQuery.substring(0, 30) + '...',
          conversationId: data.conversation_id
        };
        // Replace the default chat entry if it exists, otherwise append
        setHistory(prev => {
          if (prev.length === 0 || (prev.length === 1 && prev[0].conversationId === null)) {
            return [newChat];
          }
          return [...prev.filter(chat => chat.conversationId !== null), newChat];
        });
        updateChatTitle(activeChat, inputQuery.substring(0, 30) + '...');
        setActiveChat(history.length > 0 ? history.length : 0); // Select the new conversation
        conversationId = data.conversation_id;
      }

      const responseId = data.conversation_id || conversationId;
      if (!data.conversation_history || !responseId) {
        throw new Error('Invalid response data');
      }

      const latestResponse = data.conversation_history[responseId]?.slice(-1)[0];
      if (latestResponse?.llmresponse) {
        const botMessage = {
          text: latestResponse.llmresponse,
          type: 'bot',
          citations: data.documents || []
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error('No valid response received');
      }
    } catch (error) {
      console.error("Error during fetch:", error.message, error.stack);
      let errorMessage = 'Error fetching response. Please try again.';
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to the server. Please check if the server is running or try again later.';
      } else if (error.message.includes('Not Found')) {
        errorMessage = 'Chat endpoint not found. Please contact support.';
      } else if (error.message.includes('Invalid response data')) {
        errorMessage = 'Received invalid response from the server. Please try again.';
      } else if (error.message.includes('Unauthorized')) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.message.includes('Expected JSON response')) {
        errorMessage = 'Server returned an unexpected response. Please try again or contact support.';
      }
      setMessages(prev => [...prev, { 
        text: errorMessage,
        type: 'bot' 
      }]);
    } finally {
      setIsLoading(false);
    }
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
    <div className="chat-window-wrapper">
      <div id="chat-window" ref={chatWindowRef}>
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}-message`}>
            <span>{msg.text}</span>
            {msg.citations && msg.citations.map((citation, i) => (
              <p key={i} className="citation">
                <b>Citation:</b>{' '}
                <a
                  href={citation.document_link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {citation.document_name}
                </a>
              </p>
            ))}
          </div>
        ))}
      </div>
      <form id="chat-form" onSubmit={(e) => { e.preventDefault(); if (query.trim()) sendMessage(); }}>
        <div className="input-container">
          <textarea
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here..."
            required
            disabled={isLoading}
          />
          <div className="button-container">
            <button
              type="button"
              id="mic-button"
              onClick={toggleMic}
              disabled={!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) || isLoading}
              className={isListening ? 'listening' : ''}
            >
              <i className="fas fa-microphone"></i>
            </button>
            <button type="submit" id="send-button" disabled={isLoading}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ChatWindow;