import React, { useState } from "react";

export default function ChatSidebar({ chats, activeChatId, onSelect, onNewChat, onRename, onDelete }) {
  const [editingChat, setEditingChat] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  
  const groupChatsByDate = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const groups = {
      today: [],
      yesterday: [],
      older: []
    };
    
    Object.entries(chats).forEach(([id, chat]) => {
      const chatDate = new Date(chat.timestamp || Date.now());
      if (isSameDay(chatDate, today)) {
        groups.today.push([id, chat]);
      } else if (isSameDay(chatDate, yesterday)) {
        groups.yesterday.push([id, chat]);
      } else {
        groups.older.push([id, chat]);
      }
    });
    
    return groups;
  };

  const isSameDay = (date1, date2) => {
    return date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  };

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
    </div>
  );

  // renderChatItem is defined above as a const; duplicate definition removed to fix build error
}

// Helper functions for date filtering
function isToday(timestamp) {
  const today = new Date();
  const date = new Date(timestamp);
  return date.toDateString() === today.toDateString();
}

function isYesterday(timestamp) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = new Date(timestamp);
  return date.toDateString() === yesterday.toDateString();
}

function isPreviousWeek(timestamp) {
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const date = new Date(timestamp);
  return date > weekAgo && date < today && !isToday(timestamp) && !isYesterday(timestamp);
}
