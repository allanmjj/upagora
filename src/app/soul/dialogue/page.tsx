"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { MessageSquare, Zap, Send, Loader2, ArrowLeftRight, Sparkles, Bot } from "lucide-react";

interface SoulOption {
  id: string;
  name: string;
  username: string;
  capability_description?: string;
}

interface DialogueMessage {
  id: string;
  soul_id: string;
  soul_name: string;
  content: string;
  timestamp: Date;
}

export default function SoulDialoguePage() {
  const [souls, setSouls] = useState<SoulOption[]>([]);
  const [soulA, setSoulA] = useState<string>("");
  const [soulB, setSoulB] = useState<string>("");
  const [messages, setMessages] = useState<DialogueMessage[]>([]);
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchSouls() {
      try {
        const res = await fetch("/api/agents?sort=popular");
        const data = await res.json();
        setSouls(data.data || []);
      } catch (err) {
        console.error("Failed to fetch souls:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSouls();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    setMessages([]);

    // Simulate dialogue exchange
    const exchanges = 4;
    for (let i = 0; i < exchanges; i++) {
      const speaker = i % 2 === 0 ? soulAData : soulBData;
      if (!speaker) continue;

      // Call soul chat API for each response
      try {
        const res = await fetch("/api/soul/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent_id: speaker.id,
            message: topic,
            context: messages
              .slice(-4)
              .map((m) => `${m.soul_name}: ${m.content}`)
              .join("\n"),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const response = data.reply || data.response || data.message || "No response generated.";
          setMessages((prev) => [
            ...prev,
            {
              id: `${speaker.id}-${i}`,
              soul_id: speaker.id,
              soul_name: speaker.name,
              content: response,
              timestamp: new Date(),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `${speaker.id}-${i}`,
              soul_id: speaker.id,
              soul_name: speaker.name,
              content: "[Soul is currently unavailable]",
              timestamp: new Date(),
            },
          ]);
        }
      } catch (err) {
        console.error(`Dialogue generation failed for ${speaker.name}:`, err);
        setMessages((prev) => [
          ...prev,
          {
            id: `${speaker.id}-${i}`,
            soul_id: speaker.id,
            soul_name: speaker.name,
            content: "[Error generating response]",
            timestamp: new Date(),
          },
        ]);
      }

      // Small delay between exchanges
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setGenerating(false);
  };

  const handleCustomTopic = () => {
    if (!topic.trim() || messages.length === 0) return;
    setGenerating(true);

    // Continue the dialogue with a new custom message
    const lastSpeaker = messages[messages.length - 1];
    const otherSoul = lastSpeaker.soul_id === soulA ? soulBData : soulAData;

    if (otherSoul) {
      setMessages((prev) => [
        ...prev,
        {
          id: `custom-${Date.now()}`,
          soul_id: "user",
          soul_name: "You",
          content: topic,
          timestamp: new Date(),
        },
      ]);

      // Get response from the other soul
      fetch("/api/soul/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: otherSoul.id,
          message: topic,
          context: messages.slice(-4).map((m) => `${m.soul_name}: ${m.content}`).join("\n"),
        }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data) {
            setMessages((prev) => [
              ...prev,
              {
                id: `${otherSoul.id}-${Date.now()}`,
                soul_id: otherSoul.id,
                soul_name: otherSoul.name,
                content: data.reply || data.response || data.message || "[No response]",
                timestamp: new Date(),
              },
            ]);
          }
        })
        .catch(console.error)
        .finally(() => {
          setGenerating(false);
          setTopic("");
        });
    }
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
      <div className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-transparent">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-white mb-3">Soul Dialogue</h1>
          <p className="text-lg text-zinc-400 max-w-2xl">
            Watch two souls converse on any topic. See how different personalities
            and perspectives create unique dialogues.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Soul Selection */}
        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <h3 className="font-semibold text-white">Soul A</h3>
            </div>
            <select
              value={soulA}
              onChange={(e) => setSoulA(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 focus:border-indigo-500 focus:outline-none"
              disabled={messages.length > 0}
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
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <h3 className="font-semibold text-white">Soul B</h3>
            </div>
            <select
              value={soulB}
              onChange={(e) => setSoulB(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 focus:border-indigo-500 focus:outline-none"
              disabled={messages.length > 0}
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

        {/* Topic Input */}
        <div className="mb-8">
          <div className="flex gap-3">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={messages.length > 0 ? "Continue with your own message..." : "Enter a topic for these souls to discuss..."}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-50 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  messages.length > 0 ? handleCustomTopic() : handleStartDialogue();
                }
              }}
              disabled={generating || (messages.length === 0 && (!soulA || !soulB))}
            />
            <button
              onClick={messages.length > 0 ? handleCustomTopic : handleStartDialogue}
              disabled={generating || (!soulA || !soulB)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : messages.length > 0 ? (
                <Send className="h-4 w-4" />
              ) : (
                <ArrowLeftRight className="h-4 w-4" />
              )}
              {generating ? "Thinking..." : messages.length > 0 ? "Continue" : "Start"}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

          {messages.length === 0 && souls.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs text-zinc-500">Try:</span>
              {[
                "The meaning of creativity",
                "AI vs human intuition",
                "The future of art",
                "What makes a good life",
                "Technology and human connection",
              ].map((t) => (
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
        {messages.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-indigo-400" />
                  Dialogue
                </h3>
                <button
                  onClick={() => {
                    setMessages([]);
                    setTopic("");
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Reset
                </button>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {soulAData?.name} ↔ {soulBData?.name}
              </p>
            </div>

            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
              {messages.map((msg) => {
                const isA = msg.soul_id === soulA;
                const isUser = msg.soul_id === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? "justify-end" : isA ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-3 ${
                        isUser
                          ? "bg-indigo-600 text-white"
                          : isA
                          ? "bg-blue-500/10 border border-blue-500/20 text-zinc-200"
                          : "bg-purple-500/10 border border-purple-500/20 text-zinc-200"
                      }`}
                    >
                      <div className="text-xs font-medium mb-1 opacity-70">
                        {msg.soul_name}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && souls.length < 2 && (
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
