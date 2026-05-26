import React, { useState } from 'react';
import { PageHeader, Container, Card, Button, Badge } from '../components';

// --- Ask Hal AI View Wireframe ---
// Implements: Chat interface + Ranking results

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; url?: string }[];
  confidence?: number;
  timestamp: Date;
}

interface SuggestedPrompt {
  id: string;
  text: string;
  icon: string;
}

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { id: '1', text: 'What should I image tonight?', icon: '🌙' },
  { id: '2', text: 'Rank galaxies for my setup', icon: '🔭' },
  { id: '3', text: 'Best targets this weekend', icon: '⭐' },
  { id: '4', text: 'Compare these two telescopes', icon: '⚖️' },
];

const TYPING_DOTS = (
  <div className="flex items-center gap-1">
    {<span className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />}
    <span className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <span className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
);

// --- Components ---

const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
        isUser
          ? 'bg-[#3B82F6] text-white'
          : 'bg-gradient-to-br from-[#3b82f6] to-[#3B82F6] text-white'
      }`}>
        {isUser ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        )}
      </div>

      {/* Content */}
      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-2.5 rounded-2xl ${
          isUser
            ? 'bg-[#3B82F6] text-white rounded-br-sm'
            : 'bg-[#1a2238] border border-[rgba(148,163,184,0.12)] text-[#e8eaf6] rounded-bl-sm'
        }`}
003e
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2">
            <button className="text-xs text-[#6b7280] hover:text-[#8e9aaf] transition-colors flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Sources ({message.sources.length})
            </button>
          </div>
        )}

        {/* Confidence */}
        {!isUser && message.confidence && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="w-16 h-1 bg-[#1F2937] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#3B82F6] to-[#3b82f6] rounded-full transition-all"
                style={{ width: `${message.confidence}%` }}
              />
            </div>
            <span className="text-[10px] text-[#6b7280]">{message.confidence}% confident</span>
          </div>
        )}

        <span className="text-[10px] text-[#6b7280] mt-1 block">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

const RankingResult: React.FC<{
  rank: number;
  targetName: string;
  targetType: string;
  score: number;
  reason: string;
  altitude: number;
  moonSeparation: number;
  imagingWindow: string;
}> = ({ rank, targetName, targetType, score, reason, altitude, moonSeparation, imagingWindow }) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'bg-[#10B981]';
    if (s >= 60) return 'bg-[#FBBF24]';
    if (s >= 40) return 'bg-[#F97316]';
    return 'bg-[#EF4444]';
  };

  return (
    <Card variant="elevated" className="overflow-hidden">
      <div className="flex items-start gap-4">
        {/* Rank */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] flex items-center justify-center">
          <span className="text-lg font-bold text-[#8e9aaf] font-[Space_Grotesk]">#{rank}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-[#e8eaf6]">{targetName}</h3>
            <Badge variant="default">{targetType}</Badge>
          </div>
          
          <p className="text-sm text-[#8e9aaf] mb-3">{reason}</p>
          
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6b7280]">
            <span>Altitude: {altitude}°</span>
            <span>Moon: {moonSeparation}°</span>
            <span>Window: {imagingWindow}</span>
          </div>
        </div>

        {/* Score */}
        <div className="flex-shrink-0 text-right">
          <div className={`text-2xl font-bold font-[Space_Grotesk] ${
            score >= 80 ? 'text-[#10B981]' : score >= 60 ? 'text-[#FBBF24]' : score >= 40 ? 'text-[#F97316]' : 'text-[#EF4444]'
          }`}>
            {score}
          </div>
          <div className="w-16 h-1.5 bg-[#1F2937] rounded-full mt-1 overflow-hidden">
            <div className={`h-full ${getScoreColor(score)} rounded-full`} style={{ width: `${score}%` }} />
          </div>
        </div>
      </div>
    </Card>
  );
};

// --- Main View ---

export const AskHalView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Based on your current conditions and equipment, here are my recommendations:\n\n1. **M42 Orion Astro** — Excellent altitude, minimal moon interference\n2. **M31 Andromeda** — High in the sky, good for wide-field\n3. **M45 Pleiades** — Perfect for your focal length\n\nWould you like me to generate a detailed imaging plan for any of these?`,
        sources: [
          { title: 'Messier Catalog', url: '#' },
          { title: 'AstroWeather API', url: '#' },
        ],
        confidence: 87,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 2000);
  };

  const handlePromptClick = (prompt: SuggestedPrompt) => {
    setInput(prompt.text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col">
      <Container className="flex-1 flex flex-col">
        <PageHeader
          title="Ask Hal"
          subtitle="AI-powered target ranking and recommendations"
        />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {messages.length === 0 ? (
            /* Empty State with Suggested Prompts */
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#3B82F6] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[#e8eaf6] mb-2">Ask Hal anything</h2>
              <p className="text-sm text-[#8e9aaf] mb-8 text-center max-w-md">
                Get personalized target recommendations, compare equipment, or plan your next imaging session.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {SUGGESTED_PROMPTS.map(prompt => (
                  <button
                    key={prompt.id}
                    onClick={() => handlePromptClick(prompt)}
                    className="flex items-center gap-3 p-4 bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl hover:border-[rgba(148,163,184,0.25)] hover:bg-[#111827] transition-all text-left group"
                  >
                    <span className="text-xl">{prompt.icon}</span>
                    <span className="text-sm text-[#e8eaf6] group-hover:text-white transition-colors">{prompt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="flex-1 overflow-y-auto space-y-6 py-4">
              {messages.map(message => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#3B82F6] flex-shrink-0 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                  </div>
                  <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-2xl rounded-bl-sm px-4 py-3">
                    {TYPING_DOTS}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Ranking Results (toggleable) */}
          {showRanking && (
            <div className="py-4 border-t border-[rgba(148,163,184,0.12)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#8e9aaf] uppercase tracking-wider">Ranking Results</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowRanking(false)}>Hide</Button>
              </div>
              <div className="space-y-3">
                <RankingResult
                  rank={1}
                  targetName="M42 Orion Astro"
                  targetType="Astro"
                  score={92}
                  reason="Highest altitude at your location, minimal moon interference, optimal for your focal length"
                  altitude={65}
                  moonSeparation={45}
                  imagingWindow="21:30 - 03:00"
                />
                <RankingResult
                  rank={2}
                  targetName="M31 Andromeda Galaxy"
                  targetType="Galaxy"
                  score={78}
                  reason="Good altitude, requires longer exposures, moon will rise at 01:00"
                  altitude={55}
                  moonSeparation={30}
                  imagingWindow="20:00 - 01:00"
                />
                <RankingResult
                  rank={3}
                  targetName="M45 Pleiades"
                  targetType="Open Cluster"
                  score={71}
                  reason="Excellent for wide-field setup, lower altitude but long imaging window"
                  altitude={42}
                  moonSeparation={60}
                  imagingWindow="19:00 - 04:00"
                />
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="py-4 border-t border-[rgba(148,163,184,0.12)]">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about targets, weather, or equipment..."
                  rows={1}
                  className="w-full bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl px-4 py-3 pr-12 text-sm text-[#e8eaf6] placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.25)] focus:border-[#3B82F6] resize-none overflow-hidden min-h-[44px] max-h-[120px]"
                  style={{ height: 'auto' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </Button>
            </div>
            <p className="mt-2 text-[10px] text-[#6b7280]">
              Hal may make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default AskHalView;
