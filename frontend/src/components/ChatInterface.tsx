'use client';

import { useState, useEffect, useRef, memo, useCallback } from 'react';
import Image from 'next/image';
import { chatClient, ChatMode, ChatMessage } from '@/lib/api';
import { prepareText } from '@/lib/privacy';
import VoiceInput from './VoiceInput';

// Memoized helper component for personality avatar
const PersonalityAvatar = memo(({ mode, size = 48, className = '' }: { mode: ChatMode; size?: number; className?: string }) => {
  const [imgError, setImgError] = useState(false);
  
  if (!mode.image || imgError) {
    return <span className={`text-white text-${size <= 32 ? '2xl' : size <= 48 ? '3xl' : '5xl'} ${className}`}>{mode.emoji}</span>;
  }
  
  return (
    <Image
      src={mode.image}
      alt={mode.name}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      onError={() => setImgError(true)}
    />
  );
});

PersonalityAvatar.displayName = 'PersonalityAvatar';

const getModeColorClasses = (colorName?: string) => {
  switch (colorName) {
    case 'blue':
      return { bg600: 'bg-blue-600', hover500: 'hover:bg-blue-500', shadow: 'shadow-blue-500/20', bg400: 'bg-blue-400', topBar: 'from-blue-500 via-blue-400 to-blue-600' };
    case 'emerald':
    case 'green':
      return { bg600: 'bg-emerald-600', hover500: 'hover:bg-emerald-500', shadow: 'shadow-emerald-500/20', bg400: 'bg-emerald-400', topBar: 'from-emerald-500 via-emerald-400 to-emerald-600' };
    case 'amber':
    case 'yellow':
      return { bg600: 'bg-amber-600', hover500: 'hover:bg-amber-500', shadow: 'shadow-amber-500/20', bg400: 'bg-amber-400', topBar: 'from-amber-500 via-amber-400 to-amber-600' };
    case 'rose':
    case 'red':
      return { bg600: 'bg-rose-600', hover500: 'hover:bg-rose-500', shadow: 'shadow-rose-500/20', bg400: 'bg-rose-400', topBar: 'from-rose-500 via-rose-400 to-rose-600' };
    case 'indigo':
      return { bg600: 'bg-indigo-600', hover500: 'hover:bg-indigo-500', shadow: 'shadow-indigo-500/20', bg400: 'bg-indigo-400', topBar: 'from-indigo-500 via-indigo-400 to-indigo-600' };
    case 'purple':
    default:
      return { bg600: 'bg-purple-600', hover500: 'hover:bg-purple-500', shadow: 'shadow-purple-500/20', bg400: 'bg-purple-400', topBar: 'from-purple-500 via-purple-400 to-purple-600' };
  }
};


interface ChatInterfaceProps {
  onBack: () => void;
}

export default function ChatInterface({ onBack }: ChatInterfaceProps) {
  // State
  const [modes, setModes] = useState<ChatMode[]>([]);
  const [selectedMode, setSelectedMode] = useState<ChatMode | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingModes, setIsLoadingModes] = useState(true);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load available modes and models on mount
  useEffect(() => {
    const loadModesAndModels = async () => {
      setIsLoadingModes(true);
      const [fetchedModes, modelRes] = await Promise.all([
        chatClient.getModes(),
        chatClient.getModels()
      ]);

      if (modelRes.models && modelRes.models.length > 0) {
        setAvailableModels(modelRes.models);
        setSelectedModel(modelRes.active || modelRes.models[0]);
      } else {
        setAvailableModels(['smollm:latest', 'therapyllama:latest', 'gemma3:latest']);
        setSelectedModel('smollm:latest');
      }
      
      const topPriorities = [
        'carl_rogers',
        'mindfulness_guide',
        'mother',
        'father',
        'logical_mentor',
        'steve_jobs',
        'compassionate_friend',
        'brother',
        'best_friend',
        'marcus_aurelius',
        'rumi'
      ];

      const sortedModes = [...fetchedModes].sort((a, b) => {
        const indexA = topPriorities.indexOf(a.id);
        const indexB = topPriorities.indexOf(b.id);
        
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return 0; 
      });

      setModes(sortedModes);
      setIsLoadingModes(false);
    };
    loadModesAndModels();
  }, []);

  // Filter modes based on active category
  const filteredModes = modes.filter(mode => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'general') return !mode.category || mode.category === 'general';
    return mode.category === activeCategory;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(modes.map(m => m.category || 'general')))];

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const container = messagesEndRef.current?.parentElement;
      if (container) {
        // Use requestAnimationFrame for smoother scrolling synced with browser paint
        requestAnimationFrame(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        });
      }
    }
  }, [messages]);


  // Focus input when mode is selected
  useEffect(() => {
    if (selectedMode) {
      // Prevent disruptive scrolling when focusing
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [selectedMode]);

  // Handle mode selection
  const handleModeSelect = useCallback((mode: ChatMode) => {
    setSelectedMode(mode);
    setMessages([]);
  }, []);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading || !selectedMode) return;

    const userMessage = inputText.trim();
    setInputText('');
    
    // Privacy: Scrub PII before sending
    const { scrubbed } = prepareText(userMessage);
    
    // Add user message to chat
    const newUserMessage: ChatMessage = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);
    
    setIsLoading(true);
    
    try {
      const response = await chatClient.sendMessage(
        scrubbed,
        selectedMode.id,
        messages,
        selectedModel || undefined
      );
      
      // Add AI response to chat
      const aiMessage: ChatMessage = { role: 'assistant', content: response.response };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      
      // Smart detection: check if running on public Vercel/Web vs Local/Electron
      const isCloudEnvironment = 
        process.env.NODE_ENV === 'production' && 
        typeof window !== 'undefined' && 
        !['localhost', '127.0.0.1', ''].includes(window.location.hostname) &&
        !window.location.hostname.startsWith('192.168.') &&
        !window.location.hostname.startsWith('10.');

      let errorText = "";
      if (isCloudEnvironment) {
        errorText = "Welcome to the ZenGuard AI Web Demonstration.\n\nBecause ZenGuard is a strict privacy-first platform that relies on local LLM processing (Ollama) and encrypted desktop vaults, the AI companions cannot be run in a cloud browser.\n\nPlease download the official Desktop Software from our repository to experience the full capabilities:\nhttps://github.com/useriswild7099/ZENGUARD.AI/releases";
      } else {
        errorText = "Connection Error: The AI backend is currently offline. Since you are running this locally, please ensure that your FastAPI server and Ollama are actively running on your machine.";
      }

      const errorMessage: ChatMessage = { 
        role: 'assistant', 
        content: errorText 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press in input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Clear chat and go back to mode selection
  const handleNewChat = useCallback(() => {
    setSelectedMode(null);
    setMessages([]);
  }, []);

  // Mode selection screen
  if (!selectedMode) {
    return (
      <div className="w-full max-w-[95vw] xl:max-w-[1600px] mx-auto">
        <div className="glass-card p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={onBack}
              className="dark:text-zinc-400 text-zinc-500 dark:hover:text-white hover:text-zinc-900 transition-colors flex items-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back
            </button>
            <h2 className="text-2xl font-semibold dark:text-white text-zinc-900 tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
              Choose a Companion
            </h2>
            <div className="w-16"></div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm capitalize transition-all border dark:border-white/10 border-zinc-200 ${
                  activeCategory === cat
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/40'
                    : 'dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/20 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
                }`}
              >
                {cat.replace('_', ' ') === 'all' ? 'All' : cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Mode Cards */}
          {isLoadingModes ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-72 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse flex flex-col justify-end p-5 border border-zinc-300 dark:border-white/5">
                  <div className="h-6 w-3/4 bg-zinc-300 dark:bg-zinc-700 rounded mb-3"></div>
                  <div className="h-4 w-full bg-zinc-300 dark:bg-zinc-700 rounded mb-2"></div>
                  <div className="h-4 w-5/6 bg-zinc-300 dark:bg-zinc-700 rounded mb-4"></div>
                  <div className="h-5 w-20 bg-zinc-300 dark:bg-zinc-700 rounded-full mt-auto"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filteredModes.map((mode, index) => (
                <button
                  key={mode.id}
                  onClick={() => handleModeSelect(mode)}
                  className={`group relative h-72 w-full rounded-2xl overflow-hidden transition-all duration-500 shadow-lg hover:shadow-2xl hover:scale-[1.03] flex flex-col justify-end text-left border border-white/10 dark:border-white/5 bg-zinc-900`}
                >
                  {/* Background Image/Emoji */}
                  {mode.image ? (
                    <Image 
                      src={mode.image} 
                      alt={mode.name}
                      fill
                      priority={index < 6}
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-zinc-800 transition-transform duration-700 group-hover:scale-110">
                      <span className="text-7xl">{mode.emoji}</span>
                    </div>
                  )}

                  {/* Blackout Gradient for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent"></div>

                  {/* Content (Text & Tags) positioned at bottom */}
                  <div className="relative z-10 p-5 w-full">
                    <h3 className="font-bold text-white text-xl md:text-2xl tracking-tight leading-tight mb-1 drop-shadow-lg">
                      {mode.name}
                    </h3>
                    <p className="text-sm text-zinc-300 line-clamp-2 mb-3 drop-shadow-md">
                      {mode.description}
                    </p>
                    {mode.category && (
                      <span className="inline-block text-[10px] uppercase font-bold tracking-wider text-white bg-white/20 backdrop-blur-md border border-white/30 px-2.5 py-1 rounded-full shadow-sm">
                        {mode.category}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Privacy notice */}
          <p className="text-xs text-gray-400 text-center mt-8">
            🔒 Your conversations are never stored. Privacy first, always.
          </p>
        </div>
      </div>
    );
  }

  // Chat screen
  const colorClasses = getModeColorClasses(selectedMode.color);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="glass-card flex flex-col h-[600px] overflow-hidden relative">
        {/* Background Accent */}
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${colorClasses.topBar}`}></div>

        {/* Chat Header */}
        <div className="relative flex items-center justify-center p-4 border-b border-white/10 bg-black/20">
          <button
            onClick={handleNewChat}
            className="absolute left-4 dark:text-zinc-400 text-zinc-500 dark:hover:text-white hover:text-zinc-900 transition-colors flex items-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Change Mode
          </button>
          
          <div className="flex flex-col items-center">
            <div className="mb-1">
              <PersonalityAvatar mode={selectedMode} size={32} />
            </div>
            <span className="font-medium dark:text-white text-zinc-900 text-sm">{selectedMode.name}</span>
          </div>

          <div className="absolute right-4 flex items-center gap-3">
            {/* Model Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-zinc-800/90 dark:bg-zinc-800/90 px-3 py-1 rounded-full border border-purple-500/30 text-xs shadow-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
                <rect x="9" y="9" width="6" height="6"/>
                <line x1="9" y1="1" x2="9" y2="4"/>
                <line x1="15" y1="1" x2="15" y2="4"/>
                <line x1="9" y1="20" x2="9" y2="23"/>
                <line x1="15" y1="20" x2="15" y2="23"/>
                <line x1="20" y1="9" x2="23" y2="9"/>
                <line x1="20" y1="15" x2="23" y2="15"/>
                <line x1="1" y1="9" x2="4" y2="9"/>
                <line x1="1" y1="15" x2="4" y2="15"/>
              </svg>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-xs font-semibold text-purple-200 focus:outline-none cursor-pointer pr-1"
                title="Select Local AI Model"
              >
                {availableModels.map(m => (
                  <option key={m} value={m} className="bg-zinc-900 text-white font-sans p-2">
                    {m.includes('smollm') ? `⚡ ${m} (Fast)` : m.includes('therapy') ? `🧠 ${m} (Therapy)` : `🤖 ${m}`}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onBack}
              className="dark:text-zinc-400 text-zinc-500 dark:hover:text-white hover:text-zinc-900 transition-colors text-sm"
            >
              Exit Chat
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center dark:text-zinc-400 text-zinc-500 py-12">
              <div className="flex justify-center mb-4 opacity-80">
                <PersonalityAvatar mode={selectedMode} size={64} />
              </div>
              <p className="text-lg dark:text-white text-zinc-900 mb-2">Speak with {selectedMode.name}</p>
              <p className="text-sm max-w-xs mx-auto opacity-70">{selectedMode.description}</p>
            </div>
          )}
          
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${
                  msg.role === 'user'
                    ? `${colorClasses.bg600} text-white rounded-br-none`
                    : 'dark:bg-white/10 bg-zinc-100 backdrop-blur-md dark:text-zinc-100 text-zinc-800 rounded-bl-none border dark:border-white/5 border-zinc-200'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="dark:bg-white/10 bg-zinc-100 backdrop-blur-sm rounded-2xl rounded-bl-none px-4 py-3 border dark:border-white/5 border-zinc-200">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 ${colorClasses.bg400} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
                  <div className={`w-2 h-2 ${colorClasses.bg400} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
                  <div className={`w-2 h-2 ${colorClasses.bg400} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${selectedMode.name}...`}
              className="flex-1 resize-none rounded-xl border dark:border-white/10 border-zinc-200 dark:bg-white/5 bg-zinc-50 backdrop-blur-sm px-4 py-3 text-sm dark:text-white text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 dark:focus:ring-white/20 focus:ring-purple-500/20 focus:border-transparent transition-all"
              rows={1}
              disabled={isLoading}
            />
            <VoiceInput 
              onTranscript={(text) => setInputText(prev => prev + (prev ? ' ' : '') + text)}
              onInterimTranscript={(liveText) => setInputText(liveText)}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              className={`btn-zen ${colorClasses.bg600} ${colorClasses.hover500} disabled:opacity-50 disabled:cursor-not-allowed h-11 w-11 flex items-center justify-center rounded-xl transition-all shadow-lg ${colorClasses.shadow}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-zinc-500 text-center mt-3 font-medium tracking-wide uppercase">
            Start a new conversation to switch context
          </p>
        </div>
      </div>
    </div>
  );
}
