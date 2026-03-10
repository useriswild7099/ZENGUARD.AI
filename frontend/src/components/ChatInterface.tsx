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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load available modes on mount
  useEffect(() => {
    const loadModes = async () => {
      setIsLoadingModes(true);
      const fetchedModes = await chatClient.getModes();
      setModes(fetchedModes);
      setIsLoadingModes(false);
    };
    loadModes();
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
        messages
      );
      
      // Add AI response to chat
      const aiMessage: ChatMessage = { role: 'assistant', content: response.response };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = { 
        role: 'assistant', 
        content: "I'm having trouble connecting right now. Please make sure Ollama is running with the gemma3:4b model." 
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
      <div className="w-full max-w-4xl mx-auto">
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
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleModeSelect(mode)}
                  className={`glass-card text-left p-5 dark:hover:bg-white/20 hover:bg-zinc-100 transition-all duration-300 group shadow-lg relative overflow-hidden flex flex-col items-center justify-center text-center dark:bg-transparent bg-white border dark:border-white/10 border-zinc-200`}
                >
                  <div className={`absolute top-0 left-0 w-full h-1 bg-${mode.color || 'purple'}-500/50`}></div>
                  <div className="flex flex-col items-center gap-3 mb-2">
                    <div className="group-hover:scale-110 transition-transform dark:bg-white/10 bg-zinc-100 p-2 rounded-full">
                      <PersonalityAvatar mode={mode} size={48} />
                    </div>
                    <h3 className="font-semibold dark:text-white text-zinc-900 text-lg">{mode.name}</h3>
                  </div>
                  <p className="text-sm dark:text-zinc-300 text-zinc-600 line-clamp-2">{mode.description}</p>
                  {mode.category && (
                    <span className="inline-block mt-3 text-[10px] uppercase tracking-wider text-zinc-500 dark:bg-white/5 bg-zinc-100 px-2 py-1 rounded">
                      {mode.category}
                    </span>
                  )}
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
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="glass-card flex flex-col h-[600px] overflow-hidden relative">
        {/* Background Accent */}
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-${selectedMode.color || 'purple'}-500 via-${selectedMode.color || 'purple'}-400 to-${selectedMode.color || 'purple'}-600`}></div>

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

          <button
            onClick={onBack}
            className="absolute right-4 dark:text-zinc-400 text-zinc-500 dark:hover:text-white hover:text-zinc-900 transition-colors text-sm"
          >
            Exit Chat
          </button>
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
                    ? `bg-${selectedMode.color || 'purple'}-600 text-white rounded-br-none`
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
                  <div className={`w-2 h-2 bg-${selectedMode.color || 'purple'}-400 rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
                  <div className={`w-2 h-2 bg-${selectedMode.color || 'purple'}-400 rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
                  <div className={`w-2 h-2 bg-${selectedMode.color || 'purple'}-400 rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
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
              className={`btn-zen bg-${selectedMode.color || 'purple'}-600 hover:bg-${selectedMode.color || 'purple'}-500 disabled:opacity-50 disabled:cursor-not-allowed h-11 w-11 flex items-center justify-center rounded-xl transition-all shadow-lg shadow-${selectedMode.color || 'purple'}-500/20`}
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
