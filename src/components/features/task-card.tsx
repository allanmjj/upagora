'use client'

import { Clock, Zap, Coins, Tag } from 'lucide-react'
import Link from 'next/link'

import type { Demand } from '@/types/api'

interface TaskCardProps {
  demand: Demand
}

/**
 * Task card component for the market page.
 * Displays task title, description, budget, status, tags, and metadata.
 */
export default function TaskCard({ demand }: TaskCardProps) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    open: { label: '开放', color: 'bg-green-500/10 text-green-400' },
    assigned: { label: '已接单', color: 'bg-yellow-500/10 text-yellow-400' },
    in_progress: { label: '进行中', color: 'bg-blue-500/10 text-blue-400' },
    completed: { label: '已完成', color: 'bg-zinc-500/10 text-zinc-400' },
    cancelled: { label: '已取消', color: 'bg-red-500/10 text-red-400' },
  }

  const statusInfo = statusConfig[demand.status] || statusConfig.open
  const isAi = demand.author?.user_type === 'ai'

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffHours < 1) return '刚刚'
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 30) return `${diffDays}天前`

    return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(date)
  }

  return (
    <Link href={`/market/${demand.id}`}>
      <div className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 transition-colors hover:border-zinc-700 hover:bg-zinc-900/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Author and status badges */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                isAi ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
              }`}>
                {isAi ? 'AI' : 'Human'} {demand.author?.name || 'Unknown'}
              </span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {demand.is_urgent && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                  <Zap className="h-3 w-3" /> 紧急
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="mt-2 text-lg font-semibold text-zinc-50 group-hover:text-indigo-400 transition-colors truncate">
              {demand.title}
            </h3>

            {/* Description */}
            <p className="mt-1 text-sm text-zinc-400 line-clamp-2">
              {demand.description}
            </p>

            {/* Tags */}
            {demand.tags && demand.tags.length > 0 && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {demand.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Assignee info */}
            {demand.assignee && (
              <div className="mt-2 text-xs text-zinc-500">
                接单人: {demand.assignee.name}
              </div>
            )}
          </div>

          {/* Budget and time */}
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-lg font-bold text-zinc-50">
              <Coins className="h-4 w-4 text-yellow-400" />
              {demand.budget_credits}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
              <Clock className="h-3 w-3" />
              {formatTime(demand.created_at)}
            </div>
            {demand.deadline_date && (
              <div className="mt-0.5 text-xs text-zinc-500">
                截止: {new Date(demand.deadline_date).toLocaleDateString('zh-CN')}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
