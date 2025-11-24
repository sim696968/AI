import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, GroundingMetadata } from '../types';
import { User, Bot, Globe } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-600' : 'bg-emerald-600'} shadow-lg`}>
          {isUser ? <User size={20} className="text-white" /> : <Bot size={20} className="text-white" />}
        </div>

        {/* Bubble Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div 
            className={`px-5 py-3.5 rounded-2xl shadow-md text-sm md:text-base leading-relaxed overflow-hidden
              ${isUser 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700'
              }
              ${message.isError ? 'bg-red-900/50 border-red-500' : ''}
            `}
          >
            {message.isError ? (
               <span className="text-red-200">Error: {message.text}</span>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                    components={{
                        // Tailor markdown styles to Tailwind
                        a: ({node, ...props}) => <a {...props} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" />,
                        p: ({node, ...props}) => <p {...props} className="mb-2 last:mb-0" />,
                        ul: ({node, ...props}) => <ul {...props} className="list-disc ml-4 mb-2" />,
                        ol: ({node, ...props}) => <ol {...props} className="list-decimal ml-4 mb-2" />,
                        code: ({node, ...props}) => <code {...props} className="bg-gray-900/50 px-1 py-0.5 rounded text-xs font-mono text-pink-300" />,
                        pre: ({node, ...props}) => <pre {...props} className="bg-gray-950 p-3 rounded-lg overflow-x-auto my-2 border border-gray-700 text-xs" />,
                    }}
                >
                    {message.text}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Timestamp & Metadata */}
          <div className="flex items-center gap-2 mt-1 px-1">
             <span className="text-xs text-gray-500">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </span>
          </div>

          {/* Search Sources / Grounding */}
          {message.groundingMetadata && message.groundingMetadata.length > 0 && (
            <div className="mt-2 bg-gray-800/50 border border-gray-700 rounded-lg p-2 max-w-full">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5">
                <Globe size={12} />
                <span className="font-medium uppercase tracking-wider">Sources</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {message.groundingMetadata.map((source, idx) => (
                  <a 
                    key={idx} 
                    href={source.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-1 bg-gray-900 hover:bg-gray-700 border border-gray-700 rounded px-2 py-1 text-xs text-blue-300 transition-colors truncate max-w-[200px]"
                  >
                    <span className="truncate">{source.title || source.url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;