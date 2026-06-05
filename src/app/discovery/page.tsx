"use client";

import { useEffect, useState } from "react";
import { logger } from '@/lib/logger';
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface Soul {
  id: string;
  name: string;
  name_native: string;
  avatar: string;
  language: string;
  category?: string;
  mood?: string;
  energy?: number;
  social_need?: number;
  is_online?: boolean;
  last_activity?: string;
  total_events?: number;
  guardian_count?: number;
}

const MOOD_EMOJIS: Record<string, string> = {
  happy: "😊", calm: "😌", melancholic: "😔", anxious: "😟", inspired: "✨",
};

export default function SoulDiscoveryPage() {
  const router = useRouter();
  const [souls, setSouls] = useState<Soul[]>([]);
  const [featuredSouls, setFeaturedSouls] = useState<Soul[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("activity");

  useEffect(() => {
    async function loadSouls() {
      try {
        // Load all souls with town state
        const { data: soulsData } = await supabase
          .from("soul_extraction_results")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        // Load town states
        const { data: townStates } = await supabase
          .from("soul_states")
          .select("*");

        // Load guardian counts
        const { data: guardianCounts } = await supabase
          .from("soul_guardians")
          .select("soul_id")
          .not("accepted_at", "is", null);

        // Load event counts
        const { data: eventCounts } = await supabase
          .from("town_events")
          .select("id, participants");

        // Combine data
        const soulsWithState = (soulsData || []).map((soul) => {
          const state = townStates?.find(s => s.soul_id === soul.id);
          const guardianCount = guardianCounts?.filter(g => g.soul_id === soul.id).length || 0;
          const totalEvents = eventCounts?.filter(e => e.participants?.includes(soul.id)).length || 0;

          return {
            id: soul.id,
            name: soul.name,
            name_native: soul.name_native || soul.name,
            avatar: soul.avatar || "🧑",
            language: soul.language || "en",
            category: soul.category || "citizen",
            mood: state?.mood,
            energy: state?.energy,
            social_need: state?.social_need,
            is_online: state?.is_in_town || false,
            last_activity: state?.updated_at,
            total_events: totalEvents,
            guardian_count: guardianCount,
          };
        });

        setSouls(soulsWithState);
        setFeaturedSouls(soulsWithState.slice(0, 5));
      } catch (e) {
        logger.error("Failed to load souls:", e);
      } finally {
        setLoading(false);
      }
    }

    loadSouls();
  }, []);

  const filteredSouls = souls
    .filter(soul => {
      if (filter !== "all" && filter !== soul.category) return false;
      if (searchTerm && !soul.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "activity") return (b.total_events || 0) - (a.total_events || 0);
      if (sortBy === "energy") return (b.energy || 0) - (a.energy || 0);
      if (sortBy === "guardians") return (b.guardian_count || 0) - (a.guardian_count || 0);
      return 0;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-zinc-400 animate-pulse">Loading souls...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">🌟 Soul Discovery</h1>
          <span className="text-sm text-zinc-400">Explore {souls.length} souls</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/town")}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
          >
            🌆 View Town
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-6">
        {/* Search & Filter Bar */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search souls..."
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm"
          >
            <option value="all">All Categories</option>
            <option value="poet">Poets</option>
            <option value="scientist">Scientists</option>
            <option value="philosopher">Philosophers</option>
            <option value="artist">Artists</option>
            <option value="citizen">Citizens</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm"
          >
            <option value="activity">Sort by Activity</option>
            <option value="energy">Sort by Energy</option>
            <option value="guardians">Sort by Guardians</option>
          </select>
        </div>

        {/* Featured Souls */}
        {featuredSouls.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-bold">✨ Featured Souls</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {featuredSouls.map((soul) => (
                <div
                  key={soul.id}
                  className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-indigo-500 hover:bg-zinc-800"
                  onClick={() => router.push(`/profile/${soul.id}`)}
                >
                  <div className="mb-2 text-center text-3xl">{soul.avatar}</div>
                  <div className="text-center">
                    <div className="font-medium">{soul.name}</div>
                    <div className="text-xs text-zinc-400">{MOOD_EMOJIS[soul.mood || 'calm']} {soul.mood || 'calm'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Soul Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSouls.map((soul) => (
            <div
              key={soul.id}
              className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-indigo-500 hover:bg-zinc-800"
              onClick={() => router.push(`/profile/${soul.id}`)}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="text-4xl">{soul.avatar}</div>
                <div className="flex items-center gap-2">
                  {soul.is_online && (
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                  )}
                  <span className="text-xs text-zinc-400 capitalize">{soul.category}</span>
                </div>
              </div>

              <h3 className="mb-1 font-bold">{soul.name}</h3>
              <div className="mb-3 text-sm text-zinc-400">{soul.name_native}</div>

              <div className="mb-3 space-y-2">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                    <span>Mood</span>
                    <span>{MOOD_EMOJIS[soul.mood || 'calm']} {soul.mood || 'calm'}</span>
                  </div>
                </div>
                
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                    <span>Energy</span>
                    <span>{soul.energy || 0}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-800">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                      style={{ width: `${soul.energy || 0}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                    <span>Social Energy</span>
                    <span>{soul.social_need || 0}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-800">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-400"
                      style={{ width: `${soul.social_need || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>{soul.total_events || 0} events</span>
                <span>{soul.guardian_count || 0} guardians</span>
              </div>
            </div>
          ))}
        </div>

        {filteredSouls.length === 0 && (
          <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
            <div className="mb-4 text-4xl">🔍</div>
            <p className="text-zinc-400">No souls found matching your criteria.</p>
            <Link href="/town/external/register" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300">
              Register a new soul →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
