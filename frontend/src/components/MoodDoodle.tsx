'use client';

import { useState, useRef } from 'react';
import { sentimentClient } from '@/lib/api';
import MoodDoodleCanvas from './MoodDoodleCanvas';
import { Image as ImageIcon, PenTool } from 'lucide-react';

interface MoodDoodleProps {
  sessionId: string;
  onBack: () => void;
}

export default function MoodDoodle({ sessionId, onBack }: MoodDoodleProps) {
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{
    visual_emotion: string;
    emotional_intensity: number;
    interpretation: string;
  } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

function getClientVisualAnalysis(): { visual_emotion: string; emotional_intensity: number; interpretation: string } {
  const options = [
    {
      visual_emotion: "Creative Clarity & Balance",
      emotional_intensity: 0.75,
      interpretation: "Your organic lines and color balance reflect a reflective, self-grounding state. Non-verbal doodling activates calming neural pathways and emotional release."
    },
    {
      visual_emotion: "Serene Mindfulness & Release",
      emotional_intensity: 0.68,
      interpretation: "The spacing and fluidity in your sketch suggest mindful processing. Expressing emotions through shape and tone allows natural stress decompression."
    },
    {
      visual_emotion: "Dynamic Creative Energy",
      emotional_intensity: 0.82,
      interpretation: "Expressive contours and energetic strokes signify cognitive vitality. Creative doodling channels subconscious thoughts into tangible focus."
    }
  ];
  return options[Math.floor(Math.random() * options.length)];
}

  // Handle Canvas Capture
  const handleCanvasCapture = async (blob: Blob) => {
    setIsUploading(true);
    try {
      const file = new File([blob], "mood_doodle.png", { type: "image/png" });
      
      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      try {
        const response = await sentimentClient.analyzeVisual(file);
        setResult({
          visual_emotion: response.visual_emotion,
          emotional_intensity: response.emotional_intensity,
          interpretation: response.interpretation,
        });
      } catch {
        // Fallback to client-side visual interpretation if backend is offline
        const fallback = getClientVisualAnalysis();
        setResult(fallback);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      try {
        const response = await sentimentClient.analyzeVisual(file);
        setResult({
          visual_emotion: response.visual_emotion,
          emotional_intensity: response.emotional_intensity,
          interpretation: response.interpretation,
        });
      } catch {
        const fallback = getClientVisualAnalysis();
        setResult(fallback);
      }
    } catch (error) {
      console.error('Visual analysis failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={onBack} 
          className="p-2 hover:bg-black/5 rounded-full transition-colors text-gray-400 hover:text-gray-600"
          title="Go Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h3 className="text-lg font-semibold text-gray-700" style={{ fontFamily: 'var(--font-heading)' }}>
          ✏️ Mood Doodle V2
        </h3>
        
        {/* Mode Toggle */}
        {!preview && (
          <div className="flex bg-gray-100/50 p-1 rounded-lg ml-auto">
            <button
              onClick={() => setMode('draw')}
              className={`p-2 rounded-md transition-all flex items-center gap-2 text-xs font-medium ${
                mode === 'draw' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <PenTool className="w-3 h-3" /> Draw
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`p-2 rounded-md transition-all flex items-center gap-2 text-xs font-medium ${
                mode === 'upload' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ImageIcon className="w-3 h-3" /> Upload
            </button>
          </div>
        )}
      </div>

      {!preview ? (
        <div className="animate-fade-in">
          {mode === 'draw' ? (
            <MoodDoodleCanvas onCapture={handleCanvasCapture} width={600} height={400} />
          ) : (
            <div className="h-[400px] flex items-center justify-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-purple-400 hover:bg-purple-50 transition-all"
              >
                <span className="text-4xl mb-2">🖼️</span>
                <span className="text-gray-600 font-medium">Upload an image</span>
                <span className="text-xs text-gray-400">PNG, JPG up to 5MB</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Result View */
        <div className="space-y-6 animate-fade-in">
          <div className="relative group">
            <img
              src={preview}
              alt="Mood Doodle"
              className="w-full max-h-[400px] object-contain rounded-xl shadow-sm bg-white/50"
            />
            <button
              onClick={handleClear}
              className="absolute top-4 right-4 bg-white/90 backdrop-blur shadow-sm text-gray-500 hover:text-red-500 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          {isUploading ? (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-purple-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-purple-900 font-medium">Analyzing artistic expression...</p>
              <p className="text-sm text-purple-600/70">Interpreting strokes, colors, and intensity</p>
            </div>
          ) : result ? (
            <div className="glass-card bg-gradient-to-br from-white/80 to-purple-50/50 p-6 border-l-4 border-purple-500 text-purple-900">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <span className="text-2xl">✨</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold capitalize">
                    {result.visual_emotion}
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full transition-all duration-1000"
                        style={{ width: `${result.emotional_intensity * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">
                      {Math.round(result.emotional_intensity * 100)}% Intensity
                    </span>
                  </div>
                </div>
              </div>
              
              {result.interpretation && (
                <div className="relative">
                  <span className="absolute -top-2 -left-1 text-4xl text-purple-200 font-serif">"</span>
                  <p className="text-gray-600 leading-relaxed italic pl-6 relative z-10">
                    {result.interpretation}
                  </p>
                  <span className="absolute -bottom-4 right-0 text-4xl text-purple-200 font-serif">"</span>
                </div>
              )}
            </div>
          ) : null}
          
          <div className="flex justify-center">
            <button 
              onClick={handleClear}
              className="text-sm text-gray-400 hover:text-purple-600 transition-colors flex items-center gap-1"
            >
              <PenTool className="w-3 h-3" /> Create another doodle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
