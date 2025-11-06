import React, { useState } from "react";

export default function ChatSidebar({
  chats,
  activeChatId,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
}) {
  const [editingChat, setEditingChat] = useState(null);
  const [newTitle, setNewTitle] = useState("");

  const groupChatsByDate = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const chatGroups = {
      today: [],
      yesterday: [],
      older: []
    };
    
    Object.entries(chats).forEach(([id, chat]) => {
      const chatDate = new Date(chat.timestamp || Date.now());
      if (isSameDay(chatDate, today)) {
        chatGroups.today.push([id, chat]);
      } else if (isSameDay(chatDate, yesterday)) {
        chatGroups.yesterday.push([id, chat]);
      } else {
        chatGroups.older.push([id, chat]);
      }
    });

    return chatGroups;
  };

  const isSameDay = (date1, date2) => (
    date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
  );

  const renderNewChatButton = () => (
    <button className="new-chat-btn" onClick={onNewChat}>
      <div className="btn-content">
        <img src="/src/assets/icons/plus.svg" alt="New" />
        <span>New Chat</span>
      </div>
      <span className="shortcut">{window.navigator.platform.includes('Mac') ? '⌘N' : 'Ctrl+N'}</span>
    </button>
  );

  const renderChatItem = (chatId, chat) => (
    <div
      key={chatId}
      className={`chat-item ${activeChatId === chatId ? "active" : ""}`}
      onClick={() => onSelect(chatId)}
    >
      <div className="chat-item-left">
        <div className="chat-icon">💭</div>
        {editingChat === chatId ? (
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={() => {
              if (newTitle.trim()) {
                onRename(chatId, newTitle);
              }
              setEditingChat(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTitle.trim()) {
                onRename(chatId, newTitle);
                setEditingChat(null);
              } else if (e.key === "Escape") {
                setEditingChat(null);
                setNewTitle(chat.title);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="chat-rename-input"
          />
        ) : (
          <span className="chat-title">{chat.title || "New Chat"}</span>
        )}
      </div>
      <div className="chat-actions">
        <button
          className="action-btn edit"
          onClick={(e) => {
            e.stopPropagation();
            setEditingChat(chatId);
            setNewTitle(chat.title);
          }}
          title="Rename chat"
        >
          ✎
        </button>
        <button
          className="action-btn delete"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Are you sure you want to delete this chat?")) {
              onDelete(chatId);
            }
          }}
          title="Delete chat"
        >
          🗑
        </button>
      </div>
    </div>
  );

  const groups = groupChatsByDate();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <h1>ZM-AI</h1>
        </div>
        <button className="new-chat-btn" onClick={onNewChat}>
          + New Chat
        </button>

        {/* quick nav rows similar to reference */}
        <div className="nav-row" onClick={() => { /* placeholder action */ }}>
          <span>📄</span>
          <span style={{marginLeft:8}}>Templates</span>
          <span style={{marginLeft:'auto', background:'#ff7a90', color:'#fff', padding:'2px 6px', borderRadius:6, fontSize:11}}>PRO</span>
        </div>
        <div className="nav-row" onClick={() => { /* placeholder action */ }}>
          <span>📁</span>
          <span style={{marginLeft:8}}>My Projects</span>
          <span style={{marginLeft:'auto', background:'#ff7a90', color:'#fff', padding:'2px 6px', borderRadius:6, fontSize:11}}>PRO</span>
        </div>
        <div className="nav-row" onClick={() => { /* placeholder action */ }}>
          <span>📊</span>
          <span style={{marginLeft:8}}>Statistics</span>
        </div>
      </div>

      <div className="chat-sections">
        {groups.today.length > 0 && (
          <div className="chat-section">
            <h2>Today</h2>
            <div className="chat-list">
              {groups.today.map(([id, chat]) => renderChatItem(id, chat))}
            </div>
          </div>
        )}

        {groups.yesterday.length > 0 && (
          <div className="chat-section">
            <h2>Yesterday</h2>
            <div className="chat-list">
              {groups.yesterday.map(([id, chat]) => renderChatItem(id, chat))}
            </div>
          </div>
        )}

        {groups.older.length > 0 && (
          <div className="chat-section">
            <h2>Previous Chats</h2>
            <div className="chat-list">
              {groups.older.map(([id, chat]) => renderChatItem(id, chat))}
            </div>
          </div>
        )}

        {Object.keys(chats).length === 0 && (
          <div className="empty-state">
            <p>No chats yet</p>
            <button className="start-chat-btn" onClick={onNewChat}>
              Start a new chat
            </button>
          </div>
        )}
      </div>
      <div className="pro-card">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <div style={{fontWeight:700}}>Pro Plan</div>
            <div style={{fontSize:12, opacity:0.9}}>Strengthen AI features</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div className="price">$10/mo</div>
            <button className="small-btn" style={{marginTop:8}}>Get</button>
          </div>
        </div>
      </div>
    </div>
  );
}
