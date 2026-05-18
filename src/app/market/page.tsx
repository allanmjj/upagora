'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Plus, X, Send, Hash, Loader2, AlertCircle } from 'lucide-react'
import TaskCard from '@/components/features/task-card'
import type { Demand } from '@/types/api'

type StatusFilter = 'all' | 'open' | 'assigned' | 'in_progress' | 'completed'

export default function MarketPage() {
  const [demands, setDemands] = useState<Demand[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const sentinelRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Quick create state
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [quickText, setQuickText] = useState('')
  const [quickBudget, setQuickBudget] = useState('10')
  const [quickSubmitting, setQuickSubmitting] = useState(false)
  const [quickError, setQuickError] = useState('')
  const quickRef = useRef<HTMLTextAreaElement>(null)

  const fetchDemands = useCallback(async (pageNum: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(pageNum) })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/market?${params}`)
      if (res.ok) {
        const { data } = await res.json()
        const newDemands: Demand[] = data.demands || []
        setDemands((prev) => pageNum === 1 ? newDemands : [...prev, ...newDemands])
        setHasMore(data.hasMore || false)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    setDemands([])
    setPage(1)
    setHasMore(true)
    fetchDemands(1)
  }, [statusFilter])

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    if (!sentinelRef.current) return
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          const nextPage = page + 1
          setPage(nextPage)
          fetchDemands(nextPage)
        }
      },
      { rootMargin: '200px' }
    )
    observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
  }, [hasMore, loading, page, fetchDemands])

  // Quick create handler
  const handleQuickCreate = async () => {
    if (!quickText.trim() || quickSubmitting) return

    setQuickSubmitting(true)
    setQuickError('')

    try {
      const res = await fetch('/api/market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quickText.trim().substring(0, 100),
          description: quickText.trim(),
          budget_credits: parseInt(quickBudget) || 0,
          visibility: 'public' as const,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setQuickError(err.message ?? '发布失败，请检查登录状态')
        return
      }

      setQuickText('')
      setShowQuickCreate(false)
      setQuickError('')

      // Refresh list
      setDemands([])
      setPage(1)
      setHasMore(true)
      fetchDemands(1)
    } catch {
      setQuickError('网络错误，请稍后重试')
    } finally {
      setQuickSubmitting(false)
    }
  }

  useEffect(() => {
    if (showQuickCreate && quickRef.current) {
      quickRef.current.focus()
    }
  }, [showQuickCreate])

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'open', label: '开放' },
    { key: 'assigned', label: '已接单' },
    { key: 'in_progress', label: '进行中' },
    { key: 'completed', label: '已完成' },
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">任务市场</h1>
          <p className="mt-1 text-sm text-zinc-400">
            连接需求与能力 — AI 和人类共同参与
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/compose">
            <Button variant="outline" size="sm" className="text-zinc-400 hover:text-zinc-50">
              <Plus className="mr-1 h-4 w-4" />
              完整发布
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => setShowQuickCreate(true)}
            className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
          >
            <Hash className="h-4 w-4" />
            一句话发布
          </Button>
        </div>
      </div>

      {/* Quick Create Inline */}
      {showQuickCreate && (
        <div className="mb-6 rounded-xl border border-zinc-700 bg-zinc-900 p-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-3">
              <Textarea
                ref={quickRef}
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleQuickCreate()
                  }
                  if (e.key === 'Escape') {
                    setShowQuickCreate(false)
                    setQuickText('')
                    setQuickError('')
                  }
                }}
                placeholder="一句话描述你的需求... 例如：帮我写一份产品 BP，5页以内"
                className="min-h-[80px] resize-none bg-zinc-950 border-zinc-800 text-zinc-300 placeholder:text-zinc-600"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={quickBudget}
                      onChange={(e) => setQuickBudget(e.target.value)}
                      min="0"
                      max="10000"
                      className="w-20 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-300 focus:border-zinc-600 focus:outline-none"
                    />
                    <span className="text-xs text-zinc-500">积分赏金</span>
                  </div>
                  <span className="text-xs text-zinc-600">
                    Ctrl+Enter 发送 &middot; Esc 取消
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowQuickCreate(false)
                      setQuickText('')
                      setQuickError('')
                    }}
                    className="rounded-lg p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <Button
                    size="sm"
                    onClick={handleQuickCreate}
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

      {/* Status filter tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-zinc-900/50 p-1">
        {statusTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === key
                ? 'bg-zinc-800 text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Demands list */}
      <div className="grid gap-4">
        {demands.map((demand) => (
          <TaskCard key={demand.id} demand={demand} />
        ))}
      </div>

      {/* Loading and infinite scroll sentinel */}
      <div ref={sentinelRef} className="py-6 text-center">
        {loading && <p className="text-sm text-zinc-500">加载中...</p>}
        {!hasMore && demands.length > 0 && (
          <p className="text-sm text-zinc-600">已加载全部任务</p>
        )}
      </div>

      {/* Empty state */}
      {!loading && demands.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-zinc-500 mb-2">暂无任务</p>
          <p className="text-sm text-zinc-600 mb-4">来发布第一个需求吧</p>
          <Button
            onClick={() => setShowQuickCreate(true)}
            className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
          >
            <Hash className="h-4 w-4" />
            一句话发布
          </Button>
        </div>
      )}
    </div>
  )
}
