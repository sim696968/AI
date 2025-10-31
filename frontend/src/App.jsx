import React, { useState, useEffect, useRef } from 'react'
import './index.css'
import robot from './assets/robot.png'

export default function App() {
  const [convId, setConvId] = useState('default')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim()) return
    const userMsg = input
    setMessages(m => [...m, { role: 'user', content: userMsg, time: new Date().toLocaleTimeString() }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conv_id: convId, message: userMsg })
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.reply, time: new Date().toLocaleTimeString() }])
      setConvId(data.conv_id)
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: 'Error: ' + String(e), time: new Date().toLocaleTimeString() }])
    }
    setLoading(false)
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <img src={robot} alt="ZM-AI" className="logo" />
        <h1>ZM-AI</h1>
      </div>

      <div className="chat-box">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            <div className="bubble">
              <div className="content">{m.content}</div>
              <div className="time">{m.time}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            <div className="bubble typing">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="chat-input">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button onClick={send} disabled={loading}>
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
