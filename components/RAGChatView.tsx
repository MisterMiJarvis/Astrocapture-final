import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: { book: string; chunk_id: string; excerpt: string }[];
  took_ms?: number;
}

const RAGChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/rag-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
          took_ms: data.took_ms,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error while searching the astrophotography books. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="py-3 sm:py-4 text-center border-b border-border mb-3 sm:mb-4">
        <h1 className="text-xl sm:text-3xl font-display font-bold">📚 Astro Knowledge</h1>
        <p className="mt-1 sm:mt-2 text-xs sm:text-base text-text-secondary">
          Ask anything about astrophotography — answers from 4 reference books
        </p>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 px-1 pb-4"
      >
        {messages.length === 0 && (
          <div className="text-center text-text-secondary mt-8 sm:mt-12">
            <p className="text-base sm:text-lg">🔭 How can I help with your astrophotography?</p>
            <p className="text-xs sm:text-sm mt-2 text-text-muted">
              Ask about equipment, techniques, processing, settings...
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[88%] sm:max-w-[80%] rounded-xl px-3 sm:px-4 py-2 sm:py-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-border'
              }`}
            >
              {/* Content */}
              <div className="text-sm leading-relaxed whitespace-pre-wrap break-words overflow-hidden">
                {msg.content}
              </div>

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/50 space-y-1.5">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Sources
                  </p>
                  {msg.sources.map((src, j) => (
                    <div
                      key={j}
                      className="text-xs text-text-muted bg-background/40 rounded-lg px-2 sm:px-3 py-1.5"
                    >
                      <span className="font-medium text-text-secondary">📖 {src.book}</span>
                      <p className="mt-0.5 text-text-muted italic line-clamp-2">"{src.excerpt}"</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Response time */}
              {msg.took_ms && (
                <div className="mt-2 text-xs text-text-muted text-right">
                  {msg.took_ms < 1000 ? `${msg.took_ms}ms` : `${(msg.took_ms / 1000).toFixed(1)}s`}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border rounded-xl px-3 sm:px-4 py-2 sm:py-3">
              <div className="flex items-center gap-2 text-text-secondary text-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs sm:text-sm">Searching the books...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border pt-3 sm:pt-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about astrophotography..."
            disabled={loading}
            className="flex-1 bg-surface-secondary border border-border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-text placeholder:text-text-muted focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RAGChatView;