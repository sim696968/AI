import React, { useState, useEffect, useRef } from 'react';
import { Menu, BrainCircuit } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ChatInput from './components/ChatInput';
import MessageBubble from './components/MessageBubble';
import SettingsModal from './components/SettingsModal';
import { geminiService } from './services/gemini';
import { Message, AppSettings, Persona, GroundingMetadata, ChatSession } from './types';

const DEFAULT_SETTINGS: AppSettings = {
  persona: Persona.FRIENDLY,
  enableSearch: false,
  userName: 'User'
};

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'model',
  text: "Hello! I'm Aura. I'm here to help you with whatever you need, whether it's recommendations, technical help, or just a friendly chat. How can I assist you today?",
  timestamp: Date.now()
};

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  // Session State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Sessions from LocalStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('aura_sessions');
    const savedSettings = localStorage.getItem('aura_settings');
    
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }

    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            setSettings(parsed);
        } catch (e) {
            console.error("Failed to parse settings", e);
        }
    }
    
    // Initialize default chat (no history)
    geminiService.startChat(savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS);
  }, []);

  // Sync Messages to Active Session and LocalStorage
  useEffect(() => {
    if (!activeSessionId || messages.length === 0) return;

    // We don't want to save if it's just the welcome message
    if (messages.length === 1 && messages[0].id === 'welcome') return;

    setSessions(prevSessions => {
      const updatedSessions = prevSessions.map(session => 
        session.id === activeSessionId 
          ? { ...session, messages: messages, lastUpdated: Date.now() }
          : session
      );
      
      // If the session doesn't exist in state yet (rare race condition), add it
      if (!updatedSessions.find(s => s.id === activeSessionId)) {
         // This block might be redundant due to handleSendMessage logic, but safety first
      }
      
      localStorage.setItem('aura_sessions', JSON.stringify(updatedSessions));
      return updatedSessions;
    });
  }, [messages, activeSessionId]);

  // Save Settings to LocalStorage
  useEffect(() => {
    localStorage.setItem('aura_settings', JSON.stringify(settings));
  }, [settings]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const createNewSession = (firstMessageText: string) => {
    const newId = Date.now().toString();
    const title = firstMessageText.length > 30 ? firstMessageText.substring(0, 30) + '...' : firstMessageText;
    
    const newSession: ChatSession = {
        id: newId,
        title: title,
        messages: [],
        lastUpdated: Date.now()
    };
    
    setSessions(prev => {
        const updated = [...prev, newSession];
        localStorage.setItem('aura_sessions', JSON.stringify(updated));
        return updated;
    });
    setActiveSessionId(newId);
    return newId;
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    let currentSessionId = activeSessionId;
    let isNewSession = false;

    // If no active session (New Chat state), create one now
    if (!currentSessionId) {
        currentSessionId = createNewSession(text);
        isNewSession = true;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: Date.now()
    };

    // If it was a new session, we need to clear the "Welcome" message if we want a clean slate,
    // OR we keep it. Let's keep the user flow natural: Append to what's visible.
    // If it was "New Chat", messages contained [WELCOME_MESSAGE].
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const botMsgId = (Date.now() + 1).toString();
      let accumulatedText = "";
      let groundingData: GroundingMetadata[] = [];
      
      // Placeholder for bot message
      setMessages(prev => [...prev, {
        id: botMsgId,
        role: 'model',
        text: "",
        timestamp: Date.now()
      }]);

      const stream = geminiService.sendMessageStream(text);

      for await (const chunk of stream) {
        if (typeof chunk === 'string') {
            accumulatedText += chunk;
        } else if (chunk.groundingChunks) {
            chunk.groundingChunks.forEach((c: any) => {
                if (c.web && c.web.uri) {
                    groundingData.push({
                        url: c.web.uri,
                        title: c.web.title || c.web.uri
                    });
                }
            });
        }
        
        setMessages(prev => prev.map(msg => 
          msg.id === botMsgId 
            ? { ...msg, text: accumulatedText, groundingMetadata: groundingData.length > 0 ? groundingData : undefined } 
            : msg
        ));
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "I'm sorry, I encountered an error connecting to my consciousness. Please try again.",
        timestamp: Date.now(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    const newWelcomeMsg = { ...WELCOME_MESSAGE, text: `Hello ${settings.userName}! Ready for a fresh start. What's on your mind?`, timestamp: Date.now() };
    setMessages([newWelcomeMsg]);
    geminiService.startChat(settings); // Reset backend context without history
  };

  const handleSelectSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
        setActiveSessionId(sessionId);
        setMessages(session.messages);
        // Re-initialize Gemini service with the selected session's history
        geminiService.startChat(settings, session.messages);
    }
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(updatedSessions);
    localStorage.setItem('aura_sessions', JSON.stringify(updatedSessions));

    // If we deleted the active session, reset to new chat
    if (sessionId === activeSessionId) {
        handleNewChat();
    }
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    // When settings change, re-init the service with current messages (if any) to apply new persona
    geminiService.startChat(newSettings, messages);
    
    if (newSettings.persona !== settings.persona) {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: `*Adjusting personality matrix to: ${newSettings.persona.toUpperCase()}...* Done. How can I help you in this mode?`,
            timestamp: Date.now()
        }]);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        onNewChat={handleNewChat}
        onOpenSettings={() => setIsSettingsOpen(true)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
      />

      <main className="flex-1 flex flex-col h-full relative w-full">
        {/* Mobile Header */}
        <header className="h-16 flex items-center px-4 border-b border-gray-800 bg-gray-900/95 backdrop-blur z-10 md:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-400 hover:text-white">
            <Menu size={24} />
          </button>
          <div className="ml-2 font-semibold flex items-center gap-2">
            <BrainCircuit size={20} className="text-blue-500" />
            <span>Aura</span>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          <div className="max-w-4xl mx-auto">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {/* Thinking Indicator */}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
               <div className="flex items-center gap-2 text-gray-500 text-sm ml-2 animate-pulse">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
                  <span>Thinking...</span>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <ChatInput 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading}
          enableSearch={settings.enableSearch}
          onToggleSearch={() => setSettings(prev => ({ ...prev, enableSearch: !prev.enableSearch }))}
        />
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={handleUpdateSettings}
      />
    </div>
  );
};

export default App;