import React from 'react';
import { X, User, Zap, Coffee, Code, PenTool } from 'lucide-react';
import { Persona, AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = React.useState<AppSettings>(settings);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const personas = [
    { id: Persona.FRIENDLY, icon: Coffee, label: 'Friendly', desc: 'Warm, empathetic, casual.' },
    { id: Persona.PROFESSIONAL, icon: Zap, label: 'Professional', desc: 'Concise, efficient, polite.' },
    { id: Persona.TECHNICAL, icon: Code, label: 'Technical', desc: 'Detailed, precise, expert.' },
    { id: Persona.CREATIVE, icon: PenTool, label: 'Creative', desc: 'Imaginative, inspiring.' },
  ];

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-gray-950/50">
          <h2 className="text-xl font-semibold text-white">Customize Aura</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
            {/* User Name */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Your Name</label>
                <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                        type="text" 
                        value={localSettings.userName}
                        onChange={(e) => setLocalSettings({...localSettings, userName: e.target.value})}
                        className="w-full bg-gray-800 border border-gray-700 text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-gray-500"
                        placeholder="What should Aura call you?"
                    />
                </div>
            </div>

            {/* Persona Selection */}
            <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">AI Personality</label>
                <div className="grid grid-cols-1 gap-2">
                    {personas.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setLocalSettings({...localSettings, persona: p.id})}
                            className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                                localSettings.persona === p.id 
                                    ? 'bg-blue-900/20 border-blue-500/50 ring-1 ring-blue-500/50' 
                                    : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                            }`}
                        >
                            <div className={`p-2 rounded-lg ${localSettings.persona === p.id ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                <p.icon size={20} />
                            </div>
                            <div className="text-left">
                                <div className={`font-medium ${localSettings.persona === p.id ? 'text-blue-100' : 'text-gray-300'}`}>{p.label}</div>
                                <div className="text-xs text-gray-500">{p.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-800 bg-gray-950/50 flex justify-end">
            <button 
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-6 rounded-xl transition-colors shadow-lg shadow-blue-900/20"
            >
                Save Changes
            </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;