import React, { useState } from "react";

export default function ChatSidebar({ chats, activeChatId, onSelect, onNewChat, onRename, onDelete }) {
  const [editingChat, setEditingChat] = useState(null);
  const [newTitle, setNewTitle] = useState("");

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <img src="/logo.svg" alt="ZM-AI" className="logo" />
          <h1>ZM-AI</h1>
        </div>
        <button className="new-chat-btn" onClick={onNewChat}>
          + New Chat
        </button>
      </div>

      <div className="chat-sections">
        <div className="chat-section">
          <h2>Today</h2>
          <div className="chat-list">
            {Object.entries(chats)
              .filter(([_, chat]) => isToday(chat.timestamp))
              .map(([chatId, chat]) => renderChatItem(chatId, chat))}
          </div>
        </div>

        <div className="chat-section">
          <h2>Yesterday</h2>
          <div className="chat-list">
            {Object.entries(chats)
              .filter(([_, chat]) => isYesterday(chat.timestamp))
              .map(([chatId, chat]) => renderChatItem(chatId, chat))}
          </div>
        </div>

        <div className="chat-section">
          <h2>Previous 7 Days</h2>
          <div className="chat-list">
            {Object.entries(chats)
              .filter(([_, chat]) => isPreviousWeek(chat.timestamp))
              .map(([chatId, chat]) => renderChatItem(chatId, chat))}
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="settings-btn">
          <span className="icon">⚙️</span>
          Settings
        </button>
      </div>
    </div>
  );

  function renderChatItem(chatId, chat) {
    return (
      <div
        key={chatId}
        className={`chat-item ${activeChatId === chatId ? "active" : ""}`}
        onClick={() => onSelect(chatId)}
      >
        {editingChat === chatId ? (
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={() => {
              onRename(chatId, newTitle);
              setEditingChat(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRename(chatId, newTitle);
                setEditingChat(null);
              }
            }}
            autoFocus
            className="chat-rename-input"
          />
        ) : (
          <>
            <div className="chat-item-content">
              <span className="chat-icon">💭</span>
              <span className="chat-title">{chat.title}</span>
            </div>
            <div className="chat-actions">
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingChat(chatId);
                  setNewTitle(chat.title);
                }}
              >
                ✎
              </button>
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(chatId);
                }}
              >
                🗑
              </button>
            </div>
          </>
        )}
      </div>
    );
  }
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
