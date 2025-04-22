import React, { useState, useEffect, useRef } from 'react';

function ChatWindow({ setHistory, voiceActivate, currentChat, activeChat, updateChatTitle, history }) {
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
      // Clear messages to ensure fresh state
      setMessages([]);

      if (!currentChat?.conversationId) {
        return;
      }

      try {
        console.log('Fetching history for conversationId:', currentChat.conversationId);
        const response = await fetch(`http://localhost:8000/conversation/${currentChat.conversationId}/history`);
        if (!response.ok) throw new Error('Failed to fetch history');
        
        const data = await response.json();
        console.log('Fetched history:', data);
        
        if (isMounted && data.conversation_history) {
          const formattedMessages = data.conversation_history.map(msg => ([
            { text: msg.userquery, type: 'user' },
            { text: msg.llmresponse, type: 'bot' }
          ])).flat();
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
        if (isMounted) {
          setMessages([]);
        }
      }
    };

    loadChatHistory();

    // Cleanup to prevent race conditions
    return () => {
      isMounted = false;
    };
  }, [currentChat?.conversationId]);

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
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('Full response data:', JSON.stringify(data, null, 2));

      if (data.conversation_id && !conversationId) {
        setHistory(prev => prev.map((chat, i) => 
          i === activeChat 
            ? { ...chat, conversationId: data.conversation_id, title: inputQuery.substring(0, 30) + '...' }
            : chat
        ));
        conversationId = data.conversation_id;
      }

      const responseId = data.conversation_id || conversationId;
      if (!data.conversation_history || !responseId) {
        throw new Error('Invalid response data');
      }

      // Get the latest response (last item in the history, assuming chronological order)
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
      console.error("Error during fetch:", error);
      setMessages(prev => [...prev, { 
        text: 'Error fetching response. Please try again.',
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