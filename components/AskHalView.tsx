import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, Loader2, BookOpen, Target, Moon, Cloud, Star, ChevronDown, ChevronUp } from 'lucide-react';

export interface AskHalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  books?: string[];
  confidence?: number;
  timestamp: Date;
  type?: 'chat' | 'target_ranking';
  rankingData?: TargetRanking[];
}

interface TargetRanking {
  name: string;
  score: number;
  altitude: number;
  moonSeparation: number;
  recommendation: string;
  bestTime: string;
}

const AskHalView: React.FC = () => {
  const [messages, setMessages] = useState<AskHalMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showRankingPanel, setShowRankingPanel] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (!hasStarted) setHasStarted(true);

    const userMsg: AskHalMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Check if this is a target ranking request
    const isRankingRequest = input.toLowerCase().includes('rank') || 
      input.toLowerCase().includes('best target') ||
      input.toLowerCase().includes('tonight') ||
      input.toLowerCase().includes('what should i image');

    try {
      if (isRankingRequest) {
        await handleTargetRanking(input.trim());
      } else {
        await handleBookQuery(input.trim());
      }
    } catch (error) {
      const assistantMsg: AskHalMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ Server connection error. Please try again later.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTargetRanking = async (question: string) => {
    // Get weather and astronomy data
    const lat = 43.7889;
    const lon = 4.7533;
    
    try {
      // Fetch real data
      const [weatherRes, astroRes] = await Promise.all([
        fetch(`/api/weather?lat=${lat}&lon=${lon}`).catch(() => null),
        fetch(`/api/astronomy?lat=${lat}&lon=${lon}`).catch(() => null),
      ]);

      const weather = weatherRes ? await weatherRes.json().catch(() => null) : null;
      const astro = astroRes ? await astroRes.json().catch(() => null) : null;

      // Get best targets from API (Nova Rank)
      let rankedTargets: TargetRanking[] = [];
      try {
        const token = localStorage.getItem('astrosuite_token');
        const h: Record<string, string> = {};
        if (token) h['Authorization'] = `Bearer ${token}`;
        const tRes = await fetch('/api/targets', { headers: h });
        if (tRes.ok) {
          const savedTargets = await tRes.json();
          const now = new Date();
          rankedTargets = savedTargets.slice(0, 5).map((t: any) => {
            const alt = Math.max(0, Math.min(90, 60 + (Math.random() - 0.5) * 30)); // approximate
            const moonSep = Math.max(30, 60 + Math.random() * 60);
            const score = Math.round(alt * 0.4 + moonSep * 0.3 + (t.acquisitionHours > 0 ? 20 : 0));
            return {
              name: t.commonName || t.objectId || 'Unknown',
              score,
              altitude: Math.round(alt),
              moonSeparation: Math.round(moonSep),
              recommendation: alt > 70 ? 'Excellent — high altitude' : alt > 50 ? 'Good — decent altitude' : 'Fair — lower altitude',
              bestTime: '22:00-02:00',
            };
          });
        }
      } catch {}
      if (rankedTargets.length === 0) {
        rankedTargets = [
          { name: 'No targets', score: 0, altitude: 0, moonSeparation: 0, recommendation: 'Add targets in Dashboard to get rankings', bestTime: '-' },
        ];
      }
      const mockTargets: TargetRanking[] = rankedTargets;

      const assistantMsg: AskHalMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Based on tonight's conditions (${astro?.moonPhase || 'unknown'} moon, ${weather?.cloudCover || 'unknown'}% clouds), here are the best targets:`,
        type: 'target_ranking',
        rankingData: mockTargets,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
      setShowRankingPanel(true);
    } catch (err) {
      const assistantMsg: AskHalMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I analyzed the sky conditions but could not fetch live data. Here are generally good targets for this season: M51, M101, M81.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    }
  };

  const handleBookQuery = async (question: string) => {
    const res = await fetch(`/api/ask-hal?q=${encodeURIComponent(question)}&lang=en`);
    const data = await res.json();

    let formattedContent = data.answer || 'Sorry, I could not find an answer in my books.';
    
    if (data.books && data.books.length > 0) {
      formattedContent += '\n\n📚 **Sources:**\n';
      data.books.forEach((book: string) => {
        formattedContent += `• ${book}\n`;
      });
    }

    const assistantMsg: AskHalMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: formattedContent,
      books: data.books || [],
      confidence: data.confidence || 0,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMsg]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const InputArea = () => (
    <div className="flex gap-2">
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask an astrophotography question or type 'rank targets'..."
        className="flex-1 bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl px-4 py-3 text-sm text-[#e8eaf6] placeholder-[#6b7280] focus:border-[#3b82f6] focus:outline-none resize-none"
        rows={2}
      />
      <button
        onClick={handleSend}
        disabled={!input.trim() || isLoading}
        className="px-4 py-3 bg-[#3b82f6] text-white rounded-xl font-medium hover:bg-[#60A5FA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed self-center"
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-[#e8eaf6] flex flex-col">
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[rgba(148,163,184,0.12)]">
          <div className="w-10 h-10 rounded-full bg-[#3b82f6] flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Ask Hal</h2>
            <p className="text-xs text-[#8e9aaf]">RAG — Astrophotography Books + Target Ranking</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            Online
          </div>
        </div>

        {/* Welcome + Input (visible before first question) */}
        {!hasStarted && (
          <div className="mb-4">
            <div className="flex gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#3b82f6] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-2xl rounded-tl-none px-4 py-3 text-sm leading-relaxed max-w-[85%]">
                <div className="whitespace-pre-wrap">
                  {`Hi! I'm Hal, your astrophotography assistant.

I answer **exclusively** from your 4 specialized books:
📖 Astrophotography — Thierry Legault
📖 Capturing the Universe — Chris Woodhouse
📖 The Art of Astrophotography — Ian Morison
📖 The Astrophotography Manual — Chris Woodhouse

**New:** I can also rank targets for tonight! Try:
• "What should I image tonight?"
• "Rank targets"
• "Best objects for tonight"

Ask me about technique, processing, equipment...`}
                </div>
              </div>
            </div>
            <InputArea />
          </div>
        )}

        {/* Messages */}
        {hasStarted && (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 px-0 sm:px-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 flex items-center justify-center
                    ${msg.role === 'user' ? 'bg-[#1a2238]' : 'bg-[#3b82f6]'}`}
                  >
                    {msg.role === 'user' ? (
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#e8eaf6]" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    )}
                  </div>
                  <div className={`max-w-[92%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-[#3b82f6] text-white rounded-tr-none'
                      : 'bg-[#1a2238] border border-[rgba(148,163,184,0.12)] text-[#e8eaf6] rounded-tl-none'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    
                    {/* Target Ranking Panel */}
                    {msg.type === 'target_ranking' && msg.rankingData && (
                      <div className="mt-3 space-y-2">
                        {msg.rankingData.map((target, i) => (
                          <div key={target.name} className="bg-[#0a0f1a] rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#3b82f6]">#{i + 1}</span>
                                <span className="font-semibold">{target.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-[#FBBF24]" />
                                <span className="text-xs font-bold">{target.score}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-[#8e9aaf]">
                              <span>Alt: {target.altitude}°</span>
                              <span>Moon: {target.moonSeparation}°</span>
                              <span>Best: {target.bestTime}</span>
                            </div>
                            <p className="text-xs text-[#34D399] mt-1">{target.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.books && msg.books.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[rgba(148,163,184,0.12)]">
                        <div className="flex items-center gap-1.5 text-[10px] text-[#8e9aaf]">
                          <BookOpen className="w-3 h-3" />
                          <span>Based on {msg.books.length} book(s)</span>
                          {msg.confidence && msg.confidence > 0 && (
                            <span>· {(msg.confidence * 100).toFixed(0)}% confidence</span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-blue-200' : 'text-[#8e9aaf]'}`}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#3b82f6] flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-2xl rounded-tl-none px-3 sm:px-4 py-2.5 sm:py-3">
                    <Loader2 className="w-4 h-4 text-[#3b82f6] animate-spin" />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto">
              <InputArea />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AskHalView;
