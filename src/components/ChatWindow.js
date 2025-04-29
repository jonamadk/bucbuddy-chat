import React, { useState, useEffect, useRef } from 'react';
import './ChatWindow.css';

function ChatWindow({ setHistory, currentChat, activeChat, updateChatTitle, history, accessToken, onChatSelect }) {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState(null);
  const [isFirstInput, setIsFirstInput] = useState(true);
  const [tempConversationId, setTempConversationId] = useState(null);
  const chatWindowRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechSynthesisRef = useRef(window.speechSynthesis);

  // Auto scroll
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  // Load chat history
  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      setMessages([]);
      setTempConversationId(currentChat?.id || null);

      if (!currentChat?.conversationId) {
        setIsFirstInput(true);
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:8000/api/conversation/${currentChat.conversationId}/history`,
          {
            headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
          }
        );

        if (!response.ok) throw new Error(`Failed to fetch history: ${response.status}`);
        const data = await response.json();

        if (isMounted && data.conversation_history) {
          const formatted = data.conversation_history.map(msg => ([
            { text: msg.userquery, type: 'user' },
            { text: msg.llmresponse, type: 'bot', citations: data.documents || [] }
          ])).flat();
          setMessages(formatted);
          setIsFirstInput(false);
        }
      } catch (error) {
        console.error('Error loading history:', error);
        if (isMounted) {
          setMessages([{ text: 'Failed to load chat history.', type: 'bot' }]);
        }
      }
    };

    fetchHistory();
    return () => { isMounted = false; };
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
        setQuery(transcript);
        const form = document.getElementById('chat-form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      };
    }
  }, []);

  // Unified send message
  const sendMessage = async (inputQuery = query) => {
    if (!inputQuery.trim() || isLoading) return;

    // Detect offline
    if (!navigator.onLine) {
      setMessages(prev => [...prev, { text: 'You are offline. Please connect to internet and try again.', type: 'bot' }]);
      return;
    }

    setIsLoading(true);
    const userMessage = { text: inputQuery, type: 'user' };

    if (!currentChat?.conversationId && isFirstInput && currentChat?.id === tempConversationId) {
      updateChatTitle(activeChat, inputQuery.substring(0, 30) + '...');
      setMessages([userMessage]);
      setIsFirstInput(false);
    } else {
      setMessages(prev => [...prev, userMessage]);
    }

    if (inputQuery === query) {
      setQuery('');
    }

    try {
      const requestBody = {
        userquery: inputQuery,
        conversation_id: currentChat?.conversationId || null,
      };

      const endpoint = accessToken ? '/api/auth/chat' : '/api/chat';
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.conversation_id && !currentChat?.conversationId) {
        setHistory(prev => {
          const updated = [...prev];
          if (updated[activeChat] && updated[activeChat].id === tempConversationId) {
            updated[activeChat].conversationId = data.conversation_id;
          }
          return updated;
        });
      }

      if (data.conversation_history) {
        const latest = data.conversation_history[data.conversation_id]?.slice(-1)[0];
        if (latest?.llmresponse) {
          const botMessage = {
            text: latest.llmresponse,
            type: 'bot',
            citations: data.documents || [],
          };
          setMessages(prev => [...prev, botMessage]);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error.message);
      setMessages(prev => [...prev, { text: 'Error fetching response.', type: 'bot' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (query.trim()) {
        sendMessage(query);
      }
    }
  };

  const toggleSpeak = (index, text) => {
    if (speakingMessageIndex === index) {
      speechSynthesisRef.current.cancel();
      setSpeakingMessageIndex(null);
    } else {
      speechSynthesisRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.onend = () => setSpeakingMessageIndex(null);
      speechSynthesisRef.current.speak(utterance);
      setSpeakingMessageIndex(index);
    }
  };

  const handleCopy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
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
                >
                  <i className={`fas ${speakingMessageIndex === idx ? 'fa-stop' : 'fa-volume-up'}`}></i>
                </button>
                <button
                  id={`copy-button-${idx}`}
                  className="copy-button"
                  onClick={() => handleCopy(msg.text, idx)}
                  title="Copy to clipboard"
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
                >
                  <i className="fas fa-microphone"></i>
                </button>
              )}
              <button
                type="submit"
                id="send-button"
                disabled={isLoading}
                title="Send message"
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
