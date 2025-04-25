import React, { useState, useEffect, useRef, useCallback } from 'react';

function ChatWindow({ setHistory, voiceActivate, sessionId, selectedConversation, setSelectedConversation, onUpdateChatTitle }) {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const chatWindowRef = useRef(null);
  const recognitionRef = useRef(null);
  const wasAtBottomRef = useRef(true); // Track if user was at the bottom before a message update

  // Update conversationId from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`conversation_${sessionId}`);
    setConversationId(stored ? parseInt(stored, 10) : null);
  }, [sessionId]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      recognitionRef.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery('');
        sendMessage(transcript);
      };
    }
  }, []);

  // Update messages when selectedConversation changes
  useEffect(() => {
    if (Array.isArray(selectedConversation) && selectedConversation.length > 0) {
      const formattedMessages = selectedConversation.flatMap((chat) => {
        // Ensure chat and citation_data are valid
        if (!chat || !chat.citation_data) return [];
        return [
          { text: chat.userquery, type: 'user' },
          {
            text: chat.llmresponse,
            type: 'bot',
            citations: Array.isArray(chat.citation_data)
              ? chat.citation_data.map((citation) => {
                  const [name, url] = Object.entries(citation)[0];
                  return { name, url };
                })
              : [],
          },
        ];
      });
      setMessages(formattedMessages);
    } else {
      setMessages([]);
    }
  }, [selectedConversation]);

  // Check if the user is at the bottom of the chat window
  const checkIfAtBottom = useCallback(() => {
    if (!chatWindowRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = chatWindowRef.current;
    // Consider "at bottom" if within 100px of the bottom
    return scrollTop + clientHeight >= scrollHeight - 100;
  }, []);

  // Handle scroll events to update wasAtBottomRef
  useEffect(() => {
    const handleScroll = () => {
      wasAtBottomRef.current = checkIfAtBottom();
    };

    const chatWindow = chatWindowRef.current;
    if (chatWindow) {
      chatWindow.addEventListener('scroll', handleScroll);
      wasAtBottomRef.current = checkIfAtBottom();
    }

    return () => {
      if (chatWindow) {
        chatWindow.removeEventListener('scroll', handleScroll);
      }
    };
  }, [checkIfAtBottom]);

  // Auto-scroll to bottom only if the user was already at the bottom
  useEffect(() => {
    if (chatWindowRef.current && wasAtBottomRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (inputQuery = query) => {
      if (!inputQuery.trim()) return;

      const userMessage = { text: inputQuery, type: 'user' };
      setMessages((prev) => [...prev, userMessage]);

      const botMessage = { text: 'Loading...', type: 'bot' };
      setMessages((prev) => [...prev, botMessage]);

      // Assume user wants to see the new message
      wasAtBottomRef.current = true;

      try {
        setIsLoading(true);
        const token = localStorage.getItem('access_token');
        const endpoint = token ? 'http://127.0.0.1:8000/auth/chat' : 'http://127.0.0.1:8000/chat';

        const headers = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        const storedConversationId = localStorage.getItem('current_conversation_id');
        const requestBody = {
          userquery: inputQuery,
          conversation_id: storedConversationId || null,
        };

        console.log('Request payload:', requestBody);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          setMessages((prev) => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = { text: 'Error fetching response from server!', type: 'bot' };
            return msgs;
          });
          throw new Error(`Server responded with status ${response.status}`);
        }

        const data = await response.json();
        console.log('Response from server:', JSON.stringify(data, null, 2));

        const newConversationId = data.conversation_id;
        if (newConversationId && !storedConversationId) {
          setConversationId(newConversationId);
          localStorage.setItem('current_conversation_id', newConversationId);
          localStorage.setItem(`conversation_${sessionId}`, newConversationId);
          // Only update title for new conversations
          onUpdateChatTitle(inputQuery, null);
        } else if (newConversationId) {
          setConversationId(newConversationId);
          localStorage.setItem('current_conversation_id', newConversationId);
          localStorage.setItem(`conversation_${sessionId}`, newConversationId);
        }

        // Extract conversation history and documents
        const conversationId = newConversationId;
        const conversationHistory = data.conversation_history?.[conversationId] || [];
        const documents = data.documents || [];

        // Get the bot response from conversation history
        let botResponse = 'No response text provided by server';
        let citations = [];
        if (conversationHistory.length > 0) {
          const latestEntry = conversationHistory[conversationHistory.length - 1];
          botResponse = latestEntry.llmresponse || botResponse;
          citations = Array.isArray(latestEntry.citation_data)
            ? latestEntry.citation_data.map((citation) => {
                const [name, url] = Object.entries(citation)[0];
                return { name, url };
              })
            : [];
        }

        // Format the new bot response
        const newBotMessage = {
          text: botResponse,
          type: 'bot',
          citations,
        };

        // Update messages
        setMessages((prev) => {
          const updatedMessages = [...prev];
          updatedMessages[updatedMessages.length - 1] = newBotMessage;
          return updatedMessages;
        });

        // Update selectedConversation
        const updatedConversation = [
          ...(Array.isArray(selectedConversation) ? selectedConversation : []),
          {
            userquery: inputQuery,
            llmresponse: botResponse,
            citation_data: documents.map((doc) => ({
              [doc.document_name]: doc.document_link,
            })),
            top_n_document: documents,
          },
        ];
        setSelectedConversation(updatedConversation);

        // Cache the updated conversation
        const cached = localStorage.getItem('conversations');
        let conversations = cached ? JSON.parse(cached) : [];
        const existingConversation = conversations.find((conv) => conv.conversationid === conversationId);
        if (existingConversation) {
          existingConversation.chat_history = updatedConversation;
        } else {
          conversations.push({
            conversationid: conversationId,
            title: inputQuery,
            chat_history: updatedConversation,
            useremail: data.useremail || JSON.parse(localStorage.getItem('user'))?.email,
            created_at: new Date().toISOString(),
          });
        }
        localStorage.setItem('conversations', JSON.stringify(conversations));

        if (voiceActivate) {
          const speech = new SpeechSynthesisUtterance(newBotMessage.text);
          speech.lang = 'en-US';
          window.speechSynthesis.speak(speech);
        }
      } catch (error) {
        console.error('Error during fetch:', error);
        setMessages((prev) => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = { text: `Error: ${error.message}`, type: 'bot' };
          return msgs;
        });
      } finally {
        setIsLoading(false);
        setQuery('');
      }
    },
    [query, sessionId, selectedConversation, onUpdateChatTitle, voiceActivate]
  );

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

  return (
    <>
      <div id="chat-window" ref={chatWindowRef}>
        {messages.length === 0 ? (
          <div className="empty-chat">Start a new conversation!</div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`message ${msg.type}-message`}>
              <span>{msg.text}</span>
              {msg.citations && msg.citations.length > 0 && (
                <div className="citations">
                  <b>Citations:</b>
                  <ul>
                    {msg.citations.map((citation, i) => (
                      <li key={i}>
                        <a href={citation.url} target="_blank" rel="noopener noreferrer">
                          {citation.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <form id="chat-form" onSubmit={(e) => { e.preventDefault(); if (query.trim()) sendMessage(); }}>
        <textarea
          id="query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your question here..."
          disabled={isLoading}
          required
        />
        <button
          type="button"
          id="mic-button"
          onClick={toggleMic}
          disabled={isLoading || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)}
          style={{ backgroundColor: isListening ? '#FF0000' : '' }}
        >
          <i className="fas fa-microphone"></i>
        </button>
        <button type="submit" disabled={isLoading}>
          <i className="fas fa-paper-plane"></i>
        </button>
      </form>
    </>
  );
}

export default ChatWindow;