import React from 'react';
import { Settings, Plus, MessageSquare, X, BrainCircuit, Trash2, Calendar } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  setIsOpen, 
  onNewChat, 
  onOpenSettings,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div 
        className={`fixed top-0 left-0 bottom-0 w-72 bg-gray-950 border-r border-gray-800 z-30 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2 text-white font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BrainCircuit size={18} className="text-white" />
            </div>
            <span>Aura</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button 
            onClick={() => {
                onNewChat();
                setIsOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95"
          >
            <Plus size={20} />
            <span>New Chat</span>
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Recent Conversations
            </div>
            
            <div className="space-y-1">
              {sessions.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-600 text-sm italic">
                  No saved chats yet.
                </div>
              ) : (
                sessions.sort((a, b) => b.lastUpdated - a.lastUpdated).map((session) => (
                  <div 
                    key={session.id}
                    onClick={() => {
                      onSelectSession(session.id);
                      setIsOpen(false);
                    }}
                    className={`group relative w-full text-left px-3 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-3 border border-transparent ${
                      activeSessionId === session.id
                        ? 'bg-gray-800 border-gray-700 text-blue-100 shadow-sm' 
                        : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                    }`}
                  >
                    <MessageSquare size={16} className={`flex-shrink-0 ${activeSessionId === session.id ? 'text-blue-400' : 'text-gray-600 group-hover:text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium">
                        {session.title}
                      </div>
                      <div className="text-[10px] text-gray-600 flex items-center gap-1 mt-0.5">
                        <Calendar size={10} />
                        {new Date(session.lastUpdated).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => onDeleteSession(e, session.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                      title="Delete chat"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
        </div>

        {/* Footer / Settings */}
        <div className="p-4 border-t border-gray-800 bg-gray-950">
          <button 
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-xl transition-colors"
          >
            <Settings size={20} className="text-gray-400" />
            <span className="font-medium text-sm">Settings & Persona</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;