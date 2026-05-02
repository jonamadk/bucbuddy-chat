import React, { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/etsu-logo.png";

function Sidebar({
  history = [],
  onNewChat,
  onChatSelect,
  setShowSettings,
  onCloseSidebar,
  onSignOut,
  user,
  selectedChat,
  themeVariant = "light",
  sidebarOpen = false,
  setSidebarOpen,
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = useMemo(() => {
    if (!user) return "Guest";  // FIX: was "Student"
    const first = user.firstname || user.first_name || user.firstName || "";
    const last = user.lastname || user.last_name || user.lastName || "";
    const fullName = `${first} ${last}`.trim();
    if (fullName) return fullName;
    if (user.name) return user.name;
    if (user.email) return user.email;
    return "Guest";  // FIX: was "Student"
  }, [user]);

  const displaySubtext = useMemo(() => {
    if (!user) return "Not signed in";  // FIX: was "Student Account"
    return user.email || "Not signed in";
  }, [user]);

  const firstInitial = useMemo(() => {
    const source =
      user?.firstname ||
      user?.first_name ||
      user?.firstName ||
      user?.name ||
      user?.email ||
      "G";  // FIX: was "S" for Student, now "G" for Guest
    return source.trim().charAt(0).toUpperCase();
  }, [user]);

  const historyItems = useMemo(() => {
    if (!Array.isArray(history)) return [];
    return history.filter((item) => {
      if (!item) return false;
      if (typeof item === "string") return item !== "New Chat";
      return item.title !== "New Chat";
    });
  }, [history]);

  const getHistoryId = (item) => {
    if (!item || typeof item === "string") return null;
    return item.id || item.conversationid || item.conversationId || null;
  };

  const getHistoryLabel = (item) => {
    if (typeof item === "string") return item;
    if (item?.title) return item.title;
    if (item?.name) return item.name;
    return "Untitled Chat";
  };

  const getTimestamp = (item) => {
    if (typeof item === "string") return null;
    return item?.timestamp || item?.created_at || item?.createdAt || null;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const selectedChatId = useMemo(() => {
    if (!selectedChat || typeof selectedChat === "string") return null;
    return selectedChat.id || selectedChat.conversationid || selectedChat.conversationId || null;
  }, [selectedChat]);

  const selectedChatLabel = useMemo(() => {
    if (!selectedChat) return "";
    if (typeof selectedChat === "string") return selectedChat;
    if (selectedChat?.title) return selectedChat.title;
    if (selectedChat?.name) return selectedChat.name;
    return String(selectedChat);
  }, [selectedChat]);

  const isActiveChat = (item) => {
    const itemId = getHistoryId(item);
    const itemLabel = getHistoryLabel(item);
    if (itemId && selectedChatId) return String(itemId) === String(selectedChatId);
    return itemLabel === selectedChatLabel;
  };

  const handleChatClick = (item) => {
    if (onChatSelect) onChatSelect(item);
    if (onCloseSidebar) onCloseSidebar();
    if (setSidebarOpen) setSidebarOpen(false);
  };

  const handleSignOutClick = (e) => {
    e.stopPropagation();
    setShowProfileMenu(false);
    if (onSignOut) onSignOut();
  };

  return (
    <aside className={`sidebar ${themeVariant === "dark" ? "sidebar-dark" : ""} ${sidebarOpen ? "sidebar-open" : ""}`}>
     <div className="sidebar-brand">
       <div className="logo-box" aria-hidden="true">
         <img src={logo} alt="ETSU Logo" className="sidebar-logo" />
      </div>
      <div className="brand-text">
         <h1>BucBuddy</h1>
         <p>ETSU AI Assistant</p>
        </div>
      </div>

      <button className="new-chat-btn" onClick={onNewChat} type="button">
        <i className="fas fa-pen-to-square" aria-hidden="true"></i>
        <span>New Conversation</span>
      </button>

      <div className="history-label">CHAT HISTORY</div>

      <ul className="history-list">
        {historyItems.length > 0 ? (
          historyItems.map((item, index) => {
            const label = getHistoryLabel(item);
            const timestamp = formatTimestamp(getTimestamp(item));
            const itemId = getHistoryId(item);
            return (
              <li
                key={typeof item === "string" ? `${item}-${index}` : itemId || `${label}-${index}`}
                className={`history-item ${isActiveChat(item) ? "active" : ""}`}
                onClick={() => handleChatClick(item)}
                title={label}
              >
                <div className="history-left">
                  <span className="history-icon" aria-hidden="true">
                    <i className="fas fa-history"></i>
                  </span>
                  <span className="history-text">{label}</span>
                </div>
                <span className={`history-time ${!timestamp ? "history-time-empty" : ""}`}>
                  {timestamp || ""}
                </span>
              </li>
            );
          })
        ) : (
          <li className="history-empty">No conversations yet</li>
        )}
      </ul>

      <div className="sidebar-bottom">
        <button
          className="settings-btn"
          type="button"
          onClick={() => setShowSettings && setShowSettings(true)}
        >
          <i className="fas fa-gear" aria-hidden="true"></i>
          <span>Settings</span>
        </button>

        {/* FIX: Show sign in/up buttons when not logged in, profile card when logged in */}
        {!user ? (
          <div className="sidebar-auth-buttons">
            <button
              className="sidebar-signin-btn"
              type="button"
              onClick={() => navigate('/signin')}
            >
              <i className="fas fa-right-to-bracket" aria-hidden="true"></i>
              <span>Sign in</span>
            </button>
            <button
              className="sidebar-signup-btn"
              type="button"
              onClick={() => navigate('/signup')}
            >
              <i className="fas fa-user-plus" aria-hidden="true"></i>
              <span>Create account</span>
            </button>
          </div>
        ) : (
          <div className="profile-card-wrapper" ref={profileRef}>
            <button
              className="profile-card profile-card-clickable"
              type="button"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={showProfileMenu}
            >
              <div className="profile-avatar">{firstInitial}</div>
              <div className="profile-info">
                <div className="profile-name">{displayName}</div>
                <div className="profile-role">{displaySubtext}</div>
              </div>
              <i className="fas fa-chevron-up profile-chevron" style={{ transform: showProfileMenu ? "rotate(180deg)" : "rotate(0deg)" }} aria-hidden="true"></i>
            </button>

            {showProfileMenu && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-name">{displayName}</div>
                <div className="profile-dropdown-email">{displaySubtext}</div>
                <hr className="profile-dropdown-divider" />
                <button
                  className="profile-dropdown-signout"
                  type="button"
                  onClick={handleSignOutClick}
                >
                  <i className="fas fa-right-from-bracket" aria-hidden="true"></i>
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;