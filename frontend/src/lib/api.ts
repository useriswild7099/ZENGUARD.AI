/**
 * API Client for ZenGuard Backend
 * Handles all communication with the sentiment analysis API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Emotion {
  type: string;
  intensity: number;
}

export interface MaskingIndicator {
  detected: boolean;
  confidence: number;
  surface_emotion?: string;
  underlying_emotion?: string;
  indicators: string[];
}

export interface Intervention {
  type: string;
  title: string;
  description: string;
  priority: number;
}

export interface AnalysisResponse {
  wellness_score: number;
  confidence: number;
  primary_emotion: Emotion;
  secondary_emotions: Emotion[];
  emotional_intensity: number;
  masking: MaskingIndicator;
  repetition_detected: boolean;
  emotional_shift: string | null;
  mood_seed_stage: string;
  mood_color: string;
  recommended_interventions: Intervention[];
  supportive_message: string;
  data_stored: boolean;
}

export interface QuickCheckResponse {
  emotional_tone: string;
  intensity: number;
  suggestion: string | null;
}

export interface SessionTrendsResponse {
  session_trend: string;
  trend_confidence: number;
  recurring_themes: string[];
  risk_trajectory: string;
  overall_risk_score: number;
  session_insight: string;
  recommended_intervention: string;
}

export interface VisualAnalysisResponse {
  visual_emotion: string;
  emotional_intensity: number;
  energy_level: string;
  interpretation: string;
  visual_risk_score: number;
  data_stored: boolean;
}

/** Helper to fetch with timeout */
async function fetchWithTimeout(resource: URL | string | Request, options: RequestInit & { timeout?: number } = {}) {
  const { timeout = 30000 } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal
  });
  
  clearTimeout(id);
  return response;
}

class SentimentClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Check if the API is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Shorter timeout for health check
      const response = await fetchWithTimeout(`${this.baseUrl}/health`, { timeout: 10000 });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Perform full sentiment analysis on journal entry
   */
  async analyzeEntry(
    text: string,
    sessionId?: string
  ): Promise<AnalysisResponse> {
    const response = await fetchWithTimeout(`${this.baseUrl}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        session_id: sessionId,
      }),
      timeout: 60000 // 60s timeout for heavy AI work
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Quick check for real-time feedback while typing
   */
  async quickCheck(text: string): Promise<QuickCheckResponse> {
    const response = await fetchWithTimeout(`${this.baseUrl}/api/quick-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
      timeout: 15000 // 15s timeout
    });

    if (!response.ok) {
      throw new Error(`Quick check failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get session trends analysis
   */
  async getSessionTrends(sessionId: string): Promise<SessionTrendsResponse> {
    const response = await fetchWithTimeout(
      `${this.baseUrl}/api/session/${sessionId}/trends`,
      { timeout: 30000 }
    );

    if (!response.ok) {
      throw new Error(`Trend analysis failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Analyze a mood doodle/sketch
   */
  async analyzeVisual(file: File): Promise<VisualAnalysisResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetchWithTimeout(`${this.baseUrl}/api/analyze-visual`, {
      method: 'POST',
      body: formData,
      timeout: 60000 // 60s timeout for multimodal AI work
    });

    if (!response.ok) {
      throw new Error(`Visual analysis failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Clear session data
   */
  async clearSession(sessionId: string): Promise<void> {
    await fetchWithTimeout(`${this.baseUrl}/api/session/${sessionId}`, {
      method: 'DELETE',
      timeout: 10000
    });
  }
}

// Export singleton instance
export const sentimentClient = new SentimentClient();

// ============ CHAT API ============

export interface ChatMode {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category?: string;
  color?: string;
  image?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  mode: string;
  data_stored: boolean;
}

class ChatClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Get available chat modes with robust offline fallback
   */
  async getModes(): Promise<ChatMode[]> {
    const fallbackModes: ChatMode[] = [
      { id: "compassionate_friend", name: "Compassionate Friend", emoji: "🤗", description: "A warm, understanding listener who offers emotional support, validation, and a safe space to share your feelings.", category: "general", color: "purple", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop" },
      { id: "academic_coach", name: "Academic Coach", emoji: "📚", description: "Helps with study stress, time management, and academic motivation. Practical, structured, and encouraging.", category: "general", color: "blue", image: "https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=200&auto=format&fit=crop" },
      { id: "mindfulness_guide", name: "Mindfulness Guide", emoji: "🧘", description: "Guides you through breathing exercises and grounding techniques. Calm, centered, and peaceful.", category: "general", color: "teal", image: "https://images.unsplash.com/photo-1511295742362-92c96b124e52?q=80&w=200&auto=format&fit=crop" },
      { id: "motivational_coach", name: "Motivational Coach", emoji: "🚀", description: "Inspires action and helps you see your potential. Energetic, positive, and forward-looking.", category: "general", color: "orange", image: "https://images.unsplash.com/photo-1526498460520-4c246339dccb?q=80&w=200&auto=format&fit=crop" },
      { id: "mother", name: "Mother", emoji: "👩‍👧", description: "Warm, nurturing, and always there for you. Offers unconditional support and gentle guidance.", category: "family", color: "rose", image: "https://images.unsplash.com/photo-1544281679-05e8e8609f7a?q=80&w=200&auto=format&fit=crop" },
      { id: "father", name: "Father", emoji: "👨‍👦", description: "Supportive, wise, and believes in you. Provides a steady, grounded perspective and practical life advice.", category: "family", color: "blue", image: "https://images.unsplash.com/photo-1582216149959-19ebbb3c19f5?q=80&w=200&auto=format&fit=crop" }
    ];

    try {
      const response = await fetchWithTimeout(`${this.baseUrl}/api/modes`, { timeout: 8000 });
      if (!response.ok) return fallbackModes;
      const data = await response.json();
      return data.modes && data.modes.length > 0 ? data.modes : fallbackModes;
    } catch {
      // If backend is unreachable (e.g., deployed on Vercel without a live backend), return beautiful fallbacks so UI never breaks
      return fallbackModes;
    }
  }

  /**
   * Send a chat message
   */
  async sendMessage(
    message: string,
    mode: string,
    history: ChatMessage[]
  ): Promise<ChatResponse> {
    const response = await fetchWithTimeout(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        mode,
        history,
      }),
      timeout: 60000 // 60s timeout for AI response
    });

    if (!response.ok) {
      throw new Error(`Chat failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Clear chat (client-side confirmation)
   */
  async clearChat(): Promise<void> {
    await fetchWithTimeout(`${this.baseUrl}/api/chat/clear`, {
      method: 'DELETE',
      timeout: 10000
    });
  }
}

// Export singleton instance
export const chatClient = new ChatClient();

