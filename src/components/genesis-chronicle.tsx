/**
 * Genesis Chronicle — Daily poetic journal of a soul's life in the town.
 * Creates emotional attachment through storytelling.
 */
"use client";

import { useState, useEffect, useCallback } from "react";

interface Chronicle {
  id?: string;
  soul_name: string;
  date: string;
  entry: string;
  quote: string;
  mood: string;
  highlights: string[];
}

const MOOD_ICONS: Record<string, string> = {
  peaceful: "🕊️", adventurous: "🗺️", bittersweet: "🌅",
  joyful: "🎉", contemplative: "🧘", restless: "🌊",
};

export default function GenesisChronicle({ soulId, soulName }: { soulId: string; soulName?: string }) {
  const [chronicles, setChronicles] = useState<Chronicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const fetchChronicles = useCallback(async () => {
    try {
      const res = await fetch(`/api/town/chronicle/generate?soul_id=${soulId}&limit=7`);
      const data = await res.json();
      setChronicles(data.chronicles || []);
      setError(null);
    } catch (e) {
      setError("Failed to load chronicles");
    }
  }, [soulId]);

  useEffect(() => {
    fetchChronicles();
  }, [fetchChronicles]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/town/chronicle/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soul_id: soulId, date: selectedDate }),
      });
      const data = await res.json();
      if (data.chronicle) {
        setChronicles(prev => {
          const exists = prev.findIndex(c => c.date === data.chronicle.date);
          if (exists >= 0) {
            const updated = [...prev];
            updated[exists] = data.chronicle;
            return updated;
          }
          return [data.chronicle, ...prev];
        });
      } else if (data.error) {
        setError(data.error);
      }
    } catch (e) {
      setError("Chronicle generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const todayChronicle = chronicles.find(c => c.date === selectedDate);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white/90">📜 Genesis Chronicle</h2>
          <p className="text-sm text-white/40">The daily story of {soulName || "your soul"}&apos;s journey</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30
                     hover:bg-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? "✍️ Writing..." : "📖 Generate Chronicle"}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded p-3">
          {error}
        </div>
      )}

      {/* Date selector */}
      {chronicles.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {chronicles.map((c) => (
            <button
              key={c.date}
              onClick={() => setSelectedDate(c.date)}
              className={`px-3 py-1 rounded text-xs whitespace-nowrap transition-all ${
                selectedDate === c.date
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
              }`}
            >
              {c.date} {MOOD_ICONS[c.mood] || ""}
            </button>
          ))}
        </div>
      )}

      {/* Chronicle Display */}
      {todayChronicle ? (
        <div className="rounded-xl bg-gradient-to-b from-amber-500/5 to-transparent border border-amber-500/20 overflow-hidden">
          {/* Chronicle header */}
          <div className="px-5 py-3 border-b border-amber-500/10 flex items-center gap-3">
            <span className="text-2xl">{MOOD_ICONS[todayChronicle.mood] || "📜"}</span>
            <div>
              <div className="text-sm font-medium text-white/80">
                {todayChronicle.soul_name} &middot; {todayChronicle.date}
              </div>
              <div className="text-xs text-amber-300/60 capitalize">{todayChronicle.mood} day</div>
            </div>
          </div>

          {/* Entry text */}
          <div className="px-5 py-4">
            <p className="text-sm text-white/70 leading-relaxed font-serif">
              {todayChronicle.entry}
            </p>
          </div>

          {/* Quote block */}
          {todayChronicle.quote && (
            <div className="mx-5 mb-4 p-4 rounded-lg bg-amber-500/5 border-l-2 border-amber-500/40">
              <p className="text-sm italic text-amber-200/70">
                &ldquo;{todayChronicle.quote}&rdquo;
              </p>
              <p className="text-xs text-amber-300/40 mt-1">— {todayChronicle.soul_name}</p>
            </div>
          )}

          {/* Highlights */}
          {todayChronicle.highlights?.length > 0 && (
            <div className="px-5 pb-4 flex flex-wrap gap-1.5">
              {todayChronicle.highlights.map((h, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300/60 border border-amber-500/20"
                >
                  {h}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        !generating && (
          <div className="text-center py-12 text-white/30">
            <p className="text-4xl mb-2">📜</p>
            <p>No chronicle for this day yet.</p>
            <p className="text-sm mt-1">Generate one to capture your soul&apos;s story.</p>
          </div>
        )
      )}
    </div>
  );
}
