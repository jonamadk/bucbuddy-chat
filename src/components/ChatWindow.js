import React, { useState, useEffect, useRef } from 'react';
import './ChatWindow.css';

function ChatWindow({ setHistory, currentChat, activeChat, updateChatTitle, history, accessToken, onChatSelect }) {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState(null);
  const [isFirstInput, setIsFirstInput] = useState(true); // Track first input for new chat
  const [tempConversationId, setTempConversationId] = useState(null); // Track temporary chat ID
  const chatWindowRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechSynthesisRef = useRef(window.speechSynthesis);

  // Auto scroll when new message arrives
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset state when switching chats
  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      setMessages([]); // Clear messages for new chat
      setTempConversationId(currentChat?.id || null); // Set temporary chat ID

      if (!currentChat?.conversationId) {
        console.log('No conversationId, resetting for new chat');
        setIsFirstInput(true); // Reset for new chat
        return;
      }

      try {
        console.log('Fetching history for conversationId:', currentChat.conversationId);
        const response = await fetch(
          `http://localhost:8000/api/conversation/${currentChat.conversationId}/history`,
          { headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {} }
        );
        if (!response.ok) throw new Error(`Failed to fetch history: ${response.status}`);
        const data = await response.json();
        console.log('Fetched history:', JSON.stringify(data, null, 2));

        if (isMounted && data.conversation_history) {
          const formatted = data.conversation_history.map(msg => ([
            { text: msg.userquery, type: 'user' },
            { text: msg.llmresponse, type: 'bot', citations: data.documents || [] }
          ])).flat();
          setMessages(formatted);
          setIsFirstInput(false); // History loaded, not first input
        }
      } catch (error) {
        console.error('Error loading history:', error);
        if (isMounted) {
          setMessages([{ text: 'Failed to load chat history.', type: 'bot' }]);
        }
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [currentChat?.id, currentChat?.conversationId, accessToken]);

  // Setup speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      recognitionRef.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript); // Update textarea with voice input
        // Instead of directly calling sendMessage, submit the form
        const form = document.getElementById('chat-form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      };
    }
  }, []);

  // Unified function to send message (typed or mic)
  const sendMessage = async (inputQuery = query) => {
    if (!inputQuery.trim() || isLoading) return;

    setIsLoading(true);
    const userMessage = { text: inputQuery, type: 'user' };

    // Handle first input in new chat
    if (!currentChat?.conversationId && isFirstInput && currentChat?.id === tempConversationId) {
      console.log('Sending first message in new chat...');
      updateChatTitle(activeChat, inputQuery.substring(0, 30) + '...'); // Rename for first input
      setMessages([userMessage]); // Clear messages for new chat
      setIsFirstInput(false); // Mark as processed
    } else {
      // Existing chat or subsequent input
      setMessages(prev => [...prev, userMessage]);
    }

    // Clear textarea only for typed input
    if (inputQuery === query) {
      setQuery('');
    }

    try {
      const requestBody = {
        userquery: inputQuery,
        conversation_id: currentChat?.conversationId || null
      };

      console.log('Sending message:', { conversationId: requestBody.conversation_id, userquery: inputQuery });
      const endpoint = accessToken ? '/api/auth/chat' : '/api/chat';
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      const data = await response.json();
      console.log('Server response:', JSON.stringify(data, null, 2));

      if (data.error) {
        throw new Error(data.error);
      }

      // Update conversation ID for new chat
      if (data.conversation_id && !currentChat?.conversationId) {
        console.log('Real conversation_id received:', data.conversation_id);
        setHistory(prev => {
          const updated = [...prev];
          if (updated[activeChat] && updated[activeChat].id === tempConversationId) {
            updated[activeChat].conversationId = data.conversation_id;
          }
          return updated;
        });
      }

      // Add bot response
      const responseId = data.conversation_id || currentChat?.conversationId;
      if (data.conversation_history && responseId) {
        const latestMessage = data.conversation_history[responseId]?.slice(-1)[0];
        if (latestMessage?.llmresponse) {
          const botMessage = {
            text: latestMessage.llmresponse,
            type: 'bot',
            citations: data.documents || []
          };
          setMessages(prev => [...prev, botMessage]);
        } else {
          throw new Error('No valid response received');
        }
      } else {
        throw new Error('Invalid response data');
      }
    } catch (error) {
      console.error('Error sending message:', error.message);
      setMessages(prev => [...prev, { text: 'Error fetching response.', type: 'bot' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle microphone listening
  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Enter key sending
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (query.trim()) {
        sendMessage(query);
      }
    }
  };

  // Voice button for bot responses
  const toggleSpeak = (index, text) => {
    if (speakingMessageIndex === index) {
      // Stop speaking
      speechSynthesisRef.current.cancel();
      setSpeakingMessageIndex(null);
    } else {
      // Start speaking
      speechSynthesisRef.current.cancel(); // Stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.onend = () => setSpeakingMessageIndex(null);
      speechSynthesisRef.current.speak(utterance);
      setSpeakingMessageIndex(index);
    }
  };

  // Copy to clipboard function
  const handleCopy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      // Optional: Show visual feedback
      const copyButton = document.querySelector(`#copy-button-${index}`);
      copyButton.classList.add('copied');
      copyButton.innerHTML = '<i class="fas fa-check"></i>';
      setTimeout(() => {
        copyButton.classList.remove('copied');
        copyButton.innerHTML = '<i class="fas fa-copy"></i>';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="chat-window-wrapper">
      <div id="chat-window" ref={chatWindowRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.type}-message`}>
            <span>{msg.text}</span>
            {msg.type === 'bot' && (
              <div className="message-actions">
                <button
                  className="voice-button"
                  onClick={() => toggleSpeak(idx, msg.text)}
                  title={speakingMessageIndex === idx ? 'Stop reading' : 'Read aloud'}
                  aria-label={speakingMessageIndex === idx ? 'Stop reading' : 'Read aloud'}
                >
                  <i className={`fas ${speakingMessageIndex === idx ? 'fa-stop' : 'fa-volume-up'}`}></i>
                </button>
                <button
                  id={`copy-button-${idx}`}
                  className="copy-button"
                  onClick={() => handleCopy(msg.text, idx)}
                  title="Copy to clipboard"
                  aria-label="Copy to clipboard"
                >
                  <i className="fas fa-copy"></i>
                </button>
              </div>
            )}
            {msg.citations && msg.citations.length > 0 && (
              <div className="citations">
                {msg.citations.map((citation, i) => (
                  <p key={i} className="citation">
                    {i + 1}. Source: <a href={citation.document_link} target="_blank" rel="noopener noreferrer">
                      {citation.document_name}
                    </a>
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <form id="chat-form" onSubmit={(e) => { e.preventDefault(); sendMessage(query); }}>
        <div className="input-wrapper">
          <div className="input-box">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here..."
              disabled={isLoading}
            />
            <div className="button-group">
              {('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && (
                <button
                  type="button"
                  id="mic-button"
                  className={isListening ? 'listening' : ''}
                  onClick={toggleMic}
                  disabled={isLoading}
                  title={isListening ? 'Stop recording' : 'Start recording'}
                  aria-label={isListening ? 'Stop recording' : 'Start recording'}
                >
                  <i className="fas fa-microphone"></i>
                </button>
              )}
              <button
                type="submit"
                id="send-button"
                disabled={isLoading}
                title="Send message"
                aria-label="Send message"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ChatWindow;