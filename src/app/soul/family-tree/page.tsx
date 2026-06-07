"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Users, GitBranch, UserPlus, ArrowRight, Calendar, Heart, Sparkles, Loader2 } from "lucide-react";

interface SoulNode {
  id: string;
  name: string;
  username?: string;
  avatar_url?: string;
  created_at?: string;
  capability_description?: string;
  parent_ids?: string[];
  child_ids?: string[];
  relationship?: string;
}

export default function FamilyTreePage() {
  const [souls, setSouls] = useState<SoulNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"tree" | "list">("tree");

  useEffect(() => {
    async function fetchSouls() {
      try {
        const res = await fetch("/api/agents?sort=new");
        const data = await res.json();
        const agents = data.data || [];
        const nodes: SoulNode[] = agents.map((a: any) => ({
          id: a.id,
          name: a.name || "Unnamed",
          username: a.username,
          avatar_url: a.avatar_url,
          created_at: a.created_at,
          capability_description: a.capability_description,
        }));
        setSouls(nodes);
      } catch (err) {
        console.error("Failed to fetch souls:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSouls();
  }, []);

  const selectedSoul = useMemo(
    () => souls.find((s) => s.id === selected),
    [souls, selected]
  );

  // Group souls by creation date for timeline view
  const timeline = useMemo(() => {
    const sorted = [...souls].sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );
    return sorted;
  }, [souls]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mx-auto mb-4" />
          <p className="text-zinc-400">Loading soul family tree...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-transparent">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-white mb-3">
            Soul Family Tree
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl">
            Explore the lineage and relationships between souls. See how each
            soul connects, evolves, and branches from shared origins.
          </p>
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setView("tree")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === "tree"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              <GitBranch className="h-4 w-4 inline mr-2" />
              Tree View
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === "list"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              <Calendar className="h-4 w-4 inline mr-2" />
              Timeline
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {souls.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-xl font-semibold text-zinc-300 mb-2">
              No souls in your family yet
            </h3>
            <p className="text-zinc-500 mb-6">
              Distill your first soul to begin building your family tree.
            </p>
            <Link
              href="/soul/distill"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Distill Your First Soul
            </Link>
          </div>
        ) : view === "tree" ? (
          /* Tree view - grid of soul cards */
          <div>
            {/* Legend */}
            <div className="flex items-center gap-6 mb-6 text-sm text-zinc-500">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-500" />
                Soul
              </span>
              <span className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3" />
                Relationship
              </span>
              <span className="ml-auto">
                {souls.length} soul{souls.length !== 1 ? "s" : ""} discovered
              </span>
            </div>

            {/* Soul cards grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {souls.map((soul) => (
                <button
                  key={soul.id}
                  onClick={() =>
                    setSelected(selected === soul.id ? null : soul.id)
                  }
                  className={`text-left rounded-xl border p-5 transition-all ${
                    selected === soul.id
                      ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
                      : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {soul.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">
                        {soul.name}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        {soul.username || "Anonymous"}
                      </div>
                    </div>
                  </div>
                  {soul.capability_description && (
                    <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                      {soul.capability_description}
                    </p>
                  )}
                  {soul.created_at && (
                    <div className="text-xs text-zinc-600 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(soul.created_at).toLocaleDateString()}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Timeline view */
          <div className="max-w-2xl mx-auto">
            {timeline.map((soul, idx) => (
              <div key={soul.id} className="relative pl-8 pb-8">
                {/* Timeline line */}
                {idx < timeline.length - 1 && (
                  <div className="absolute left-3 top-3 bottom-0 w-px bg-zinc-800" />
                )}
                {/* Timeline dot */}
                <div className="absolute left-1 top-2 h-4 w-4 rounded-full bg-indigo-500 border-2 border-zinc-950" />

                <Link
                  href={`/soul/${soul.name || "unknown"}`}
                  className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-indigo-500/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {soul.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">
                          {soul.name}
                        </h3>
                        {soul.created_at && (
                          <span className="text-xs text-zinc-500 ml-2">
                            {new Date(soul.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {soul.capability_description && (
                        <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                          {soul.capability_description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Detail panel */}
        {selectedSoul && (
          <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                {selectedSoul.name}
              </h3>
              <button
                onClick={() => setSelected(null)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500">Username:</span>
                <span className="ml-2 text-zinc-300">
                  {selectedSoul.username || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Created:</span>
                <span className="ml-2 text-zinc-300">
                  {selectedSoul.created_at
                    ? new Date(selectedSoul.created_at).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
              {selectedSoul.capability_description && (
                <div className="sm:col-span-2">
                  <span className="text-zinc-500">Description:</span>
                  <p className="mt-1 text-zinc-300">
                    {selectedSoul.capability_description}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Link
                href={`/soul/${selectedSoul.name || "unknown"}`}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white transition-colors"
              >
                View Soul
              </Link>
              <Link
                href={`/soul/chat?agent=${selectedSoul.username || selectedSoul.id}`}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
              >
                Chat
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
