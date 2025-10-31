// frontend/src/App.jsx
import React, { useState, useEffect, useRef } from "react";
import "./index.css";

const DEFAULT_COLORS = ["#4A90E2", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

function makeUserId() {
  let id = localStorage.getItem("zm_user_id");
  if (!id) {
    id = "user_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("zm_user_id", id);
  }
  return id;
}

export default function App() {
  const userId = makeUserId();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [renameMode, setRenameMode] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchConversations() {
    try {
      const res = await fetch(`/conversations?user_id=${userId}`);
      const data = await res.json();
      setConversations(data.conversations || []);
      if (data.conversations && data.conversations.length > 0) {
        // pick first if no active
        if (!activeId) {
          openConversation(data.conversations[0].id);
        }
      } else {
        // create a default conversation
        const created = await createConversation("Welcome", DEFAULT_COLORS[0]);
        openConversation(created.id);
      }
    } catch (e) {
      console.error("Could not fetch conversations:", e);
    }
  }

  async function createConversation(title = "New Chat", color = "#4A90E2") {
    const res = await fetch("/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, color, user_id: userId }),
    });
    const data = await res.json();
    setConversations((c) => [...c, { id: data.id, title: data.title, color: data.color }]);
    return data;
  }

  async function openConversation(id) {
    setActiveId(id);
    const res = await fetch(`/conversation/${id}`);
    const data = await res.json();
    setMessages(data.messages || []);
    // ensure meta present in conversations list
    setConversations((prev) => {
      const exists = prev.find((p) => p.id === id);
      if (!exists) {
        return [...prev, { id: id, title: data.meta.title, color: data.meta.color }];
      } else {
        return prev.map((p) => (p.id === id ? { ...p, title: data.meta.title, color: data.meta.color } : p));
      }
    });
  }

  async function sendMessage() {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conv_id: activeId, message: userMsg }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "Error: " + String(e) }]);
    }
    setLoading(false);
  }

  async function renameConversation(id, title) {
    await fetch(`/conversation/${id}/rename`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setConversations((c) => c.map((x) => (x.id === id ? { ...x, title } : x)));
    setRenameMode(null);
  }

  async function changeColor(id, color) {
    await fetch(`/conversation/${id}/color`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
    setConversations((c) => c.map((x) => (x.id === id ? { ...x, color } : x)));
    setColorPickerVisible(false);
  }

  async function deleteConversation(id) {
    if (!confirm("Delete this conversation?")) return;
    await fetch(`/conversation/${id}`, { method: "DELETE" });
    setConversations((c) => c.filter((x) => x.id !== id));
    if (activeId === id) {
      if (conversations.length > 1) {
        const next = conversations.find((c) => c.id !== id);
        openConversation(next.id);
      } else {
        const created = await createConversation("New Chat", DEFAULT_COLORS[0]);
        openConversation(created.id);
      }
    }
  }

  return (
    <div className="zm-root">
      <aside className="zm-sidebar">
        <div className="zm-brand">
          <div className="zm-logo">ZM</div>
          <div className="zm-title">ZM-AI</div>
        </div>

        <button
          className="zm-new-btn"
          onClick={async () => {
            const created = await createConversation("New Chat", DEFAULT_COLORS[0]);
            openConversation(created.id);
          }}
        >
          + New Chat
        </button>

        <div className="zm-list">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`zm-item ${c.id === activeId ? "active" : ""}`}
              onClick={() => openConversation(c.id)}
            >
              <div className="zm-color" style={{ background: c.color || "#4A90E2" }} />
              <div className="zm-item-title">{c.title}</div>
              <div className="zm-item-actions">
                <button
                  title="Rename"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenameMode(c.id);
                    setNewTitle(c.title);
                  }}
                >
                  ✏️
                </button>
                <button
                  title="Color"
                  onClick={(e) => {
                    e.stopPropagation();
                    setColorPickerVisible(c.id === colorPickerVisible ? false : c.id);
                  }}
                >
                  🎨
                </button>
                <button
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(c.id);
                  }}
                >
                  🗑️
                </button>
              </div>

              {renameMode === c.id && (
                <div className="rename-row">
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Conversation title"
                  />
                  <button
                    onClick={() => {
                      renameConversation(c.id, newTitle || "Untitled");
                    }}
                  >
                    Save
                  </button>
                </div>
              )}

              {colorPickerVisible === c.id && (
                <div className="color-row">
                  {DEFAULT_COLORS.map((col) => (
                    <button
                      key={col}
                      className="color-swatch"
                      style={{ background: col }}
                      onClick={() => changeColor(c.id, col)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="zm-footer">User: <code>{userId}</code></div>
      </aside>

      <main className="zm-main">
        <div className="chat-header">
          <div className="chat-title">{conversations.find(c=>c.id===activeId)?.title || "New Chat"}</div>
          <div className="chat-meta">{conversations.find(c=>c.id===activeId)?.id}</div>
        </div>

        <div className="chat-body">
          {messages.length === 0 && <div className="chat-empty">No messages yet — say hi 👋</div>}
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role === "user" ? "chat-user" : "chat-assistant"}`}>
              <div className="chat-bubble">{m.content}</div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="chat-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type your message..."
          />
          <button onClick={() => sendMessage()} disabled={loading}>
            {loading ? "..." : "Send"}
          </button>
        </div>
      </main>
    </div>
  );
}
