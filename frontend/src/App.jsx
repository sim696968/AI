import React, { useState } from "react";
import "./index.css";

export default function App() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I'm ZM-AI 🤖 How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: "user", text: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://your-backend-url.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();
      setMessages([
        ...newMessages,
        { role: "assistant", text: data.reply || "No response from server." },
      ]);
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: "assistant", text: "⚠️ Error: Failed to fetch reply." },
      ]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="zm-layout">
      <aside className="zm-sidebar">
        <h2 className="zm-logo">ZM-AI</h2>
        <button
          className="zm-newchat"
          onClick={() =>
            setMessages([
              { role: "assistant", text: "New chat started ✨ What’s up?" },
            ])
          }
        >
          + New Chat
        </button>
        <div className="zm-sidebar-footer">
          <p>Built with ❤️ by ZM</p>
        </div>
      </aside>

      <main className="zm-main">
        <div className="zm-chatbox">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`zm-message ${
                msg.role === "user" ? "zm-user" : "zm-assistant"
              }`}
            >
              <div className="zm-bubble">{msg.text}</div>
            </div>
          ))}
          {loading && (
            <div className="zm-message zm-assistant">
              <div className="zm-bubble typing">...</div>
            </div>
          )}
        </div>

        <div className="zm-inputbar">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </main>
    </div>
  );
}
