import React, { useState, useRef, useEffect } from 'react';
import { Send, Globe, Loader2, Sparkles, Mic, MicOff } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  enableSearch: boolean;
  onToggleSearch: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, enableSearch, onToggleSearch }) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || isLoading) return;
    onSendMessage(text);
    setText('');
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // Capture current text to append to
    const initialText = text;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onend = () => {
        setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
        }
        setText(initialText + (initialText && !initialText.endsWith(' ') ? ' ' : '') + transcript);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      <div className={`relative flex flex-col bg-gray-800 border rounded-2xl shadow-xl transition-all ${isListening ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-gray-700 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500'}`}>
        
        {/* Input Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "Listening..." : "Ask Aura anything..."}
          className="w-full bg-transparent text-white placeholder-gray-400 p-4 min-h-[56px] max-h-[120px] resize-none focus:outline-none rounded-t-2xl text-base"
          disabled={isLoading}
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 rounded-b-2xl border-t border-gray-700/50">
          
          <div className="flex items-center gap-2">
            {/* Search Toggle */}
            <button
              type="button"
              onClick={onToggleSearch}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                enableSearch 
                  ? 'bg-blue-900/40 text-blue-300 border border-blue-800' 
                  : 'bg-gray-700/30 text-gray-400 border border-transparent hover:bg-gray-700'
              }`}
              title="Toggle Google Search (Grounding)"
            >
              <Globe size={14} className={enableSearch ? 'text-blue-400' : ''} />
              <span>Web Search {enableSearch ? 'On' : 'Off'}</span>
            </button>
            
             {/* Decorative 'AI' Badge */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs text-emerald-400 font-medium opacity-70 cursor-default select-none">
                <Sparkles size={12} />
                <span>Gemini 2.5</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mic Button */}
            <button
              onClick={toggleListening}
              disabled={isLoading}
              className={`p-2 rounded-xl transition-all duration-200 ${
                isListening
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 animate-pulse'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
              title={isListening ? "Stop Listening" : "Voice Input"}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Send Button */}
            <button
              onClick={() => handleSubmit()}
              disabled={!text.trim() || isLoading}
              className={`p-2 rounded-xl transition-all duration-200 ${
                text.trim() && !isLoading
                  ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>
      
      <div className="text-center mt-2">
         <p className="text-[10px] text-gray-500">
            Aura may display inaccurate info, including about people, so double-check its responses.
         </p>
      </div>
    </div>
  );
};

export default ChatInput;