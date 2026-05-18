'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, MessageCircle, Repeat2, Share } from 'lucide-react'

import { Avatar } from '@/components/ui/avatar'
import { UserBadge } from '@/components/features/user-badge'
import type { Post, AuthUser } from '@/types/api'

interface PostCardProps {
  post: Post
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

export function PostCard({ post, currentUser }: PostCardProps) {
  const [liked, setLiked] = useState(post.is_liked_by_me ?? false)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [likeLoading, setLikeLoading] = useState(false)

  const author = post.author
  const isAi = author?.user_type === 'ai'

  const handleLike = async () => {
    if (likeLoading) return
    if (!currentUser) return

    setLikeLoading(true)
    // Optimistic update
    const newLiked = !liked
    setLiked(newLiked)
    setLikeCount((prev) => newLiked ? prev + 1 : Math.max(0, prev - 1))

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' })
      if (!res.ok) {
        // Revert on failure
        setLiked(!newLiked)
        setLikeCount((prev) => newLiked ? Math.max(0, prev - 1) : prev + 1)
      } else {
        const data = await res.json()
        if (data.data?.like_count !== undefined) {
          setLikeCount(data.data.like_count)
        }
      }
    } catch {
      // Revert on network error
      setLiked(!newLiked)
      setLikeCount((prev) => newLiked ? Math.max(0, prev - 1) : prev + 1)
    } finally {
      setLikeLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 transition-colors hover:bg-zinc-900/50">
      {post.is_pinned && (
        <div className="mb-2 text-xs text-zinc-500">Pinned</div>
      )}

      <div className="flex items-start gap-3">
        <Link href={author?.username ? `/profile/${author.username}` : '#'}>
          <Avatar
            name={author?.name || '?'}
            size="md"
            className={isAi ? 'ring-2 ring-purple-400/20' : 'ring-2 ring-blue-400/20'}
          />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={author?.username ? `/profile/${author.username}` : '#'}
              className="font-semibold text-zinc-50 hover:text-indigo-400 transition-colors"
            >
              {author?.name || 'Unknown'}
            </Link>
            <UserBadge type={isAi ? 'ai' : 'human'} />
            <span className="text-xs text-zinc-600">·</span>
            <span className="text-xs text-zinc-500">{formatTime(post.created_at)}</span>
          </div>

          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300 leading-relaxed">
            {post.content}
          </p>

          {post.tags && post.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-6">
            <Link
              href={`/feed?post=${post.id}`}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-blue-400 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{post.reply_count}</span>
            </Link>

            <button className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-green-400 transition-colors">
              <Repeat2 className="h-4 w-4" />
              <span>{post.repost_count}</span>
            </button>

            <button
              onClick={handleLike}
              disabled={likeLoading || !currentUser}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                liked
                  ? 'text-pink-500 hover:text-pink-400'
                  : 'text-zinc-500 hover:text-pink-400'
              } ${!currentUser ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
              <span>{likeCount}</span>
            </button>

            <button className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-indigo-400 transition-colors">
              <Share className="h-4 w-4" />
              <span>{post.share_count}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
