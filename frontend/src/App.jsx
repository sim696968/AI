import React, { useState, useEffect } from "react";
import ChatSidebar from "./components/ChatSidebar";
import ChatWindow from "./components/ChatWindow";
import "./App.css";

// Keyboard shortcut handler
const useKeyboardShortcuts = (handlers) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + N for new chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handlers.onNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};

const BACKEND_URL = "https://zmai-backend.onrender.com"; // ← change to your real backend

export default function App() {
  const [chats, setChats] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);

  // Fetch all chats on start
  useEffect(() => {
    fetch(`${BACKEND_URL}/chats`)
      .then(res => res.json())
      .then(setChats)
      .catch(console.error);
  }, []);

  // Create new chat with optional template
  const handleNewChat = async (template) => {
    try {
      const res = await fetch(`${BACKEND_URL}/new_chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      const data = await res.json();
      
      // Add new chat to state
      setChats(prev => ({
        ...prev,
        [data.chat_id]: {
          title: data.title,
          messages: [],
          timestamp: data.timestamp,
          template: template
        }
      }));
      
      // Switch to new chat
      setActiveChatId(data.chat_id);

      // Show welcome message if it's first chat
      if (Object.keys(chats).length === 0) {
        // You can customize this welcome message
        const welcomeMessage = {
          role: "assistant",
          content: "👋 Welcome! I'm ready to help you with your questions and tasks."
        };
        setChats(prev => ({
          ...prev,
          [data.chat_id]: {
            ...prev[data.chat_id],
            messages: [welcomeMessage]
          }
        }));
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
      // You could add error handling UI here
    }
  };

  // Rename chat
  const handleRenameChat = async (chatId, newTitle) => {
    await fetch(`${BACKEND_URL}/rename_chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, new_title: newTitle }),
    });
    setChats(prev => ({ ...prev, [chatId]: { ...prev[chatId], title: newTitle } }));
  };

  // Delete chat
  const handleDeleteChat = async (chatId) => {
    await fetch(`${BACKEND_URL}/delete_chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId }),
    });
    const updated = { ...chats };
    delete updated[chatId];
    setChats(updated);
    if (activeChatId === chatId) setActiveChatId(null);
  };

  return (
    <div className="zm-root">
      <ChatSidebar
        onNewChat={handleNewChat}
      />
      
      <ChatWindow
        chatId={activeChatId}
        chat={chats[activeChatId]}
        setChats={setChats}
        BACKEND_URL={BACKEND_URL}
      />

      {/* right history panel */}
      <div className="history">
        <h3>History</h3>
        <div className="history-list">
          {Object.entries(chats).length === 0 && (
            <div className="muted">No history yet</div>
          )}
          {Object.entries(chats).map(([id, c]) => (
            <div key={id} className="history-item">
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <div style={{fontWeight:600}}>{c.title || 'New Chat'}</div>
                <div className="muted">{c.timestamp ? new Date(c.timestamp).toLocaleDateString() : ''}</div>
              </div>
              <div className="muted" style={{marginTop:6}}>{(c.messages||[]).slice(-1)[0]?.content?.slice(0,80) || ''}</div>
            </div>
          ))}
        </div>
        <div className="history-footer">
          <div className="muted">{Object.keys(chats).length}/50</div>
          <button className="start-chat-btn" onClick={() => setChats({})}>Clear history</button>
        </div>
      </div>
    </div>
  );
}
