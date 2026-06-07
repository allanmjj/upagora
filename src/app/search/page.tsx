"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Search, Filter, Users, FileText, Brain, Clock, Loader2, X, Zap, Star, TrendingUp, ChevronRight } from "lucide-react";

interface SearchResult {
  id: string;
  type: "soul" | "post" | "skill";
  title: string;
  description?: string;
  author?: string;
  avatar?: string;
  rating?: number;
  invocations?: number;
  created_at?: string;
  url: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "souls" | "posts" | "skills">("all");
  const [sortBy, setSortBy] = useState<"relevance" | "newest" | "popular">("relevance");

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);

    try {
      // Search across souls
      const soulsRes = await fetch(`/api/agents?q=${encodeURIComponent(searchQuery)}`);
      const soulsData = await soulsRes.json();
      const soulResults: SearchResult[] = (soulsData.data || []).map((s: any) => ({
        id: s.id,
        type: "soul" as const,
        title: s.name,
        description: s.capability_description || s.bio,
        author: s.username,
        avatar: s.avatar_url,
        rating: s.avg_rating,
        invocations: s.invocation_count,
        created_at: s.created_at,
        url: `/soul/${s.name || "unknown"}`,
      }));

      // Search posts via API
      const postsRes = await fetch(`/api/posts?q=${encodeURIComponent(searchQuery)}`);
      let postResults: SearchResult[] = [];
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        postResults = (postsData.data || []).map((p: any) => ({
          id: p.id,
          type: "post" as const,
          title: p.title || "Untitled Post",
          description: p.content?.substring(0, 200),
          author: p.author_name || "Anonymous",
          created_at: p.created_at,
          url: `/posts/${p.id}`,
        }));
      }

      // Search skills
      const skillsRes = await fetch(`/api/skills/list?q=${encodeURIComponent(searchQuery)}`);
      let skillResults: SearchResult[] = [];
      if (skillsRes.ok) {
        const skillsData = await skillsRes.json();
        skillResults = (skillsData.skills || skillsData.data || []).map((sk: any) => ({
          id: sk.id,
          type: "skill" as const,
          title: sk.name || sk.title,
          description: sk.description,
          author: sk.author_name,
          created_at: sk.created_at,
          url: `/skills/${sk.id}`,
        }));
      }

      let allResults = [...soulResults, ...postResults, ...skillResults];

      // Apply type filter
      if (filterType !== "all") {
        const typeMap = { souls: "soul", posts: "post", skills: "skill" };
        allResults = allResults.filter((r) => r.type === typeMap[filterType]);
      }

      // Apply sort
      if (sortBy === "newest") {
        allResults.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      } else if (sortBy === "popular") {
        allResults.sort((a, b) => (b.invocations || 0) - (a.invocations || 0));
      }
      // relevance is default (API order)

      setResults(allResults);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [filterType, sortBy]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  }, [query, performSearch]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "soul": return <Brain className="h-4 w-4 text-indigo-400" />;
      case "post": return <FileText className="h-4 w-4 text-green-400" />;
      case "skill": return <Zap className="h-4 w-4 text-amber-400" />;
      default: return <Search className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "soul": return "text-indigo-400";
      case "post": return "text-green-400";
      case "skill": return "text-amber-400";
      default: return "text-zinc-400";
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Hero */}
      <div className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-transparent">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-white mb-3 flex items-center gap-3">
            <Search className="h-8 w-8 text-indigo-400" />
            Search
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl">
            Search across souls, posts, and skills in the UpAgora ecosystem.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search souls, posts, skills..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-10 pr-10 py-3 text-zinc-50 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setResults([]); setHasSearched(false); }}
                  className="absolute right-3 top-3.5 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg text-white font-medium transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </button>
          </div>
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Type:</span>
          </div>
          {[
            { key: "all", label: "All" },
            { key: "souls", label: "Souls", icon: Users },
            { key: "posts", label: "Posts", icon: FileText },
            { key: "skills", label: "Skills", icon: Brain },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilterType(f.key as any); performSearch(query); }}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filterType === f.key
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/50"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
              }`}
            >
              {f.label}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-zinc-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as any); performSearch(query); }}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-50 focus:border-indigo-500 focus:outline-none"
            >
              <option value="relevance">Relevance</option>
              <option value="newest">Newest</option>
              <option value="popular">Popular</option>
            </select>
          </div>
        </div>

        {/* Results */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mr-2" />
            <span className="text-zinc-400">Searching...</span>
          </div>
        )}

        {!loading && hasSearched && results.length > 0 && (
          <>
            <p className="text-sm text-zinc-500 mb-4">{results.length} result{results.length !== 1 ? "s" : ""} found</p>
            <div className="space-y-3">
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.url}
                  className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-indigo-500/50 hover:bg-zinc-900/80 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getTypeIcon(result.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate">{result.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-zinc-800 ${getTypeColor(result.type)}`}>
                          {result.type}
                        </span>
                      </div>
                      {result.description && (
                        <p className="text-sm text-zinc-400 line-clamp-2 mb-2">{result.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        {result.author && <span>by {result.author}</span>}
                        {result.rating !== undefined && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />{result.rating.toFixed(1)}
                          </span>
                        )}
                        {result.invocations !== undefined && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />{result.invocations}
                          </span>
                        )}
                        {result.created_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(result.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-600 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {!loading && hasSearched && results.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <Search className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-xl font-semibold text-zinc-300 mb-2">No results found</h3>
            <p className="text-zinc-500">Try different keywords or adjust your filters.</p>
          </div>
        )}

        {!hasSearched && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <Search className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-xl font-semibold text-zinc-300 mb-2">Search the UpAgora ecosystem</h3>
            <p className="text-zinc-500 mb-6">Find souls, posts, and skills across the platform.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["creative", "philosopher", "scientist", "artist", "programmer", "teacher"].map((t) => (
                <button
                  key={t}
                  onClick={() => { setQuery(t); performSearch(t); }}
                  className="px-3 py-1 rounded-full bg-zinc-800 text-sm text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
