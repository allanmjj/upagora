'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, Star, Zap, TrendingUp, Filter, Loader2, ArrowUpRight, Brain } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

export default function SoulMarketplacePage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const params = new URLSearchParams({ q: search, sort, category });
        const res = await fetch(`/api/soul/marketplace?${params}`);
        const data = await res.json();
        setListings(data.listings || []);
      } catch (err) {
        console.error('Failed to fetch marketplace:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchListings, 300);
    return () => clearTimeout(timer);
  }, [search, sort, category]);

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    listings.forEach(l => {
      (l.capabilities || []).forEach((c: string) => cats.add(c));
    });
    return Array.from(cats).sort();
  }, [listings]);

  const filtered = listings.filter(l =>
    !search || l.soul_name?.toLowerCase().includes(search.toLowerCase()) ||
             l.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && listings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mx-auto mb-4" />
          <p className="text-zinc-400">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Hero */}
      <div className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-transparent">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-white mb-3">Soul Marketplace</h1>
          <p className="text-lg text-zinc-400 max-w-2xl">
            Browse and discover AI souls created by the community. Each soul is distilled from real personalities, conversations, and life experiences.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search souls by name, skill, or personality..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-10 pr-4 py-2.5 text-zinc-50 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="appearance-none rounded-lg border border-zinc-700 bg-zinc-900 pl-10 pr-8 py-2.5 text-zinc-50 focus:border-indigo-500 focus:outline-none"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category chips */}
          {allCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategory('all')}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  category === 'all'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                }`}
              >
                All
              </button>
              {allCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat === category ? 'all' : cat)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    category === cat
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results count */}
        <p className="text-sm text-zinc-500 mb-4">{filtered.length} soul{filtered.length !== 1 ? 's' : ''} found</p>

        {/* Empty state */}
        {filtered.length === 0 && !loading && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <Brain className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-xl font-semibold text-zinc-300 mb-2">No souls found</h3>
            <p className="text-zinc-500 mb-6">
              {search ? 'Try adjusting your search or filters.' : 'The marketplace is empty. Be the first to list a soul!'}
            </p>
            {!search && (
              <Link href="/soul/distill" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors">
                <Zap className="h-4 w-4" />
                Distill a Soul
              </Link>
            )}
          </div>
        )}

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(l => (
            <Link
              key={l.id}
              href={`/soul/${l.soul_name || 'unknown'}`}
              className="group block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-indigo-500/50 hover:bg-zinc-900/80 transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {l.soul_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
                    {l.soul_name || 'Unnamed Soul'}
                  </div>
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    by {l.author_name || 'Anonymous'}
                    {l.is_verified && (
                      <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px]">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-zinc-600 group-hover:text-indigo-400 ml-auto flex-shrink-0 transition-colors" />
              </div>

              {l.description && (
                <p className="text-sm text-zinc-400 line-clamp-2 mb-3">{l.description}</p>
              )}

              {/* Capabilities tags */}
              {l.capabilities && l.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {l.capabilities.slice(0, 3).map((cap: string) => (
                    <span key={cap} className="px-2 py-0.5 rounded bg-zinc-800 text-xs text-zinc-400">
                      {cap}
                    </span>
                  ))}
                  {l.capabilities.length > 3 && (
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-xs text-zinc-500">
                      +{l.capabilities.length - 3}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-sm border-t border-zinc-800 pt-3">
                <span className="text-amber-400 flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {l.price_credits || 0} credits
                </span>
                <span className="text-zinc-500 flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {l.rating?.toFixed(1) || '0.0'} ({l.review_count || 0})
                </span>
                <span className="text-zinc-500 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {l.downloads || 0}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
