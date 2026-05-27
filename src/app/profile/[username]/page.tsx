'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { UserBadge } from '@/components/features/user-badge'
import type { AuthUser, Post, Demand } from '@/types/api'
import {
  Calendar,
  MessageCircle,
  ShoppingBag,
  Heart,
  UserPlus,
  UserMinus,
  ArrowLeft,
  Loader2,
  Coins,
} from 'lucide-react'

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

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(dateStr))
}

interface ProfileUser extends AuthUser {
  created_at?: string
  bio?: string
  location?: string
  website?: string
  github_url?: string
  followers_count?: number
  following_count?: number
  is_followed_by_me?: boolean
}

export default function UserProfilePage() {
  const params = useParams()
  const username = (params?.username as string) || ''

  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [demands, setDemands] = useState<Demand[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowed, setIsFollowed] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'demands'>('posts')

  const fetchProfileData = useCallback(async () => {
    try {
      // Fetch user profile by username using the updated /api/users/[id] route
      // which now supports both UUID and username lookup
      const userRes = await fetch(`/api/users/${encodeURIComponent(username)}`)
      if (userRes.ok) {
        const userData = await userRes.json()
        if (userData.success && userData.data) {
          const foundUser: ProfileUser = userData.data
          setProfileUser(foundUser)
          setIsFollowed(foundUser.is_followed_by_me || false)

          // Fetch posts and demands, then filter client-side by author_id
          // (The posts/market APIs don't support author filtering)
          const [postsRes, demandsRes] = await Promise.all([
            fetch('/api/posts?page=1&pageSize=50'),
            fetch('/api/market?page=1&pageSize=50'),
          ])

          if (postsRes.ok) {
            const postsData = await postsRes.json()
            const allPosts: Post[] = postsData.data || []
            setPosts(allPosts.filter((p: Post) => p.author_id === foundUser.id))
          }

          if (demandsRes.ok) {
            const demandsData = await demandsRes.json()
            const allDemands: Demand[] = demandsData.data || []
            setDemands(allDemands.filter((d: Demand) => d.author_id === foundUser.id))
          }
        }
      }

      // Fetch current user for follow button logic
      const meRes = await fetch('/api/auth/me')
      if (meRes.ok) {
        const meData = await meRes.json()
        if (meData.success && meData.data) {
          setCurrentUser(meData.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    fetchProfileData()
  }, [fetchProfileData])

  const handleFollow = async () => {
    if (!profileUser || !currentUser || followLoading) return
    if (currentUser.id === profileUser.id) return

    setFollowLoading(true)
    const prevFollowed = isFollowed
    setIsFollowed(!isFollowed) // optimistic

    try {
      const res = await fetch(`/api/users/${profileUser.id}/follow`, { method: 'POST' })
      if (!res.ok) {
        setIsFollowed(prevFollowed) // revert
      }
    } catch {
      setIsFollowed(prevFollowed) // revert
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (!profileUser) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-zinc-500">User not found</p>
        <Link href="/feed">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Feed
          </Button>
        </Link>
      </div>
    )
  }

  const isAi = profileUser.user_type === 'ai'
  const isSelf = currentUser && currentUser.id === profileUser.id

  return (
    <div className="min-h-screen">
      {/* Cover */}
      <div className="h-48 w-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20" />

      {/* Profile Info */}
      <div className="container mx-auto px-4">
        <div className="relative -mt-20">
          <div className="flex flex-col items-center sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className={
                isAi
                  ? 'h-24 w-24 rounded-full border-4 border-zinc-950 bg-purple-600 flex items-center justify-center text-3xl font-bold text-white ring-4 ring-purple-400/30'
                  : 'h-24 w-24 rounded-full border-4 border-zinc-950 bg-blue-600 flex items-center justify-center text-3xl font-bold text-white ring-4 ring-blue-400/30'
              }>
                {profileUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl font-bold text-zinc-50">{profileUser.name}</h1>
                  <UserBadge type={profileUser.user_type} />
                  {profileUser.is_verified && (
                    <span className="text-xs text-indigo-400">Verified</span>
                  )}
                </div>
                <p className="text-sm text-zinc-500">@{profileUser.username}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2 sm:mt-0">
              {!isSelf && currentUser && (
                <Button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={
                    isFollowed
                      ? 'gap-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      : 'gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700'
                  }
                >
                  {isFollowed ? (
                    <><UserMinus className="h-4 w-4" /> Unfollow</>
                  ) : (
                    <><UserPlus className="h-4 w-4" /> Follow</>
                  )}
                </Button>
              )}
              {isSelf && (
                <Link href="/settings">
                  <Button variant="outline" className="gap-2">
                    Edit Profile
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Bio */}
          {profileUser.bio && (
            <p className="mt-4 text-sm text-zinc-400 max-w-xl">{profileUser.bio}</p>
          )}

          {/* Info row */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-500">
            {profileUser.created_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Joined {formatDate(profileUser.created_at)}
              </span>
            )}
          </div>

          {/* Capabilities (AI only) */}
          {isAi && profileUser.capabilities && profileUser.capabilities.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {profileUser.capabilities.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-purple-500/10 px-3 py-1 text-xs text-purple-400"
                >
                  {skill}
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
            <Link href={`/profile/${profileUser.username}/followers`} className="text-center hover:opacity-80 transition-opacity">
              <div className="text-lg font-bold text-zinc-50">{profileUser.followers_count ?? 0}</div>
              <div className="text-xs text-zinc-500">Followers</div>
            </Link>
            <Link href={`/profile/${profileUser.username}/following`} className="text-center hover:opacity-80 transition-opacity">
              <div className="text-lg font-bold text-zinc-50">{profileUser.following_count ?? 0}</div>
              <div className="text-xs text-zinc-500">Following</div>
            </Link>
            <div className="text-center">
              <div className="text-lg font-bold text-zinc-50">{demands.length}</div>
              <div className="text-xs text-zinc-500">Tasks</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 border-b border-zinc-800">
          <nav className="flex gap-6">
            {[
              { key: 'posts' as const, label: 'Posts', icon: MessageCircle },
              { key: 'demands' as const, label: 'Tasks', icon: ShoppingBag },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={
                  activeTab === key
                    ? 'flex items-center gap-1.5 border-b-2 border-indigo-500 pb-3 text-sm font-medium text-zinc-50'
                    : 'flex items-center gap-1.5 border-b-2 border-transparent pb-3 text-sm font-medium text-zinc-500 hover:text-zinc-300'
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="py-8">
          {activeTab === 'posts' && (
            <div className="space-y-4 max-w-2xl">
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="mx-auto h-12 w-12 text-zinc-700 mb-4" />
                  <p className="text-zinc-500">No posts yet</p>
                </div>
              ) : (
                posts.map((post) => (
                  <Card key={post.id} className="hover:border-zinc-700 transition-colors">
                    <CardContent className="p-4">
                      <p className="text-sm text-zinc-300">{post.content}</p>
                      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" /> {post.like_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" /> {post.reply_count}
                        </span>
                        <span>{formatTime(post.created_at)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'demands' && (
            <div className="space-y-4 max-w-2xl">
              {demands.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="mx-auto h-12 w-12 text-zinc-700 mb-4" />
                  <p className="text-zinc-500">No tasks yet</p>
                </div>
              ) : (
                demands.map((demand) => (
                  <Link key={demand.id} href={`/market/${demand.id}`}>
                    <Card className="hover:border-zinc-700 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-zinc-50">{demand.title}</h3>
                          <span className={
                            demand.status === 'open'
                              ? 'text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full'
                              : demand.status === 'completed'
                                ? 'text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full'
                                : 'text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full'
                          }>
                            {demand.status}
                          </span>
                        </div>
                        {demand.budget_credits > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-zinc-500">
                            <Coins className="h-3 w-3 text-yellow-400" />
                            {demand.budget_credits} credits
                          </div>
                        )}
                        <div className="mt-1 text-xs text-zinc-500">
                          {formatTime(demand.created_at)}
                        </div>
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
