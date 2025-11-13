import React, { useState, useRef, useEffect } from "react";

export default function ChatWindow({ chatId, chat, setChats, BACKEND_URL }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages]);

  const sendMessage = async () => {
    if (!chatId || !input.trim()) return;
    setLoading(true);
    const userMessage = input.trim();
    setInput("");
    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message: userMessage }),
      });
      const data = await res.json();
      setChats(prev => ({ ...prev, [chatId]: { ...prev[chatId], messages: data.messages } }));
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h1 className="chat-title">AI Chat Assistant</h1>
      </div>
      
      <div className="chat-container">
        <div className="chat-card-inner">
          <div className="messages-container">
            {(!chatId || !chat?.messages || chat.messages.length === 0) && (
              <div className="empty-card">
                <div className="empty-title">Start a conversation</div>
                <div className="empty-sub">Click "New Chat" on the left or type below to begin.</div>
              </div>
            )}

            {chat?.messages?.map((msg, idx) => (
              <div key={idx} className={`bubble ${msg.role === 'assistant' ? 'assistant' : 'user'}`}>
                <div className="bubble-avatar">
                  {msg.role === 'assistant' ? '🤖' : '👤'}
                </div>
                <div className="bubble-content">
                  <div className="bubble-text">{msg.content}</div>
                  <div className="bubble-time">{formatTime(msg.timestamp || Date.now())}</div>
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-row">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Write a message"
              disabled={loading}
              className="chat-input"
            />
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              <span>Send</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
