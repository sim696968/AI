import React, { useEffect, useState, useRef } from "react";
import "./index.css";
import plusIcon from "./assets/icons/plus.svg";
import searchIcon from "./assets/icons/search.svg";
import chatIcon from "./assets/icons/chat-icon.svg";
import profileIcon from "./assets/icons/profile.svg";
import boxIcon from "./assets/icons/box.svg";
import heroChatIcon from "./assets/icons/chat.svg";
import calendarIcon from "./assets/icons/calendar.svg";

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

      // simulate streaming reveal
      simulateStream(assistantText, convId, userMsg);
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

  // streaming simulation: gradually reveal assistant text
  const streamTimers = useRef([]);
  useEffect(() => {
    return () => {
      // cleanup timers on unmount
      streamTimers.current.forEach((t) => clearInterval(t));
    };
  }, []);

  const simulateStream = (fullText, convId, userMsg) => {
    // clear any existing timers
    streamTimers.current.forEach((t) => clearInterval(t));
    streamTimers.current = [];

    let idx = 0;
    const chunkSize = 2; // reveal characters per tick
    const placeholder = { role: "assistant", text: "", streaming: true };
    setMessages([userMsg, placeholder]);

    const t = setInterval(() => {
      idx += chunkSize;
      const slice = fullText.slice(0, idx);
      setMessages([userMsg, { role: "assistant", text: slice }]);
      if (idx >= fullText.length) {
        clearInterval(t);
      }
    }, 30);
    streamTimers.current.push(t);
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
        <nav className="left-bar" aria-label="Primary navigation">
          <div className="left-top">
            <Icon label="New" onClick={() => createConversation()}>
              <img src={plusIcon} alt="new" width="18" height="18" />
            </Icon>
            <Icon label="Dashboard" onClick={() => setView("dashboard") } active={view==="dashboard"}>
              <img src={searchIcon} alt="dashboard" width="18" height="18" />
            </Icon>
            <Icon label="Chat" onClick={() => setView("chat")} active={view==="chat"}>
              <img src={chatIcon} alt="chat" width="18" height="18" />
            </Icon>
          </div>
          <div className="left-bottom">
            <Icon label="Profile">
              <img src={profileIcon} alt="profile" width="18" height="18" />
            </Icon>
          </div>
        </nav>

        <main className="center-card">
          {view === "dashboard" ? (
            <div className="dashboard">
              <header className="dashboard-header">
                <div className="welcome"><span>Ready to Achieve Great Things?</span></div>
                <div className="upgrade">Upgrade</div>
              </header>

              <section className="hero-cards">
                <div className="hero-card">
                  <div className="card-icon">
                    <img src={boxIcon} alt="box" width="28" height="28" />
                  </div>
                  <div className="card-title">Contribute ideas, offer feedback, manage tasks — all in sync.</div>
                  <div className="card-sub">Fast Start</div>
                </div>
                <div className="hero-card">
                  <div className="card-icon">
                    <img src={heroChatIcon} alt="chat" width="28" height="28" />
                  </div>
                  <div className="card-title">Stay connected, share ideas, and align goals effortlessly.</div>
                  <div className="card-sub">Collaborate with Team</div>
                </div>
                <div className="hero-card">
                  <div className="card-icon">
                    <img src={calendarIcon} alt="calendar" width="28" height="28" />
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
              <aside className="chat-list" aria-label="Conversations">
                <div className="chat-list-top">
                  <h3>Conversations</h3>
                  <button className="new-small" onClick={() => createConversation()} aria-label="Create conversation">+ New</button>
                </div>
                <div className="chat-items">
                  {conversations.map((c) => (
                    <div key={c.id} className={`chat-item ${selectedConvId === c.id ? "active" : ""}`}>
                      <div className="item-badge" style={{ background: c.color || "#4A90E2" }} onClick={() => openConversation(c.id)} />
                      <div className="item-title" onClick={() => openConversation(c.id)}>{c.title || c.id}</div>
                      <div className="item-actions">
                        <input aria-label="Pick color" type="color" defaultValue={c.color || "#4A90E2"} onChange={(e) => {
                          // optimistic UI change
                          const newColor = e.target.value;
                          setConversations((arr) => arr.map(x => x.id === c.id ? { ...x, color: newColor } : x));
                          // send to backend
                          fetch(`${API_BASE}/conversation/${c.id}/color`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ color: newColor }) }).catch(()=>{});
                        }} />
                        <button className="rename-btn" onClick={() => {
                          const newTitle = prompt('Rename conversation', c.title || '');
                          if (newTitle) {
                            setConversations((arr) => arr.map(x => x.id === c.id ? { ...x, title: newTitle } : x));
                            fetch(`${API_BASE}/conversation/${c.id}/rename`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle }) }).catch(()=>{});
                          }
                        }} aria-label={`Rename ${c.title || c.id}`}>✎</button>
                        <button className="delete-btn" onClick={() => {
                          if (confirm(`Delete conversation "${c.title || c.id}"? This cannot be undone.`)) {
                            fetch(`${API_BASE}/conversation/${c.id}`, { method: 'DELETE' }).catch(()=>{});
                            setConversations((arr) => arr.filter(x=>x.id !== c.id));
                          }
                        }} aria-label={`Delete ${c.title || c.id}`}>🗑️</button>
                      </div>
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
