import React, { useState } from "react";

export default function ChatSidebar({ chats, activeChatId, onSelect, onNewChat, onRename, onDelete }) {
  const [editingChat, setEditingChat] = useState(null);
  const [newTitle, setNewTitle] = useState("");

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>ZM-AI 💬</h2>
        <button className="new-chat-btn" onClick={onNewChat}>＋ New Chat</button>
      </div>

      <div className="chat-list">
        {Object.entries(chats).map(([chatId, chat]) => (
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
              />
            ) : (
              <>
                <span>{chat.title}</span>
                <div className="chat-actions">
                  <button onClick={(e) => { e.stopPropagation(); setEditingChat(chatId); setNewTitle(chat.title); }}>✏️</button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(chatId); }}>🗑️</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
