"use client";

import { useEffect, useState, useRef } from "react";
import { logger } from '@/lib/logger';

const MOOD_EMOJIS: Record<string, string> = {
  happy: "😊", calm: "😌", melancholic: "😔", anxious: "😟", inspired: "✨", peace: "😇",
};

const MOOD_COLORS: Record<string, string> = {
  happy: "#22c55e", calm: "#06b6d4", melancholic: "#8b5cf6", anxious: "#f97316", inspired: "#fbbf24", peace: "#a78bfa",
};

interface SummaryData {
  town: {
    total_souls: number; total_events_today: number;
    encounters: number; creations: number; guardian_interactions: number;
  };
  mood_distribution: Record<string, number>;
  highlights: Array<{ type: string; summary: string; space: string; time: number; icon: string }>;
  souls: Array<{ soul_id: string; name: string; name_native: string; mood: string; energy: number; region: string; avatar: string; color: string }>;
  event_counts: Record<string, number>;
  all_events: any[];
}

export function TownSummaryDashboard({ className = "" }: { className?: string }) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSoul, setSelectedSoul] = useState<string | null>(null);
  const refreshInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/town/summary" + (selectedSoul ? `?soul_id=${selectedSoul}` : ""));
      const json = await res.json();
      setData(json);
    } catch (e) {
      logger.error("Summary fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    refreshInterval.current = setInterval(fetchData, 60000);
    return () => clearInterval(refreshInterval.current as any);
  }, []);

  if (loading) {
    return (
      <div className={`p-6 text-center text-zinc-500 ${className}`}>
        <p className="text-2xl mb-2">📊</p>
        <p className="text-sm">Loading town summary...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`p-6 text-center text-zinc-500 ${className}`}>
        <p className="text-sm">No summary data available</p>
      </div>
    );
  }

  const dominantMood = Object.entries(data.mood_distribution)
    .sort(([, a], [, b]) => b - a)[0];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="👥" label="Souls" value={data.town.total_souls} />
        <StatCard icon="📅" label="Today Events" value={data.town.total_events_today} />
        <StatCard icon="🤝" label="Encounters" value={data.town.encounters} />
        <StatCard icon="🎨" label="Creations" value={data.town.creations} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mood Distribution */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span>🎭</span> Mood Distribution
          </h3>
          <div className="space-y-2">
            {Object.entries(data.mood_distribution).filter(([, v]) => v > 0).map(([mood, count]) => (
              <div key={mood} className="flex items-center gap-2">
                <span className="text-sm w-8">{MOOD_EMOJIS[mood] || "😐"}</span>
                <div className="flex-1 h-2 rounded-full bg-zinc-800">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${(count / data.town.total_souls) * 100}%`,
                      backgroundColor: MOOD_COLORS[mood] || "#6b7280",
                    }}
                  />
                </div>
                <span className="text-xs text-zinc-500 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-600">
            Dominant mood: <span className="text-zinc-400 font-medium">{MOOD_EMOJIS[dominantMood[0]]} {dominantMood[0]}</span>
          </div>
        </div>

        {/* Soul List */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span>✨</span> Souls Present
          </h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {data.souls.map((soul) => (
              <button
                key={soul.soul_id}
                onClick={() => setSelectedSoul(soul.soul_id)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                  selectedSoul === soul.soul_id
                    ? "bg-zinc-800 border border-zinc-700"
                    : "hover:bg-zinc-800/50 border border-transparent"
                }`}
              >
                <span className="text-lg">{soul.avatar || "👤"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">{soul.name_native || soul.name}</div>
                  <div className="text-[10px] text-zinc-500">{soul.region}</div>
                </div>
                <span className="text-xs">{MOOD_EMOJIS[soul.mood]}</span>
                <div className="w-12 h-1.5 rounded-full bg-zinc-800">
                  <div
                    className="h-1.5 rounded-full bg-green-500"
                    style={{ width: `${soul.energy}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Highlights */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span>📰</span> Today Highlights
          </h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {data.highlights.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-4">The town is quiet today.</p>
            ) : (
              data.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-zinc-800/30">
                  <span className="text-sm mt-0.5">{h.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-zinc-300 leading-tight">{h.summary}</p>
                    <p className="text-[10px] text-zinc-600 mt-1">@ {h.time}:00 · {h.space}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="text-lg mb-1">{icon}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}
