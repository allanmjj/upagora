"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Sparkles, TrendingUp, Clock, Star, Zap, Flame, Compass, Eye, Loader2, ArrowRight, Brain } from "lucide-react";

interface SoulOption {
  id: string;
  name: string;
  username: string;
  capability_description?: string;
  capabilities?: string[];
  avg_rating?: number;
  review_count?: number;
  invocation_count?: number;
  is_verified?: boolean;
  created_at?: string;
}

export default function DiscoverPage() {
  const [souls, setSouls] = useState<SoulOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"trending" | "new" | "top_rated">("trending");

  useEffect(() => {
    async function fetchSouls() {
      try {
        const [trendingRes, newRes, ratedRes] = await Promise.all([
          fetch("/api/agents?sort=popular"),
          fetch("/api/agents?sort=new"),
          fetch("/api/agents?sort=rating"),
        ]);
        const [trendingData, newData, ratedData] = await Promise.all([
          trendingRes.json(),
          newRes.json(),
          ratedRes.json(),
        ]);
        // Merge all souls, deduplicate by id
        const allSouls = new Map<string, SoulOption>();
        [...(trendingData.data || []), ...(newData.data || []), ...(ratedData.data || [])].forEach((s: any) => {
          if (!allSouls.has(s.id)) {
            allSouls.set(s.id, s);
          }
        });
        setSouls(Array.from(allSouls.values()));
      } catch (err) {
        console.error("Failed to fetch souls:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSouls();
  }, []);

  const trending = useMemo(
    () => [...souls].sort((a, b) => (b.invocation_count || 0) - (a.invocation_count || 0)).slice(0, 6),
    [souls]
  );

  const newest = useMemo(
    () =>
      [...souls]
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 6),
    [souls]
  );

  const topRated = useMemo(
    () =>
      [...souls]
        .filter((s) => (s.review_count || 0) > 0)
        .sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
        .slice(0, 6),
    [souls]
  );

  const featured = useMemo(() => {
    return [...souls]
      .filter((s) => s.is_verified)
      .slice(0, 3);
  }, [souls]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mx-auto mb-4" />
          <p className="text-zinc-400">Discovering souls...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Hero */}
      <div className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-transparent">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-white mb-3 flex items-center gap-3">
            <Compass className="h-8 w-8 text-indigo-400" />
            Discover
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl">
            Explore trending, new, and top-rated souls from the UpAgora community.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Featured Souls */}
        {featured.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Flame className="h-6 w-6 text-amber-400" />
              Featured Souls
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map((soul) => (
                <Link
                  key={soul.id}
                  href={`/soul/${soul.name || "unknown"}`}
                  className="group block rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-6 hover:border-amber-500/50 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl font-bold">
                      {soul.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white group-hover:text-amber-300 transition-colors">
                        {soul.name}
                      </h3>
                      <p className="text-xs text-zinc-500">{soul.username}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-amber-400 ml-auto transition-colors" />
                  </div>
                  {soul.capability_description && (
                    <p className="text-sm text-zinc-400 line-clamp-2">{soul.capability_description}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: "trending", label: "Trending", icon: TrendingUp },
            { key: "new", label: "New Arrivals", icon: Clock },
            { key: "top_rated", label: "Top Rated", icon: Star },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === tab.key
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Soul Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(activeTab === "trending" ? trending : activeTab === "new" ? newest : topRated).map((soul, idx) => (
            <Link
              key={soul.id}
              href={`/soul/${soul.name || "unknown"}`}
              className="group block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-indigo-500/50 hover:bg-zinc-900/80 transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {soul.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
                    {soul.name}
                  </div>
                  <div className="text-xs text-zinc-500">{soul.username || "Anonymous"}</div>
                </div>
              </div>

              {soul.capability_description && (
                <p className="text-sm text-zinc-400 line-clamp-2 mb-3">{soul.capability_description}</p>
              )}

              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-zinc-500 border-t border-zinc-800 pt-3">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {soul.avg_rating?.toFixed(1) || "0.0"}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {soul.invocation_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  #{idx + 1}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {(activeTab === "trending" ? trending : activeTab === "new" ? newest : topRated).length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center mt-8">
            <Brain className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-xl font-semibold text-zinc-300 mb-2">No souls to discover yet</h3>
            <p className="text-zinc-500 mb-6">Be the first to distill a soul.</p>
            <Link
              href="/soul/distill"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Distill a Soul
            </Link>
          </div>
        )}

        {/* Browse More */}
        <div className="mt-12 text-center">
          <Link
            href="/soul/marketplace"
            className="inline-flex items-center gap-2 px-6 py-3 border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors"
          >
            Browse All Souls
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
