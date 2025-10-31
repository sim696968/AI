// ... inside your React component
return (
  <div className="zm-root">
    <header className="zm-header">
      <h1>ZM-AI</h1>
    </header>

    <div className="zm-chat-container">
      <div className="zm-messages">
        {messages.map((m,i) => (
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
          onChange={e => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button onClick={send} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  </div>
)
