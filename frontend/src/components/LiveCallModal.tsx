'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ChatMode, chatClient, ChatMessage } from '@/lib/api';
import { prepareText } from '@/lib/privacy';
import { 
  PhoneOff, Mic, MicOff, Volume2, VolumeX, Lock, UserPlus, 
  VideoOff, MoreHorizontal, Share2, Minimize2, Send, MessageSquare 
} from 'lucide-react';

interface LiveCallModalProps {
  mode: ChatMode;
  onClose: () => void;
}

export default function LiveCallModal({ mode, onClose }: LiveCallModalProps) {
  // Call States: 'contacting' -> 'connected' -> 'ended'
  const [callStatus, setCallStatus] = useState<'contacting' | 'connected' | 'ended'>('contacting');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [statusText, setStatusText] = useState('Contacting...');
  
  // Real-time transcript states
  const [userTranscript, setUserTranscript] = useState('');
  const [aiTranscript, setAiTranscript] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [typedInput, setTypedInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  
  // Refs
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMutedRef = useRef(isMuted);
  const isSpeakerOnRef = useRef(isSpeakerOn);
  const isProcessingRef = useRef(false);
  const historyRef = useRef<ChatMessage[]>([]);
  
  isMutedRef.current = isMuted;
  isSpeakerOnRef.current = isSpeakerOn;
  historyRef.current = history;

  const isMountedRef = useRef(true);

  // Preload voices & handle Chrome audio resume
  useEffect(() => {
    isMountedRef.current = true;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      window.speechSynthesis.getVoices();
      const onVoices = () => { window.speechSynthesis.getVoices(); };
      window.speechSynthesis.onvoiceschanged = onVoices;
    }
    return () => {
      isMountedRef.current = false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Speak AI text with natural human pauses
  const speakAiResponse = useCallback((text: string, onComplete?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !isSpeakerOnRef.current) {
      if (onComplete) onComplete();
      return;
    }

    // Cancel previous speech & resume synth state
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    setIsAiSpeaking(true);

    // Clean text of markdown, bracketed tags, emojis
    const cleanText = text
      .replace(/\[.*?\]/g, '')
      .replace(/\*\*.*?\*\*/g, '')
      .replace(/[\*\_\`]/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}]/gu, '')
      .trim();

    if (!cleanText) {
      setIsAiSpeaking(false);
      if (onComplete) onComplete();
      return;
    }

    // Split into sentences cleanly using split to ensure NO trailing sentences are dropped
    const rawParts = cleanText.split(/([.!?;,]+)/);
    const chunks: string[] = [];
    for (let i = 0; i < rawParts.length; i += 2) {
      const sentence = (rawParts[i] || '') + (rawParts[i + 1] || '');
      if (sentence.trim()) {
        chunks.push(sentence.trim());
      }
    }
    if (chunks.length === 0 && cleanText) {
      chunks.push(cleanText);
    }

    let currentChunkIndex = 0;

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Enhanced'))
    ) || voices.find(v => v.lang.startsWith('en')) || null;

    const speakNextChunk = () => {
      if (!isMountedRef.current || currentChunkIndex >= chunks.length || !isSpeakerOnRef.current) {
        setIsAiSpeaking(false);
        setStatusText(formatTime(callDuration));
        if (onComplete) onComplete();
        return;
      }

      const chunk = chunks[currentChunkIndex].trim();
      currentChunkIndex++;

      if (!chunk) {
        speakNextChunk();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunk);
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.rate = 0.95; // Calmer human pacing
      utterance.pitch = 1.0;

      utterance.onend = () => {
        // Human breath pause between clauses (250ms)
        setTimeout(() => {
          if (isMountedRef.current && isSpeakerOnRef.current) {
            speakNextChunk();
          }
        }, 250);
      };

      utterance.onerror = (err) => {
        console.warn('SpeechSynthesis error:', err);
        setIsAiSpeaking(false);
        if (onComplete) onComplete();
      };

      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    };

    speakNextChunk();
  }, [callDuration]);

  // Handle user speech / message sent to AI model
  const handleUserSentence = useCallback(async (spokenText: string) => {
    if (!spokenText.trim() || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setIsUserSpeaking(false);

    // Stop speech synthesis if AI was talking (barge-in)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const { scrubbed } = prepareText(spokenText);
    const newMsg: ChatMessage = { role: 'user', content: spokenText };
    const updatedHistory = [...historyRef.current, newMsg];
    setHistory(updatedHistory);
    setUserTranscript(spokenText);

    try {
      const response = await chatClient.sendMessage(scrubbed, mode.id, updatedHistory);
      const aiReply = response.response;
      
      const aiMsg: ChatMessage = { role: 'assistant', content: aiReply };
      setHistory(prev => [...prev, aiMsg]);
      setAiTranscript(aiReply);

      // Speak back with human pauses
      speakAiResponse(aiReply, () => {
        isProcessingRef.current = false;
      });
    } catch (err) {
      console.error('Call AI Error:', err);
      const fallbackMsg = `I'm listening, tell me more.`;
      setAiTranscript(fallbackMsg);
      speakAiResponse(fallbackMsg, () => {
        isProcessingRef.current = false;
      });
    }
  }, [mode.id, speakAiResponse]);

  // Initialize Speech Recognition
  const startSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let speechTimeout: NodeJS.Timeout | null = null;
    let currentInterim = '';

    recognition.onresult = (event: any) => {
      if (isMutedRef.current || isAiSpeaking) return;

      setIsUserSpeaking(true);

      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      currentInterim = final || interim;
      setUserTranscript(currentInterim);

      if (speechTimeout) clearTimeout(speechTimeout);
      speechTimeout = setTimeout(() => {
        if (currentInterim.trim() && !isProcessingRef.current) {
          handleUserSentence(currentInterim.trim());
          currentInterim = '';
        }
      }, 1800);
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn('Live Call Speech recognition:', e.error);
      }
    };

    recognition.onend = () => {
      if (callStatus === 'connected') {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch {}
  }, [callStatus, isAiSpeaking, handleUserSentence]);

  // Handle Call Lifecycle
  useEffect(() => {
    // 1. WhatsApp-style Ringing Phase (2.5 seconds "Contacting...")
    const contactingTimer = setTimeout(() => {
      setCallStatus('connected');

      // Start Call Duration Timer
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      // Initial Warm Greeting from AI Companion
      const initialGreeting = getInitialGreeting(mode);
      setAiTranscript(initialGreeting);
      speakAiResponse(initialGreeting, () => {
        startSpeechRecognition();
      });

    }, 2500);

    return () => {
      clearTimeout(contactingTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, [mode, speakAiResponse, startSpeechRecognition]);

  // Initial personalized greeting generator
  const getInitialGreeting = (mode: ChatMode) => {
    switch (mode.id) {
      case 'compassionate_friend':
        return `Hey! It's ${mode.name}. I'm right here with you. How are you holding up today?`;
      case 'academic_coach':
        return `Hey there! Arjun here. Let's take a deep breath together. What's on your mind?`;
      case 'mindful_guide':
        return `Welcome. Take a moment to settle in. I am listening whenever you are ready to share.`;
      case 'bob_ross':
        return `Hello my friend! It is so good to hear your voice today. Take all the time you need.`;
      default:
        return `Hi there! I am ${mode.name}. I'm right here with you. What would you like to talk about?`;
    }
  };

  // End Call Action
  const handleEndCall = () => {
    setCallStatus('ended');
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleSendTypedMessage = () => {
    if (!typedInput.trim()) return;
    const text = typedInput.trim();
    setTypedInput('');
    handleUserSentence(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#0b141a] text-white overflow-hidden font-sans animate-in fade-in duration-300">
      
      {/* Dark Doodle Background Overlay */}
      <div 
        className="absolute inset-0 opacity-10 bg-repeat pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.2) 2px, transparent 0)`,
          backgroundSize: '50px 50px'
        }} 
      />

      {/* ── TOP HEADER (WhatsApp Style) ── */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6 pb-4">
        {/* Minimize Button Top-Left */}
        <button 
          onClick={onClose}
          className="p-2.5 text-zinc-300 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          title="Minimize call"
        >
          <Minimize2 className="w-5 h-5" />
        </button>

        {/* Contact Name & Subtitle Top-Center */}
        <div className="flex flex-col items-center text-center">
          <h1 className="text-xl font-bold tracking-tight text-white">
            {mode.name}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
            {callStatus === 'contacting' ? (
              <span className="text-amber-400 font-medium animate-pulse">Contacting...</span>
            ) : (
              <>
                <Lock className="w-3 h-3 text-zinc-400" />
                <span>{callStatus === 'connected' ? (formatTime(callDuration) || 'Connected') : 'Ending call...'}</span>
              </>
            )}
          </div>
        </div>

        {/* Add Person Icon Top-Right */}
        <button 
          className="p-2.5 text-zinc-300 hover:text-white rounded-full hover:bg-white/10 transition-colors opacity-75 cursor-not-allowed"
          title="Add person (1-on-1 call)"
        >
          <UserPlus className="w-5 h-5" />
        </button>
      </div>

      {/* ── CENTER AREA: Large Circular Profile Picture ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 my-auto">
        <div className="relative">
          {/* Outer Pulsing Aura when Contacting or Speaking */}
          {callStatus === 'contacting' ? (
            <>
              <span className="absolute inset-0 rounded-full border-2 border-emerald-500/50 animate-ping opacity-60" style={{ animationDuration: '1.5s' }} />
              <span className="absolute -inset-4 rounded-full border border-emerald-400/30 animate-pulse" />
            </>
          ) : isAiSpeaking ? (
            <>
              <span className="absolute -inset-4 rounded-full border-2 border-emerald-500/80 animate-ping opacity-75" style={{ animationDuration: '2s' }} />
              <span className="absolute -inset-8 rounded-full border border-emerald-400/30 animate-pulse" />
            </>
          ) : isUserSpeaking ? (
            <span className="absolute -inset-4 rounded-full border-2 border-teal-500/80 animate-ping opacity-75" style={{ animationDuration: '1.2s' }} />
          ) : null}

          {/* Profile Photo */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl bg-zinc-800 flex items-center justify-center">
            {mode.image ? (
              <Image
                src={mode.image}
                alt={mode.name}
                width={208}
                height={208}
                className="w-full h-full object-cover"
                priority
              />
            ) : (
              <span className="text-6xl sm:text-7xl">{mode.emoji || '💬'}</span>
            )}
          </div>
        </div>

        {/* Live Subtitle Transcript Pill */}
        <div className="w-full max-w-sm mt-8 px-5 py-3 rounded-2xl bg-zinc-900/80 border border-white/10 backdrop-blur-md min-h-[56px] flex items-center justify-center text-center shadow-lg">
          {aiTranscript && isAiSpeaking ? (
            <p className="text-xs sm:text-sm text-emerald-300 font-medium line-clamp-2 italic leading-relaxed">
              "{aiTranscript}"
            </p>
          ) : userTranscript ? (
            <p className="text-xs sm:text-sm text-zinc-200 font-medium line-clamp-2 leading-relaxed">
              "{userTranscript}"
            </p>
          ) : (
            <p className="text-xs text-zinc-400 font-medium">
              {callStatus === 'contacting' ? 'Ringing companion...' : 'End-to-end encrypted voice call'}
            </p>
          )}
        </div>

        {/* Optional Type to Talk bar when toggled */}
        {showTextInput && (
          <div className="w-full max-w-sm mt-4 flex items-center gap-2">
            <input
              type="text"
              value={typedInput}
              onChange={e => setTypedInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendTypedMessage()}
              placeholder="Type message to speak during call..."
              className="flex-1 px-4 py-2 text-xs bg-zinc-800/90 text-white rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleSendTypedMessage}
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── BOTTOM CONTROL CARD (Exact 1:1 WhatsApp Layout) ── */}
      <div className="relative z-20 w-full max-w-lg mx-auto p-4 pb-8 sm:pb-6">
        <div className="bg-[#1c2a33]/95 border border-white/10 rounded-[36px] p-6 shadow-2xl backdrop-blur-xl">
          
          {/* 3x2 Grid of Circular Action Buttons with Labels */}
          <div className="grid grid-cols-3 gap-y-6 text-center">
            
            {/* ROW 1, COL 1: SPEAKER */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => {
                  setIsSpeakerOn(prev => !prev);
                  if (isSpeakerOn && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                  }
                }}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  !isSpeakerOn 
                    ? 'bg-amber-500/30 text-amber-400 border border-amber-500/40' 
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                }`}
                title={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
              >
                {!isSpeakerOn ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              <span className="text-xs text-zinc-300 font-medium mt-2">Speaker</span>
            </div>

            {/* ROW 1, COL 2: VIDEO (Disabled / Placeholder) */}
            <div className="flex flex-col items-center opacity-60">
              <button
                type="button"
                disabled
                className="w-14 h-14 rounded-full bg-zinc-800/60 text-zinc-400 flex items-center justify-center cursor-not-allowed"
                title="Video disabled"
              >
                <VideoOff className="w-6 h-6" />
              </button>
              <span className="text-xs text-zinc-400 font-medium mt-2">Video</span>
            </div>

            {/* ROW 1, COL 3: MUTE */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => setIsMuted(prev => !prev)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  isMuted 
                    ? 'bg-red-500/30 text-red-400 border border-red-500/40' 
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <span className="text-xs text-zinc-300 font-medium mt-2">Mute</span>
            </div>

            {/* ROW 2, COL 1: MORE (Toggles Text Bar) */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => setShowTextInput(prev => !prev)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  showTextInput ? 'bg-emerald-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                }`}
                title="Type message during call"
              >
                <MessageSquare className="w-6 h-6" />
              </button>
              <span className="text-xs text-zinc-300 font-medium mt-2">Type</span>
            </div>

            {/* ROW 2, COL 2: SHARE */}
            <div className="flex flex-col items-center opacity-60">
              <button
                type="button"
                disabled
                className="w-14 h-14 rounded-full bg-zinc-800/60 text-zinc-400 flex items-center justify-center cursor-not-allowed"
                title="Share screen"
              >
                <Share2 className="w-6 h-6" />
              </button>
              <span className="text-xs text-zinc-400 font-medium mt-2">Share</span>
            </div>

            {/* ROW 2, COL 3: END CALL (BRIGHT RED) */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={handleEndCall}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transform active:scale-95 transition-all cursor-pointer"
                title="End call"
              >
                <PhoneOff className="w-6 h-6 fill-current rotate-[135deg]" />
              </button>
              <span className="text-xs text-zinc-200 font-semibold mt-2">End</span>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
