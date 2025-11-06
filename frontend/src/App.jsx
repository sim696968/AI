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
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      sender: 'user',
      text: inputValue,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      // Debug: Log environment variables
      console.log('Environment:', import.meta.env);
      console.log('API Key exists:', !!import.meta.env.VITE_OPENAI_API_KEY);

      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key is not configured');
      }

      console.log('Using API Key:', apiKey ? '***' + apiKey.slice(-4) : 'Not found');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant.'
            },
            ...updatedMessages.map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.text
            }))
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0].message) {
        const aiMessage = {
          id: updatedMessages.length + 1,
          sender: 'ai',
          text: data.choices[0].message.content,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      const errorMessage = {
        id: updatedMessages.length + 1,
        sender: 'ai',
        text: "I'm sorry, I encountered an error. Please try again later.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
              placeholder={isLoading ? "AI is thinking..." : "Type your message here..."}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className={`send-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? (
                <div className="loading-spinner"></div>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
