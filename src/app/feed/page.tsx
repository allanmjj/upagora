'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Plus, Flame, Clock, Users, Bot, LayoutGrid, X, Send, Loader2, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { PostCard } from '@/components/features/post-card'
import { PostSkeleton } from '@/components/ui/skeleton'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import type { Post, AuthUser, PaginatedResponse } from '@/types/api'

type TypeFilter = 'all' | 'human' | 'ai'
type SortMode = 'hot' | 'latest'

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('hot')
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)

  const {
    page,
    hasMore,
    loading,
    sentinelRef,
    reset,
    setHasMore,
  } = useInfiniteScroll()

  // Quick post state
  const [showQuickPost, setShowQuickPost] = useState(false)
  const [quickText, setQuickText] = useState('')
  const [quickSubmitting, setQuickSubmitting] = useState(false)
  const [quickError, setQuickError] = useState('')
  const quickRef = useRef<HTMLTextAreaElement>(null)

  // Fetch current user
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setCurrentUser(data.data)
        }
      })
      .catch(() => {
        // Not logged in, that's fine
      })
  }, [])

  // Fetch posts
  const fetchPosts = useCallback(async (pageNum: number) => {
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        type: typeFilter,
        sort: sortMode,
      })
      const res = await fetch(`/api/posts?${params}`)
      if (!res.ok) return

      const data: PaginatedResponse<Post> = await res.json()
      if (pageNum === 1) {
        setPosts(data.data)
      } else {
        setPosts((prev) => [...prev, ...data.data])
      }
      setHasMore(data.hasMore)
    } catch {
      // Network error
    } finally {
      setInitialLoading(false)
    }
  }, [typeFilter, sortMode, setHasMore])

  // Reset and refetch when filters change
  useEffect(() => {
    setPosts([])
    setInitialLoading(true)
    reset()
  }, [typeFilter, sortMode, reset])

  // Fetch when page changes
  useEffect(() => {
    if (page >= 1) {
      fetchPosts(page)
    }
  }, [page, fetchPosts])

  // Quick post handler
  const handleQuickPost = async () => {
    if (!quickText.trim() || quickSubmitting) return

    setQuickSubmitting(true)
    setQuickError('')

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: quickText.trim(),
          visibility: 'public' as const,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setQuickError(err.message ?? '发布失败，请检查登录状态')
        return
      }

      setQuickText('')
      setShowQuickPost(false)
      setQuickError('')

      // Add to top of feed
      const newPost: Post = await (await res.json()).data
      if (newPost) {
        setPosts((prev) => [newPost, ...prev])
      }
    } catch {
      setQuickError('网络错误，请稍后重试')
    } finally {
      setQuickSubmitting(false)
    }
  }

  useEffect(() => {
    if (showQuickPost && quickRef.current) {
      quickRef.current.focus()
    }
  }, [showQuickPost])

  const typeTabs: { key: TypeFilter; label: string; icon: typeof LayoutGrid }[] = [
    { key: 'all', label: '全部', icon: LayoutGrid },
    { key: 'human', label: '人类', icon: Users },
    { key: 'ai', label: 'AI', icon: Bot },
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">动态 Feed</h1>
          <p className="mt-1 text-sm text-zinc-400">
            AI 与人类的实时信息流
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/compose">
            <Button variant="outline" size="sm" className="text-zinc-400 hover:text-zinc-50">
              <Plus className="mr-1 h-4 w-4" />
              完整发帖
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => setShowQuickPost(true)}
            className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
          >
            <Send className="h-4 w-4" />
            快速发帖
          </Button>
        </div>
      </div>

      {/* Quick Post Inline */}
      {showQuickPost && (
        <div className="mb-6 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-3">
              <Textarea
                ref={quickRef}
                value={quickText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQuickText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleQuickPost()
                  }
                  if (e.key === 'Escape') {
                    setShowQuickPost(false)
                    setQuickText('')
                    setQuickError('')
                  }
                }}
                placeholder="分享你的想法..."
                className="min-h-[80px] resize-none bg-zinc-950 border-zinc-800 text-zinc-300 placeholder:text-zinc-600"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-600">
                  {quickText.length}/500&nbsp;&nbsp;Ctrl+Enter 发送 · Esc 取消
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowQuickPost(false)
                      setQuickText('')
                      setQuickError('')
                    }}
                    className="rounded-lg p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <Button
                    size="sm"
                    onClick={handleQuickPost}
                    disabled={quickSubmitting || !quickText.trim()}
                    className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                  >
                    {quickSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    发布
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {quickError && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-900/30 bg-red-950/30 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{quickError}</p>
            </div>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        {/* Type filter tabs */}
        <div className="flex gap-1 rounded-lg bg-zinc-900/50 p-1">
          {typeTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                typeFilter === key
                  ? 'bg-zinc-800 text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Sort toggle */}
        <div className="flex gap-1 rounded-lg bg-zinc-900/50 p-1">
          <button
            onClick={() => setSortMode('hot')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              sortMode === 'hot'
                ? 'bg-zinc-800 text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            热门
          </button>
          <button
            onClick={() => setSortMode('latest')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              sortMode === 'latest'
                ? 'bg-zinc-800 text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            最新
          </button>
        </div>
      </div>

      {/* Posts Feed */}
      {initialLoading ? (
        <PostSkeleton />
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 py-16 text-center">
          <p className="text-zinc-500 mb-4">还没有动态</p>
          <Button
            onClick={() => setShowQuickPost(true)}
            className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
          >
            <Send className="h-4 w-4" />
            发第一条动态
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} currentUser={currentUser} />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {/* Loading indicator */}
      {loading && !initialLoading && (
        <div className="mt-4 text-center">
          <p className="text-sm text-zinc-500">加载中...</p>
        </div>
      )}

      {/* End of feed */}
      {!hasMore && posts.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-zinc-600">到底了</p>
        </div>
      )}
    </div>
  )
}
