'use client'

import { useState, useEffect, useCallback } from 'react'
import { Send } from 'lucide-react'

import { Avatar } from '@/components/ui/avatar'
import { UserBadge } from '@/components/features/user-badge'
import { Button } from '@/components/ui/button'
import type { Comment, AuthUser, PaginatedResponse } from '@/types/api'

interface CommentListProps {
  postId: string
  currentUser?: AuthUser | null
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date)
}

export function CommentList({ postId, currentUser }: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [content, setContent] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  const fetchComments = useCallback(async (pageNum: number) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments?page=${pageNum}`)
      if (!res.ok) return

      const data: PaginatedResponse<Comment> = await res.json()
      if (pageNum === 1) {
        setComments(data.data)
      } else {
        setComments((prev) => [...prev, ...data.data])
      }
      setHasMore(data.hasMore)
      setTotalCount(data.count)
    } catch {
      // Network error, keep existing state
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    setLoading(true)
    fetchComments(1)
  }, [fetchComments])

  const loadMore = () => {
    if (!hasMore || loading) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchComments(nextPage)
  }

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.message || 'Failed to post comment')
        return
      }

      const result = await res.json()
      setComments((prev) => [...prev, result.data as Comment])
      setTotalCount((prev) => prev + 1)
      setContent('')
    } catch {
      alert('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse flex gap-3">
            <div className="h-8 w-8 rounded-full bg-zinc-800" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-zinc-800" />
              <div className="h-3 w-full rounded bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-zinc-400">
        Comments ({totalCount})
      </h3>

      {/* Comment form */}
      {currentUser ? (
        <div className="flex gap-3">
          <Avatar name={currentUser.name} size="sm" />
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write a comment..."
              className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-500 focus:border-zinc-700 focus:outline-none"
              rows={2}
            />
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!content.trim() || submitting}
                className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
              >
                <Send className="h-3 w-3" />
                Reply
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Log in to leave a comment.</p>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {comments.map((comment) => {
          const isAi = comment.author?.user_type === 'ai'
          return (
            <div key={comment.id} className="flex gap-3">
              <Avatar
                name={comment.author?.name || '?'}
                size="sm"
                className={isAi ? 'ring-1 ring-purple-400/20' : 'ring-1 ring-blue-400/20'}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-300">
                    {comment.author?.name || 'Unknown'}
                  </span>
                  <UserBadge type={isAi ? 'ai' : 'human'} />
                  <span className="text-xs text-zinc-600">·</span>
                  <span className="text-xs text-zinc-500">{formatTime(comment.created_at)}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-400">{comment.content}</p>
              </div>
            </div>
          )
        })}

        {comments.length === 0 && (
          <p className="text-sm text-zinc-500 py-2">No comments yet.</p>
        )}
      </div>

      {hasMore && (
        <Button variant="ghost" size="sm" onClick={loadMore} className="text-zinc-500">
          Load more comments
        </Button>
      )}
    </div>
  )
}
