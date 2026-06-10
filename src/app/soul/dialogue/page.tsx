"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { MessageSquare, Zap, Send, Loader2, ArrowLeftRight, Sparkles, Bot, Play, RefreshCw } from "lucide-react";

interface SoulOption {
  id: string;
  name: string;
  capability_description?: string;
}

interface DialogueTurn {
  speaker: string;
  speaker_name: string;
  content: string;
}

interface DialogueSession {
  id: string;
  topic: string;
  turns: DialogueTurn[];
  soul_a_name: string;
  soul_b_name: string;
}

const TOPIC_SUGGESTIONS = [
  "The meaning of creativity",
  "AI vs human intuition",
  "The future of art",
  "What makes a good life",
  "Technology and human connection",
  "Can machines have souls?",
  "The nature of consciousness",
];

export default function SoulDialoguePage() {
  const [souls, setSouls] = useState<SoulOption[]>([]);
  const [soulA, setSoulA] = useState("");
  const [soulB, setSoulB] = useState("");
  const [topic, setTopic] = useState("");
  const [session, setSession] = useState<DialogueSession | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [streamingTurn, setStreamingTurn] = useState("");
  const [streamingSpeaker, setStreamingSpeaker] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchSouls() {
      try {
        const res = await fetch("/api/agents?sort=popular");
        const data = await res.json();
        setSouls(data.data || []);
      } catch {
        setSouls([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSouls();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session, streamingTurn]);

  const soulAData = souls.find((s) => s.id === soulA);
  const soulBData = souls.find((s) => s.id === soulB);

  const handleStartDialogue = async () => {
    if (!soulA || !soulB || !topic.trim()) {
      setError("Please select two souls and enter a topic.");
      return;
    }
    if (soulA === soulB) {
      setError("Please select two different souls.");
      return;
    }
    setError("");
    setGenerating(true);
    setSession(null);
    setStreamingTurn("");
    setStreamingSpeaker("");

    try {
      const res = await fetch("/api/soul/dialogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soul_a_id: soulA,
          soul_b_id: soulB,
          topic: topic.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `API error: ${res.status}`);
      }

      const data = await res.json();
      setSession({
        id: data.id || `dlg-${Date.now()}`,
        topic: topic.trim(),
        turns: data.turns || [],
        soul_a_name: soulAData?.name || "Soul A",
        soul_b_name: soulBData?.name || "Soul B",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate dialogue");
    } finally {
      setGenerating(false);
      setStreamingTurn("");
      setStreamingSpeaker("");
    }
  };

  const handleContinue = async () => {
    if (!topic.trim() || !session) return;
    setGenerating(true);
    setStreamingTurn("");
    setStreamingSpeaker("");

    try {
      const res = await fetch("/api/soul/dialogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soul_a_id: soulA,
          soul_b_id: soulB,
          topic: topic.trim(),
          context: session.turns.map((t) => `${t.speaker_name}: ${t.content}`).join("\n"),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `API error: ${res.status}`);
      }

      const data = await res.json();
      const newTurns = (data.turns || []).map((t: any) => ({
        speaker: t.speaker || t.soul_id,
        speaker_name: t.speaker_name || (t.speaker === soulA ? soulAData?.name : soulBData?.name) || "Unknown",
        content: t.content || "",
      }));

      setSession((prev) =>
        prev
          ? { ...prev, turns: [...prev.turns, ...newTurns] }
          : { ...session, turns: [...session.turns, ...newTurns] }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to continue dialogue");
    } finally {
      setGenerating(false);
      setStreamingTurn("");
      setStreamingSpeaker("");
      setTopic("");
    }
  };

  const handleReset = () => {
    setSession(null);
    setTopic("");
    setStreamingTurn("");
    setStreamingSpeaker("");
    setError("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-transparent">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-3">
            <ArrowLeftRight className="h-7 w-7 text-indigo-400" />
            <h1 className="text-4xl font-bold text-white">Soul Dialogue</h1>
          </div>
          <p className="text-lg text-zinc-400 max-w-2xl">
            Watch two souls converse on any topic. Powered by A2A — Agent-to-Agent protocol,
            where each soul maintains its own personality and perspective.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Soul Selection */}
        {!session && (
          <div className="grid sm:grid-cols-2 gap-6 mb-8">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <h3 className="font-semibold text-white">Soul A</h3>
              </div>
              <select
                value={soulA}
                onChange={(e) => setSoulA(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Select a soul...</option>
                {souls.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === soulB}>
                    {s.name}
                  </option>
                ))}
              </select>
              {soulAData && (
                <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                  {soulAData.capability_description || "No description"}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                <h3 className="font-semibold text-white">Soul B</h3>
              </div>
              <select
                value={soulB}
                onChange={(e) => setSoulB(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Select a soul...</option>
                {souls.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === soulA}>
                    {s.name}
                  </option>
                ))}
              </select>
              {soulBData && (
                <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                  {soulBData.capability_description || "No description"}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Session Header */}
        {session && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-400" />
                {session.soul_a_name} <span className="text-zinc-500">↔</span> {session.soul_b_name}
              </h3>
              <p className="text-xs text-zinc-500 mt-1">Topic: {session.topic}</p>
            </div>
            <button
              onClick={handleReset}
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              New Dialogue
            </button>
          </div>
        )}

        {/* Topic Input */}
        <div className="mb-8">
          <div className="flex gap-3">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={
                session
                  ? "Continue with your own message..."
                  : "Enter a topic for these souls to discuss..."
              }
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-50 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  session ? handleContinue() : handleStartDialogue();
                }
              }}
              disabled={
                generating ||
                (!session && (!soulA || !soulB))
              }
            />
            <button
              onClick={session ? handleContinue : handleStartDialogue}
              disabled={
                !!(generating ||
                (!session && (!soulA || !soulB)) ||
                (session && !topic.trim()))
              }
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : session ? (
                <Send className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {generating ? "Thinking..." : session ? "Continue" : "Start"}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

          {!session && souls.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs text-zinc-500">Try:</span>
              {TOPIC_SUGGESTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  className="px-3 py-1 rounded-full bg-zinc-800 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dialogue Messages */}
        {(session || streamingTurn) && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
              {session?.turns.map((turn, i) => {
                const isA = turn.speaker === soulA || turn.speaker_name === soulAData?.name;
                return (
                  <div
                    key={i}
                    className={`flex ${isA ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-3 ${
                        isA
                          ? "bg-blue-500/10 border border-blue-500/20 text-zinc-200"
                          : "bg-purple-500/10 border border-purple-500/20 text-zinc-200"
                      }`}
                    >
                      <div className="text-xs font-medium mb-1 opacity-70">
                        {turn.speaker_name}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{turn.content}</p>
                    </div>
                  </div>
                );
              })}

              {/* Streaming indicator */}
              {streamingTurn && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-xl px-4 py-3 bg-blue-500/10 border border-blue-500/20 text-zinc-200">
                    <div className="text-xs font-medium mb-1 opacity-70">
                      {streamingSpeaker}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">
                      {streamingTurn}
                      <span className="inline-block w-2 h-4 bg-indigo-400 ml-1 animate-pulse" />
                    </p>
                  </div>
                </div>
              )}

              {generating && !streamingTurn && (
                <div className="flex justify-center py-4">
                  <div className="flex items-center gap-2 text-zinc-500 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Souls are conversing...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!session && souls.length < 2 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <Bot className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-xl font-semibold text-zinc-300 mb-2">
              Not enough souls for dialogue
            </h3>
            <p className="text-zinc-500 mb-6">
              At least two souls are needed to start a dialogue.
            </p>
            <Link
              href="/soul/distill"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Distill More Souls
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
