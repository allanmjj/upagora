'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Coins, Clock, Tag, Zap, ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import CreditDisplay from '@/components/features/credit-display'
import { UserBadge } from '@/components/features/user-badge'

import type { Demand } from '@/types/api'

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params?.id as string

  const [demand, setDemand] = useState<Demand | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!taskId) return

    const fetchDemand = async () => {
      try {
        const res = await fetch(`/api/market/${taskId}`)
        if (res.ok) {
          const { data } = await res.json()
          setDemand(data)
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }

    fetchDemand()
  }, [taskId])

  const handleAccept = async () => {
    if (!taskId || actionLoading) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/market/${taskId}/accept`, { method: 'POST' })
      if (res.ok) {
        const { data } = await res.json()
        setDemand({ ...demand!, ...data })
      } else {
        const { message } = await res.json()
        alert(message || '操作失败')
      }
    } catch {
      alert('网络错误')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!taskId || actionLoading) return
    const url = prompt('请输入成果链接:')
    if (!url) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/market/${taskId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_url: url }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setDemand({ ...demand!, ...data })
      } else {
        const { message } = await res.json()
        alert(message || '提交失败')
      }
    } catch {
      alert('网络错误')
    } finally {
      setActionLoading(false)
    }
  }

  const handleProgress = async () => {
    if (!taskId || actionLoading) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/market/${taskId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setDemand({ ...demand!, ...data })
      } else {
        const { message } = await res.json()
        alert(message || '操作失败')
      }
    } catch {
      alert('网络错误')
    } finally {
      setActionLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!taskId || actionLoading) return
    if (!confirm('确认任务已完成？积分将结算给接单人。')) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/market/${taskId}/complete`, { method: 'POST' })
      if (res.ok) {
        const { data } = await res.json()
        setDemand({ ...demand!, ...data })
      } else {
        const { message } = await res.json()
        alert(message || '操作失败')
      }
    } catch {
      alert('网络错误')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!taskId || actionLoading) return
    if (!confirm('确认取消任务？积分将退还给您。')) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/market/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setDemand({ ...demand!, ...data })
      } else {
        const { message } = await res.json()
        alert(message || '操作失败')
      }
    } catch {
      alert('网络错误')
    } finally {
      setActionLoading(false)
    }
  }

  const formatTime = (dateStr: string) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr))
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    open: { label: '开放', color: 'text-green-400 bg-green-500/10' },
    assigned: { label: '已接单', color: 'text-yellow-400 bg-yellow-500/10' },
    in_progress: { label: '进行中', color: 'text-blue-400 bg-blue-500/10' },
    completed: { label: '已完成', color: 'text-zinc-400 bg-zinc-500/10' },
    cancelled: { label: '已取消', color: 'text-red-400 bg-red-500/10' },
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-zinc-500">加载中...</p>
      </div>
    )
  }

  if (!demand) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-zinc-500">任务不存在</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/market')}>
          返回市场
        </Button>
      </div>
    )
  }

  const statusInfo = statusConfig[demand.status] || statusConfig.open

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.push('/market')} className="mb-4 gap-2">
        <ArrowLeft className="h-4 w-4" />
        返回市场
      </Button>

      {/* Main card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        {/* Status and badges */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          {demand.is_urgent && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
              <Zap className="h-3 w-3" /> 紧急
            </span>
          )}
          {demand.author && <UserBadge type={demand.author.user_type} />}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-zinc-50">{demand.title}</h1>

        {/* Author */}
        <div className="mt-2 text-sm text-zinc-400">
          发布者: <span className="text-zinc-300">{demand.author?.name || 'Unknown'}</span>
          <span className="text-zinc-600 mx-2">·</span>
          <span>{formatTime(demand.created_at)}</span>
        </div>

        {/* Description */}
        <p className="mt-4 whitespace-pre-wrap text-zinc-300">{demand.description}</p>

        {/* Tags */}
        {demand.tags && demand.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {demand.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Details grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <div>
            <span className="text-xs text-zinc-500">积分预算</span>
            <div className="mt-1">
              <CreditDisplay credits={demand.budget_credits} size="md" showLabel={false} />
            </div>
          </div>
          {demand.deadline_date && (
            <div>
              <span className="text-xs text-zinc-500">截止日期</span>
              <div className="mt-1 flex items-center gap-1 text-sm text-zinc-300">
                <Clock className="h-4 w-4" />
                {new Date(demand.deadline_date).toLocaleDateString('zh-CN')}
              </div>
            </div>
          )}
          {demand.assignee && (
            <div className="col-span-2">
              <span className="text-xs text-zinc-500">接单人</span>
              <div className="mt-1 flex items-center gap-2">
                <UserBadge type={demand.assignee.user_type} />
                <span className="text-sm text-zinc-300">{demand.assignee.name}</span>
              </div>
            </div>
          )}
          {demand.submission_url && (
            <div className="col-span-2">
              <span className="text-xs text-zinc-500">成果链接</span>
              <a
                href={demand.submission_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
              >
                <ExternalLink className="h-4 w-4" />
                {demand.submission_url}
              </a>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          {demand.status === 'open' && (
            <Button
              onClick={handleAccept}
              disabled={actionLoading}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
            >
              接受任务
            </Button>
          )}
          {demand.status === 'assigned' && (
            <Button
              onClick={handleProgress}
              disabled={actionLoading}
              variant="outline"
            >
              标记为进行中
            </Button>
          )}
          {['assigned', 'in_progress'].includes(demand.status) && (
            <Button
              onClick={handleSubmit}
              disabled={actionLoading}
              variant="outline"
            >
              提交成果
            </Button>
          )}
          {['assigned', 'in_progress'].includes(demand.status) && (
            <Button
              onClick={handleComplete}
              disabled={actionLoading}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              确认完成
            </Button>
          )}
          {['open', 'assigned'].includes(demand.status) && (
            <Button
              onClick={handleCancel}
              disabled={actionLoading}
              variant="ghost"
              className="text-red-400 hover:text-red-300"
            >
              <XCircle className="mr-2 h-4 w-4" />
              取消任务
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
