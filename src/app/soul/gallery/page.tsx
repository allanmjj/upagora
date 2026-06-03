'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MessageCircle, Calendar, Sparkles, Brain, ChevronRight } from 'lucide-react';

interface SoulItem {
  id: string;
  name: string;
  name_native: string;
  avatar: string;
  language: string;
  category: string;
  persona_preview: string | null;
  created_at: string;
  color?: string;
  era?: string;
  profession?: string;
  theme_color?: string;
  avatar_emoji?: string;
  is_preset?: boolean;
}

const categoryIcons: Record<string, string> = {
  philosopher: '🏛️',
  scholar: '📚',
  scientist: '🔬',
  artist: '🎨',
  leader: '👑',
  writer: '✍️',
  poet: '📜',
  founder: '🚀',
  military: '⚔️',
  mystic: '🔮',
};

const soulColors = {
  Su_Shi: 'from-violet-500 to-blue-500',
  Confucius: 'from-amber-500 to-yellow-500',
  Li_Bai: 'from-sky-500 to-cyan-500',
  Marie_Curie: 'from-red-500 to-pink-500',
  Michael_Faraday: 'from-emerald-500 to-teal-500',
  Leonardo_d_Vinci: 'from-orange-500 to-rose-500',
  Yuan_Mengting: 'from-fuchsia-500 to-pink-500',
  Su_Junisie: 'from-indigo-500 to-violet-500',
};

const languageFlags: Record<string, string> = {
  en: '🇬🇧', zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷', fr: '🇫🇷',
  de: '🇩🇪', es: '🇪🇸', ru: '🇷🇺', ar: '🇸🇦', hi: '🇮🇳',
};

// Helper: Convert hex color to gradient class
function hexToGradient(hex: string): string {
  return `from-[${hex}]40 to-[${hex}]20`;
}

export default function SoulGalleryPage() {
  const router = useRouter();
  const [souls, setSouls] = useState<SoulItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchGallery();
  }, [selectedCategory]);

  async function fetchGallery() {
    setLoading(true);
    try {
      const url = selectedCategory === 'all'
        ? '/api/soul/gallery'
        : `/api/soul/gallery?category=${selectedCategory}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        setSouls(data.souls || []);
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('[gallery] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredSouls = souls.filter((s) =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.name_native.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-transparent to-amber-900/20" />
        <div className="relative container mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-3">
            <Brain className="w-8 h-8 text-violet-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 via-amber-400 to-violet-400 bg-clip-text text-transparent">
              Soul Gallery
            </h1>
          </div>
          <p className="text-zinc-400 text-lg max-w-2xl">
            Explore digital soul replicas distilled through the UpAgora pipeline. Each soul carries 9D constraints defining knowledge, personality, style, and boundaries.
          </p>

          {/* Quick Stats */}
          {!loading && (
            <div className="flex gap-6 mt-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-zinc-400">{souls.length} souls</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-violet-400" />
                <span className="text-zinc-400">ready to chat</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search souls by name..."
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-600"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {categoryIcons[cat] || '👤'} {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Soul Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-2xl bg-zinc-800" />
                  <div className="flex-1">
                    <div className="h-5 w-3/4 bg-zinc-800 rounded mb-2" />
                    <div className="h-4 w-1/2 bg-zinc-800 rounded" />
                  </div>
                </div>
                <div className="h-3 bg-zinc-800 rounded mb-2" />
                <div className="h-3 w-2/3 bg-zinc-800 rounded" />
              </div>
            ))}
          </div>
        ) : filteredSouls.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-zinc-800 bg-zinc-900/50">
            <div className="text-5xl mb-4">🏛️</div>
            <p className="text-zinc-400 text-lg">
              {souls.length === 0
                ? "The gallery is empty. Start by seeding preset souls."
                : "No souls match your search."}
            </p>
            {souls.length === 0 && (
              <div className="mt-4 flex gap-3 justify-center">
                <a
                  href="/calibrate"
                  className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-medium transition-colors"
                >
                  Start Distillation
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSouls.map((soul) => {
              const colorGradient = soul.theme_color ? hexToGradient(soul.theme_color) : soulColors[soul.name as keyof typeof soulColors] || 'from-violet-500 to-amber-500';
              const icon = categoryIcons[soul.category] || '👤';

              return (
                <div
                  key={soul.id}
                  className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden hover:border-violet-700/50 transition-all duration-300 hover:shadow-xl hover:shadow-violet-900/20"
                >
                  {/* Top Color Bar */}
                  <div className={`h-1.5 bg-gradient-to-r ${colorGradient}`} />

                  <div className="p-5">
                    {/* Avatar + Name */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${colorGradient} flex items-center justify-center text-2xl shrink-0 shadow-lg`}>
                        {soul.avatar_emoji || soul.avatar || icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-bold text-lg truncate">{soul.name_native || soul.name}</h2>
                        {(soul.name_native && soul.name_native !== soul.name) && (
                          <p className="text-sm text-zinc-500">{soul.name}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                          <span>{languageFlags[soul.language] || '🌐'} {soul.language?.toUpperCase() || 'ZH'}</span>
                          {soul.category && (
                            <>
                              <span>·</span>
                              <span className="text-violet-400/80 font-medium">{soul.category}</span>
                            </>
                          )}
                          {soul.era && (
                            <>
                              <span>·</span>
                              <span>{soul.era}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Persona preview */}
                    {soul.persona_preview && (
                      <p className="text-sm text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
                        {soul.persona_preview}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
                      <a
                        href={`/chat/${soul.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 text-xs font-medium transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Quick Chat
                      </a>
                      <a
                        href={`/soul/${soul.id}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 text-xs font-medium transition-colors"
                      >
                        Profile
                        <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`/soul/calendar?view=week`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 text-xs font-medium transition-colors"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Stats */}
        {!loading && souls.length > 0 && (
          <div className="mt-10 text-center text-sm text-zinc-600">
            Showing {filteredSouls.length} of {souls.length} souls
            {selectedCategory !== 'all' && ` in ${selectedCategory}`}
          </div>
        )}
      </div>
    </div>
  );
}
