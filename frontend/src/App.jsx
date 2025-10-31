import { useState, useRef, useEffect } from "react";
import "./index.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: Failed to fetch" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="zm-root">
      <header className="zm-header">
        <h1>ZM-AI</h1>
      </header>

      <div className="zm-chat-container">
        <div className="zm-messages">
          {messages.map((m, i) => (
            <div key={i} className={`zm-bubble ${m.role}`}>
              <div className="zm-content">{m.content}</div>
            </div>
          ))}

          {loading && (
            <div className="zm-bubble assistant typing">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          )}

          <div ref={endRef} />
        </div>

        <div className="zm-input-bar">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
          />
          <button onClick={send} disabled={loading}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
