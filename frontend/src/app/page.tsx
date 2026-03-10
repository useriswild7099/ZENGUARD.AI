'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import Image from 'next/image';
import { sentimentClient } from '@/lib/api';
import dynamic from 'next/dynamic';

// Dynamic imports for secondary views to reduce initial bundle size
const ChatInterface = dynamic(() => import('@/components/ChatInterface'), { 
  loading: () => <div className="animate-pulse glass w-full h-96 rounded-3xl" /> 
});
const KnowledgeHub = dynamic(() => import('@/components/KnowledgeHub'), { 
  loading: () => <div className="animate-pulse glass w-full h-96 rounded-3xl" /> 
});
const HelpHub = dynamic(() => import('@/components/HelpHub'), { 
  loading: () => <div className="animate-pulse glass w-full h-96 rounded-3xl" /> 
});
const CopingNavigator = dynamic(() => import('@/components/CopingNavigator'));
const FeatureShowcase = dynamic(() => import('@/components/FeatureShowcase'));
const MoodDoodle = dynamic(() => import('@/components/MoodDoodle'));
const BreathingExercise = dynamic(() => import('@/components/BreathingExercise'));
const GroundingExercise = dynamic(() => import('@/components/GroundingExercise'));
const WellnessPillars = dynamic(() => import('@/components/WellnessPillars'));
const MethodologySection = dynamic(() => import('@/components/MethodologySection'));
const TechnicalPrivacySection = dynamic(() => import('@/components/TechnicalPrivacySection'));
const SafetySection = dynamic(() => import('@/components/SafetySection'));
const SiaAssistant = dynamic(() => import('@/components/SiaAssistant'), { ssr: false });
const BackgroundMusic = dynamic(() => import('@/components/BackgroundMusic'), { ssr: false });

import { 
  PenLine, MessageCircle, 
  WifiOff, Cpu, UserX, Code, 
  Plus, BookOpen, Lightbulb, Flame, Calendar, Shield,
  GraduationCap, Sparkles, LifeBuoy, Zap, Languages,
  Palette, Wind, MapPin, Volume2, VolumeX
} from 'lucide-react';

// ZenGuard Journal imports
import { JournalEntry } from '@/types/journal';
import { KnowledgeArticle } from '@/lib/knowledge';
import { journalStorage, generateInsights } from '@/lib/storage';
import { NewEntryFlow } from '@/components/journal/NewEntryFlow';
import { TimelineView } from '@/components/journal/TimelineView';
import { InsightsDashboard } from '@/components/journal/InsightsDashboard';
import { StreakTracker } from '@/components/journal/StreakTracker';
import { JournalCalendar } from '@/components/journal/JournalCalendar';
import { YearInPixels } from '@/components/journal/YearInPixels';
import { MoodChart } from '@/components/journal/MoodChart';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import React, { memo } from 'react';

// Memoized background component to prevent re-renders when parent state changes
const VideoBackground = memo(({ activeView, isLight }: { activeView: string; isLight: boolean }) => {
  const isLandingOrJournal = activeView === 'landing' || activeView === 'journal';
  
  return (
    <div className={`fixed inset-0 overflow-hidden -z-10 transition-opacity duration-1000 ${isLight ? 'opacity-0' : 'opacity-100'}`} style={{ transform: 'translateZ(0)' }}>
      {isLandingOrJournal ? (
        <video
          autoPlay loop muted playsInline preload="auto"
          className="absolute w-full h-full object-cover will-change-transform"
          style={{ 
            filter: activeView === 'landing' ? 'brightness(0.7)' : 'brightness(0.5)',
            transform: 'translate3d(0, 0, 0)'
          }}
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
      ) : (
        <video
          autoPlay loop muted playsInline preload="none"
          className="absolute w-full h-full object-cover will-change-transform"
          style={{ 
            filter: activeView === 'help' ? 'brightness(0.2)' : activeView === 'knowledge' ? 'brightness(0.4)' : 'brightness(0.6)',
            transform: 'translate3d(0, 0, 0)'
          }}
        >
          <source src="/chat-bg.mp4" type="video/mp4" />
        </video>
      )}
      <div className={`absolute inset-0 transition-all duration-700 ${
        activeView === 'help' ? 'bg-black/80 backdrop-blur-[4px]' :
        activeView === 'knowledge' ? 'bg-black/60 backdrop-blur-[3px]' :
        activeView === 'chat' ? 'bg-black/40 backdrop-blur-[2px]' :
        activeView === 'landing' ? 'bg-gradient-to-b from-black/30 via-black/20 to-black/40' :
        'bg-black/50 backdrop-blur-[1px]'
      }`} style={{ transform: 'translateZ(0)' }}></div>
    </div>
  );
});

VideoBackground.displayName = 'VideoBackground';


export default function Home() {
  const [apiConnected, setApiConnected] = useState(false);
  const [activeView, setActiveView] = useState<'landing' | 'journal' | 'chat' | 'knowledge' | 'help' | 'doodle' | 'breathing' | 'grounding'>('landing');
  const [showCopingNavigator, setShowCopingNavigator] = useState(false);
  const [routedArticle, setRoutedArticle] = useState<KnowledgeArticle | null>(null);

  // ZenGuard Journal state
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isCreatingEntry, setIsCreatingEntry] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'insights' | 'stats' | 'calendar'>('timeline');
  const [globalLanguage, setGlobalLanguage] = useState('English');
  const [isMuted, setIsMuted] = useState(true);
  const [theme, setTheme] = useState<'nature' | 'light' | 'dark'>('nature');

  useEffect(() => {
    sentimentClient.healthCheck().then(setApiConnected);
  }, []);

  // Load journal entries from localStorage
  useEffect(() => {
    if (activeView === 'journal') {
      const loadedEntries = journalStorage.getEntries();
      setEntries(loadedEntries);
    }
  }, [activeView]);

  const handleSaveEntry = (entryData: Omit<JournalEntry, 'id' | 'date'>) => {
    const newEntry: JournalEntry = {
      ...entryData,
      id: crypto.randomUUID(),
      date: new Date(),
    };
    journalStorage.saveEntry(newEntry);
    setEntries(journalStorage.getEntries());
    setIsCreatingEntry(false);
  };

  const insights = generateInsights(entries);
  const streak = journalStorage.getStreak();

  // Scroll to top when view changes synchronously before DOM paint
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
    // Fallback for some browsers that might need a tick
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
    }, 10);
    return () => clearTimeout(timer);
  }, [activeView]);


  const isLight = theme === 'light';
  const textPrimary = isLight ? 'text-zinc-900' : 'text-white';
  const textSecondary = isLight ? 'text-zinc-500' : 'text-zinc-100';
  const textMuted = isLight ? 'text-zinc-400' : 'text-white/60';

  return (
    <div className={`min-h-screen relative transition-colors duration-500 ${
      theme === 'dark' ? 'dark bg-zinc-950 text-white' : 
      theme === 'nature' ? 'dark text-white' : 
      'bg-white text-zinc-900'
    }`}>
      <BackgroundMusic isMuted={isMuted} />

      <VideoBackground activeView={activeView} isLight={isLight} />

      {/* View Content Hub */}
      {activeView === 'landing' && (
        <div className="min-h-screen relative flex flex-col">
          <nav className="relative z-10 flex justify-between items-center px-6 md:px-12 py-6">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-[0.5em] uppercase transition-colors duration-500 dark:text-white text-zinc-900" style={{ fontFamily: 'var(--font-heading)' }}>
                ZenGuard
              </span>
            </div>
            <div className="flex items-center gap-4">
              {/* Sound Toggle */}
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className={`flex items-center justify-center w-10 h-10 border rounded-xl transition-all ${
                  isLight ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-600' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/60 hover:text-white'
                }`}
                title={isMuted ? "Unmute" : "Mute"}
                aria-label={isMuted ? "Unmute background music" : "Mute background music"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
              </button>

              {/* Language Switcher */}
              <div className="relative group/lang z-50">
                <button className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition-all h-10 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 bg-zinc-100 hover:bg-zinc-200 border-zinc-200`}>
                  <Languages className="w-4 h-4 text-purple-400" />
                  <span className={`text-xs font-bold uppercase tracking-wider dark:text-white text-zinc-700`}>{globalLanguage}</span>
                </button>
                <div className="absolute right-0 top-full mt-2 w-40 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover/lang:opacity-100 group-hover/lang:visible transition-all overflow-hidden flex flex-col py-1">
                  {['English', 'Hindi', 'Assamese', 'Bengali', 'Spanish', 'French', 'German'].map(lang => (
                    <button 
                      key={lang}
                      onClick={() => setGlobalLanguage(lang)}
                      className={`px-4 py-2 text-left text-xs hover:bg-white/10 transition-colors ${globalLanguage === lang ? 'text-purple-400 font-bold' : 'text-zinc-400'}`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Status Indicator */}
              <div 
                className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-black border backdrop-blur-md px-3 py-2 rounded-xl h-10 dark:bg-white/5 dark:border-white/10 bg-zinc-100 border-zinc-200`}
                role="status"
                aria-live="polite"
              >
                <div className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-rose-400'}`}></div>
                <span className={`font-black dark:text-white/60 text-zinc-600`}>{apiConnected ? 'AI READY' : 'OFFLINE'}</span>
              </div>
            </div>
          </nav>

          <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-12 pb-20 md:pt-20 flex-1">
            <div className="text-center max-w-6xl mx-auto">
              <div className="mb-8 flex justify-center animate-fade-scale">
                <Image src="/logo.png" alt="ZenGuard Logo" width={256} height={256} className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-2xl animate-gentle-float" priority />
              </div>
              <div className="max-w-3xl mx-auto">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1] drop-shadow-xl tracking-tight animate-fade-up stagger-2 dark:text-white text-zinc-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  A quiet space for <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 animate-gradient-x">your thoughts</span>
                </h1>
                <p className="text-lg md:text-xl mb-12 max-w-xl mx-auto leading-relaxed drop-shadow-md font-light animate-fade-up stagger-3 dark:text-zinc-100 text-zinc-500">
                  Express how you&apos;re feeling. Get gentle insights. 
                  <span className={`block mt-2 font-medium dark:text-zinc-300 text-zinc-600`}>Everything stays with you — nothing is stored.</span>
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mt-16 animate-fade-up stagger-4 max-w-5xl mx-auto">
                {[
                  { label: "Start\nJournaling", view: 'journal', icon: PenLine, color: 'white' },
                  { label: "Talk to\nAI Friend", view: 'chat', icon: MessageCircle, color: 'purple' },
                  { label: "MindSpace\nLibrary", view: 'knowledge', icon: GraduationCap, color: 'blue' },
                  { label: "Professional\nHelp Hub", view: 'help', icon: LifeBuoy, color: 'red' }
                ].map((btn, i) => (
                  <button key={i} onClick={() => setActiveView(btn.view as any)} className={`glass-pill-button group p-6 flex flex-col items-center justify-center gap-3 min-h-[140px] text-center dark:bg-transparent dark:border-white/10 bg-zinc-50 hover:bg-zinc-100 border-zinc-200 shadow-sm`}>
                    <div className={`p-3 rounded-full border transition-all duration-500 dark:bg-white/5 dark:border-white/10 bg-zinc-200/50 border-zinc-300 group-hover:scale-110 group-hover:rotate-6`}>
                      <btn.icon className={`w-6 h-6 ${btn.color === 'purple' ? 'text-purple-500' : btn.color === 'blue' ? 'text-blue-500' : btn.color === 'red' ? 'text-red-500' : 'dark:text-white text-zinc-700'}`} />
                    </div>
                    <span className={`font-bold leading-tight whitespace-pre-line text-base drop-shadow-sm dark:text-white text-zinc-800`}>{btn.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <FeatureShowcase />
            <WellnessPillars onNavigate={(view) => setActiveView(view)} />
            <MethodologySection onNavigate={(view) => setActiveView(view)} />
            <TechnicalPrivacySection />
            <SafetySection onNavigate={(view) => setActiveView(view)} />
            <div className="mt-20 flex flex-wrap justify-center gap-8 md:gap-12 animate-fade-up stagger-8 pb-20">
              {[
                { icon: WifiOff, label: "Fully Offline", color: "text-green-400" },
                { icon: Cpu, label: "Local Processing", color: "text-blue-400" },
                { icon: UserX, label: "No Account Needed", color: "text-purple-400" },
                { icon: Code, label: "Open Source", color: "text-yellow-400", action: () => window.open('https://github.com/useriswild7099/zenguard-mental-health', '_blank') }
              ].map((item, i) => (
                <div 
                  key={i} 
                  className={`flex flex-col items-center gap-3 group ${item.action ? 'cursor-pointer' : ''}`}
                  onClick={item.action}
                >
                  <div className={`w-12 h-12 glass-card flex items-center justify-center transition-colors dark:border-white/10 dark:hover:bg-white/10 bg-zinc-100 border-zinc-200 hover:bg-zinc-200`}>
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <span className={`font-mono text-xs tracking-wide transition-colors dark:text-zinc-300 text-zinc-500`}>{item.label}</span>
                </div>
              ))}
            </div>
          </main>
          <footer className="relative z-10 text-center py-8 text-sm text-gray-400">
            <p>Built for mental wellness. Your peace of mind matters.</p>
          </footer>
        </div>
      )}

      {activeView === 'chat' && (
        <div className="min-h-screen relative flex flex-col items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-2xl z-10">
            <ChatInterface onBack={() => setActiveView('landing')} />
          </div>
        </div>
      )}

      {activeView === 'knowledge' && (
        <div className="min-h-screen relative flex flex-col items-center p-4 md:p-12 overflow-x-hidden">
          <KnowledgeHub 
            onBack={() => { setActiveView('landing'); setRoutedArticle(null); }} 
            onNavigateToHelp={() => { setActiveView('help'); setRoutedArticle(null); }}
            initialArticle={routedArticle}
            sessionLanguage={globalLanguage}
            theme={theme}
          />
        </div>
      )}

      {activeView === 'help' && (
        <div className="min-h-screen relative flex flex-col items-center p-4 md:p-12 overflow-x-hidden">
          <HelpHub onBack={() => setActiveView('landing')} />
        </div>
      )}

      {isCreatingEntry && (
        <div className="min-h-screen relative flex items-start justify-center p-4 py-8">
          <div className="relative z-10 w-full max-w-4xl">
            <button
              onClick={() => { setIsCreatingEntry(false); setActiveView('landing'); }}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-8"
            >
              <span>←</span><span>Home</span>
            </button>
            <NewEntryFlow onSave={handleSaveEntry} onCancel={() => setIsCreatingEntry(false)} />
          </div>
        </div>
      )}

      {activeView === 'doodle' && !isCreatingEntry && (
        <div className="min-h-screen relative flex flex-col items-center justify-center p-4 md:p-12 overflow-x-hidden">
          <MoodDoodle sessionId="session_123" onBack={() => setActiveView('landing')} />
        </div>
      )}

      {activeView === 'breathing' && !isCreatingEntry && (
        <div className="min-h-screen relative flex flex-col items-center justify-center p-4 md:p-12 overflow-x-hidden">
          <BreathingExercise onBack={() => setActiveView('landing')} />
        </div>
      )}

      {activeView === 'grounding' && !isCreatingEntry && (
        <div className="min-h-screen relative flex flex-col items-center justify-center p-4 md:p-12 overflow-x-hidden">
          <GroundingExercise onBack={() => setActiveView('landing')} />
        </div>
      )}

      {activeView === 'journal' && !isCreatingEntry && (
        <div className="min-h-screen flex flex-col">
          <header className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-colors duration-500 shadow-2xl ${
            theme === 'dark' ? 'bg-zinc-950/80 border-white/10' : 
            theme === 'nature' ? 'bg-black/20 border-white/10' : 
            'bg-white/80 border-zinc-200'
          }`}>
            <div className="container max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveView('landing')} className={`flex items-center gap-2 transition-colors ${isLight ? 'text-zinc-500 hover:text-zinc-900' : 'text-white/50 hover:text-white'}`}><span>←</span></button>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xl ${isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-white/10 border-white/20'}`}><Shield className={`h-6 w-6 ${isLight ? 'text-zinc-900' : 'text-white'}`} /></div>
                  <div><h1 className={`text-2xl font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>ZenGuard</h1><p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-white/40'}`}>Your Reflective Space</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <Button variant="ghost" onClick={() => setActiveView('knowledge')} className={`gap-2 hidden md:flex ${isLight ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100' : 'text-white/60 hover:text-white hover:bg-white/5'}`}><GraduationCap className="h-5 w-5" />Library</Button>
                  <Button variant="ghost" onClick={() => setActiveView('help')} className={`gap-2 hidden md:flex ${isLight ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-red-400/60 hover:text-red-400 hover:bg-red-400/5'}`}><LifeBuoy className="h-5 w-5" />Help</Button>
                  <Button onClick={() => setIsCreatingEntry(true)} size="lg" className={`gap-2 border-0 shadow-xl ${isLight ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-white/90'}`}><Plus className="h-5 w-5" />New Entry</Button>
                </div>
              </div>
            </div>
          </header>
          <main className={`relative z-10 container max-w-7xl mx-auto px-4 py-8 flex-1 ${isLight ? 'text-zinc-900' : 'text-white'}`}>
            {entries.length === 0 ? (
              <div className="max-w-3xl mx-auto text-center space-y-8 py-20">
                <div className={`w-24 h-24 border rounded-full mx-auto flex items-center justify-center backdrop-blur-md shadow-2xl ${isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-white/5 border-white/10'}`}><BookOpen className={`h-12 w-12 ${isLight ? 'text-zinc-400' : 'text-white/60'}`} /></div>
                <h2 className="text-4xl font-bold">Welcome to ZenGuard</h2>
                <p className={`text-xl ${isLight ? 'text-zinc-500' : 'text-white/50'}`}>A mental wellness app with 10 scientifically-proven features for better emotional health.</p>
                <Button onClick={() => setIsCreatingEntry(true)} size="lg" className={`gap-2 px-8 border-0 shadow-2xl ${isLight ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-white/90'}`}><Plus className="h-5 w-5" />Start Your First Entry</Button>
              </div>
            ) : (
              <div className="space-y-12">
                <StreakTracker streak={streak} />
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                  <TabsList className={`p-1 mb-8 border ${isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-white/5 border-white/10'}`}>
                    <TabsTrigger value="timeline" className={`data-[state=active]:shadow-sm ${isLight ? 'data-[state=active]:bg-white text-zinc-500 data-[state=active]:text-zinc-900' : 'data-[state=active]:bg-white/10 text-white/60 data-[state=active]:text-white'}`}><BookOpen className="h-4 w-4 mr-2" />Timeline</TabsTrigger>
                    <TabsTrigger value="calendar" className={`data-[state=active]:shadow-sm ${isLight ? 'data-[state=active]:bg-white text-zinc-500 data-[state=active]:text-zinc-900' : 'data-[state=active]:bg-white/10 text-white/60 data-[state=active]:text-white'}`}><Calendar className="h-4 w-4 mr-2" />Calendar</TabsTrigger>
                    <TabsTrigger value="insights" className={`data-[state=active]:shadow-sm ${isLight ? 'data-[state=active]:bg-white text-zinc-500 data-[state=active]:text-zinc-900' : 'data-[state=active]:bg-white/10 text-white/60 data-[state=active]:text-white'}`}><Lightbulb className="h-4 w-4 mr-2" />Insights</TabsTrigger>
                    <TabsTrigger value="stats" className={`data-[state=active]:shadow-sm ${isLight ? 'data-[state=active]:bg-white text-zinc-500 data-[state=active]:text-zinc-900' : 'data-[state=active]:bg-white/10 text-white/60 data-[state=active]:text-white'}`}><Flame className="h-4 w-4 mr-2" />Stats</TabsTrigger>
                  </TabsList>
                  <TabsContent value="timeline" className="mt-0 focus-visible:outline-none"><TimelineView entries={entries} /></TabsContent>
                  <TabsContent value="insights" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                    <div className="space-y-8">
                      <div className={`p-8 backdrop-blur-2xl rounded-3xl border shadow-2xl ${isLight ? 'bg-white border-zinc-200' : 'bg-white/5 border-white/10'}`}>
                        <h2 className="text-2xl font-bold mb-6">10 Science-Backed Features</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <ul className={`space-y-3 text-sm ${isLight ? 'text-zinc-600' : 'text-white/70'}`}>
                            {["Mood Predictor - 70% accuracy", "Weekly Heatmap - 40% awareness boost", "Positive Memory Bank - 3x happiness", "Social Connection Tracker", "Sleep Correlation - 60% impact"].map((f, i) => (
                              <li key={i} className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${['bg-purple-400', 'bg-blue-400', 'bg-pink-400', 'bg-yellow-400', 'bg-indigo-400'][i]}`}></div> {f}</li>
                            ))}
                          </ul>
                          <ul className={`space-y-3 text-sm ${isLight ? 'text-zinc-600' : 'text-white/70'}`}>
                            {["CBT Reframing - 50-60% reduction", "Three Good Things - 2-10% happiness", "Worry Dump - 50% thought reduction", "Future Self Letters - 30% goal boost", "Timed Free-Write - 40% focus boost"].map((f, i) => (
                              <li key={i} className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${['bg-green-400', 'bg-orange-400', 'bg-red-400', 'bg-teal-400', 'bg-lime-400'][i]}`}></div> {f}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <InsightsDashboard insights={insights} />
                    </div>
                  </TabsContent>
                  <TabsContent value="stats" className="mt-0 focus-visible:outline-none">
                    <div className="space-y-6">
                      <h2 className="text-2xl font-semibold">Your Statistics</h2>
                      <div className="grid md:grid-cols-3 gap-6">
                        <div className={`p-8 backdrop-blur-2xl rounded-3xl border shadow-2xl ${isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-white/5 border-white/10 text-white'}`}><p className={`text-sm mb-1 ${isLight ? 'text-zinc-500' : 'text-white/40'}`}>Total Entries</p><p className="text-5xl font-bold">{entries.length}</p></div>
                        <div className={`p-8 backdrop-blur-2xl rounded-3xl border shadow-2xl ${isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-white/5 border-white/10 text-white'}`}><p className={`text-sm mb-1 ${isLight ? 'text-zinc-500' : 'text-white/40'}`}>Average Mood</p><p className="text-5xl font-bold">{entries.length > 0 ? (entries.reduce((sum, e) => sum + e.pulse.mood, 0) / entries.length).toFixed(1) : '0'}<span className={`text-xl ml-1 ${isLight ? 'text-zinc-400' : 'text-white/30'}`}>/10</span></p></div>
                        <div className={`p-8 backdrop-blur-2xl rounded-3xl border shadow-2xl ${isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-white/5 border-white/10 text-white'}`}><p className={`text-sm mb-1 ${isLight ? 'text-zinc-500' : 'text-white/40'}`}>Total Words</p><p className="text-5xl font-bold">{entries.reduce((sum, e) => sum + (e.content?.split(/\s+/).filter(Boolean).length || 0), 0).toLocaleString()}</p></div>
                      </div>
                      <div className={`p-8 backdrop-blur-2xl rounded-3xl border shadow-2xl ${isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-white/5 border-white/10 text-white'}`}><h3 className="text-xl font-bold mb-6">Mood Trend (14 days)</h3><MoodChart entries={entries} days={14} /></div>
                      <div className={`p-8 backdrop-blur-2xl rounded-3xl border shadow-2xl ${isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-white/5 border-white/10 text-white'}`}><h3 className="text-xl font-bold mb-6">Last 90 Days</h3><YearInPixels entries={entries} /></div>
                    </div>
                  </TabsContent>
                  <TabsContent value="calendar" className="mt-0 focus-visible:outline-none"><JournalCalendar entries={entries} /></TabsContent>
                </Tabs>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Global Systems */}
      <Toaster />
      <SiaAssistant 
        activeView={activeView}
        onNavigate={(view) => setActiveView(view)}
        onNavigateTab={(tab) => {
          setActiveView('journal');
          setActiveTab(tab as any);
        }}
        onOpenArticle={(article) => {
          setRoutedArticle(article);
          setActiveView('knowledge');
        }}
        language={globalLanguage}
        theme={theme}
        onThemeChange={(newTheme) => setTheme(newTheme as any)}
        isMuted={isMuted}
        onToggleMusic={() => setIsMuted(!isMuted)}
      />
    </div>
  );
}
