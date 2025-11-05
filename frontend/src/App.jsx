import React, { useState, useEffect } from "react";
import ChatSidebar from "./components/ChatSidebar";
import ChatWindow from "./components/ChatWindow";
import "./App.css";

const BACKEND_URL = "https://zmai-backend.onrender.com";

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

  // Create new chat
  const handleNewChat = async (template = null) => {
    try {
      const res = await fetch(`${BACKEND_URL}/new_chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: template ? JSON.stringify({ template }) : undefined
      });
      const data = await res.json();
      setChats(prev => ({
        ...prev,
        [data.chat_id]: {
          title: data.title,
          messages: [],
          timestamp: data.timestamp
        }
      }));
      setActiveChatId(data.chat_id);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Rename chat
  const handleRenameChat = async (chatId, newTitle) => {
    try {
      await fetch(`${BACKEND_URL}/rename_chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, new_title: newTitle }),
      });
      setChats(prev => ({
        ...prev,
        [chatId]: { ...prev[chatId], title: newTitle }
      }));
    } catch (error) {
      console.error('Error renaming chat:', error);
    }
  };

  // Delete chat
  const handleDeleteChat = async (chatId) => {
    try {
      await fetch(`${BACKEND_URL}/delete_chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId }),
      });
      const newChats = { ...chats };
      delete newChats[chatId];
      setChats(newChats);
      if (activeChatId === chatId) {
        setActiveChatId(null);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  return (
    <div className="zm-root dark">
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelect={setActiveChatId}
        onNewChat={handleNewChat}
        onRename={handleRenameChat}
        onDelete={handleDeleteChat}
      />
      
      <div className="main-content">
        <ChatWindow
          chatId={activeChatId}
          chat={chats[activeChatId]}
          setChats={setChats}
          BACKEND_URL={BACKEND_URL}
        />
      </div>

      <div className="history">
        <h3>History</h3>
        <div className="history-list">
          {Object.entries(chats).length === 0 ? (
            <div className="history-empty">No history yet</div>
          ) : (
            Object.entries(chats).map(([id, chat]) => (
              <div 
                key={id} 
                className={"history-item " + (id === activeChatId ? "active" : "")}
                onClick={() => setActiveChatId(id)}
              >
                <div className="history-item-title">
                  {chat.title || "New Chat"}
                </div>
                <div className="history-item-preview">
                  {chat.messages && chat.messages.length > 0 
                    ? chat.messages[chat.messages.length - 1].content.slice(0, 60) 
                    : "No messages yet"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
