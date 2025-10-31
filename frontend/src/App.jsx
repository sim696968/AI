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
    setMessages(m => [...m, { role: 'user', content: userMsg, time: new Date().toLocaleTimeString() }])
    setInput(''); setLoading(true)

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
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#2b2d42' }}>🤖 ZM-AI Chat</h1>
      <div style={{
        border: '1px solid #ddd',
        borderRadius: 12,
        padding: 16,
        background: '#f8f9fa',
        minHeight: 400,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{ margin: '12px 0' }}>
            <div style={{
              background: m.role === 'user' ? '#d4edda' : '#e2e3e5',
              borderRadius: 10,
              padding: '10px 14px',
              maxWidth: '70%',
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              float: m.role === 'user' ? 'right' : 'left',
              clear: 'both'
            }}>
              <strong>{m.role === 'user' ? 'You' : 'ZM-AI'}:</strong>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
              <div style={{ fontSize: 10, color: '#666', textAlign: 'right' }}>{m.time}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ margin: '8px 0', fontStyle: 'italic', color: '#888' }}>ZM-AI is typing...</div>
        )}
        <div ref={endRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 8,
            border: '1px solid #ccc'
          }}
          placeholder='Type your message...'
        />
        <button
          onClick={send}
          disabled={loading}
          style={{
            background: '#2b2d42',
            color: 'white',
            border: 'none',
            padding: '10px 18px',
            borderRadius: 8,
            cursor: 'pointer'
          }}>
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
