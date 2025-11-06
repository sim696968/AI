import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const App = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Hello! I am ZM AI Assistant. How can I help you today?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      sender: 'user',
      text: inputValue,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponses = [
        "I understand your question about " + inputValue + ". Let me help with that.",
        "That's an interesting point about " + inputValue + ". Here's what I think...",
        "Thanks for asking about " + inputValue + ". Here's the information you need...",
        "I've analyzed your question about " + inputValue + ". Here's my response..."
      ];
      
      const aiMessage = {
        id: messages.length + 2,
        sender: 'ai',
        text: aiResponses[Math.floor(Math.random() * aiResponses.length)],
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn">
            <span>+</span> New Chat
          </button>
          <button className="toggle-sidebar" onClick={toggleSidebar}>
            ☰
          </button>
        </div>
        <div className="chat-history">
          <div className="chat-item active">
            <span>New Chat</span>
          </div>
          <div className="chat-item">
            <span>Previous Chat 1</span>
          </div>
          <div className="chat-item">
            <span>Previous Chat 2</span>
          </div>
        </div>
        <div className="user-profile">
          <div className="profile-pic">U</div>
          <span>User Name</span>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="main-content">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <h1>ZM AI Assistant</h1>
            <p>How can I help you today?</p>
          </div>
        ) : (
          <div className="chat-messages">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.sender}`}>
                <div className="message-content">
                  {message.text}
                </div>
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        <form className="message-input-container" onSubmit={handleSendMessage}>
          <div className="input-wrapper">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message here..."
            />
            <button type="submit" className="send-button">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
