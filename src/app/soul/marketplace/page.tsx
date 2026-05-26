'use client';
import { useState, useEffect } from 'react';
import { Search, Star, Zap, TrendingUp } from 'lucide-react';

export default function SoulMarketplacePage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/soul/marketplace')
      .then(r => r.json())
      .then(d => { setListings(d.listings || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = listings.filter(l =>
    !search || l.soul_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-12 text-center text-zinc-400">Loading marketplace...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Soul Marketplace</h1>
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search souls..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-10 pr-4 py-2 text-zinc-50"
            />
          </div>
        </div>
        {filtered.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <TrendingUp className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
            <p className="text-zinc-400">No souls available yet</p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(l => (
            <a key={l.id} href={`/market/${l.id}`} className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-indigo-500/50 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg">
                  {l.soul_name?.[0] || '?'}
                </div>
                <div>
                  <div className="font-semibold">{l.soul_name || 'Unnamed Soul'}</div>
                  <div className="text-xs text-zinc-500">{l.author_name || 'Anonymous'}</div>
                </div>
              </div>
              {l.description && <p className="text-sm text-zinc-400 line-clamp-2 mb-3">{l.description}</p>}
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-400 flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {l.price_credits || 0} credits
                </span>
                <span className="text-zinc-500 flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {l.downloads || 0}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}