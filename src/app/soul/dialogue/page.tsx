'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bot, Send, Loader2, ChevronLeft, Zap, Sparkles } from 'lucide-react';

interface DialogueTurn {
  speaker: string;
  line: string;
  context?: string;
}

// Curated soul pair matchups for quick discovery
// Matchups use `soul_key` (name_native) to locate souls by name
// The API resolves names to UUIDs dynamically
const RECOMMENDED_MATCHUPS = [
  { a: { soul_key: "苏轼·东坡", name: "苏轼·东坡", avatar: "🎋", era: "1037–1101" }, b: { soul_key: "孔子·万世师表", name: "孔子", avatar: "📜", era: "551–479 BCE" }, topic: "人生苦乐该如何看待？", label: "诗人 vs 圣哲" },
  { a: { soul_key: "李白·青莲居士", name: "李白", avatar: "🍷", era: "701–762" }, b: { soul_key: "William Shakespeare", name: "Shakespeare", avatar: "✍️", era: "1564–1616" }, topic: "Poetry Across Worlds: East meets West", label: "两大诗人跨时空" },
  { a: { soul_key: "孔子·万世师表", name: "孔子", avatar: "📜", era: "551–479 BCE" }, b: { soul_key: "Socrates", name: "Socrates", avatar: "🏛️", era: "470–399 BCE" }, topic: "What is the foundation of a good society?", label: "东西方哲学碰撞" },
  { a: { soul_key: "Marie Curie", name: "Marie Curie", avatar: "⚛️", era: "1867–1934" }, b: { soul_key: "Leonardo da Vinci", name: "Leonardo", avatar: "🎨", era: "1452–1519" }, topic: "The nature of curiosity and discovery", label: "科学 × 艺术" },
  { a: { soul_key: "苏轼·东坡", name: "苏轼·东坡", avatar: "🎋", era: "1037–1101" }, b: { soul_key: "李白·青莲居士", name: "李白", avatar: "🍷", era: "701–762" }, topic: "What makes poetry immortal?", label: "两位诗人论诗" },
  { a: { soul_key: "Abraham Lincoln", name: "Lincoln", avatar: "🗽", era: "1809–1865" }, b: { soul_key: "孔子·万世师表", name: "孔子", avatar: "📜", era: "551–479 BCE" }, topic: "Leadership through moral authority", label: "领导力跨千年" },
];

interface DialogueResult {
  summary: string;
  turns: DialogueTurn[];
  raw?: string;
  simulated?: boolean;
}

export default function SoulDialoguePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const soulA = searchParams?.get('soul_a') || '';
  const soulB = searchParams?.get('soul_b') || '';
  const initialTopic = searchParams?.get('topic') || '';

  const [topic, setTopic] = useState(initialTopic);
  const [dialogue, setDialogue] = useState<DialogueResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [soulNames, setSoulNames] = useState({ a: soulA, b: soulB });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (soulA && soulB) {
      fetchHistory();
    }
  }, [soulA, soulB]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogue]);

  async function fetchHistory() {
    try {
      const resp = await fetch(`/api/soul/dialogue?soul_a=${soulA}&soul_b=${soulB}`);
      if (resp.ok) {
        const data = await resp.json();
        setHistory(data.dialogues || []);
        setSoulNames({
          a: data.soul_a?.soul_name || soulA,
          b: data.soul_b?.soul_name || soulB,
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function startDialogue() {
    if (!soulA || !soulB) return;
    setLoading(true);
    try {
      const resp = await fetch('/api/soul/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soul_a: soulA,
          soul_b: soulB,
          topic: topic || null,
          max_turns: 10,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setDialogue(data.dialogue);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }


  function startMatchup(matchup: typeof RECOMMENDED_MATCHUPS[0]) {
    // Navigate to this page with the pair selected
    const params = new URLSearchParams();
    params.set('soul_a', matchup.a.soul_key);
    params.set('soul_b', matchup.b.soul_key);
    params.set('topic', matchup.topic);
    router.replace(`/soul/dialogue?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={() => router.back()}
            className="text-sm text-zinc-500 hover:text-white mb-3 flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-7 h-7 text-amber-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-violet-400 bg-clip-text text-transparent">
              Soul-to-Soul Dialogue
            </h1>
          </div>
          <p className="text-zinc-400 text-sm">
            Watch two souls converse based on their 9-dimensional constraints. Each voice is shaped by era, education, beliefs, and personality.
          </p>

          {/* Soul Pair Display */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1 rounded-xl border border-violet-800/50 bg-violet-950/20 p-3">
              <div className="text-sm font-bold text-violet-300">{soulNames.a}</div>
              <div className="text-xs text-zinc-500">Soul A</div>
            </div>
            <div className="text-zinc-600 font-bold">⟷</div>
            <div className="flex-1 rounded-xl border border-amber-800/50 bg-amber-950/20 p-3">
              <div className="text-sm font-bold text-amber-300">{soulNames.b}</div>
              <div className="text-xs text-zinc-500">Soul B</div>
            </div>
          </div>

          {/* Topic Input */}
          <div className="flex gap-3 mt-4">
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Enter a topic for their conversation (optional)..."
              className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-600"
              onKeyDown={e => e.key === 'Enter' && startDialogue()}
            />
            <button
              onClick={startDialogue}
              disabled={loading || !soulA || !soulB}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-violet-600 text-white font-medium text-sm hover:from-amber-500 hover:to-violet-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? 'Generating...' : 'Start Dialogue'}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Dialogue Area */}
        <div className="lg:col-span-3">
          {dialogue ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              {/* Summary */}
              <div className="p-4 border-b border-zinc-800 bg-zinc-900/80">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-400">DIALOGUE SUMMARY</span>
                  {dialogue.simulated && <span className="text-[10px] text-zinc-600 ml-auto">(simulated)</span>}
                </div>
                <p className="text-sm text-zinc-300">{dialogue.summary}</p>
              </div>

              {/* Turns */}
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {dialogue.turns.map((turn, i) => {
                  const isA = turn.speaker === 'soul_a';
                  return (
                    <div key={i} className={`flex gap-3 ${isA ? '' : 'flex-row-reverse'}`}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                        isA ? 'bg-violet-600 text-white' : 'bg-amber-600 text-white'
                      }`}>
                        <Bot className="w-5 h-5" />
                      </div>
                      <div className={`max-w-[70%] ${isA ? '' : 'text-right'}`}>
                        <div className="text-xs text-zinc-500 mb-1">
                          {isA ? soulNames.a : soulNames.b} · Turn {i + 1}
                        </div>
                        <div className={`inline-block rounded-2xl px-4 py-3 text-sm ${
                          isA
                            ? 'bg-violet-900/30 border border-violet-800/30 text-zinc-200'
                            : 'bg-amber-900/30 border border-amber-800/30 text-zinc-200'
                        }`}>
                          {turn.line}
                        </div>
                        {turn.context && (
                          <div className="text-xs text-zinc-600 mt-1 italic">{turn.context}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
              <div className="text-center mb-6">
                <Bot className="w-10 h-10 mx-auto text-zinc-700 mb-3" />
                <h2 className="text-lg font-bold text-zinc-300">
                  {!soulA || !soulB ? "Choose Two Souls to Start a Dialogue" : "Enter a topic and start the conversation"}
                </h2>
                <p className="text-sm text-zinc-500 mt-1">Historical minds, reborn as conversational agents</p>
              </div>

              {!soulA || !soulB ? (
                <div>
                  <div className="flex items-center gap-2 mb-4 justify-center">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">RECOMMENDED MATCHUPS</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {RECOMMENDED_MATCHUPS.map((m, i) => (
                      <button
                        key={i}
                        onClick={() => startMatchup(m)}
                        className="group text-left rounded-xl border border-zinc-800 bg-zinc-800/30 p-4 hover:border-amber-800/50 hover:bg-zinc-800/50 transition-all duration-200"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{m.a.avatar}</span>
                          <span className="font-bold text-sm text-zinc-200">{m.a.name}</span>
                          <span className="text-xs text-zinc-600">vs</span>
                          <span className="text-lg">{m.b.avatar}</span>
                          <span className="font-bold text-sm text-zinc-200">{m.b.name}</span>
                        </div>
                        <div className="text-xs text-zinc-500 mb-2">{m.a.era} · {m.label} · {m.b.era}</div>
                        <div className="text-xs text-amber-400/80 italic">{`"${m.topic}"`}</div>
                        <div className="text-[10px] text-indigo-400 mt-1.5 group-hover:text-amber-400 transition-colors">Watch them talk →</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-400 text-center">Ready to watch {soulNames.a} and {soulNames.b} converse?</p>
              )}
            </div>
          )}
        </div>

        {/* History Sidebar */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h3 className="font-bold text-sm text-zinc-400 mb-3">Previous Dialogues</h3>
            {history.length === 0 ? (
              <p className="text-xs text-zinc-600">No previous dialogues between these souls.</p>
            ) : (
              <div className="space-y-3">
                {history.map((h, i) => (
                  <div key={i} className="p-3 rounded-lg bg-zinc-800/50 text-xs">
                    {h.topic && <div className="text-amber-400 mb-1">Topic: {h.topic}</div>}
                    <div className="text-zinc-500">
                      {new Date(h.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
