import { useState, useRef, useEffect } from "react";
import "./index.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messageEndRef = useRef(null);

  // Auto scroll to bottom when new messages appear
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message to backend
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (!response.ok) {
        throw new Error("Server error: " + response.statusText);
      }

      const data = await response.json();
      const aiMessage = { role: "assistant", content: data.reply };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Failed to get response from server." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={handleNewChat}>
            + New Chat
          </button>
        </div>
        <div className="sidebar-footer">
          <p style={{ textAlign: "center", fontSize: "12px", color: "#999" }}>
            ZM AI Chat
          </p>
        </div>
      </div>

      {/* Chat main area */}
      <div className="chat-main">
        <div className="chat-header">ZM AI</div>

        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-title">Welcome to ZM AI</div>
              <p>Start typing below to begin a conversation.</p>
              <div>
                <div
                  className="example-card"
                  onClick={() => setInput("Tell me a joke")}
                >
                  Tell me a joke
                </div>
                <div
                  className="example-card"
                  onClick={() => setInput("What is AI?")}
                >
                  What is AI?
                </div>
                <div
                  className="example-card"
                  onClick={() =>
                    setInput("Give me tips to stay productive.")
                  }
                >
                  Productivity tips
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`message-row ${msg.role === "assistant" ? "assistant" : ""}`}
              >
                <div className="message-content-wrapper">
                  <div className="message-avatar-wrapper">
                    {msg.role === "assistant" ? "🤖" : "🧑"}
                  </div>
                  <div className="message-text">{msg.content}</div>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="message-row assistant">
              <div className="message-content-wrapper">
                <div className="message-avatar-wrapper">🤖</div>
                <div className="message-text">Typing...</div>
              </div>
            </div>
          )}
          <div ref={messageEndRef} />
        </div>

        {/* Input area */}
        <div className="input-area">
          <div className="input-wrapper">
            <textarea
              className="message-input"
              placeholder="Send a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows="1"
            />
            <button
              className="send-button"
              onClick={sendMessage}
              disabled={loading}
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
