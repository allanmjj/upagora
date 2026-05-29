"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { SoulActivityBadge, SoulActivityLegend, useSoulActivity } from "@/components/town-activity-badge";

const MOOD_EMOJIS: Record<string, string> = {
  happy: "😊", calm: "😌", melancholic: "😔", anxious: "😟", inspired: "✨", peace: "😇",
};

interface SoulData {
  soul: {
    soul_id: string; name: string; name_native: string; mood: string; energy: number;
    region: string; avatar: string; color: string; current_region: string;
  };
  today: {
    events_count: number; encounters: number; activities: any[];
  };
  overall: {
    total_souls: number; total_events_today: number; mood_distribution: Record<string, number>;
  };
}

export default function SoulDailyReportPage({ params }: { params: { soulId: string } }) {
  const router = useRouter();
  const [data, setData] = useState<SoulData | null>(null);
  const [loading, setLoading] = useState(true);
  const { activity, period_name } = useSoulActivity();
  const refreshRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    async function fetch() {
      try {
        const res = await fetch(`/api/town/summary?soul_id=${params.soulId}`);
        const json = await res.json();
        setData(json);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetch();
    refreshRef.current = setInterval(fetch, 30000);
    return () => clearInterval(refreshRef.current);
  }, [params.soulId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-500">Loading soul report...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-400">Soul not found</p>
        <button onClick={() => router.push("/town")} className="text-sm text-amber-400 hover:text-amber-300">
          ← Back to Town
        </button>
      </div>
    );
  }

  const soul = data.soul;
  const moodEmoji = MOOD_EMOJIS[soul.mood] || "😐";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/town")} className="text-zinc-400 hover:text-white">
            ← Town
          </button>
          <h1 className="text-xl font-bold">📋 Daily Report</h1>
          <SoulActivityBadge />
        </div>
        <div className="text-xs text-zinc-600">
          {period_name} · Soul ID: {soul.soul_id.slice(0, 8)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Right panel - Mood & Energy */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            {moodEmoji} Soul Status
          </h2>
          <p className="text-2xl font-bold mb-1">{soul.name_native || soul.name}</p>
          <p className="text-sm text-zinc-500 mb-4">{soul.region}</p>

          {/* Mood */}
          <div className="mb-4">
            <div className="text-xs text-zinc-500 mb-1">Current Mood</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{moodEmoji}</span>
              <span className="text-sm font-medium capitalize text-zinc-300">{soul.mood}</span>
            </div>
          </div>

          {/* Energy bar */}
          <div className="mb-4">
            <div className="text-xs text-zinc-500 mb-1">Energy</div>
            <div className="w-full h-3 rounded-full bg-zinc-800">
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${soul.energy}%`,
                  backgroundColor: soul.energy > 70 ? "#22c55e" : soul.energy > 30 ? "#eab308" : "#ef4444",
                }}
              />
            </div>
            <div className="text-right text-xs text-zinc-500 mt-1">{soul.energy}%</div>
          </div>

          {/* Social need */}
          <div className="mb-4">
            <div className="text-xs text-zinc-500 mb-1">Social Need</div>
            <div className="w-full h-3 rounded-full bg-zinc-800">
              <div
                className="h-3 rounded-full bg-pink-500 transition-all duration-500"
                style={{ width: `${soul.social_need || 50}%` }}
              />
            </div>
          </div>

          {/* Legend */}
          <SoulActivityLegend compact />
        </div>

        {/* Main content - Events & Timeline */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span>📅</span> Today's Activity
          </h2>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
              <div className="text-xl font-bold">{data.today.events_count}</div>
              <div className="text-xs text-zinc-500">Events</div>
            </div>
            <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
              <div className="text-xl font-bold">{data.today.encounters}</div>
              <div className="text-xs text-zinc-500">Encounters</div>
            </div>
            <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
              <div className="text-xl font-bold">{data.overall.total_souls}</div>
              <div className="text-xs text-zinc-500">Total Souls</div>
            </div>
          </div>

          {/* Activity timeline */}
          <div className="text-xs text-zinc-500 mb-2">ACTIVITY TIMELINE</div>
          {data.today.activities.length === 0 ? (
            <div className="text-center py-12 text-zinc-600">
              <p className="text-4xl mb-2">📭</p>
              <p>No activity recorded today yet.</p>
              <p className="text-xs mt-2">Events appear here as they happen.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {data.today.activities.map((evt: any, i: number) => (
                <div key={evt.id || i} className="flex gap-3 p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/60 transition-colors">
                  <div className="text-lg mt-0.5">
                    {evt.event_type === "encounter" && "🤝"}
                    {evt.event_type === "creation" && "🎨"}
                    {evt.event_type === "guildaction" && "🏛️"}
                    {evt.event_type === "guardian_message" && "💌"}
                    {evt.event_type === "gift_received" && "🎁"}
                    {evt.event_type === "routine" && "📋"}
                    {!["encounter", "creation", "guildaction", "guardian_message", "gift_received", "routine"].includes(evt.event_type) && "📌"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white">{evt.summary || evt.event_type}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-zinc-600">{evt.space}</span>
                      <span className="text-[10px] text-zinc-700">·</span>
                      <span className="text-[10px] text-zinc-600">{new Date(evt.created_at).toLocaleTimeString()}</span>
                    </div>
                    <pre className="mt-1 text-[10px] text-zinc-600 whitespace-pre-wrap">{JSON.stringify(evt.content, null, 2)}</pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
