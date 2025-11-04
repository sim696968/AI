import React, { useState } from "react";

export default function ChatWindow({ chatId, chat, setChats, BACKEND_URL }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");

  const sendMessage = async () => {
    if (!chatId || !input.trim()) return;
    setLoading(true);
    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, role: "user", content: input }),
    });
    const data = await res.json();
    setChats(prev => ({ ...prev, [chatId]: { ...prev[chatId], messages: data.messages } }));
    setInput("");
    setLoading(false);
  };

  const renderHeader = () => (
    <div className="chat-header">
      <button className="back-button">←</button>
      <h2>New Chat</h2>
      <button className="close-button">×</button>
    </div>
  );

  const renderMessages = () => (
    <div className="messages">
      {chat?.messages?.map((msg, idx) => (
        <div key={idx} className={`message ${msg.role}`}>
          <div className="message-avatar">
            {msg.role === "assistant" ? "🤖" : "👤"}
          </div>
          <div className="message-content">
            <p>{msg.content}</p>
            {msg.images && (
              <div className="message-images">
                {msg.images.map((img, i) => (
                  <img key={i} src={img} alt={`Generated ${i + 1}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      {loading && (
        <div className="message assistant">
          <div className="message-avatar">🤖</div>
          <div className="message-content">
            <p>Typing...</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderToolbar = () => (
    <div className="chat-toolbar">
      <button 
        className={`toolbar-btn ${activeTab === "chat" ? "active" : ""}`}
        onClick={() => setActiveTab("chat")}
      >
        💬 Chat
      </button>
      <button 
        className={`toolbar-btn ${activeTab === "images" ? "active" : ""}`}
        onClick={() => setActiveTab("images")}
      >
        🖼️ Images
      </button>
      <button 
        className={`toolbar-btn ${activeTab === "translate" ? "active" : ""}`}
        onClick={() => setActiveTab("translate")}
      >
        🌐 Translate
      </button>
      <button 
        className={`toolbar-btn ${activeTab === "audio" ? "active" : ""}`}
        onClick={() => setActiveTab("audio")}
      >
        🎤 Audio Chat
      </button>
    </div>
  );

  if (!chatId) {
    return (
      <div className="chat-window empty">
        <p>🧠 Start a new chat to begin talking with ZM-AI.</p>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {renderHeader()}
      {renderMessages()}
      <div className="input-container">
        {renderToolbar()}
        <div className="input-box">
          <input
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button className="send-button" onClick={sendMessage}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
