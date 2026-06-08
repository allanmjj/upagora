/**
 * Internet Traces Feed — Displays soul discoveries from the internet.
 * Souls "roam" the web and bring back interesting findings.
 */
"use client";

import { useState, useEffect, useCallback } from "react";

interface Trace {
  id?: string;
  soul_name: string;
  url: string;
  site_label?: string;
  category: string;
  discovery: string;
  quote: string;
  timestamp: string;
  stored?: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  science: "🔬", art: "🎨", philosophy: "🤔", tech: "💻",
  psychology: "🧠", learning: "📚", nature: "🌿", history: "📜",
  math: "🔢", mystery: "🔮", exploration: "🧭", knowledge: "💡",
};

export default function InternetTracesFeed({ soulId }: { soulId?: string }) {
  if (!soulId) return <div className="p-6 text-center text-zinc-500 text-sm">Select a soul to view internet traces</div>;
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(false);
  const [exploring, setExploring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTraces = useCallback(async () => {
    try {
      const res = await fetch(`/api/town/trace?soul_id=${soulId}&limit=20`);
      const data = await res.json();
      setTraces(data.traces || []);
      setError(null);
    } catch (e) {
      setError("Failed to load traces");
    }
  }, [soulId]);

  useEffect(() => {
    fetchTraces();
    const interval = setInterval(fetchTraces, 30000);
    return () => clearInterval(interval);
  }, [fetchTraces]);

  const handleExplore = async () => {
    setExploring(true);
    setError(null);
    try {
      const res = await fetch("/api/town/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soul_id: soulId }),
      });
      const data = await res.json();
      if (data.trace) {
        setTraces(prev => [data.trace, ...prev]);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (e) {
      setError("Exploration failed");
    } finally {
      setExploring(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white/90">🌐 Soul Internet Traces</h2>
          <p className="text-sm text-white/40">Discoveries your soul brings back from the web</p>
        </div>
        <button
          onClick={handleExplore}
          disabled={exploring}
          className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30
                     hover:bg-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exploring ? "🔍 Exploring..." : "🧭 Explore Now"}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded p-3">
          {error}
        </div>
      )}

      {/* Traces Feed */}
      {traces.length === 0 && !exploring ? (
        <div className="text-center py-12 text-white/30">
          <p className="text-4xl mb-2">🌐</p>
          <p>Your soul hasn&apos;t explored the internet yet.</p>
          <p className="text-sm mt-1">Click "Explore Now" to send your soul on an adventure.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {traces.map((trace, i) => (
            <div
              key={trace.id || i}
              className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
            >
              {/* Trace header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-white/80">{trace.soul_name}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  {CATEGORY_ICONS[trace.category] || "🔍"} {trace.category}
                </span>
                <span className="text-xs text-white/30 ml-auto">
                  {trace.timestamp ? new Date(trace.timestamp).toLocaleDateString() : ""}
                </span>
              </div>

              {/* Site visited */}
              <div className="text-xs text-white/40 mb-2">
                📍 Visited: {trace.site_label || new URL(trace.url).hostname}
              </div>

              {/* Discovery */}
              <p className="text-sm text-white/70 mb-2">{trace.discovery}</p>

              {/* Quote */}
              {trace.quote && (
                <blockquote className="border-l-2 border-purple-500/30 pl-3 py-1 text-sm italic text-purple-300/70">
                  &ldquo;{trace.quote}&rdquo;
                </blockquote>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
