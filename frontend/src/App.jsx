import React, { useState, useEffect, useRef } from "react";
import "./index.css";

export default function App() {
  const [convId, setConvId] = useState("default");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(
        import.meta.env.VITE_API_URL || "http://localhost:8000/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conv_id: convId, message: userMsg }),
        }
      );
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      setConvId(data.conv_id);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Error: " + String(e) },
      ]);
    }
    setLoading(false);
  }

  return (
    <div className="zm-root">
      <header className="zm-header">
        <h1>ZM-AI</h1>
      </header>

      <div className="zm-chatbox">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`zm-msg ${m.role === "user" ? "user" : "ai"}`}
          >
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
    </div>
  );
}
