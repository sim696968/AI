import React, { useState, useRef, useEffect } from "react";

export default function ChatWindow({ chatId, chat, setChats, BACKEND_URL }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState("chat");
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!chatId || (!input.trim() && attachments.length === 0)) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('content', input);
    
    attachments.forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setChats(prev => ({ ...prev, [chatId]: { ...prev[chatId], messages: data.messages } }));
      setInput("");
      setAttachments([]);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const renderHeader = () => (
    <div className="chat-header">
      <button className="back-button">←</button>
      <h2>New Chat</h2>
      <button className="close-button">×</button>
    </div>
  );

  const renderMessages = () => (
    <div className="messages">
      {chat?.messages?.map((msg, idx) => (
        <div key={idx} className={`message ${msg.role}`}>
          <div className="message-avatar">
            {msg.role === "assistant" ? "🤖" : "👤"}
          </div>
          <div className="message-content">
            <p>{msg.content}</p>
            {msg.images && (
              <div className="message-images">
                {msg.images.map((img, i) => (
                  <img key={i} src={img} alt={`Generated ${i + 1}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      {loading && (
        <div className="message assistant">
          <div className="message-avatar">🤖</div>
          <div className="message-content">
            <p>Typing...</p>
          </div>
        </div>
      )}
    </div>
  );

  // toolbar removed (replaced by feature pills below)

  if (!chatId) {
    return (
      <div className="chat-window empty">
        <p>🧠 Start a new chat to begin talking with ZM-AI.</p>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <button className="back-button">←</button>
        <h2>New Chat</h2>
        <button className="close-button">×</button>
      </div>

      {/* Intro / document summary area (matches reference) */}
      <div className="intro-section">
        <div className="user-intro">
          <div className="user-avatar"><img src="/user-avatar.png" alt="user"/></div>
          <div>
            <div className="greeting">Hi, Marry!</div>
            <div className="sub">How can I help you?</div>
          </div>
          <div style={{marginLeft:'auto'}}>
            {/* small action icons */}
            <button className="small-btn">⋯</button>
          </div>
        </div>

        <div className="code-area">
          <div className="tabs">
            <div className="tab">HTML</div>
            <div className="tab">CSS</div>
            <div className="tab active">JS</div>
          </div>
          <div style={{fontSize:13, color:'#444'}}>let cancelButton = document.getElementById("cancel-button");</div>
        </div>

        <div className="doc-cards">
          <div className="doc-pill">Chat Files</div>
          <div className="doc-pill">Images</div>
          <div className="doc-pill">Translate</div>
          <div className="doc-pill">Audio Chat</div>
        </div>
      </div>

      <div className="messages" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
        {chat?.messages?.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === "assistant" ? (
                <img src="/bot-avatar.png" alt="AI" />
              ) : (
                <img src="/user-avatar.png" alt="User" />
              )}
            </div>
            <div className="message-content">
              <p>{msg.content}</p>
              {msg.images && (
                <div className="message-images">
                  {msg.images.map((img, i) => (
                    <img key={i} src={img} alt={`Generated ${i + 1}`} />
                  ))}
                </div>
              )}
              {msg.files && (
                <div className="message-files">
                  {msg.files.map((file, i) => (
                    <div key={i} className="file-attachment">
                      {file.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="message-avatar">
              <img src="/bot-avatar.png" alt="AI" />
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <div className="feature-toolbar">
          <button 
            className={`feature-btn ${activeFeature === "chat" ? "active" : ""}`}
            onClick={() => setActiveFeature("chat")}
          >
            <span className="feature-icon">💭</span>
            Chat
          </button>
          <button 
            className={`feature-btn ${activeFeature === "images" ? "active" : ""}`}
            onClick={() => setActiveFeature("images")}
          >
            <span className="feature-icon">🖼️</span>
            Images
          </button>
          <button 
            className={`feature-btn ${activeFeature === "translate" ? "active" : ""}`}
            onClick={() => setActiveFeature("translate")}
          >
            <span className="feature-icon">🌐</span>
            Translate
          </button>
          <button 
            className={`feature-btn ${activeFeature === "audio" ? "active" : ""}`}
            onClick={() => setActiveFeature("audio")}
          >
            <span className="feature-icon">🎤</span>
            Audio
          </button>
        </div>

        {attachments.length > 0 && (
          <div className="attachments-preview">
            {attachments.map((file, index) => (
              <div key={index} className="attachment-item">
                <span>{file.name}</span>
                <button onClick={() => removeAttachment(index)}>×</button>
              </div>
            ))}
          </div>
        )}

        <div className="input-box">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            multiple
          />
          <button 
            className="attachment-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="feature-icon">📎</span>
          </button>
          <input
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          />
          <button 
            className="send-button" 
            onClick={sendMessage}
            disabled={!input.trim() && attachments.length === 0}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
