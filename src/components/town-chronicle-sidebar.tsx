"use client";

import { useEffect, useState, useRef } from "react";

interface ChronicleEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  epoch_date: string;
  icon: string;
  timestamp: string;
  space?: string;
  participants?: string[];
}

interface ChronicleStats {
  total_events: number;
  encounters: number;
  creations: number;
}

function typeLabel(type: string): { text: string; bg: string } {
  const labels: Record<string, { text: string; bg: string }> = {
    era: { text: "Era", bg: "text-violet-300 bg-violet-900/30" },
    season: { text: "Season", bg: "text-emerald-300 bg-emerald-900/30" },
    "soul-arrival": { text: "Arrival", bg: "text-amber-300 bg-amber-900/30" },
    arrival: { text: "Arrival", bg: "text-amber-300 bg-amber-900/30" },
    encounter: { text: "Encounter", bg: "text-blue-300 bg-blue-900/30" },
    conversation: { text: "Chat", bg: "text-sky-300 bg-sky-900/30" },
    creation: { text: "Creation", bg: "text-rose-300 bg-rose-900/30" },
    "guardian-visit": { text: "Visit", bg: "text-indigo-300 bg-indigo-900/30" },
    visit: { text: "Visit", bg: "text-indigo-300 bg-indigo-900/30" },
    routine: { text: "Routine", bg: "text-orange-300 bg-orange-900/30" },
  };
  return labels[type] || { text: "Event", bg: "text-zinc-300 bg-zinc-900/30" };
}

function ChronicleEntry({ event, isLatest }: { event: ChronicleEvent; isLatest: boolean }) {
  const label = typeLabel(event.type);
  return (
    <div className="relative pl-5 pb-5">
      <div className="absolute left-0 top-1 bottom-0">
        <div className="absolute left-2.5 top-1.5 bottom-0 w-px bg-zinc-800" />
        <div
          className="absolute left-1.5 top-1 w-3 h-3 rounded-full border-2 bg-zinc-900"
          style={{
            borderColor: isLatest ? "#f59e0b" : "#3f3f46",
            backgroundColor: isLatest ? "#f59e0b20" : "transparent",
          }}
        />
      </div>
      <div className="flex items-start gap-3">
        <span className="text-base mt-0.5">{event.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${label.bg}`}>
              {label.text}
            </span>
            {event.space && (
              <span className="text-[10px] text-zinc-600">• {event.space}</span>
            )}
            <span className="text-[10px] text-zinc-600 ml-auto">{event.epoch_date}</span>
          </div>
          <h4 className="text-[13px] font-semibold text-zinc-200 leading-tight">{event.title}</h4>
          {event.description && (
            <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{event.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function EraChronicle({ onClose }: { onClose?: () => void }) {
  const [events, setEvents] = useState<ChronicleEvent[]>([]);
  const [stats, setStats] = useState<ChronicleStats>({ total_events: 0, encounters: 0, creations: 0 });
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchChronicle = async () => {
      try {
        const res = await fetch(`/api/town/chronicle?limit=50&type=${filter}`);
        const data = await res.json();
        if (data.chronicle) {
          setEvents(data.chronicle);
          if (data.stats) setStats(data.stats);
        }
      } catch (e) {
        console.error("Failed to fetch chronicle:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchChronicle();
    // Refresh every 60 seconds
    const iv = setInterval(fetchChronicle, 60000);
    return () => clearInterval(iv);
  }, [filter]);

  const filters = [
    { key: "all", label: "All", icon: "📋" },
    { key: "era", label: "Era", icon: "🌅" },
    { key: "season", label: "Season", icon: "🌸" },
    { key: "arrival", label: "Arrivals", icon: "✨" },
    { key: "encounter", label: "Encounters", icon: "🤝" },
    { key: "creation", label: "Creations", icon: "🎨" },
    { key: "visit", label: "Visits", icon: "👤" },
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h2 className="text-white font-bold flex items-center gap-2 text-sm">
          <span>📜</span> Epoch Chronicle
        </h2>
        {onClose && (
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-sm">
            ✕
          </button>
        )}
      </div>

      {/* Stats */}
      {stats.total_events > 0 && (
        <div className="flex gap-3 px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500">
          <span>📊 {stats.total_events} events</span>
          <span>🤝 {stats.encounters} encounters</span>
          <span>🎨 {stats.creations} creations</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-zinc-800">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-[11px] px-2 py-1 rounded-full transition-colors ${
              filter === f.key
                ? "bg-zinc-700 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className="mr-0.5">{f.icon}</span>
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm text-zinc-600">
            Loading chronicle...
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-sm text-zinc-600">
            <p className="text-2xl mb-2">📜</p>
            <p>The chronicle is empty.</p>
            <p className="text-xs text-zinc-700 mt-1">Events will appear here as souls interact.</p>
          </div>
        ) : (
          events.map((event, i) => (
            <ChronicleEntry key={event.id} event={event} isLatest={i === 0} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
