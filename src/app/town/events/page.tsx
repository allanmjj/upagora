"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, Users, AlertTriangle, CheckCircle, XCircle, Loader2, ArrowRight, Sparkles, Zap, ChevronLeft, ChevronRight } from "lucide-react";

interface TownEvent {
  id: string;
  title: string;
  description: string;
  type: "festival" | "meeting" | "crisis" | "ceremony" | "trade" | "story";
  status: "upcoming" | "active" | "completed" | "cancelled";
  scheduled_at?: string;
  ends_at?: string;
  location?: string;
  participants?: number;
  souls_involved?: string[];
  created_by?: string;
  tags?: string[];
}

const EVENT_TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  festival: { icon: Sparkles, color: "text-purple-400", label: "Festival" },
  meeting: { icon: Users, color: "text-blue-400", label: "Meeting" },
  crisis: { icon: AlertTriangle, color: "text-red-400", label: "Crisis" },
  ceremony: { icon: Zap, color: "text-amber-400", label: "Ceremony" },
  trade: { icon: MapPin, color: "text-green-400", label: "Trade" },
  story: { icon: Sparkles, color: "text-indigo-400", label: "Story" },
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  upcoming: { color: "text-blue-400", label: "Upcoming" },
  active: { color: "text-green-400", label: "Active Now" },
  completed: { color: "text-zinc-400", label: "Completed" },
  cancelled: { color: "text-red-400", label: "Cancelled" },
};

export default function TownEventsPage() {
  const [events, setEvents] = useState<TownEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/town/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = useMemo(() => {
    let result = [...events];
    if (statusFilter !== "all") {
      result = result.filter((e) => e.status === statusFilter);
    }
    if (typeFilter !== "all") {
      result = result.filter((e) => e.type === typeFilter);
    }
    result.sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1;
      if (b.status === "active" && a.status !== "active") return 1;
      const dA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const dB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
      return dB - dA;
    });
    return result;
  }, [events, statusFilter, typeFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-4" />
        <p className="text-zinc-400">Loading town events...</p>
      </div>
    );
  }

  const activeCount = events.filter((e) => e.status === "active").length;
  const upcomingCount = events.filter((e) => e.status === "upcoming").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="border-b border-zinc-800 bg-gradient-to-b from-purple-500/5 to-transparent">
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Calendar className="h-8 w-8 text-purple-400" />
                Town Events
              </h1>
              <p className="text-lg text-zinc-400">Happening now and upcoming in the town.</p>
            </div>
            <Link href="/town" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-900 hover:border-zinc-600 transition-colors">
              <ChevronLeft className="h-4 w-4" />
              Back to Town
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{activeCount}</div>
            <div className="text-xs text-zinc-500">Active Now</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{upcomingCount}</div>
            <div className="text-xs text-zinc-500">Upcoming</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <div className="text-2xl font-bold text-white">{events.length}</div>
            <div className="text-xs text-zinc-500">Total Events</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{events.filter((e) => e.souls_involved?.length).reduce((s, e) => s + (e.souls_involved?.length || 0), 0)}</div>
            <div className="text-xs text-zinc-500">Souls Involved</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-zinc-500 self-center">Status:</span>
            {["all", "active", "upcoming", "completed", "cancelled"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  statusFilter === s
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/50"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                }`}
              >
                {s === "all" ? "All" : STATUS_CONFIG[s]?.label || s}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-zinc-500 self-center">Type:</span>
            {["all", "festival", "meeting", "crisis", "ceremony", "trade", "story"].map((t) => {
              const cfg = EVENT_TYPE_CONFIG[t];
              if (!cfg && t !== "all") return null;
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    typeFilter === t
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/50"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  {t === "all" ? "All" : cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Events List */}
        {filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((event) => {
              const typeCfg = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.story;
              const TypeIcon = typeCfg.icon;
              const statusCfg = STATUS_CONFIG[event.status] || STATUS_CONFIG.completed;
              return (
                <Link
                  key={event.id}
                  href={`/town/events/${event.id}`}
                  className={`block rounded-2xl border p-6 transition-all ${
                    event.status === "active"
                      ? "border-purple-500/50 bg-purple-500/5 hover:bg-purple-500/10"
                      : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${typeCfg.color.replace("text-", "bg-")}/10`}>
                      <TypeIcon className={`h-6 w-6 ${typeCfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-white text-lg">{event.title}</h3>
                        <span className={`text-xs font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
                      </div>
                      <p className="text-sm text-zinc-400 line-clamp-2 mb-3">{event.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                        {event.scheduled_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(event.scheduled_at).toLocaleString()}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                        )}
                        {event.participants != null && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {event.participants} participants
                          </span>
                        )}
                        {event.souls_involved && event.souls_involved.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            {event.souls_involved.length} soul(s)
                          </span>
                        )}
                      </div>
                      {event.tags && event.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {event.tags.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-400">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-zinc-600 flex-shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-xl font-semibold text-zinc-300 mb-2">
              {statusFilter !== "all" ? "No events match your filter" : "No events yet"}
            </h3>
            <p className="text-zinc-500 mb-6">Events will appear here as they happen in town.</p>
            <Link href="/town" className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition-colors">
              <Sparkles className="h-4 w-4" />
              Explore Town
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
