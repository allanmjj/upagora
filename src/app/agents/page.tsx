'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AgentCard } from '@/components/features/agent-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Brain, Search, Zap, Star, Clock, Filter, ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import type { Agent } from '@/types/api'

type SortMode = 'popular' | 'new' | 'rating'

const sortTabs: { key: SortMode; label: string; icon: any }[] = [
  { key: 'popular', label: '热门', icon: Zap },
  { key: 'new', label: '最新', icon: Clock },
  { key: 'rating', label: '好评', icon: Star },
]

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [sortMode, setSortMode] = useState<SortMode>('new')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchAgents = useCallback(async (pageNum: number) => {
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        sort: sortMode,
      })
      if (debouncedQuery) params.set('q', debouncedQuery)
      if (selectedTag) params.set('tag', selectedTag)

      const res = await fetch(`/api/agents?${params}`)
      if (!res.ok) return

      const json = await res.json()
      const data: Agent[] = json.data?.agents ?? json?.data ?? []
      if (pageNum === 1) {
        setAgents(data)
      } else {
        setAgents((prev) => [...prev, ...data])
      }
      setHasMore(data.length >= 12)
    } catch {
      // Network error
    } finally {
      setLoading(false)
    }
  }, [sortMode, debouncedQuery, selectedTag])

  // Reset and refetch on filter change
  useEffect(() => {
    setPage(1)
    setAgents([])
    setLoading(true)
    fetchAgents(1)
  }, [sortMode, debouncedQuery, selectedTag, fetchAgents])

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          setPage((prev) => prev + 1)
        }
      },
      { rootMargin: '200px' }
    )
    if (sentinelRef.current) observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading])

  useEffect(() => {
    if (page > 1) fetchAgents(page)
  }, [page, fetchAgents])

  // Collect tags from loaded agents
  const allTags = [...new Set(agents.flatMap((a) => a.capabilities))].sort()

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-50">Agent 广场</h1>
            <p className="text-sm text-zinc-400">
              发现 AI 智能体，一句话开始协作
            </p>
          </div>
        </div>
        {/* <Link href="/" passHref>
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-50">
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回首页
          </Button>
        </Link> */}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索 Agent 名称、能力描述..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-zinc-50 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Sort + Filter */}
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <div className="flex gap-1 rounded-lg bg-zinc-900/50 p-1">
          {sortTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSortMode(key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                sortMode === key
                  ? 'bg-zinc-800 text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-zinc-500" />
            <button
              onClick={() => setSelectedTag(null)}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${
                !selectedTag
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              全部
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`rounded-md px-2 py-1 text-xs transition-colors ${
                  selectedTag === tag
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Agent grid */}
      {loading && page === 1 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
            >
              <div className="mb-3 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="mb-3 h-12 w-full" />
              <div className="mb-3 flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 py-16 text-center">
          <Brain className="mx-auto mb-4 h-12 w-12 text-zinc-700" />
          <p className="text-zinc-400 text-lg">暂无可用 Agent</p>
          <p className="mt-2 text-sm text-zinc-500">
            成为第一个发布 Agent 的创作者
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {loading && page > 1 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-zinc-500">加载中...</p>
        </div>
      )}

      {!hasMore && agents.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-zinc-600">已经到底了</p>
        </div>
      )}
    </div>
  )
}
