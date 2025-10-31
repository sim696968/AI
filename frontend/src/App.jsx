import React, { useEffect, useState } from "react";
import "./index.css";

const API_BASE = import.meta.env.VITE_API_BASE || "";
const LS_CONVS = "zmai_conversations";

function Icon({ children, label, onClick, active }) {
  return (
    <button className={`icon-btn ${active ? "active" : ""}`} onClick={onClick} title={label}>
      {children}
    </button>
  );
}

export default function App() {
  const [view, setView] = useState("dashboard");

  // Keep minimal conversation state to let chat still work
  const [conversations, setConversations] = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [messages, setMessages] = useState([{ role: "assistant", text: "Hi! I'm ZM-AI 🤖 How can I help you today?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // fetch list (fallback local)
  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_BASE}/conversations`);
      const data = await res.json();
      setConversations(data.conversations || []);
      localStorage.setItem(LS_CONVS, JSON.stringify(data.conversations || []));
    } catch (e) {
      const cached = localStorage.getItem(LS_CONVS);
      setConversations(cached ? JSON.parse(cached) : []);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const createConversation = async (title = "New Chat") => {
    try {
      const res = await fetch(`${API_BASE}/conversations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
      const data = await res.json();
      setConversations((c) => [data, ...c]);
      localStorage.setItem(LS_CONVS, JSON.stringify([data, ...conversations]));
      setSelectedConvId(data.id);
      setView("chat");
      return { id: data.id, local: false };
    } catch (e) {
      const id = `local_${Date.now()}`;
      const conv = { id, title, color: "#4A90E2" };
      setConversations((c) => [conv, ...c]);
      localStorage.setItem(LS_CONVS, JSON.stringify([conv, ...conversations]));
      setSelectedConvId(id);
      setView("chat");
      return { id, local: true };
    }
  };

  // dashboard input state and handler
  const [dashQuery, setDashQuery] = useState("");

  const handleDashboardSubmit = async () => {
    const q = (dashQuery || "").trim();
    if (!q) return;
    // create conversation and then send the query to /chat
    const conv = await createConversation("Quick: " + (q.length > 30 ? q.slice(0, 30) + '…' : q));
    const convId = conv?.id;
    if (!convId) return;

    // add user message locally
    const userMsg = { role: "user", text: q };
    setMessages([userMsg]);
    setDashQuery("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: q, conv_id: convId }) });
      const data = await res.json();
      const assistantText = data.reply || "No response from server.";
      const updated = [userMsg, { role: "assistant", text: assistantText }];
      setMessages(updated);
      localStorage.setItem(`zmai_msgs_${convId}`, JSON.stringify(updated));
      fetchConversations();
      setView("chat");
    } catch (err) {
      // fallback: store locally only
      const updated = [userMsg, { role: "assistant", text: "⚠️ Error: Failed to fetch reply." }];
      setMessages(updated);
      localStorage.setItem(`zmai_msgs_${convId}`, JSON.stringify(updated));
      setView("chat");
    }

    setLoading(false);
  };

  const openConversation = (id) => {
    setSelectedConvId(id);
    setView("chat");
    const cached = localStorage.getItem(`zmai_msgs_${id}`);
    if (cached) setMessages(JSON.parse(cached));
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: "user", text: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: input, conv_id: selectedConvId }) });
      const data = await res.json();
      const assistantText = data.reply || "No response from server.";
      const updated = [...newMessages, { role: "assistant", text: assistantText }];
      setMessages(updated);
      localStorage.setItem(`zmai_msgs_${selectedConvId || "default"}`, JSON.stringify(updated));
      fetchConversations();
    } catch (e) {
      const updated = [...newMessages, { role: "assistant", text: "⚠️ Error: Failed to fetch reply." }];
      setMessages(updated);
      localStorage.setItem(`zmai_msgs_${selectedConvId || "default"}`, JSON.stringify(updated));
    }
    setLoading(false);
  };

  return (
    <div className="app-bg">
      <div className="app-shell">
        <nav className="left-bar">
          <div className="left-top">
            <Icon label="New" onClick={() => createConversation()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Icon>
            <Icon label="Search" onClick={() => setView("dashboard") } active={view==="dashboard"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2"/></svg>
            </Icon>
            <Icon label="Chat" onClick={() => setView("chat")} active={view==="chat"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Icon>
          </div>
          <div className="left-bottom">
            <Icon label="Profile">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.6"/></svg>
            </Icon>
          </div>
        </nav>

        <main className="center-card">
          {view === "dashboard" ? (
            <div className="dashboard">
              <header className="dashboard-header">
                <div className="welcome">Hi Nixtio, <span>Ready to Achieve Great Things?</span></div>
                <div className="upgrade">Upgrade</div>
              </header>

              <section className="hero-cards">
                <div className="hero-card">
                  <div className="card-icon">
                    {/* box icon */}
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="#0f1724" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div className="card-title">Contribute ideas, offer feedback, manage tasks — all in sync.</div>
                  <div className="card-sub">Fast Start</div>
                </div>
                <div className="hero-card">
                  <div className="card-icon">
                    {/* chat bubble icon */}
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#0f1724" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div className="card-title">Stay connected, share ideas, and align goals effortlessly.</div>
                  <div className="card-sub">Collaborate with Team</div>
                </div>
                <div className="hero-card">
                  <div className="card-icon">
                    {/* calendar icon */}
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="16" rx="2" stroke="#0f1724" strokeWidth="1.2"/><path d="M16 3v4M8 3v4M3 11h18" stroke="#0f1724" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div className="card-title">Organize your time efficiently, set clear priorities, and stay focused</div>
                  <div className="card-sub">Planning</div>
                </div>
              </section>

              <section className="dashboard-input">
                <div className="input-shell">
                  <div className="input-left">✚</div>
                  <input className="dash-input" value={dashQuery} onChange={(e) => setDashQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleDashboardSubmit(); }} placeholder='Example: "Explain quantum computing in simple terms"' />
                  <div className="input-actions">
                    <button className="chip" onClick={() => { setDashQuery('Deep research about AI'); handleDashboardSubmit(); }}>Deep Research</button>
                    <button className="chip" onClick={() => { setDashQuery('Generate an image of a sunset over mountains'); handleDashboardSubmit(); }}>Make an Image</button>
                    <button className="chip" onClick={() => { setDashQuery('Search for productivity tips'); handleDashboardSubmit(); }}>Search</button>
                    <button className="chip" onClick={() => { setDashQuery('Create a short music prompt'); handleDashboardSubmit(); }}>Create music</button>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="chat-view">
              <aside className="chat-list">
                <div className="chat-list-top">
                  <h3>Conversations</h3>
                  <button className="new-small" onClick={() => createConversation()}>+ New</button>
                </div>
                <div className="chat-items">
                  {conversations.map((c) => (
                    <div key={c.id} className={`chat-item ${selectedConvId === c.id ? "active" : ""}`} onClick={() => openConversation(c.id)}>
                      <div className="item-badge" style={{ background: c.color || "#4A90E2" }} />
                      <div className="item-title">{c.title || c.id}</div>
                    </div>
                  ))}
                </div>
              </aside>

              <section className="chat-main">
                <div className="zm-chatbox">
                  {messages.map((msg, i) => (
                    <div key={i} className={`zm-message ${msg.role === "user" ? "zm-user" : "zm-assistant"}`}>
                      <div className="zm-bubble">{msg.text}</div>
                    </div>
                  ))}
                  {loading && (
                    <div className="zm-message zm-assistant"><div className="zm-bubble typing">...</div></div>
                  )}
                </div>

                <div className="zm-inputbar">
                  <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }} placeholder="Type a message..." />
                  <button onClick={sendMessage}>Send</button>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
