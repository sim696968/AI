import React, { useState } from "react";

export default function ChatWindow({ chatId, chat, setChats, BACKEND_URL }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

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

  if (!chatId) {
    return (
      <div className="chat-window empty">
        <p>🧠 Start a new chat to begin talking with ZM-AI.</p>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="messages">
        {chat?.messages?.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <p>{msg.content}</p>
          </div>
        ))}
        {loading && <div className="message assistant"><p>Typing...</p></div>}
      </div>

      <div className="input-box">
        <input
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
