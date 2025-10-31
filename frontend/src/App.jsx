import React, { useEffect, useState } from "react";
import "./index.css";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Simple localStorage keys for fallback
const LS_CONVS = "zmai_conversations";

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [meta, setMeta] = useState({ title: "New Chat", color: "#4A90E2" });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // -- backend helpers with local fallback --
  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_BASE}/conversations`);
      const data = await res.json();
      setConversations(data.conversations || []);
      // persist locally as cache
      localStorage.setItem(LS_CONVS, JSON.stringify(data.conversations || []));
    } catch (err) {
      // fallback to localStorage
      const cached = localStorage.getItem(LS_CONVS);
      if (cached) setConversations(JSON.parse(cached));
    }
  };

  const createConversation = async (title = "New Chat") => {
    try {
      const res = await fetch(`${API_BASE}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      setConversations((c) => [data, ...c]);
      localStorage.setItem(LS_CONVS, JSON.stringify([data, ...conversations]));
      selectConversation(data.id);
    } catch (err) {
      // local-only conversation
      const id = `local_${Date.now()}`;
      const conv = { id, title, color: "#4A90E2" };
      setConversations((c) => [conv, ...c]);
      localStorage.setItem(LS_CONVS, JSON.stringify([conv, ...conversations]));
      selectConversation(id, true);
    }
  };

  const selectConversation = async (id, localOnly = false) => {
    setSelectedConvId(id);
    if (localOnly || id.startsWith("local_")) {
      const cachedMessages = localStorage.getItem(`zmai_msgs_${id}`);
      setMessages(cachedMessages ? JSON.parse(cachedMessages) : [{ role: "assistant", text: "New chat started ✨ What’s up?" }]);
      setMeta({ title: "New Chat", color: "#4A90E2" });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/conversation/${id}`);
      const data = await res.json();
      setMessages(data.messages || []);
      setMeta(data.meta || { title: "New Chat", color: "#4A90E2" });
    } catch (err) {
      // on error, fallback to empty
      setMessages([{ role: "assistant", text: "New chat started ✨ What’s up?" }]);
      setMeta({ title: "New Chat", color: "#4A90E2" });
    }
  };

  const deleteConversation = async (id) => {
    try {
      await fetch(`${API_BASE}/conversation/${id}`, { method: "DELETE" });
      setConversations((c) => c.filter((x) => x.id !== id));
      localStorage.setItem(LS_CONVS, JSON.stringify(conversations.filter((x) => x.id !== id)));
      if (selectedConvId === id) {
        if (conversations.length > 1) selectConversation(conversations.find((c) => c.id !== id).id);
        else createConversation();
      }
    } catch (err) {
      // local-only delete
      setConversations((c) => c.filter((x) => x.id !== id));
      localStorage.setItem(LS_CONVS, JSON.stringify(conversations.filter((x) => x.id !== id)));
      localStorage.removeItem(`zmai_msgs_${id}`);
      if (selectedConvId === id) createConversation();
    }
  };

  // send message; include conv_id so backend can persist
  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: "user", text: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const body = { message: input, conv_id: selectedConvId };
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const assistantText = data.reply || "No response from server.";
      const updated = [...newMessages, { role: "assistant", text: assistantText }];
      setMessages(updated);
      // persist locally as a cache
      localStorage.setItem(`zmai_msgs_${selectedConvId || "default"}`, JSON.stringify(updated));
      // refresh conversation list titles/colors (meta might have been created on server)
      fetchConversations();
    } catch (err) {
      const updated = [...newMessages, { role: "assistant", text: "⚠️ Error: Failed to fetch reply." }];
      setMessages(updated);
      localStorage.setItem(`zmai_msgs_${selectedConvId || "default"}`, JSON.stringify(updated));
    }

    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  useEffect(() => {
    // load conversations on start
    fetchConversations().then(() => {
      // if any exist, select the first; otherwise create one
      setTimeout(() => {
        const cached = JSON.parse(localStorage.getItem(LS_CONVS) || "[]");
        if (cached && cached.length > 0) selectConversation(cached[0].id);
        else createConversation();
      }, 50);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="zm-layout">
      <aside className="zm-sidebar">
        <div>
          <h2 className="zm-logo">ZM-AI</h2>
          <button className="zm-newchat" onClick={() => createConversation()}>
            + New Chat
          </button>

          <div className="zm-conversations">
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`zm-conv-item ${selectedConvId === c.id ? "selected" : ""}`}
                onClick={() => selectConversation(c.id)}
              >
                <span className="conv-badge" style={{ background: c.color || "#4A90E2" }} />
                <span className="conv-title">{c.title || c.id}</span>
                <button className="conv-delete" onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }} title="Delete">✕</button>
              </div>
            ))}
          </div>
        </div>

        <div className="zm-sidebar-footer">
          <p>Built with ❤️ by ZM</p>
        </div>
      </aside>

      <main className="zm-main">
        <div className="zm-chatbox">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`zm-message ${msg.role === "user" ? "zm-user" : "zm-assistant"}`}
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
            placeholder={meta?.title ? `Chat: ${meta.title}` : "Type a message..."}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </main>
    </div>
  );
}
