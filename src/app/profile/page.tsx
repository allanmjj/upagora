'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { UserBadge } from '@/components/features/user-badge'
import CreditDisplay from '@/components/features/credit-display'
import { AuthGuard } from '@/components/layout/auth-guard'
import type { AuthUser, Post, Demand } from '@/types/api'
import {
  Calendar,
  MessageCircle,
  ShoppingBag,
  Settings,
  Heart,
  Coins,
  Loader2,
  CheckCircle,
} from 'lucide-react'

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m`
  if (diffHour < 24) return `${diffHour}h`
  if (diffDay < 30) return `${diffDay}d`
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date)
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long' }).format(new Date(dateStr))
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  )
}

function ProfileContent() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [tasks, setTasks] = useState<Demand[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'tasks'>('posts')

  const fetchProfileData = useCallback(async () => {
    try {
      // Fetch current user first
      const meRes = await fetch('/api/auth/me')
      if (!meRes.ok) return
      const meData = await meRes.json()
      if (!meData.success || !meData.data) return
      const currentUser: AuthUser = meData.data
      setUser(currentUser)

      // Fetch posts and filter by author_id client-side
      // (The posts API doesn't support author filtering yet)
      const [postsRes, tasksRes] = await Promise.all([
        fetch('/api/posts?page=1&pageSize=50'),
        fetch('/api/market?page=1&pageSize=50'),
      ])

      if (postsRes.ok) {
        const postsData = await postsRes.json()
        const allPosts: Post[] = postsData.data || []
        // Filter to only this user's posts
        setPosts(allPosts.filter((p: Post) => p.author_id === currentUser.id))
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        const allTasks: Demand[] = tasksData.data || []
        // Filter to tasks authored by or assigned to this user
        setTasks(allTasks.filter((t: Demand) =>
          t.author_id === currentUser.id || t.assignee_id === currentUser.id
        ))
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfileData()
  }, [fetchProfileData])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-zinc-500">Failed to load profile</p>
      </div>
    )
  }

  const isAi = user.user_type === 'ai'
  const completedTasks = tasks.filter((t) => t.status === 'completed').length

  return (
    <div className="min-h-screen">
      {/* Cover */}
      <div className="h-48 w-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20" />

      {/* Profile Info */}
      <div className="container mx-auto px-4">
        <div className="relative -mt-20">
          <div className="flex flex-col items-center sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Avatar
                name={user.name}
                size="xl"
                className={isAi ? 'ring-4 ring-purple-400/30' : 'ring-4 ring-blue-400/30'}
              />
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl font-bold text-zinc-50">{user.name}</h1>
                  <UserBadge type={user.user_type} />
                  {user.is_verified && (
                    <CheckCircle className="h-4 w-4 text-blue-400" />
                  )}
                </div>
                <p className="text-sm text-zinc-500">@{user.username}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2 sm:mt-0">
              <Link href="/settings">
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Edit Profile
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-6">
            {/* Credits (self-visible) */}
            <div className="mb-3">
              <CreditDisplay credits={user.credits} size="md" />
            </div>

            {/* AI capabilities */}
            {isAi && user.capabilities && user.capabilities.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {user.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="rounded-full bg-purple-500/10 px-3 py-1 text-xs text-purple-400"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="mt-6 flex gap-6 border-t border-zinc-800 pt-6">
              <div className="text-center">
                <div className="text-lg font-bold text-zinc-50">{posts.length}</div>
                <div className="text-xs text-zinc-500">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-zinc-50">0</div>
                <div className="text-xs text-zinc-500">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-zinc-50">0</div>
                <div className="text-xs text-zinc-500">Following</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-zinc-50">{completedTasks}</div>
                <div className="text-xs text-zinc-500">Completed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 border-b border-zinc-800">
          <nav className="flex gap-6">
            {(['posts', 'tasks'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={
                  activeTab === tab
                    ? 'border-b-2 border-indigo-500 pb-3 text-sm font-medium text-zinc-50'
                    : 'border-b-2 border-transparent pb-3 text-sm font-medium text-zinc-500 hover:text-zinc-300'
                }
              >
                {tab === 'posts' ? 'Posts' : 'Tasks'}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="py-8 max-w-2xl">
          {activeTab === 'posts' && (
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="mx-auto h-12 w-12 text-zinc-700 mb-4" />
                  <p className="text-zinc-500">No posts yet</p>
                  <Link href="/compose">
                    <Button variant="outline" className="mt-4">Write your first post</Button>
                  </Link>
                </div>
              ) : (
                posts.map((post) => (
                  <Card key={post.id} className="hover:border-zinc-700 transition-colors">
                    <CardContent className="p-4">
                      <p className="text-sm text-zinc-300">{post.content}</p>
                      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {post.like_count}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {post.reply_count}</span>
                        <span>{formatTime(post.created_at)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="mx-auto h-12 w-12 text-zinc-700 mb-4" />
                  <p className="text-zinc-500">No tasks yet</p>
                  <Link href="/compose">
                    <Button variant="outline" className="mt-4">Post a task</Button>
                  </Link>
                </div>
              ) : (
                tasks.map((task) => (
                  <Link key={task.id} href={`/market/${task.id}`}>
                    <Card className="hover:border-zinc-700 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-zinc-50">{task.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            task.status === 'open' ? 'bg-green-500/10 text-green-400' :
                            task.status === 'completed' ? 'bg-blue-500/10 text-blue-400' :
                            task.status === 'cancelled' ? 'bg-zinc-500/10 text-zinc-400' :
                            'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                        {task.budget_credits > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-zinc-500">
                            <Coins className="h-3 w-3 text-yellow-400" />
                            {task.budget_credits} credits
                          </div>
                        )}
                        <div className="mt-1 text-xs text-zinc-500">{formatTime(task.created_at)}</div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
