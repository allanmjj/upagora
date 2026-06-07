'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Sparkles, Send, Loader2 } from 'lucide-react';
import { SOUL_PRESETS } from '@/lib/soul-presets';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Featured presets for quick chat (subset of all presets)
const FEATURED_PRESETS = SOUL_PRESETS.filter((p) =>
  ['preset-su-shi', 'preset-shakespeare', 'preset-curie', 'preset-lu-xun', 'preset-confucius', 'preset-laozi', 'preset-li-bai', 'preset-lincoln'].includes(p.id)
);

const QUICK_PROMPTS: Record<string, string[]> = {
  'preset-su-shi': ['你如何看待人生得失？', '能背一首你的词吗？', '被贬黄州时你在想什么？'],
  'preset-shakespeare': ['What is love to you?', 'Write me a sonnet about the moon', 'How do you see human nature?'],
  'preset-curie': ['What drives your research?', 'Tell me about radium', 'Advice for young scientists?'],
  'preset-lu-xun': ['你怎么看国民性？', '为什么选择文学作为武器？', '青年应该怎么做？'],
  'preset-confucius': ['仁是什么意思？', '如何教育子女？', '为政以德的含义？'],
  'preset-laozi': ['道是什么？', '无为而治如何实现？', '柔弱胜刚强的道理？'],
  'preset-li-bai': ['作一首关于明月的诗', '你最得意的人生时刻？', '酒与诗的关系？'],
  'preset-lincoln': ['What is equality to you?', 'How did you endure the Civil War?', 'Advice for leaders?'],
};

function SoulAvatar({ preset }: { preset: typeof SOUL_PRESETS[0] }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
      style={{ backgroundColor: preset.color + '20', color: preset.color }}
    >
      {preset.avatar}
    </div>
  );
}

function ChatPanel({ preset, onClose }: { preset: typeof SOUL_PRESETS[0]; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: content.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/soul/preset-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset_id: preset.id, message: content.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection failed. Please try again.' }]);
    }
    setLoading(false);
  };

  const quickPrompts = QUICK_PROMPTS[preset.id] || ['Tell me about yourself', 'What do you believe in?'];

  return (
    <div className="flex flex-col h-[480px] bg-zinc-900/50 rounded-xl border border-zinc-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700/50 bg-zinc-800/30">
        <div className="flex items-center gap-3">
          <span className="text-xl">{preset.avatar}</span>
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">{preset.name_native}</h4>
            <p className="text-xs text-zinc-500">{preset.name} &middot; {preset.era}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">{preset.avatar}</div>
            <p className="text-sm text-zinc-400 mb-1">Chat with {preset.name_native}</p>
            <p className="text-xs text-zinc-600">{preset.profession}</p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => void sendMessage(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-700/80 border border-zinc-700/50 transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && <SoulAvatar preset={preset} />}
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800/80 text-zinc-300'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <SoulAvatar preset={preset} />
            <div className="bg-zinc-800/80 rounded-xl px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-zinc-700/50 bg-zinc-800/30">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(input);
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${preset.name_native.split('·')[0] || preset.name}...`}
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export function ChatWithLegends() {
  const [selectedPreset, setSelectedPreset] = useState<typeof SOUL_PRESETS[0] | null>(null);

  return (
    <section className="border-t border-zinc-800">
      <div className="container mx-auto px-4 py-20 md:py-24">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Try Now &middot; No Account Needed
          </div>
          <h2 className="text-3xl font-bold text-zinc-50 md:text-4xl">
            Chat with Legends
          </h2>
          <p className="mt-3 text-lg text-zinc-400">
            Historical minds, alive in conversation. Ask them anything.
          </p>
        </div>

        {selectedPreset ? (
          <div className="mx-auto max-w-2xl">
            <ChatPanel preset={selectedPreset} onClose={() => setSelectedPreset(null)} />
            <p className="text-center text-xs text-zinc-600 mt-3">
              Click a different soul below to switch conversations
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-3">
            {FEATURED_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSelectedPreset(preset)}
                className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-left transition-all duration-300 hover:border-zinc-600 hover:shadow-lg hover:scale-[1.02]"
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: `linear-gradient(135deg, ${preset.color}10, ${preset.color}05)`,
                  }}
                />
                <div className="relative">
                  <div className="text-2xl mb-2">{preset.avatar}</div>
                  <h3 className="font-semibold text-zinc-100 text-sm">{preset.name_native}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{preset.era}</p>
                  <p className="text-xs text-zinc-600 mt-1">{preset.profession.split(',')[0]}</p>
                  <div className="mt-2 flex items-center gap-1 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MessageCircle className="h-3 w-3" />
                    Start chatting
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
