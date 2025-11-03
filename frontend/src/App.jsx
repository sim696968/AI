import React, { useState, useEffect } from "react";
import ChatSidebar from "./components/ChatSidebar";
import ChatWindow from "./components/ChatWindow";
import "./App.css";

const BACKEND_URL = "https://zmai-backend.onrender.com"; // ← change to your real backend

export default function App() {
  const [chats, setChats] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);

  // Fetch all chats on start
  useEffect(() => {
    fetch(`${BACKEND_URL}/chats`)
      .then(res => res.json())
      .then(setChats)
      .catch(console.error);
  }, []);

  // Create new chat
  const handleNewChat = async () => {
    const res = await fetch(`${BACKEND_URL}/new_chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setChats(prev => ({ ...prev, [data.chat_id]: { title: data.title, messages: [] } }));
    setActiveChatId(data.chat_id);
  };

  // Rename chat
  const handleRenameChat = async (chatId, newTitle) => {
    await fetch(`${BACKEND_URL}/rename_chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, new_title: newTitle }),
    });
    setChats(prev => ({ ...prev, [chatId]: { ...prev[chatId], title: newTitle } }));
  };

  // Delete chat
  const handleDeleteChat = async (chatId) => {
    await fetch(`${BACKEND_URL}/delete_chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId }),
    });
    const updated = { ...chats };
    delete updated[chatId];
    setChats(updated);
    if (activeChatId === chatId) setActiveChatId(null);
  };

  return (
    <div className="zm-root">
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelect={setActiveChatId}
        onNewChat={handleNewChat}
        onRename={handleRenameChat}
        onDelete={handleDeleteChat}
      />
      <ChatWindow
        chatId={activeChatId}
        chat={chats[activeChatId]}
        setChats={setChats}
        BACKEND_URL={BACKEND_URL}
      />
    </div>
  );
}
