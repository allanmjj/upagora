"use client";

import { useEffect, useState } from "react";

interface SoulItem {
  id: string;
  name: string;
  name_native: string;
  avatar: string;
  language: string;
  category: string;
  persona_preview: string | null;
  created_at: string;
}

export default function SoulGalleryPage() {
  const [souls, setSouls] = useState<SoulItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchGallery();
  }, [selectedCategory]);

  async function fetchGallery() {
    setLoading(true);
    try {
      const url = selectedCategory === "all"
        ? "/api/soul/gallery"
        : `/api/soul/gallery?category=${selectedCategory}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        setSouls(data.souls || []);
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("[gallery] Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredSouls = souls.filter((s) =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.name_native.toLowerCase().includes(search.toLowerCase())
  );

  const languageFlags: Record<string, string> = {
    en: "🇬🇧", zh: "🇨🇳", ja: "🇯🇵", ko: "🇰🇷", fr: "🇫🇷",
    de: "🇩🇪", es: "🇪🇸", ru: "🇷🇺", ar: "🇸🇦", hi: "🇮🇳",
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-amber-400 bg-clip-text text-transparent">
            Soul Gallery
          </h1>
          <p className="text-zinc-400 mt-2">
            Explore the digital soul replicas created through the distillation pipeline.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search souls..."
            className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-600"
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Soul Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-14 w-14 rounded-full bg-zinc-800" />
                  <div className="flex-1">
                    <div className="h-5 w-3/4 bg-zinc-800 rounded mb-2" />
                    <div className="h-4 w-1/2 bg-zinc-800 rounded" />
                  </div>
                </div>
                <div className="h-4 bg-zinc-800 rounded mb-2" />
                <div className="h-4 w-2/3 bg-zinc-800 rounded" />
              </div>
            ))}
          </div>
        ) : filteredSouls.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-zinc-800 bg-zinc-900">
            <div className="text-5xl mb-4">🏛️</div>
            <p className="text-zinc-400 text-lg">
              {souls.length === 0
                ? "The gallery is empty. Start by extracting a soul."
                : "No souls match your search."}
            </p>
            {souls.length === 0 && (
              <a
                href="/calibrate"
                className="mt-4 inline-block text-violet-400 hover:text-violet-300 underline"
              >
                Go to Guardian Calibration →
              </a>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSouls.map((soul) => (
              <div
                key={soul.id}
                className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-6 hover:border-violet-700/50 transition-all hover:shadow-lg hover:shadow-violet-900/20"
              >
                {/* Avatar + Name */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-amber-500 flex items-center justify-center text-xl font-bold shrink-0">
                    {soul.name_native?.[0] || soul.name?.[0] || "?"}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-lg truncate">{soul.name}</h2>
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <span>{languageFlags[soul.language] || "🌐"} {soul.language.toUpperCase()}</span>
                      {soul.category && (
                        <>
                          <span>·</span>
                          <span className="text-violet-400/80">{soul.category}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Native name */}
                {soul.name_native && soul.name_native !== soul.name && (
                  <p className="text-sm text-zinc-500 mb-3">{soul.name_native}</p>
                )}

                {/* Persona preview */}
                {soul.persona_preview && (
                  <p className="text-sm text-zinc-400 line-clamp-3 mb-4">
                    {soul.persona_preview}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                  <span className="text-xs text-zinc-600">
                    {new Date(soul.created_at).toLocaleDateString()}
                  </span>
                  <a
                    href={`/soul/${soul.id}`}
                    className="text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors"
                  >
                    Explore →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {!loading && souls.length > 0 && (
          <div className="mt-12 text-center text-sm text-zinc-600">
            Showing {filteredSouls.length} of {souls.length} souls
          </div>
        )}
      </div>
    </div>
  );
}
