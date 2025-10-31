import React, { useState, useEffect, useRef } from "react";
import "./index.css";

export default function App() {
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem("zm_chats");
    return saved ? JSON.parse(saved) : [{ id: "default", title: "New Chat", messages: [] }];
  });
  const [activeChat, setActiveChat] = useState(chats[0].id);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const current = chats.find((c) => c.id === activeChat);

  useEffect(() => {
    localStorage.setItem("zm_chats", JSON.stringify(chats));
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  async function send() {
    if (!input.trim()) return;
    const userMsg = input;
    setInput("");
    setLoading(true);

    const newChats = chats.map((c) =>
      c.id === activeChat
        ? { ...c, messages: [...c.messages, { role: "user", content: userMsg }] }
        : c
    );
    setChats(newChats);

    try {
      const res = await fetch(import.meta.env.VITE_API_URL || "http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conv_id: activeChat, message: userMsg }),
      });

      const data = await res.json();
      const updatedChats = newChats.map((c) =>
        c.id === activeChat
          ? { ...c, messages: [...c.messages, { role: "assistant", content: data.reply }] }
          : c
      );
      setChats(updatedChats);
    } catch (e) {
      const updatedChats = newChats.map((c) =>
        c.id === activeChat
          ? { ...c, messages: [...c.messages, { role: "assistant", content: "Error: " + String(e) }] }
          : c
      );
      setChats(updatedChats);
    }

    setLoading(false);
  }

  function newChat() {
    const id = Date.now().toString();
    const chat = { id, title: `Chat ${chats.length + 1}`, messages: [] };
    setChats([...chats, chat]);
    setActiveChat(id);
  }

  function deleteChat(id) {
    const filtered = chats.filter((c) => c.id !== id);
    setChats(filtered.length ? filtered : [{ id: "default", title: "New Chat", messages: [] }]);
    setActiveChat(filtered.length ? filtered[0].id : "default");
  }

  return (
    <div className="zm-layout">
      <aside className="zm-sidebar">
        <button className="new-chat" onClick={newChat}>+ New Chat</button>
        <div className="chat-list">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-item ${activeChat === chat.id ? "active" : ""}`}
              onClick={() => setActiveChat(chat.id)}
            >
              <span>{chat.title}</span>
              <button className="delete" onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}>×</button>
            </div>
          ))}
        </div>
      </aside>

      <main className="zm-main">
        <header className="zm-header">
          <h1>ZM-AI</h1>
        </header>

        <div className="zm-chatbox">
          {current?.messages.map((m, i) => (
            <div key={i} className={`zm-msg ${m.role === "user" ? "user" : "ai"}`}>
              <div className="bubble">{m.content}</div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="zm-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
          />
          <button onClick={send} disabled={loading}>
            {loading ? "..." : "Send"}
          </button>
        </div>
      </main>
    </div>
  );
}
