import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import FeedbackWidget from "./FeedbackWidget";
import ConsentModal from "./ConsentModal";

function ChatWindow({
  setHistory,
  voiceActivate,
  sessionId,
  selectedConversation,
  setSelectedConversation,
  onUpdateChatTitle,
  onSignOut,
  onOpenSidebar,
  user,
}) {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const chatWindowRef = useRef(null);
  const recognitionRef = useRef(null);
  const wasAtBottomRef = useRef(true);
  const lastLoadedConversationRef = useRef(null);
  const textareaRef = useRef(null);
  const menuRef = useRef(null);
  const prevMessagesRef = useRef([]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getConversationId = useCallback((conversation) => {
    if (!conversation || typeof conversation === "string") return null;
    return (
      conversation.conversationid ||
      conversation.conversationId ||
      conversation.id ||
      null
    );
  }, []);

  const getConversationHistory = useCallback((conversation) => {
    if (!conversation || typeof conversation === "string") return [];
    return Array.isArray(conversation.chat_history) ? conversation.chat_history : [];
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(`conversation_${sessionId}`);
    setConversationId(stored && !isNaN(Number(stored)) ? Number(stored) : null);
  }, [sessionId]);

  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        if (transcript.trim()) {
          setQuery("");
          sendMessage(transcript);
        }
      };
    }
  }, []);

  const autoResizeTextarea = useCallback(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(
      textareaRef.current.scrollHeight,
      140
    )}px`;
  }, []);

  useEffect(() => {
    autoResizeTextarea();
  }, [query, autoResizeTextarea]);

  const checkIfAtBottom = useCallback(() => {
    if (!chatWindowRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = chatWindowRef.current;
    return scrollTop + clientHeight >= scrollHeight - 100;
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      wasAtBottomRef.current = checkIfAtBottom();
    };

    const chatWindow = chatWindowRef.current;
    if (chatWindow) {
      chatWindow.addEventListener("scroll", handleScroll);
      wasAtBottomRef.current = checkIfAtBottom();
    }

    return () => {
      if (chatWindow) {
        chatWindow.removeEventListener("scroll", handleScroll);
      }
    };
  }, [checkIfAtBottom]);

  useEffect(() => {
    if (chatWindowRef.current && wasAtBottomRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const formatConversationHistory = useCallback((chatHistory = []) => {
    return chatHistory.flatMap((chat) => {
      if (!chat) return [];

      if (chat.text && chat.type) {
        return [
          {
            text: chat.text,
            type: chat.type,
            citations: chat.citations || [],
          },
        ];
      }

      const userText = chat.userquery ?? "";
      const botText = chat.llmresponse ?? "";

      const citations = Array.isArray(chat.citation_data)
        ? chat.citation_data
            .map((citation) => {
              const [name, url] = Object.entries(citation || {})[0] || [];
              return name && url ? { name, url } : null;
            })
            .filter(Boolean)
        : [];

      const result = [];
      if (userText) result.push({
        text: userText,
        type: "user",
        timestamp: chat.prompt_received_at || null,
      });
      if (botText) result.push({
        text: botText,
        type: "bot",
        citations,
        timestamp: chat.response_generated_at || null,
        response_time_ms: chat.response_time_ms || null,
      });

      return result;
    });
  }, []);

  const selectedConversationHistory = useMemo(() => {
    if (Array.isArray(selectedConversation)) return selectedConversation;
    return getConversationHistory(selectedConversation);
  }, [selectedConversation, getConversationHistory]);

  const loadConversation = useCallback(
    async (conversationIdToLoad) => {
      const numericId = Number(conversationIdToLoad);

      if (!numericId || isNaN(numericId)) return;
      if (lastLoadedConversationRef.current === numericId) return;

      setIsLoadingConversation(true);

      try {
        const cached = localStorage.getItem("conversations");
        let foundConversation = null;

        if (cached) {
          const conversations = JSON.parse(cached);
          foundConversation = conversations.find(
            (conv) => Number(getConversationId(conv)) === numericId
          );

          if (foundConversation) {
            const history = getConversationHistory(foundConversation);

            if (history.length > 0) {
              const formattedMessages = formatConversationHistory(history);
              setConversationId(numericId);
              prevMessagesRef.current = formattedMessages;
              setMessages(formattedMessages);
              localStorage.setItem("current_conversation_id", String(numericId));
              localStorage.setItem(`conversation_${sessionId}`, String(numericId));
              lastLoadedConversationRef.current = numericId;
              setIsLoadingConversation(false);
              return;
            }
          }
        }

        const token = localStorage.getItem("access_token");
        const headers = { "Content-Type": "application/json" };

        const isAuthenticatedConversation =
          !!user &&
          !!token &&
          (
            foundConversation?.useremail === user.email ||
            selectedConversation?.useremail === user.email
          );

        if (isAuthenticatedConversation) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(
          `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/api/conversation/${numericId}/history`,
          { method: "GET", headers }
        );

        if (!res.ok) throw new Error(`History fetch failed: ${res.status}`);

        const data = await res.json();
        const formattedMessages = formatConversationHistory(
          data.conversation_history || []
        );

        setConversationId(numericId);
        prevMessagesRef.current = formattedMessages;
        setMessages(formattedMessages);
        setIsLoadingConversation(false);
        localStorage.setItem("current_conversation_id", String(numericId));
        localStorage.setItem(`conversation_${sessionId}`, String(numericId));
        lastLoadedConversationRef.current = numericId;
      } catch (e) {
        console.error("Could not load conversation history:", e);
        setIsLoadingConversation(false);
      }
    },
    [
      formatConversationHistory,
      sessionId,
      getConversationId,
      getConversationHistory,
      selectedConversation,
      user,
    ]
  );

  useEffect(() => {
    if (selectedConversationHistory.length > 0) {
      const formattedMessages =
        formatConversationHistory(selectedConversationHistory);
      setMessages(formattedMessages);
      prevMessagesRef.current = formattedMessages;
      setIsLoadingConversation(false);

      const selectedId = getConversationId(selectedConversation);
      const currentConversationId =
        selectedId || localStorage.getItem("current_conversation_id");

      if (currentConversationId && !isNaN(Number(currentConversationId))) {
        setConversationId(Number(currentConversationId));
        lastLoadedConversationRef.current = Number(currentConversationId);
      }

      return;
    }

    const currentConversationId = localStorage.getItem("current_conversation_id");
    const cachedConversations = localStorage.getItem("conversations");

    if (currentConversationId && cachedConversations) {
      try {
        const parsed = JSON.parse(cachedConversations);
        const foundConversation = parsed.find(
          (conv) =>
            String(getConversationId(conv)) === String(currentConversationId)
        );

        if (foundConversation) {
          const history = getConversationHistory(foundConversation);

          if (history.length > 0) {
            const formattedMessages = formatConversationHistory(history);
            setMessages(formattedMessages);
            prevMessagesRef.current = formattedMessages;
            setConversationId(Number(currentConversationId));
            lastLoadedConversationRef.current = Number(currentConversationId);
            return;
          }
        }
      } catch (error) {
        console.error("Error restoring conversation from cache:", error);
      }
    }

    const selectedId = getConversationId(selectedConversation);

    if (selectedId) {
      loadConversation(selectedId);
      return;
    }

    if (!selectedConversation) {
      setTimeout(() => {
        if (!selectedConversation) {
          setMessages([]);
          prevMessagesRef.current = [];
          setConversationId(null);
          lastLoadedConversationRef.current = null;
          setIsLoadingConversation(false);
        }
      }, 300);
    }
  }, [
    selectedConversation,
    selectedConversationHistory,
    loadConversation,
    formatConversationHistory,
    getConversationId,
    getConversationHistory,
  ]);

  const updateCachedConversationList = useCallback(
    (newConversationId, inputQuery, updatedConversation) => {
      const cached = localStorage.getItem("conversations");
      let conversations = [];

      try {
        conversations = cached ? JSON.parse(cached) : [];
      } catch (error) {
        console.error("Error parsing cached conversations:", error);
      }

      const existingConversationIndex = conversations.findIndex(
        (conv) => String(getConversationId(conv)) === String(newConversationId)
      );

      if (existingConversationIndex !== -1) {
        conversations[existingConversationIndex] = {
          ...conversations[existingConversationIndex],
          chat_history: updatedConversation,
          title: conversations[existingConversationIndex].title || inputQuery,
        };
      } else {
        conversations.unshift({
          conversationId: newConversationId,
          title: inputQuery,
          chat_history: updatedConversation,
          useremail:
            JSON.parse(localStorage.getItem("user") || "{}")?.email || "",
          created_at: new Date().toISOString(),
        });
      }

      localStorage.setItem("conversations", JSON.stringify(conversations));
      setHistory(["New Chat", ...conversations]);
    },
    [getConversationId, setHistory]
  );

  const sendMessage = useCallback(
    async (inputQuery = query) => {
      if (!inputQuery.trim() || isLoading) return;

      wasAtBottomRef.current = true;

      setMessages((prev) => [
        ...prev,
        { text: inputQuery, type: "user" },
        { text: "Loading...", type: "bot" },
      ]);

      try {
        setIsLoading(true);

        const token = localStorage.getItem("access_token");
        const endpoint = token
          ? `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/api/auth/chat/stream`
          : `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/api/chat/stream`;
        const headers = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        const storedConversationId = localStorage.getItem(
          "current_conversation_id"
        );

        const safeConversationId =
          storedConversationId &&
          storedConversationId !== "undefined" &&
          storedConversationId !== "null" &&
          !isNaN(Number(storedConversationId))
            ? Number(storedConversationId)
            : null;

        // --- TIMESTAMP: record when prompt was sent ---
        const promptReceivedAt = new Date().toISOString();

        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            userquery: inputQuery,
            conversation_id: safeConversationId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Server responded with status ${response.status}`);
        }

        // ── STREAMING RESPONSE HANDLER ──────────────────────────────
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let streamedText = "";
        let finalData = null;

        // Show empty bot message immediately so streaming appears in place
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { text: "", type: "bot", streaming: true };
          return updated;
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const rawChunk = decoder.decode(value, { stream: true });
          const lines = rawChunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const parsed = JSON.parse(jsonStr);

              if (parsed.type === "token") {
                streamedText += parsed.content;
                // Update the last message with current streamed text
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    text: streamedText,
                    type: "bot",
                    streaming: true,
                  };
                  return updated;
                });
              } else if (parsed.type === "done") {
                finalData = parsed;
              } else if (parsed.type === "meta") {
                // conversation_id and citations saved after DB write
                if (!finalData) finalData = {};
                finalData.conversation_id = parsed.conversation_id;
                finalData.citation_data = parsed.citation_data;
                finalData.top_n_document = parsed.top_n_document;
              }
            } catch (e) {
              // Incomplete JSON chunk — skip
            }
          }
        }

        // ── POST-STREAM: apply final decorated text + metadata ───────
        const responseGeneratedAt = new Date().toISOString();
        const responseTimeMs = new Date(responseGeneratedAt) - new Date(promptReceivedAt);

        const data = finalData || {};
        const newConversationId = data.conversation_id || safeConversationId;

        if (newConversationId) {
          setConversationId(Number(newConversationId));
          localStorage.setItem(
            "current_conversation_id",
            String(newConversationId)
          );
          localStorage.setItem(
            `conversation_${sessionId}`,
            String(newConversationId)
          );
          lastLoadedConversationRef.current = Number(newConversationId);
        }

        const documents = data.top_n_document || [];
        const botResponse = data.full_text || streamedText || "No response provided";

        let citations = [];
        if (Array.isArray(data.citation_data)) {
          citations = data.citation_data
            .map((citation) => {
              const [name, url] = Object.entries(citation || {})[0] || [];
              return name && url ? { name, url } : null;
            })
            .filter(Boolean);
        }

        const newBotMessage = {
          text: botResponse,
          type: "bot",
          citations,
          timestamp: responseGeneratedAt,
          response_time_ms: responseTimeMs,
          streaming: false,
        };

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = newBotMessage;
          return updated;
        });

        const existingHistory = Array.isArray(selectedConversation)
          ? selectedConversation
          : getConversationHistory(selectedConversation);

        const updatedConversation = [
          ...existingHistory,
          {
            userquery: inputQuery,
            llmresponse: botResponse,
            citation_data: citations.map((citation) => ({
              [citation.name]: citation.url,
            })),
            top_n_document: documents,
            prompt_received_at: promptReceivedAt,
            response_generated_at: responseGeneratedAt,
            response_time_ms: responseTimeMs,
          },
        ];

        const updatedConversationObject =
          selectedConversation && !Array.isArray(selectedConversation)
            ? {
                ...selectedConversation,
                conversationId: newConversationId,
                title:
                  selectedConversation.title ||
                  (inputQuery.length > 30
                    ? `${inputQuery.substring(0, 30)}...`
                    : inputQuery),
                chat_history: updatedConversation,
              }
            : {
                conversationId: newConversationId,
                title:
                  inputQuery.length > 30
                    ? `${inputQuery.substring(0, 30)}...`
                    : inputQuery,
                chat_history: updatedConversation,
                created_at: new Date().toISOString(),
              };

        setSelectedConversation(updatedConversationObject);
        updateCachedConversationList(
          newConversationId,
          inputQuery,
          updatedConversation
        );

        if (!safeConversationId) {
          onUpdateChatTitle(inputQuery, newConversationId);
        }

        if (voiceActivate) {
          const plainText = newBotMessage.text
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/\[(.*?)\]\(.*?\)/g, '$1')
            .replace(/📍|📚|🏆|👋/g, '')
            .replace(/#+\s/g, '')
            .trim();
          const speech = new SpeechSynthesisUtterance(plainText);
          speech.lang = "en-US";
          window.speechSynthesis.speak(speech);
        }
      } catch (error) {
        console.error("Error during fetch:", error);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            text: `Error: ${error.message}`,
            type: "bot",
          };
          return updated;
        });
      } finally {
        setIsLoading(false);
        setQuery("");
      }
    },
    [
      query,
      isLoading,
      sessionId,
      selectedConversation,
      onUpdateChatTitle,
      voiceActivate,
      setSelectedConversation,
      getConversationHistory,
      updateCachedConversationList,
    ]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (query.trim()) sendMessage();
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    } else {
      try {
        recognitionRef.current.abort();
        recognitionRef.current.start();
      } catch (e) {
        console.warn("SpeechRecognition start error:", e);
        setIsListening(false);
      }
    }
  };

  const sendQuickPrompt = (text) => {
    setQuery(text);
    sendMessage(text);
  };

  // Helper to format timestamp for display
  const formatTimestamp = (isoString) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="chat-container">
      <ConsentModal user={user} />
      <header className="chat-topbar">
        <div className="chat-topbar-left">
          <button
            type="button"
            className="mobile-menu-btn"
            aria-label="Open menu"
            onClick={() => onOpenSidebar && onOpenSidebar()}
          >
            <i className="fas fa-bars"></i>
          </button>
          <span className="chat-status-dot"></span>
          <h2 className="chat-topbar-title">BucBuddy is online</h2>
        </div>

        <div className="chat-topbar-right">
          {showSearch && (
            <input
              className="chat-topbar-search-input"
              autoFocus
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setShowSearch(false)}
            />
          )}

          <button
            type="button"
            className="chat-topbar-icon-btn"
            aria-label="Search"
            onClick={() => {
              setShowSearch((prev) => !prev);
              setSearchQuery("");
            }}
          >
            <i className="fas fa-magnifying-glass"></i>
          </button>

          <div className="topbar-menu-wrapper" ref={menuRef}>
            <button
              type="button"
              className="chat-topbar-icon-btn"
              aria-label="More options"
              onClick={() => setShowMenu((prev) => !prev)}
            >
              <i className="fas fa-ellipsis-vertical"></i>
            </button>

            {showMenu && (
              <div className="topbar-dropdown">
                {user ? (
                  <button
                    type="button"
                    className="topbar-dropdown-signout"
                    onClick={() => {
                      setShowMenu(false);
                      if (onSignOut) onSignOut();
                    }}
                  >
                    <i className="fas fa-right-from-bracket"></i>
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="topbar-dropdown-signin"
                    onClick={() => {
                      setShowMenu(false);
                      window.location.href = '/signin';
                    }}
                  >
                    <i className="fas fa-right-to-bracket"></i>
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="chat-body" id="chat-window" ref={chatWindowRef}>
        {messages.length === 0 && prevMessagesRef.current.length === 0 && !isLoadingConversation && !localStorage.getItem("current_conversation_id") ? (
          <div className="welcome-screen">
            <h1 className="welcome-screen-title">
              Welcome, Buc! <span className="welcome-wave">👋</span>
            </h1>
            <p className="welcome-screen-subtitle">
              Go Bucs! I&apos;m your ETSU AI assistant. How can I help you
              navigate campus life today?
            </p>

            <div className="welcome-card-row">
              <button
                type="button"
                className="welcome-card"
                onClick={() => sendQuickPrompt("Where is the Culp University Center located on campus?")}
              >
                <div className="welcome-card-icon">
                  <i className="fas fa-map"></i>
                </div>
                <div className="welcome-card-body">
                  <div className="welcome-card-title">Find a building</div>
                  <div className="welcome-card-sub">
                    Where is the Culp Center?
                  </div>
                </div>
              </button>

              <button
                type="button"
                className="welcome-card"
                onClick={() =>
                  sendQuickPrompt("What student organizations and clubs are available at ETSU?")
                }
              >
                <div className="welcome-card-icon">
                  <i className="fas fa-calendar-days"></i>
                </div>
                <div className="welcome-card-body">
                  <div className="welcome-card-title">Student life</div>
                  <div className="welcome-card-sub">
                    Clubs &amp; organizations
                  </div>
                </div>
              </button>

              <button
                type="button"
                className="welcome-card"
                onClick={() =>
                  sendQuickPrompt("How do I apply for financial aid at ETSU and what are the deadlines?")
                }
              >
                <div className="welcome-card-icon">
                  <i className="fas fa-wallet"></i>
                </div>
                <div className="welcome-card-body">
                  <div className="welcome-card-title">Financial aid</div>
                  <div className="welcome-card-sub">How to apply &amp; deadlines</div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="chat-messages-wrap">
            {(messages.length > 0 ? messages : prevMessagesRef.current)
              .filter(
                (msg) =>
                  !searchQuery.trim() ||
                  msg.text.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((msg, index) => {
                const isUser = msg.type === "user";
                const isBot = msg.type === "bot";

                return (
                  <div
                    key={`${msg.type}-${index}`}
                    className={`message-block ${
                      isUser ? "message-block-user" : "message-block-bot"
                    }`}
                  >
                    <div
                      className={`message-row ${
                        isUser ? "message-row-user" : "message-row-bot"
                      }`}
                    >
                      <div
                        className={`message ${
                          isUser ? "user-message" : "bot-message"
                        }`}
                      >
                        <div className="message-text">
                          {isUser ? (
                            msg.text
                          ) : (
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                          )}
                        </div>

                        {/* Timestamp shown below each message */}
                        {msg.timestamp && (
                          <div style={{
                            fontSize: "0.72em",
                            opacity: 0.5,
                            marginTop: "4px",
                            textAlign: isUser ? "right" : "left",
                          }}>
                            {formatTimestamp(msg.timestamp)}
                            {isBot && msg.response_time_ms && (
                              <span style={{ marginLeft: "6px" }}>
                                · {(msg.response_time_ms / 1000).toFixed(1)}s
                              </span>
                            )}
                          </div>
                        )}

                        {isBot &&
                          Array.isArray(msg.citations) &&
                          msg.citations.length > 0 && (
                            <div
                              className="citations"
                              style={{ marginTop: "8px" }}
                            >
                              <p style={{ margin: "0 0 4px 0", fontSize: "0.8em", opacity: 0.7 }}>📚 References</p>
                              <ul
                                style={{ margin: 0, paddingLeft: "18px" }}
                              >
                                {msg.citations.map((citation, citationIndex) => (
                                  <li key={`${citation.name}-${citationIndex}`}>
                                    <a
                                      href={citation.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {citation.name}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    </div>

                    {isBot && msg.text !== "Loading..." && (
                      <div className="feedback-widget-row">
                        <FeedbackWidget
                          message={msg.text}
                          conversationId={conversationId}
                          messageIndex={index}
                          userquery={messages[index - 1]?.text || ""}
                          llmresponse={msg.text}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <div className="chat-input-wrapper">
        <div className="chat-input-bar">
          <button
            type="button"
            className={`chat-voice-btn ${
              isListening ? "chat-voice-btn--active" : ""
            }`}
            aria-label={isListening ? "Stop voice input" : "Enable voice agent"}
            title={isListening ? "Stop listening" : "Enable voice agent"}
            onClick={toggleMic}
          >
            <i
              className={`fas ${
                isListening ? "fa-microphone-slash" : "fa-microphone"
              }`}
            ></i>
          </button>

          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about ETSU..."
            rows="1"
          />

          <button
            type="button"
            className="chat-send-btn"
            onClick={() => sendMessage()}
            title="Send message"
            disabled={!query.trim() || isLoading}
          >
            <i className="fas fa-arrow-up"></i>
          </button>
        </div>

        <p className="chat-input-disclaimer">
          BucBuddy can provide general university information. Always verify
          critical deadlines.
        </p>
      </div>
    </div>
  );
}

export default ChatWindow;