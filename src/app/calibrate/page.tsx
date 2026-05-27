"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const VALID_DIMENSIONS = ["voice", "values", "knowledge", "emotion", "relationships"];
const DIM_ICONS: Record<string, string> = {
  voice: "🗣️", values: "⚖️", knowledge: "📚", emotion: "💛", relationships: "🤝",
};

const DIM_LABELS: Record<string, string> = {
  voice: "Voice & Expression", values: "Values & Judgment",
  knowledge: "Knowledge & Depth", emotion: "Emotional Response",
  relationships: "Relationships & Warmth",
};

export default function GuardianCalibrationPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [souls, setSouls] = useState<any[]>([]);
  const [selectedSoul, setSelectedSoul] = useState<any>(null);

  // Chat state
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Calibration state
  const [showCalibration, setShowCalibration] = useState(false);
  const [dimension, setDimension] = useState("voice");
  const [correctedResponse, setCorrectedResponse] = useState("");
  const [calibrating, setCalibrating] = useState(false);
  const [recentCalibrations, setRecentCalibrations] = useState<any[]>([]);
  const [calibrationCount, setCalibrationCount] = useState(0);
  const [lastCalibrationResult, setLastCalibrationResult] = useState<any>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // Load souls where user is guardian
        const { data: guardianSouls } = await supabase
          .from("soul_guardians")
          .select("soul_id")
          .eq("user_id", user.id);

        if (guardianSouls && guardianSouls.length > 0) {
          const soulIds = guardianSouls.map((g: any) => g.soul_id);
          const { data: soulData } = await supabase
            .from("soul_extraction_results")
            .select("id, name, name_native, persona_text, avatar, language")
            .in("id", soulIds);
          setSouls(soulData || []);
          if (soulData && soulData.length > 0) setSelectedSoul(soulData[0]);
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  useEffect(() => {
    // Load recent calibrations when soul changes
    if (selectedSoul) {
      loadCalibrations();
    }
  }, [selectedSoul]);

  async function loadCalibrations() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch("/api/soul/calibrate", {
        headers: { authorization: `Bearer ${session?.access_token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setRecentCalibrations(data.calibrations || []);
        setCalibrationCount(data.total || 0);
      }
    } catch {}
  }

  const sendMessage = async () => {
    if (!input.trim() || !selectedSoul || sending) return;
    const userMsg = { role: "user", content: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);
    setStreamingText("");
    setShowCalibration(false);
    setLastCalibrationResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch("/api/soul/chat-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          session_id: selectedSoul.id,
          message: userMsg.content,
          conversation_history: messages.slice(-10),
        }),
      });

      if (resp.ok && resp.headers.get("content-type")?.includes("text/event-stream")) {
        const reader = resp.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const data = JSON.parse(line.slice(6));
                if (data.token) {
                  fullText += data.token;
                  setStreamingText(fullText);
                }
                if (data.done && fullText) {
                  setMessages((m) => [...m, { role: "assistant", content: fullText }]);
                  setStreamingText("");
                  setShowCalibration(true);
                }
              } catch {}
            }
          }
        }
      } else {
        const data = await resp.json();
        const text = data.response || "...";
        setMessages((m) => [...m, { role: "assistant", content: text }]);
        setShowCalibration(true);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Soul is resting right now. Try again later." },
      ]);
    }
    setSending(false);
  };

  const submitCalibration = async () => {
    if (!correctedResponse.trim() || !selectedSoul) return;
    setCalibrating(true);
    setLastCalibrationResult(null);

    try {
      const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch("/api/soul/calibrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          context: lastAssistantMsg ? `Q: ${[...messages].reverse().find(m => m.role === "user")?.content || ""}\nA: ${lastAssistantMsg.content}` : "",
          agent_response: lastAssistantMsg?.content || selectedSoul.persona_text || "",
          corrected_response: correctedResponse.trim(),
          dimension,
        }),
      });

      const data = await resp.json();
      if (resp.ok) {
        setLastCalibrationResult(data);
        setCalibrationCount((c) => c + 1);
        setCorrectedResponse("");
        loadCalibrations();
      } else {
        setLastCalibrationResult({ error: data.error });
      }
    } catch (err: any) {
      setLastCalibrationResult({ error: err.message || "Calibration failed" });
    }
    setCalibrating(false);
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center"><p className="text-zinc-400 animate-pulse">Loading...</p></div>;
  if (!user) return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center"><div className="text-center"><div className="mb-4 text-4xl">🔒</div><p className="text-zinc-400">Please sign in to calibrate souls.</p></div></div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Guardian Calibration
          </h1>
          <p className="text-zinc-400 mt-1">
            Chat with souls and provide feedback to continuously improve their accuracy.
          </p>
          {calibrationCount > 0 && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-600/20 px-3 py-1 text-sm text-indigo-300">
              {calibrationCount} calibration{calibrationCount !== 1 ? "s" : ""} recorded
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Soul Sidebar */}
          <aside className="lg:w-64 shrink-0">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="text-sm font-semibold text-zinc-300 mb-3">Your Souls</h2>
              {souls.length === 0 ? (
                <p className="text-sm text-zinc-500">No souls found. Try extracting a soul first.</p>
              ) : (
                <div className="space-y-2">
                  {souls.map((soul) => (
                    <button
                      key={soul.id}
                      onClick={() => { setSelectedSoul(soul); setMessages([]); setShowCalibration(false); }}
                      className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors ${
                        selectedSoul?.id === soul.id ? "bg-indigo-600/30" : "hover:bg-zinc-800"
                      }`}
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-sm font-bold shrink-0">
                        {soul.name?.[0] || "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{soul.name || soul.name_native || "Unknown"}</div>
                        <div className="text-xs text-zinc-500">{soul.language || "N/A"}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {!selectedSoul ? (
              <div className="flex-1 flex items-center justify-center rounded-xl border border-zinc-800">
                <p className="text-zinc-500">Select a soul to calibrate</p>
              </div>
            ) : (
              <>
                {/* Chat */}
                <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 flex flex-col min-h-0">
                  <div className="border-b border-zinc-800 p-4">
                    <div className="font-bold">{selectedSoul.name || selectedSoul.name_native}</div>
                    <div className="text-xs text-zinc-500">Guardian Mode — Ask questions, calibrate responses</div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                            msg.role === "user"
                              ? "bg-indigo-600 text-white"
                              : "bg-zinc-800 text-zinc-200 border border-zinc-700"
                          }`}
                        >
                          <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                        </div>
                      </div>
                    ))}
                    {streamingText && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-xl px-4 py-2 text-sm bg-zinc-800 text-indigo-300 border border-zinc-700">
                          {streamingText}
                          <span className="animate-pulse ml-1">▊</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="border-t border-zinc-800 p-3">
                    <form
                      onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask the soul a question..."
                        className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={sending || !selectedSoul}
                      />
                      <button
                        type="submit"
                        disabled={sending || !input.trim()}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-indigo-500 transition-colors"
                      >
                        {sending ? "..." : "Send"}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Calibration Area */}
                {showCalibration && (
                  <div className="mt-4 rounded-xl border border-amber-700/50 bg-zinc-900 p-4">
                    <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                      ⚖️ Calibrate This Response
                    </h3>
                    <div className="grid gap-4">
                      <div>
                        <label className="text-xs text-zinc-400">Dimension</label>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {VALID_DIMENSIONS.map((dim) => (
                            <button
                              key={dim}
                              onClick={() => setDimension(dim)}
                              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                dimension === dim
                                  ? "bg-amber-600 text-white"
                                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                              }`}
                            >
                              <span>{DIM_ICONS[dim]}</span>
                              {DIM_LABELS[dim]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400">
                          🔧 Your Corrected Response (what <strong>{selectedSoul.name}</strong> should say)
                        </label>
                        <textarea
                          value={correctedResponse}
                          onChange={(e) => setCorrectedResponse(e.target.value)}
                          rows={4}
                          placeholder="Write the ideal response this soul should have given..."
                          className="mt-1 w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-500">
                          This will be compared with the soul's response and merged into persona updates.
                        </p>
                        <button
                          onClick={submitCalibration}
                          disabled={calibrating || !correctedResponse.trim()}
                          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-amber-500 transition-colors"
                        >
                          {calibrating ? "Submitting..." : "Submit Calibration"}
                        </button>
                      </div>
                    </div>
                    {lastCalibrationResult && (
                      <div
                        className={`mt-3 rounded-lg p-3 text-sm ${
                          lastCalibrationResult.error ? "bg-red-900/30 text-red-400" : "bg-green-900/30 text-green-400"
                        }`}
                      >
                        {lastCalibrationResult.error
                          ? `Error: ${lastCalibrationResult.error}`
                          : "✓ Calibration recorded. Persona updated."}
                      </div>
                    )}
                  </div>
                )}

                {/* Recent Calibrations */}
                {recentCalibrations.length > 0 && (
                  <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                    <h3 className="text-sm font-semibold text-zinc-300 mb-3">Recent Calibrations</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {recentCalibrations.slice(0, 10).map((cal: any, i) => (
                        <div key={i} className="rounded-lg bg-zinc-800 p-3 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-amber-400 font-medium">
                              {DIM_ICONS[cal.dimension] || "📝"} {cal.dimension}
                            </span>
                            <span className="text-zinc-500">
                              {new Date(cal.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {cal.corrected_response && (
                            <p className="text-zinc-400 truncate">{cal.corrected_response.slice(0, 120)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

