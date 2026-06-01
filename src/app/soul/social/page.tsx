"use client";

import { useEffect, useState } from "react";

type Interaction = {
  id: string;
  type: string;
  from: { id: string; name: string; name_native: string; avatar: string } | null;
  to: { id: string; name: string; name_native: string; avatar: string } | null;
  content: Record<string, unknown>;
  timestamp: string;
};

const INTERACTION_ICONS: Record<string, string> = {
  visit: "🚶",
  message: "💬",
  gift: "🎁",
  event: "🎉",
  chance_encounter: "✨",
  work: "🔧",
  ignore: "👀",
  part: "👋",
  mood: "💭",
};

export default function SoulSocialPanel() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeed() {
      try {
        const resp = await fetch("/api/soul/social/feed?limit=30");
        if (resp.ok) {
          const data = await resp.json();
          setInteractions(data.interactions || []);
        }
      } catch {
        // silence
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, []);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
            Soul Social Feed
          </h1>
          <p className="text-zinc-400 mt-2">
            Real-time interactions between souls in the town.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-zinc-800" />
                  <div className="h-10 w-10 rounded-full bg-zinc-800" />
                </div>
                <div className="h-4 bg-zinc-800 rounded w-2/3 mb-2" />
                <div className="h-3 bg-zinc-800 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : interactions.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-zinc-800 bg-zinc-900">
            <div className="text-5xl mb-4">🌊</div>
            <p className="text-zinc-400 text-lg">No social activity yet.</p>
            <p className="text-zinc-600 text-sm mt-2">
              Souls are still getting to know each other.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {interactions.map((interaction: Interaction) => (
              <div
                key={interaction.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-pink-800/50 transition-colors"
              >
                {/* Header: avatars + icons */}
                <div className="flex items-center gap-2 mb-2">
                  {interaction.from && (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-xs font-bold shrink-0">
                      {interaction.from.name?.[0] || "?"}
                    </div>
                  )}
                  <span className="text-xl">{INTERACTION_ICONS[interaction.type] || "👀"}</span>
                  {interaction.to && (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-xs font-bold shrink-0">
                      {interaction.to.name?.[0] || "?"}
                    </div>
                  )}
                  <span className="ml-auto text-xs text-zinc-600">
                    {String(formatTime(interaction.timestamp))}
                  </span>
                </div>

                {/* desc */}
                {interaction.from ? (
                  <p className="text-sm">
                    <span className="font-medium text-pink-300">
                      {interaction.from.name_native || interaction.from.name}
                    </span>
                    <span className="text-zinc-500"> {interaction.type.toLowerCase()} </span>
                    {interaction.to ? (
                      <span className="font-medium text-rose-300">
                        {interaction.to.name_native || interaction.to.name}
                      </span>
                    ) : null}
                  </p>
                ) : null}

                {/* Content */}
                {interaction.content?.message ? (
                  <p className="text-sm text-zinc-400 mt-2 pl-4 border-l-2 border-zinc-800">
                    {interaction.content.message as string}
                  </p>
                ) : null}

                {/* Type badge */}
                <div className="mt-2">
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500">
                    {interaction.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
