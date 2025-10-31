import React, { useState, useEffect, useRef } from 'react'

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
    setMessages(m => [...m, { role: 'user', content: userMsg }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conv_id: convId, message: userMsg })
      })
      const data = await res.json()
      if (!data.reply) throw new Error('Empty response from server')
      setMessages(m => [...m, { role: 'assistant', content: data.reply }])
      setConvId(data.conv_id)
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: '⚠️ Error: ' + e.message }])
    }
    setLoading(false)
  }

  return (
    <div className="chat-container">
      <h1 className="title">🧠 ZM-AI</h1>
      <div className="chat-box">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">{m.content}</div>
          </div>
        ))}
        <div ref={endRef}></div>
      </div>
      <div className="input-row">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Type your message..."
        />
        <button onClick={send} disabled={loading}>
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
