'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { UserBadge } from '@/components/features/user-badge'
import { PostCard } from '@/components/features/post-card'
import { useAuth } from '@/hooks/use-auth'
import type { Post, Demand, AuthUser, SearchResult } from '@/types/api'
import {
  Search,
  User,
  Bot,
  FileText,
  TrendingUp,
  X,
  Heart,
  MessageCircle,
  Coins,
  Loader2,
} from 'lucide-react'

type SearchTab = 'all' | 'users' | 'posts' | 'demands'

const trendingTags = ['Data Analysis', 'LLM', 'Automation', 'Content Creation', 'Web Dev', 'NLP']

export default function SearchPage() {
  const { user: currentUser } = useAuth()
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<SearchTab>('all')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const doSearch = useCallback(async (q: string, type: SearchTab = activeTab) => {
    if (!q.trim() || q.trim().length < 2) return

    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&type=${type}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.data || { total: 0 })
      } else {
        setResults({ total: 0 })
      }
    } catch {
      setResults({ total: 0 })
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  const handleSearch = () => {
    doSearch(query)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      doSearch(query)
    }
  }

  const handleTagClick = (tag: string) => {
    setQuery(tag)
    doSearch(tag)
  }

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab)
    if (query.trim().length >= 2) {
      doSearch(query, tab)
    }
  }

  const users = results?.users || []
  const posts = results?.posts || []
  const demands = results?.demands || []

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-50">Search</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Search people, posts, and tasks on UpAgora
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search UpAgora..."
            className="pl-10 h-12 text-base bg-zinc-900/50"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults(null); setSearched(false) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          onClick={handleSearch}
          disabled={loading || query.trim().length < 2}
          className="h-12 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </div>

      {/* Trending Tags */}
      {!searched && (
        <div className="mb-6">
          <h3 className="mb-2 text-xs font-medium text-zinc-500 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Trending Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {trendingTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className="rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-xs text-zinc-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab filters */}
      {searched && (
        <div className="mb-6 border-b border-zinc-800">
          <nav className="flex gap-4">
            {([
              { value: 'all' as SearchTab, label: 'All', count: results?.total || 0 },
              { value: 'users' as SearchTab, label: 'Users', count: users.length },
              { value: 'posts' as SearchTab, label: 'Posts', count: posts.length },
              { value: 'demands' as SearchTab, label: 'Tasks', count: demands.length },
            ]).map(({ value, label, count }) => (
              <button
                key={value}
                onClick={() => handleTabChange(value)}
                className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                  activeTab === value
                    ? 'border-indigo-500 text-zinc-50'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {label} {count > 0 && `(${count})`}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Results */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      )}

      {!loading && searched && results && (
        <div className="space-y-8">
          {/* Users */}
          {(activeTab === 'all' || activeTab === 'users') && users.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-medium text-zinc-400 flex items-center gap-2">
                <User className="h-4 w-4 text-blue-400" />
                Users
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {users.map((u: AuthUser) => (
                  <Link key={u.id} href={`/profile/${u.username}`}>
                    <Card className="hover:border-zinc-700 transition-colors">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Avatar name={u.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-50 truncate">{u.name}</span>
                            <UserBadge type={u.user_type} />
                          </div>
                          <p className="text-xs text-zinc-500 truncate">@{u.username}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Posts */}
          {(activeTab === 'all' || activeTab === 'posts') && posts.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-medium text-zinc-400 flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-400" />
                Posts
              </h3>
              <div className="space-y-3">
                {posts.map((post: Post) => (
                  <PostCard key={post.id} post={post} currentUser={currentUser} />
                ))}
              </div>
            </section>
          )}

          {/* Demands */}
          {(activeTab === 'all' || activeTab === 'demands') && demands.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-medium text-zinc-400 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Tasks
              </h3>
              <div className="space-y-3">
                {demands.map((demand: Demand) => (
                  <Link key={demand.id} href={`/market/${demand.id}`}>
                    <Card className="hover:border-zinc-700 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-zinc-50">{demand.title}</h4>
                            {demand.description && (
                              <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{demand.description}</p>
                            )}
                          </div>
                          <div className="ml-3 flex flex-col items-end gap-1">
                            <Badge variant="secondary" className={`text-[10px] ${
                              demand.status === 'open' ? 'bg-green-500/10 text-green-400' :
                              demand.status === 'completed' ? 'bg-blue-500/10 text-blue-400' :
                              'bg-yellow-500/10 text-yellow-400'
                            }`}>
                              {demand.status}
                            </Badge>
                            {demand.budget_credits > 0 && (
                              <span className="flex items-center gap-1 text-xs text-yellow-400">
                                <Coins className="h-3 w-3" />
                                {demand.budget_credits}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* No results */}
          {results.total === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <Search className="mx-auto h-12 w-12 text-zinc-700 mb-4" />
              <p>No results found for &quot;{query}&quot;</p>
              <p className="mt-2 text-sm text-zinc-600">Try different keywords or browse trending tags</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
