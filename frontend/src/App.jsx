import React, { useState, useEffect } from "react";
import ChatSidebar from "./components/ChatSidebar";
import ChatWindow from "./components/ChatWindow";
import "./App.css";

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

  // Create new chat
  const handleNewChat = async () => {
    const res = await fetch(`${BACKEND_URL}/new_chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setChats(prev => ({ ...prev, [data.chat_id]: { title: data.title, messages: [] } }));
    setActiveChatId(data.chat_id);
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
        chats={chats}
        activeChatId={activeChatId}
        onSelect={setActiveChatId}
        onNewChat={handleNewChat}
        onRename={handleRenameChat}
        onDelete={handleDeleteChat}
      />

      {/* main chat area */}
      <div className="chat-window">
        <div className="main-container">
          <div className="content-card">
            <ChatWindow
              chatId={activeChatId}
              chat={chats[activeChatId]}
              setChats={setChats}
              BACKEND_URL={BACKEND_URL}
            />
          </div>
        </div>
      </div>

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
